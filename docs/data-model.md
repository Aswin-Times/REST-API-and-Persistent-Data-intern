# Data model and response format

## Internship

| Field            | Type              | Rules                                                  |
|------------------|-------------------|--------------------------------------------------------|
| `id`             | integer           | Server-generated, read-only                            |
| `title`          | string            | Required, 3–120 chars                                  |
| `company`        | string            | Required, 2–80 chars                                   |
| `location`       | string            | Required, 2–80 chars                                   |
| `mode`           | enum              | Required: `remote`, `onsite` or `hybrid`               |
| `stipend`        | integer           | Optional, ≥ 0 (monthly, INR). Default `0`              |
| `duration_weeks` | integer           | Required, 1–52                                         |
| `skills`         | string[]          | Optional, ≤ 15 items, each 1–40 chars. Default `[]`    |
| `deadline`       | string (date)     | Required, `YYYY-MM-DD`, must be a real calendar date   |
| `status`         | enum              | Optional: `open` or `closed`. Default `open`           |
| `created_at`     | string (ISO 8601) | Server-generated, read-only                            |
| `updated_at`     | string (ISO 8601) | Server-generated, refreshed on every change            |

The SQL definition lives in [`db/schema.sql`](../db/schema.sql); it repeats the key
rules as `CHECK` constraints so the database rejects bad rows even if the API layer
is bypassed.

## Response envelope

Every success response has a `data` key; list responses also carry `meta`.

```json
{ "data": { "id": 1, "title": "Frontend Developer Intern" } }
```

```json
{
  "data": [ { "id": 1 }, { "id": 2 } ],
  "meta": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 }
}
```

Every error response has an `error` key with a stable machine-readable `code`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [ { "field": "mode", "message": "must be one of: remote, onsite, hybrid" } ]
  }
}
```

| Status | `code`                   | When                                                     |
|--------|--------------------------|----------------------------------------------------------|
| 400    | `VALIDATION_ERROR`       | Bad body, query parameter or id                          |
| 400    | `INVALID_JSON`           | Body is not parseable JSON                               |
| 404    | `NOT_FOUND`              | Internship id or route does not exist                    |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | Write request without `Content-Type: application/json`   |
| 500    | `INTERNAL_ERROR`         | Unexpected server failure                                |
