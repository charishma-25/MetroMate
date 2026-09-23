const { pointToSegmentMeters } = require('./geo');

// Computes distance from point to nearest metro corridor segment.
// Segments are built from consecutive stations per line sequence.
function corridorDistanceMeters(point, linePolylines) {
  // linePolylines: { line: string, coords: [{lat,lng}] }[]
  let best = Infinity;
  for (const poly of linePolylines) {
    const coords = poly.coords;
    for (let i = 0; i < coords.length - 1; i++) {
      const d = pointToSegmentMeters(point, coords[i], coords[i + 1]);
      if (d < best) best = d;
    }
  }
  return best;
}

module.exports = { corridorDistanceMeters };