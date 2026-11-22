const express = require('express');
const { ApiError } = require('../errors');

function parseId(raw) {
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) {
    throw ApiError.validation([{ field: 'id', message: 'must be a positive integer' }], 'Invalid internship id');
  }
  return id;
}

function internshipsRouter(repo) {
  const router = express.Router();

  // GET /api/internships?page=&limit=&status=&mode=&company=&q=&sort=&order=
  router.get('/', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { status, mode, company, q, sort, order } = req.query;
    const { rows, total } = repo.list({ page, limit, status, mode, company, q, sort, order });
    res.json({ data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // GET /api/internships/:id
  router.get('/:id', (req, res) => {
    const item = repo.get(parseId(req.params.id));
    if (!item) throw ApiError.notFound(`Internship ${req.params.id} not found`);
    res.json({ data: item });
  });

  // POST /api/internships
  router.post('/', (req, res) => {
    const item = repo.create(req.body);
    res.status(201).location(`/api/internships/${item.id}`).json({ data: item });
  });

  // PUT /api/internships/:id  (full replace) and PATCH (partial update)
  for (const method of ['put', 'patch']) {
    router[method]('/:id', (req, res) => {
      const id = parseId(req.params.id);
      const item = repo.update(id, req.body);
      if (!item) throw ApiError.notFound(`Internship ${id} not found`);
      res.json({ data: item });
    });
  }

  // DELETE /api/internships/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!repo.remove(id)) throw ApiError.notFound(`Internship ${id} not found`);
    res.status(204).end();
  });

  return router;
}

module.exports = { internshipsRouter };
