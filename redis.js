const Redis = require('ioredis');
const { redisUrl } = require('./config');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
});

module.exports = { redis };