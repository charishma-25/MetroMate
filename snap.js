const { haversineMeters } = require('./geo');

function snapToNearestStation({ lat, lng }, stations) {
  // stations: [{id,name,lat,lng}]
  let best = null;
  for (const s of stations) {
    if (s.lat == null || s.lng == null) continue;
    const d = haversineMeters({ lat, lng }, { lat: s.lat, lng: s.lng });
    if (!best || d < best.distance_m) best = { station: s, distance_m: d };
  }
  return best;
}

module.exports = { snapToNearestStation };