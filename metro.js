const { query, close } = require('../src/db');
const { seedReset } = require('../src/config');
const { LINES } = require('../src/lib/metroLines');

function normName(s) {
  return s
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchOverpassStations() {
  // Overpass QL: Hyderabad Metro (HMR) stations as nodes/ways/relations with a name.
  const q = `
[out:json][timeout:60];
(
  node["railway"="station"]["station"~"subway|metro",i]["name"](area:3600066421);
  node["railway"="station"]["name"~"Metro",i](area:3600066421);
  node["public_transport"="station"]["name"](area:3600066421);
  node["station"="subway"]["name"](area:3600066421);
);
out center;
`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: q,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Overpass failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  const out = [];
  for (const el of data.elements || []) {
    const name = el.tags?.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    out.push({ name, lat, lng });
  }
  return out;
}

async function upsertStation({ name, lat, lng }) {
  const r = await query(
    `
    INSERT INTO stations(name, lat, lng)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET lat = EXCLUDED.lat, lng = EXCLUDED.lng
    RETURNING id
  `,
    [name, lat, lng],
  );
  return r.rows[0].id;
}

async function ensureStationName(name, osmByNorm) {
  const key = normName(name);
  const osm = osmByNorm.get(key);
  const lat = osm?.lat ?? null;
  const lng = osm?.lng ?? null;
  return upsertStation({ name, lat, lng });
}

async function resetIfNeeded() {
  if (!seedReset) return;
  await query('TRUNCATE edges RESTART IDENTITY CASCADE');
  await query('TRUNCATE station_lines RESTART IDENTITY CASCADE');
  await query('TRUNCATE stations RESTART IDENTITY CASCADE');
}

async function main() {
  await resetIfNeeded();

  // Pull coordinates from OSM once and match by normalized name.
  const osm = await fetchOverpassStations();
  const osmByNorm = new Map();
  for (const s of osm) {
    const k = normName(s.name);
    if (!osmByNorm.has(k)) osmByNorm.set(k, s);
  }

  // Insert stations and line memberships (sequence_on_line).
  const stationIdByName = new Map();
  for (const [line, seq] of Object.entries(LINES)) {
    for (let i = 0; i < seq.length; i++) {
      const name = seq[i];
      if (!stationIdByName.has(name)) {
        const id = await ensureStationName(name, osmByNorm);
        stationIdByName.set(name, id);
      }
      const stationId = stationIdByName.get(name);
      await query(
        `
        INSERT INTO station_lines(station_id, line, sequence_on_line)
        VALUES ($1, $2, $3)
        ON CONFLICT (station_id, line) DO UPDATE SET sequence_on_line = EXCLUDED.sequence_on_line
      `,
        [stationId, line, i + 1],
      );
    }
  }

  // Create adjacency edges along each line (both directions).
  for (const [line, seq] of Object.entries(LINES)) {
    for (let i = 0; i < seq.length - 1; i++) {
      const a = stationIdByName.get(seq[i]);
      const b = stationIdByName.get(seq[i + 1]);
      await query(
        `INSERT INTO edges(from_station_id, to_station_id, line, weight)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT DO NOTHING`,
        [a, b, line],
      );
      await query(
        `INSERT INTO edges(from_station_id, to_station_id, line, weight)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT DO NOTHING`,
        [b, a, line],
      );
    }
  }

  // Basic sanity output
  const stCount = await query('SELECT COUNT(*)::int AS c FROM stations');
  const edgeCount = await query('SELECT COUNT(*)::int AS c FROM edges');
  // eslint-disable-next-line no-console
  console.log(`Seeded stations=${stCount.rows[0].c} edges=${edgeCount.rows[0].c}`);

  const missingCoords = await query(
    `SELECT name FROM stations WHERE lat IS NULL OR lng IS NULL ORDER BY name`,
  );
  if (missingCoords.rows.length) {
    // eslint-disable-next-line no-console
    console.log(`Stations missing coords (${missingCoords.rows.length}):`);
    for (const r of missingCoords.rows) console.log(`- ${r.name}`);
  }

  await close();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  try {
    await close();
  } catch {}
  process.exit(1);
});