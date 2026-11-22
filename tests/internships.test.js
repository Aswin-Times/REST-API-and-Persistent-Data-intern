const request = require('supertest');
const { openDatabase } = require('../src/db');
const { seed } = require('../src/seed');
const { createApp } = require('../src/app');

const valid = {
  title: 'Backend Intern',
  company: 'Acme Corp',
  location: 'Delhi',
  mode: 'remote',
  stipend: 12000,
  duration_weeks: 8,
  skills: ['Node.js', 'SQL'],
  deadline: '2027-03-01',
};

let db;
let app;

beforeEach(() => {
  db = openDatabase(':memory:');
  seed(db);
  app = createApp(db);
});

afterEach(() => db.close());

describe('GET /api/internships', () => {
  test('returns first page with default limit and meta', async () => {
    const res = await request(app).get('/api/internships');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 12, totalPages: 2 });
    expect(Array.isArray(res.body.data[0].skills)).toBe(true);
  });

  test('paginates', async () => {
    const res = await request(app).get('/api/internships?page=2&limit=5');
    expect(res.body.data.map((i) => i.id)).toEqual([6, 7, 8, 9, 10]);
    expect(res.body.meta.totalPages).toBe(3);
  });

  test('page past the end returns empty data, not an error', async () => {
    const res = await request(app).get('/api/internships?page=99');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('filters by status, mode and company', async () => {
    const res = await request(app).get('/api/internships?status=open&mode=remote&company=northwind%20cloud');
    expect(res.body.data.map((i) => i.title)).toEqual(['Backend Engineering Intern', 'DevOps Intern']);
  });

  test('searches with q across title, company, location and skills', async () => {
    const res = await request(app).get('/api/internships?q=python');
    expect(res.body.meta.total).toBe(2);
  });

  test('q treats % and _ literally', async () => {
    const res = await request(app).get('/api/internships?q=%25');
    expect(res.body.meta.total).toBe(0);
  });

  test('sorts by stipend descending', async () => {
    const res = await request(app).get('/api/internships?sort=stipend&order=desc&limit=3');
    expect(res.body.data.map((i) => i.stipend)).toEqual([25000, 22000, 20000]);
  });

  test.each([
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['limit=101', 'limit'],
    ['mode=space', 'mode'],
    ['status=draft', 'status'],
    ['sort=password', 'sort'],
    ['order=up', 'order'],
    ['colour=red', 'colour'],
    ['page=1&page=2', 'page'],
  ])('rejects invalid query %s', async (qs, field) => {
    const res = await request(app).get(`/api/internships?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });
});

describe('GET /api/internships/:id', () => {
  test('returns one internship', async () => {
    const res = await request(app).get('/api/internships/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, title: 'Frontend Developer Intern' });
  });

  test('404 for missing id', async () => {
    const res = await request(app).get('/api/internships/999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test.each(['abc', '0', '-1', '1.5'])('400 for invalid id %s', async (id) => {
    const res = await request(app).get(`/api/internships/${id}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/internships', () => {
  test('creates and returns 201 with Location header and defaults', async () => {
    const { stipend, ...body } = valid;
    const res = await request(app).post('/api/internships').send({ ...body, title: '  Backend Intern  ' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe('/api/internships/13');
    expect(res.body.data).toMatchObject({ id: 13, title: 'Backend Intern', stipend: 0, status: 'open' });
    expect(res.body.data.created_at).toBeDefined();

    const again = await request(app).get('/api/internships/13');
    expect(again.body.data.title).toBe('Backend Intern');
  });

  test('reports every invalid field at once', async () => {
    const res = await request(app).post('/api/internships').send({ title: 'x', mode: 'space', stipend: -1 });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'company', 'location', 'mode', 'stipend', 'duration_weeks', 'deadline']));
  });

  test.each([
    [{ deadline: '2027-02-30' }, 'deadline'],
    [{ deadline: '01/03/2027' }, 'deadline'],
    [{ duration_weeks: 53 }, 'duration_weeks'],
    [{ duration_weeks: 4.5 }, 'duration_weeks'],
    [{ stipend: '1000' }, 'stipend'],
    [{ skills: 'Node' }, 'skills'],
    [{ skills: [''] }, 'skills'],
    [{ status: 'draft' }, 'status'],
    [{ id: 50 }, 'id'],
    [{ salary: 5 }, 'salary'],
  ])('rejects %j', async (override, field) => {
    const res = await request(app).post('/api/internships').send({ ...valid, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  test('rejects non-object JSON body', async () => {
    const res = await request(app).post('/api/internships').send([valid]);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body');
  });

  test('400 INVALID_JSON for malformed JSON', async () => {
    const res = await request(app).post('/api/internships').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('415 when Content-Type is not JSON', async () => {
    const res = await request(app).post('/api/internships').set('Content-Type', 'text/plain').send('hello');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('PUT /api/internships/:id', () => {
  test('replaces the record and resets omitted optional fields', async () => {
    const { skills, ...body } = valid;
    const res = await request(app).put('/api/internships/1').send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, title: 'Backend Intern', skills: [], status: 'open' });
  });

  test('requires all required fields', async () => {
    const res = await request(app).put('/api/internships/1').send({ title: 'Only title' });
    expect(res.status).toBe(400);
  });

  test('404 for missing id', async () => {
    const res = await request(app).put('/api/internships/999').send(valid);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/internships/:id', () => {
  test('updates only given fields and bumps updated_at', async () => {
    const before = (await request(app).get('/api/internships/2')).body.data;
    await new Promise((r) => setTimeout(r, 5));
    const res = await request(app).patch('/api/internships/2').send({ status: 'closed' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ ...before, status: 'closed', updated_at: expect.any(String) });
    expect(res.body.data.updated_at > before.updated_at).toBe(true);
    expect(res.body.data.created_at).toBe(before.created_at);
  });

  test('empty body is rejected', async () => {
    const res = await request(app).patch('/api/internships/2').send({});
    expect(res.status).toBe(400);
  });

  test('404 for missing id', async () => {
    const res = await request(app).patch('/api/internships/999').send({ status: 'closed' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/internships/:id', () => {
  test('deletes and returns 204, then 404', async () => {
    const res = await request(app).delete('/api/internships/3');
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get('/api/internships/3')).status).toBe(404);
    expect((await request(app).delete('/api/internships/3')).status).toBe(404);
  });
});

describe('misc', () => {
  test('health check', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ data: { status: 'ok' } });
  });

  test('unknown route returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
