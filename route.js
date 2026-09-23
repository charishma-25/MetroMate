const { Router } = require("express");
const { z } = require("zod");

const { query } = require("../db");
const { dijkstra, summarizePath } = require("../lib/routing");

const routeRouter = Router();

const RouteReq = z.object({
  source_station: z.string().min(1),
  destination_station: z.string().min(1),
});

async function loadGraph() {
  const stationsRes = await query("SELECT id, name, lat, lng FROM stations");

  const stationsById = new Map();
  const stationIdByNameNorm = new Map();

  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  for (const s of stationsRes.rows) {
    stationsById.set(s.id, s);
    stationIdByNameNorm.set(norm(s.name), s.id);
  }

  const edgesRes = await query(
    "SELECT from_station_id, to_station_id, line, weight FROM edges"
  );

  return {
    stationsById,
    stationIdByNameNorm,
    edges: edgesRes.rows,
    norm,
  };
}

routeRouter.post("/route", async (req, res, next) => {
  try {
    const body = RouteReq.parse(req.body);
    const g = await loadGraph();

    const srcId = g.stationIdByNameNorm.get(g.norm(body.source_station));
    const dstId = g.stationIdByNameNorm.get(g.norm(body.destination_station));

    if (!srcId) {
      return res.status(400).json({
        error: "Source station not found. Please check the station name.",
      });
    }

    if (!dstId) {
      return res.status(400).json({
        error: "Destination station not found. Please check the station name.",
      });
    }

    if (srcId === dstId) {
      return res.status(400).json({
        error: "Source and destination cannot be the same.",
      });
    }

    const result = dijkstra({
      nodesById: g.stationsById,
      edges: g.edges,
      sourceId: srcId,
      destId: dstId,
    });

    if (!result) {
      return res.status(404).json({
        error: "No route found between the selected stations.",
      });
    }

    const routeSummary = summarizePath({
      stationsById: g.stationsById,
      pathIds: result.pathIds,
      pathLines: result.pathLines,
    });

    return res.json({
      success: true,
      message: "Route found successfully.",
      source: body.source_station,
      destination: body.destination_station,
      total_stations: routeSummary.stations?.length || result.pathIds.length,
      route: routeSummary,
      voice_intro: `Your route from ${body.source_station} to ${body.destination_station} is ready.`,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { routeRouter };