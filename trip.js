const { Router } = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');

const { query } = require('../db');
const { redis } = require('../redis');
const { snapStationMaxM, corridorMaxM } = require('../config');
const { haversineMeters } = require('../lib/geo');
const { corridorDistanceMeters } = require('../lib/corridor');
const { snapToNearestStation } = require('../lib/snap');
const { dijkstra, summarizePath } = require('../lib/routing');
const { emitTripUpdate } = require('../socket');

const tripRouter = Router();

const TripStartReq = z.object({
  user_id: z.string().min(1),
  source: z.string().min(1),
  destination: z.string().min(1),
});

const TripLocationReq = z.object({
  user_id: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

const TripEndReq = z.object({
  user_id: z.string().min(1),
});

const norm = (s) =>
  s.toLowerCase().replace(/\./g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

async function loadStationsAndEdges() {
  const stationsRes = await query('SELECT id, name, lat, lng FROM stations');
  const stations = stationsRes.rows;
  const stationsById = new Map(stations.map((s) => [s.id, s]));
  const stationIdByNameNorm = new Map(stations.map((s) => [norm(s.name), s.id]));

  const edgesRes = await query(
    'SELECT from_station_id, to_station_id, line, weight FROM edges',
  );

  // Precompute line polylines from station_lines sequence.
  const polyRes = await query(
    `
    SELECT sl.line, sl.sequence_on_line, s.lat, s.lng
    FROM station_lines sl
    JOIN stations s ON s.id = sl.station_id
    WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    ORDER BY sl.line, sl.sequence_on_line
  `,
  );
  const linePolylinesByLine = new Map();
  for (const r of polyRes.rows) {
    if (!linePolylinesByLine.has(r.line)) linePolylinesByLine.set(r.line, []);
    linePolylinesByLine.get(r.line).push({ lat: r.lat, lng: r.lng });
  }
  const linePolylines = Array.from(linePolylinesByLine.entries()).map(([line, coords]) => ({
    line,
    coords,
  }));

  return { stations, stationsById, stationIdByNameNorm, edges: edgesRes.rows, linePolylines };
}

async function computeRoute({ sourceName, destName, graph }) {
  const srcId = graph.stationIdByNameNorm.get(norm(sourceName));
  const dstId = graph.stationIdByNameNorm.get(norm(destName));
  if (!srcId) return { error: 'Unknown source station' };
  if (!dstId) return { error: 'Unknown destination station' };

  const r = dijkstra({
    nodesById: graph.stationsById,
    edges: graph.edges,
    sourceId: srcId,
    destId: dstId,
  });
  if (!r) return { error: 'No route found' };

  const summary = summarizePath({
    stationsById: graph.stationsById,
    pathIds: r.pathIds,
    pathLines: r.pathLines,
  });
  return { srcId, dstId, summary, pathIds: r.pathIds, pathLines: r.pathLines };
}

function alertTypeFor({ stopsRemaining, nextInterchange }) {
  if (stopsRemaining <= 0) return 'arrived';
  if (nextInterchange && nextInterchange.stops_to_interchange <= 2) return 'interchange_approaching';
  if (stopsRemaining === 1) return '1_stop_away';
  if (stopsRemaining === 2) return '2_stops_away';
  return 'in_transit';
}

function computeNextInterchange({ stops, interchanges, currentIndex }) {
  // Find next interchange station ahead in stops list (by name).
  const interchangeStations = new Set(interchanges.map((i) => i.station));
  for (let i = currentIndex + 1; i < stops.length; i++) {
    if (interchangeStations.has(stops[i])) {
      return { station: stops[i], stops_to_interchange: i - currentIndex };
    }
  }
  return null;
}

function buildSessionKey(userId) {
  return `metromind:trip:user:${userId}`;
}

tripRouter.post('/trip/start', async (req, res, next) => {
  try {
    const body = TripStartReq.parse(req.body);
    await query('INSERT INTO users(id) VALUES ($1) ON CONFLICT DO NOTHING', [body.user_id]);

    const graph = await loadStationsAndEdges();
    const r = await computeRoute({
      sourceName: body.source,
      destName: body.destination,
      graph,
    });
    if (r.error) return res.status(400).json({ error: r.error });

    const tripId = uuidv4();

    const session = {
      trip_id: tripId,
      user_id: body.user_id,
      source: body.source,
      destination: body.destination,
      route: r.summary, // includes stops + interchanges + total_stops
      current_station: r.summary.stops[0],
      // rolling corridor distances for last 3 updates (meters)
      corridor_dists: [],
      last_station: r.summary.stops[0],
      updated_at: Date.now(),
    };

    await redis.set(buildSessionKey(body.user_id), JSON.stringify(session));
    return res.json({ trip_id: tripId, ...r.summary });
  } catch (e) {
    return next(e);
  }
});

tripRouter.patch('/trip/location', async (req, res, next) => {
  try {
    const body = TripLocationReq.parse(req.body);
    const key = buildSessionKey(body.user_id);
    const raw = await redis.get(key);
    if (!raw) return res.status(404).json({ error: 'No active trip for user' });
    const session = JSON.parse(raw);

    const graph = await loadStationsAndEdges();
    const snapped = snapToNearestStation({ lat: body.lat, lng: body.lng }, graph.stations);
    if (!snapped) return res.status(500).json({ error: 'No stations loaded' });

    const atStation = snapped.distance_m <= snapStationMaxM;
    const corridorDist = corridorDistanceMeters({ lat: body.lat, lng: body.lng }, graph.linePolylines);

    // Update rolling last 3 corridor distances
    const dists = Array.isArray(session.corridor_dists) ? session.corridor_dists : [];
    dists.push(corridorDist);
    while (dists.length > 3) dists.shift();
    session.corridor_dists = dists;

    const inMetro =
      atStation && dists.length === 3 && dists.every((d) => typeof d === 'number' && d <= corridorMaxM);

    const nearestStationName = snapped.station.name;
    const walkDistanceM = Math.round(snapped.distance_m);

    // Determine progress along route
    const stops = session.route?.stops || [];
    const dest = stops[stops.length - 1];

    let currentStation = session.current_station;
    if (atStation) currentStation = nearestStationName;

    // Snap progress index to nearest matching station along route (monotonic-ish)
    let idx = stops.findIndex((s) => norm(s) === norm(currentStation));
    if (idx < 0) {
      // If station not on planned route, keep current index
      idx = stops.findIndex((s) => norm(s) === norm(session.current_station));
      if (idx < 0) idx = 0;
    }

    const stopsRemaining = Math.max(0, stops.length - 1 - idx);
    const nextInterchange = computeNextInterchange({
      stops,
      interchanges: session.route?.interchanges || [],
      currentIndex: idx,
    });

    const alert_type = alertTypeFor({ stopsRemaining, nextInterchange });
    session.current_station = currentStation;
    session.last_station = currentStation;
    session.updated_at = Date.now();

    await redis.set(key, JSON.stringify(session));

    const payload = { current_station: currentStation, stops_remaining: stopsRemaining, alert_type };
    const io = req.app.get('io');
    emitTripUpdate(io, session.trip_id, payload);

    return res.json({
      ...payload,
      mode: inMetro ? 'in_metro' : 'outside_metro',
      ...(inMetro
        ? {}
        : {
            nearest_station: nearestStationName,
            walk_distance_m: walkDistanceM,
          }),
      ...(alert_type === 'interchange_approaching' && nextInterchange
        ? { interchange_station: nextInterchange.station }
        : {}),
      arrived: norm(currentStation) === norm(dest),
    });
  } catch (e) {
    return next(e);
  }
});

tripRouter.delete('/trip/end', async (req, res, next) => {
  try {
    const body = TripEndReq.parse(req.body);
    await redis.del(buildSessionKey(body.user_id));
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
});

module.exports = { tripRouter };