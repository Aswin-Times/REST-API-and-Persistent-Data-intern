# Internship Records API

A REST API for internship listings, built with **Node.js + Express** and persisted in **SQLite**.
It supports full create / read / update / delete, pagination, filtering, search and sorting,
validates every input, and returns predictable status codes and one error format.

- **Stack:** Node.js 18+, Express 4, better-sqlite3, Jest + Supertest
- **Data model and response format:** [`docs/data-model.md`](docs/data-model.md)
- **Schema:** [`db/schema.sql`](db/schema.sql) · **Seed data:** [`db/seed.json`](db/seed.json) · **Ready-to-import SQL:** [`db/sample-data.sql`](db/sample-data.sql)
- **Request collection:** [`requests.http`](requests.http) (VS Code REST Client / JetBrains HTTP client)

## Setup

```bash
git clone https://github.com/Aswin-Times/REST-API-and-Persistent-Data-intern.git
cd REST-API-and-Persistent-Data-intern
npm install
npm run seed      # optional: (re)load the 12 sample internships
npm start         # http://localhost:3000
```

On first start the server creates `data/internships.db` and seeds it automatically if it is empty.

| Script          | What it does                                     |
|-----------------|--------------------------------------------------|
| `npm start`     | Start the API                                    |
| `npm run dev`   | Start with auto-restart on file changes          |
| `npm run seed`  | Reset the database to the seed records           |
| `npm test`      | Run the 46 automated API tests (in-memory DB)    |

| Env var   | Default                 | Purpose                    |
|-----------|-------------------------|----------------------------|
| `PORT`    | `3000`                  | HTTP port                  |
| `DB_FILE` | `data/internships.db`   | SQLite file path           |

Prefer the SQLite CLI? `sqlite3 internships.db < db/sample-data.sql` creates the same table and rows.

## Project structure

```
db/
  schema.sql          table, CHECK constraints, indexes
  seed.json           12 fictional internship records
  sample-data.sql     schema + seed as one importable SQL file
docs/data-model.md    fields, rules, response envelope, error codes
src/
  server.js           entry point (opens DB, seeds if empty, listens)
  app.js              Express app, 404 + central error handler
  routes/internships.js   endpoints
  validation.js       body and query validation
  repository.js       all SQL (prepared statements only)
  db.js, seed.js, errors.js
tests/internships.test.js
```

## Endpoints

Base URL: `http://localhost:3000`

| Method | Path                     | Description                       | Success |
|--------|--------------------------|-----------------------------------|---------|
| GET    | `/health`                | Health check                      | 200     |
| GET    | `/api/internships`       | List (paginated, filterable)      | 200     |
| GET    | `/api/internships/:id`   | Get one                           | 200     |
| POST   | `/api/internships`       | Create                            | 201 + `Location` header |
| PUT    | `/api/internships/:id`   | Replace (all required fields)     | 200     |
| PATCH  | `/api/internships/:id`   | Partial update                    | 200     |
| DELETE | `/api/internships/:id`   | Delete                            | 204 (empty body) |

### List query parameters

| Param     | Values                                                                 | Default |
|-----------|------------------------------------------------------------------------|---------|
| `page`    | integer ≥ 1                                                            | `1`     |
| `limit`   | integer 1–100                                                          | `10`    |
| `status`  | `open`, `closed`                                                       | –       |
| `mode`    | `remote`, `onsite`, `hybrid`                                           | –       |
| `company` | exact company name, case-insensitive                                   | –       |
| `q`       | text search in title, company, location, skills                        | –       |
| `sort`    | `id`, `title`, `company`, `stipend`, `duration_weeks`, `deadline`, `created_at` | `id` |
| `order`   | `asc`, `desc`                                                          | `asc`   |

Unknown parameters return `400` so typos (e.g. `?statsu=open`) don't silently return everything.

## API examples

### List with pagination

```bash
curl "http://localhost:3000/api/internships?page=1&limit=2"
```

```json
{
  "data": [
    {
      "id": 1,
      "title": "Frontend Developer Intern",
      "company": "Brightleaf Labs",
      "location": "Bengaluru",
      "mode": "hybrid",
      "stipend": 15000,
      "duration_weeks": 12,
      "skills": ["HTML", "CSS", "JavaScript", "React"],
      "deadline": "2026-12-15",
      "status": "open",
      "created_at": "2026-11-22T08:55:01.120Z",
      "updated_at": "2026-11-22T08:55:01.120Z"
    },
    { "id": 2, "title": "Backend Engineering Intern", "...": "..." }
  ],
  "meta": { "page": 1, "limit": 2, "total": 12, "totalPages": 6 }
}
```

### Filter, search and sort

```bash
curl "http://localhost:3000/api/internships?status=open&mode=remote&sort=stipend&order=desc"
curl "http://localhost:3000/api/internships?q=python"
```

### Get one

```bash
curl http://localhost:3000/api/internships/1
```

```json
{ "data": { "id": 1, "title": "Frontend Developer Intern", "...": "..." } }
```

### Create

```bash
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cloud Support Intern",
    "company": "Acme Corp",
    "location": "Delhi",
    "mode": "remote",
    "stipend": 12000,
    "duration_weeks": 8,
    "skills": ["AWS", "Linux"],
    "deadline": "2027-03-01"
  }'
```

`201 Created`, `Location: /api/internships/13`

```json
{
  "data": {
    "id": 13,
    "title": "Cloud Support Intern",
    "company": "Acme Corp",
    "location": "Delhi",
    "mode": "remote",
    "stipend": 12000,
    "duration_weeks": 8,
    "skills": ["AWS", "Linux"],
    "deadline": "2027-03-01",
    "status": "open",
    "created_at": "2026-11-22T09:01:12.442Z",
    "updated_at": "2026-11-22T09:01:12.442Z"
  }
}
```

### Partial update

```bash
curl -X PATCH http://localhost:3000/api/internships/13 \
  -H "Content-Type: application/json" \
  -d '{ "status": "closed", "stipend": 14000 }'
```

`200 OK` with the full updated record; `updated_at` is refreshed.

### Replace

```bash
curl -X PUT http://localhost:3000/api/internships/13 \
  -H "Content-Type: application/json" \
  -d '{ "title": "Cloud Intern", "company": "Acme Corp", "location": "Delhi",
        "mode": "hybrid", "duration_weeks": 10, "deadline": "2027-03-15" }'
```

Omitted optional fields reset to defaults (`stipend: 0`, `skills: []`, `status: "open"`).

### Delete

```bash
curl -i -X DELETE http://localhost:3000/api/internships/13
```

`204 No Content`

### Errors

Validation reports every problem at once:

```bash
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{ "title": "x", "mode": "space", "deadline": "2027-02-30", "id": 5 }'
```

`400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [
      { "field": "id", "message": "is read-only" },
      { "field": "title", "message": "must be between 3 and 120 characters" },
      { "field": "company", "message": "is required" },
      { "field": "location", "message": "is required" },
      { "field": "mode", "message": "must be one of: remote, onsite, hybrid" },
      { "field": "duration_weeks", "message": "is required" },
      { "field": "deadline", "message": "must be a valid date in YYYY-MM-DD format" }
    ]
  }
}
```

| Status | `error.code`             | Example trigger                                   |
|--------|--------------------------|---------------------------------------------------|
| 400    | `VALIDATION_ERROR`       | bad field, `?limit=500`, `/api/internships/abc`   |
| 400    | `INVALID_JSON`           | body `{bad`                                       |
| 404    | `NOT_FOUND`              | `/api/internships/999`, unknown route             |
| 413    | `PAYLOAD_TOO_LARGE`      | body over 100 kb                                  |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | POST/PUT/PATCH without `Content-Type: application/json` |
| 500    | `INTERNAL_ERROR`         | unexpected failure (details logged, not leaked)   |

## Design notes

- **Two layers of validation.** The API validates and trims input; the schema's `CHECK`
  constraints are a second guard if rows are ever written outside the API.
- **SQL injection safe.** Values are always bound parameters. The only interpolated parts
  (`ORDER BY` column and direction) come from a whitelist.
- **Search is literal.** `%` and `_` in `q` are escaped, so `?q=%` doesn't match everything.
- **Stable pagination.** Results are ordered by the sort column then `id`, so pages never
  overlap or skip rows when values tie.
- **Tests use an in-memory database** seeded fresh per test, so they are fast and isolated.
