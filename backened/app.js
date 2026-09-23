const express = require('express');
const cors = require('cors');

const { routeRouter } = require('./routes/route');
const { tripRouter } = require('./routes/trip');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use(routeRouter);
  app.use(tripRouter);

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal error' });
  });

  return app;
}

module.exports = { createApp };