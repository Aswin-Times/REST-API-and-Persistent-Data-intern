/**
 * Dependency-free validation for internship payloads and list queries.
 * Each validator returns { value, errors } where errors is [{ field, message }].
 */

const MODES = ['remote', 'onsite', 'hybrid'];
const STATUSES = ['open', 'closed'];
const SORTABLE = ['id', 'title', 'company', 'stipend', 'duration_weeks', 'deadline', 'created_at'];
const READ_ONLY = ['id', 'created_at', 'updated_at'];

function isRealDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const string = (min, max) => (v) => {
  if (typeof v !== 'string') return 'must be a string';
  const t = v.trim();
  if (t.length < min || t.length > max) return `must be between ${min} and ${max} characters`;
  return null;
};

const integer = (min, max) => (v) => {
  if (!Number.isInteger(v)) return 'must be an integer';
  if (v < min || (max !== undefined && v > max)) {
    return max === undefined ? `must be >= ${min}` : `must be between ${min} and ${max}`;
  }
  return null;
};

const oneOf = (values) => (v) => (values.includes(v) ? null : `must be one of: ${values.join(', ')}`);

const skills = (v) => {
  if (!Array.isArray(v)) return 'must be an array of strings';
  if (v.length > 15) return 'must contain at most 15 items';
  if (v.some((s) => typeof s !== 'string' || s.trim().length < 1 || s.trim().length > 40)) {
    return 'each skill must be a string of 1 to 40 characters';
  }
  return null;
};

const date = (v) => (isRealDate(v) ? null : 'must be a valid date in YYYY-MM-DD format');

const FIELDS = {
  title: { required: true, check: string(3, 120) },
  company: { required: true, check: string(2, 80) },
  location: { required: true, check: string(2, 80) },
  mode: { required: true, check: oneOf(MODES) },
  stipend: { required: false, check: integer(0, 10_000_000) },
  duration_weeks: { required: true, check: integer(1, 52) },
  skills: { required: false, check: skills },
  deadline: { required: true, check: date },
  status: { required: false, check: oneOf(STATUSES) },
};

function normalize(key, v) {
  if (typeof v === 'string') return v.trim();
  if (key === 'skills') return [...new Set(v.map((s) => s.trim()))];
  return v;
}

/**
 * Validate an internship body.
 * mode 'create' / 'replace': required fields must be present.
 * mode 'patch': any subset, but at least one field.
 */
function validateInternship(body, mode = 'create') {
  const errors = [];
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { value: null, errors: [{ field: 'body', message: 'must be a JSON object' }] };
  }

  for (const key of Object.keys(body)) {
    if (READ_ONLY.includes(key)) errors.push({ field: key, message: 'is read-only' });
    else if (!FIELDS[key]) errors.push({ field: key, message: 'is not an allowed field' });
  }

  const value = {};
  for (const [key, rule] of Object.entries(FIELDS)) {
    const v = body[key];
    if (v === undefined || v === null) {
      if (rule.required && mode !== 'patch') errors.push({ field: key, message: 'is required' });
      continue;
    }
    const msg = rule.check(v);
    if (msg) errors.push({ field: key, message: msg });
    else value[key] = normalize(key, v);
  }

  if (mode === 'patch' && !errors.length && !Object.keys(value).length) {
    errors.push({ field: 'body', message: 'must include at least one updatable field' });
  }

  // A full replace resets optional fields to their defaults.
  if (mode === 'replace' && !errors.length) {
    value.stipend ??= 0;
    value.skills ??= [];
    value.status ??= 'open';
  }

  return { value, errors };
}

function positiveInt(raw, field, { min = 1, max } = {}) {
  if (!/^\d+$/.test(String(raw))) return { error: { field, message: 'must be a positive integer' } };
  const n = Number(raw);
  if (n < min || (max !== undefined && n > max)) {
    return { error: { field, message: max === undefined ? `must be >= ${min}` : `must be between ${min} and ${max}` } };
  }
  return { n };
}

/** Validate list query parameters; unknown parameters are rejected to catch typos. */
function validateListQuery(query) {
  const allowed = ['page', 'limit', 'status', 'mode', 'company', 'q', 'sort', 'order'];
  const errors = [];
  const value = { page: 1, limit: 10, sort: 'id', order: 'asc' };

  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) errors.push({ field: key, message: 'is not a supported query parameter' });
    else if (typeof query[key] !== 'string') errors.push({ field: key, message: 'must be given once' });
  }
  if (errors.length) return { value, errors };

  if (query.page !== undefined) {
    const r = positiveInt(query.page, 'page');
    r.error ? errors.push(r.error) : (value.page = r.n);
  }
  if (query.limit !== undefined) {
    const r = positiveInt(query.limit, 'limit', { max: 100 });
    r.error ? errors.push(r.error) : (value.limit = r.n);
  }
  if (query.status !== undefined) {
    STATUSES.includes(query.status) ? (value.status = query.status)
      : errors.push({ field: 'status', message: `must be one of: ${STATUSES.join(', ')}` });
  }
  if (query.mode !== undefined) {
    MODES.includes(query.mode) ? (value.mode = query.mode)
      : errors.push({ field: 'mode', message: `must be one of: ${MODES.join(', ')}` });
  }
  if (query.sort !== undefined) {
    SORTABLE.includes(query.sort) ? (value.sort = query.sort)
      : errors.push({ field: 'sort', message: `must be one of: ${SORTABLE.join(', ')}` });
  }
  if (query.order !== undefined) {
    ['asc', 'desc'].includes(query.order) ? (value.order = query.order)
      : errors.push({ field: 'order', message: 'must be one of: asc, desc' });
  }
  for (const key of ['company', 'q']) {
    if (query[key] !== undefined) {
      const t = query[key].trim();
      if (t.length < 1 || t.length > 80) errors.push({ field: key, message: 'must be between 1 and 80 characters' });
      else value[key] = t;
    }
  }

  return { value, errors };
}

module.exports = { validateInternship, validateListQuery, isRealDate, MODES, STATUSES, SORTABLE };
