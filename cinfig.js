require('dotenv').config();

function mustGet(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

module.exports = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: mustGet('DATABASE_URL'),
  redisUrl: mustGet('REDIS_URL'),
  seedReset: process.env.SEED_RESET === '1',
  snapStationMaxM: Number(process.env.SNAP_STATION_MAX_M || 350),
  corridorMaxM: Number(process.env.CORRIDOR_MAX_M || 200),
};