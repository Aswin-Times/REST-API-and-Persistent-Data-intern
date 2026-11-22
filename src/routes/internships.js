const express = require('express');
const { ApiError } = require('../errors');
const { validateInternship, validateListQuery } = require('../validation');

function parseId(raw) {
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) {
    throw ApiError.validation([{ field: 'id', message: 'must be a positive integer' }], 'Invalid internship id');
  }
  return id;
}

/** Write requests must send JSON so bodies are never silently ignored. */
function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json'));
  }
  return next();
}

function validBody(body, mode) {
  const { value, errors } = validateInternship(body, mode);
  if (errors.length) throw ApiError.validation(errors, 'Request body is invalid');
  return value;
}

function internshipsRouter(repo) {
  const router = express.Router();

  // GET /api/internships?page=&limit=&status=&mode=&company=&q=&sort=&order=
  router.get('/', (req, res) => {
    const { value: query, errors } = validateListQuery(req.query);
    if (errors.length) throw ApiError.validation(errors, 'Query parameters are invalid');
    const { rows, total } = repo.list(query);
    res.json({
      data: rows,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // GET /api/internships/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const item = repo.get(id);
    if (!item) throw ApiError.notFound(`Internship ${id} not found`);
    res.json({ data: item });
  });

  // POST /api/internships
  router.post('/', requireJson, (req, res) => {
    const item = repo.create(validBody(req.body, 'create'));
    res.status(201).location(`/api/internships/${item.id}`).json({ data: item });
  });

  // PUT /api/internships/:id  -> full replace
  // PATCH /api/internships/:id -> partial update
  const update = (mode) => (req, res) => {
    const id = parseId(req.params.id);
    const item = repo.update(id, validBody(req.body, mode));
    if (!item) throw ApiError.notFound(`Internship ${id} not found`);
    res.json({ data: item });
  };
  router.put('/:id', requireJson, update('replace'));
  router.patch('/:id', requireJson, update('patch'));

  // DELETE /api/internships/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!repo.remove(id)) throw ApiError.notFound(`Internship ${id} not found`);
    res.status(204).end();
  });

  return router;
}

module.exports = { internshipsRouter };
