/**
 * Data-access layer for internships. All SQL lives here and uses
 * prepared statements with bound parameters (no string-built values).
 */

const COLUMNS = ['title', 'company', 'location', 'mode', 'stipend', 'duration_weeks', 'skills', 'deadline', 'status'];
const SORTABLE = ['id', 'title', 'company', 'stipend', 'duration_weeks', 'deadline', 'created_at'];

function toApi(row) {
  if (!row) return null;
  return { ...row, skills: JSON.parse(row.skills) };
}

function toDb(input) {
  const out = {};
  for (const key of COLUMNS) {
    if (input[key] !== undefined) out[key] = key === 'skills' ? JSON.stringify(input[key]) : input[key];
  }
  return out;
}

function createRepository(db) {
  const getStmt = db.prepare('SELECT * FROM internships WHERE id = ?');
  const deleteStmt = db.prepare('DELETE FROM internships WHERE id = ?');

  function buildWhere({ status, mode, company, q }) {
    const clauses = [];
    const params = {};
    if (status) { clauses.push('status = @status'); params.status = status; }
    if (mode) { clauses.push('mode = @mode'); params.mode = mode; }
    if (company) { clauses.push('company = @company COLLATE NOCASE'); params.company = company; }
    if (q) {
      clauses.push("(title LIKE @q ESCAPE '\\' OR company LIKE @q ESCAPE '\\' OR location LIKE @q ESCAPE '\\' OR skills LIKE @q ESCAPE '\\')");
      params.q = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    }
    return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }

  return {
    SORTABLE,

    list({ page, limit, sort, order, ...filters }) {
      const { sql, params } = buildWhere(filters);
      // sort/order are validated against a whitelist before reaching here.
      const sortCol = SORTABLE.includes(sort) ? sort : 'id';
      const dir = order === 'desc' ? 'DESC' : 'ASC';
      const total = db.prepare(`SELECT COUNT(*) AS n FROM internships ${sql}`).get(params).n;
      const rows = db
        .prepare(`SELECT * FROM internships ${sql} ORDER BY ${sortCol} ${dir}, id ASC LIMIT @limit OFFSET @offset`)
        .all({ ...params, limit, offset: (page - 1) * limit });
      return { rows: rows.map(toApi), total };
    },

    get(id) {
      return toApi(getStmt.get(id));
    },

    create(input) {
      const data = toDb(input);
      const keys = Object.keys(data);
      const info = db
        .prepare(`INSERT INTO internships (${keys.join(', ')}) VALUES (${keys.map((k) => `@${k}`).join(', ')})`)
        .run(data);
      return this.get(info.lastInsertRowid);
    },

    update(id, input) {
      const data = toDb(input);
      const keys = Object.keys(data);
      const sets = keys.map((k) => `${k} = @${k}`);
      sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
      const info = db.prepare(`UPDATE internships SET ${sets.join(', ')} WHERE id = @id`).run({ ...data, id });
      return info.changes ? this.get(id) : null;
    },

    remove(id) {
      return deleteStmt.run(id).changes > 0;
    },
  };
}

module.exports = { createRepository, COLUMNS, SORTABLE };
