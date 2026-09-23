function buildAdj(edges) {
  const adj = new Map();

  for (const edge of edges) {
    if (!adj.has(edge.from_station_id)) {
      adj.set(edge.from_station_id, []);
    }

    adj.get(edge.from_station_id).push({
      to: edge.to_station_id,
      line: edge.line,
      w: edge.weight || 1,
    });
  }

  return adj;
}

function dijkstra({ nodesById, edges, sourceId, destId }) {
  const adj = buildAdj(edges);
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  for (const id of nodesById.keys()) {
    dist.set(id, Infinity);
  }

  dist.set(sourceId, 0);

  while (visited.size < nodesById.size) {
    let current = null;
    let bestDistance = Infinity;

    for (const [id, distance] of dist.entries()) {
      if (!visited.has(id) && distance < bestDistance) {
        bestDistance = distance;
        current = id;
      }
    }

    if (current === null) break;
    if (current === destId) break;

    visited.add(current);

    const neighbors = adj.get(current) || [];

    for (const neighbor of neighbors) {
      const newDistance = dist.get(current) + neighbor.w;

      if (newDistance < dist.get(neighbor.to)) {
        dist.set(neighbor.to, newDistance);
        prev.set(neighbor.to, {
          id: current,
          viaLine: neighbor.line,
        });
      }
    }
  }

  if (!prev.has(destId) && sourceId !== destId) {
    return null;
  }

  const pathIds = [destId];
  const pathLines = [];
  let current = destId;

  while (current !== sourceId) {
    const previous = prev.get(current);
    if (!previous) break;

    pathLines.push(previous.viaLine);
    pathIds.push(previous.id);
    current = previous.id;
  }

  pathIds.reverse();
  pathLines.reverse();

  return {
    pathIds,
    pathLines,
  };
}

function summarizePath({ stationsById, pathIds, pathLines }) {
  const stops = pathIds.map((id) => stationsById.get(id).name);

  const interchanges = [];
  const linesTaken = [];
  const guidance = [];

  let lastLine = null;

  for (let i = 0; i < pathLines.length; i++) {
    const currentLine = pathLines[i];
    const fromStation = stops[i];
    const toStation = stops[i + 1];

    guidance.push({
      step: i + 1,
      from: fromStation,
      to: toStation,
      line: currentLine,
      instruction: `Travel from ${fromStation} to ${toStation} on the ${currentLine} line.`,
      voice_text: `Next station is ${toStation}.`,
    });

    if (lastLine === null || currentLine !== lastLine) {
      linesTaken.push(currentLine);

      if (lastLine !== null) {
        interchanges.push({
          station: fromStation,
          from_line: lastLine,
          to_line: currentLine,
          instruction: `Get down at ${fromStation} and change from ${lastLine} line to ${currentLine} line.`,
          voice_text: `Get down at ${fromStation}. Change from ${lastLine} line to ${currentLine} line.`,
        });
      }

      lastLine = currentLine;
    }
  }

  const totalStops = Math.max(0, stops.length - 1);

  return {
    line: linesTaken.length <= 1 ? linesTaken[0] || null : linesTaken,
    stops,
    interchanges,
    guidance,
    total_stops: totalStops,
    estimated_time_minutes: totalStops * 2,
    start_instruction: stops.length
      ? `Start from ${stops[0]}. Board the ${pathLines[0]} line.`
      : "",
    destination_instruction: stops.length
      ? `Get down at ${stops[stops.length - 1]}. You have reached your destination.`
      : "",
  };
}

module.exports = {
  dijkstra,
  summarizePath,
};