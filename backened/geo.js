function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in meters
function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Approximate distance from point to segment (meters) using local equirectangular projection.
function pointToSegmentMeters(p, a, b) {
  // Project to meters around point latitude
  const lat0 = toRad(p.lat);
  const mPerDegLat = 111132.92;
  const mPerDegLng = 111412.84 * Math.cos(lat0);

  const px = p.lng * mPerDegLng;
  const py = p.lat * mPerDegLat;
  const ax = a.lng * mPerDegLng;
  const ay = a.lat * mPerDegLat;
  const bx = b.lng * mPerDegLng;
  const by = b.lat * mPerDegLat;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const abLen2 = abx * abx + aby * aby;
  if (abLen2 === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

module.exports = { haversineMeters, pointToSegmentMeters };