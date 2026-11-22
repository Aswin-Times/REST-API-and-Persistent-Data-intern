const express = require('express');
const { createRepository } = require('./repository');
const { internshipsRouter } = require('./routes/internships');
const { ApiError, sendError } = require('./errors');

/** Build the Express app around an open database handle. */
function createApp(db) {
  const app = express();
  const repo = createRepository(db);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => res.json({ data: { status: 'ok' } }));
  app.use('/api/internships', internshipsRouter(repo));

  // Unknown route
  app.use((req, res) => sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));

  // Central error handler: every error leaves in the same envelope.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) return sendError(res, err.status, err.code, err.message, err.details);
    if (err.type === 'entity.parse.failed') return sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
    if (err.type === 'entity.too.large') return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    console.error(err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
  });

  return app;
}

module.exports = { createApp };
