// HIRE server helpers: responses, bodies, rate limits, Postgres (Neon on Vercel, PGlite in dev), the master secret.
const crypto = require('crypto');

function send(res, code, obj, cache = 'no-store') {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (/s-maxage/.test(cache)) { res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); res.setHeader('CDN-Cache-Control', cache.replace(/max-age=0,\s*/, '')); }
  else res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(obj));
}
const CACHE = (s, swr = s * 3) => `public, max-age=0, s-maxage=${s}, stale-while-revalidate=${swr}`;
function query(req) { if (req.query) return req.query; return Object.fromEntries(new URL(req.url, 'http://x').searchParams); }
async function body(req, max = 3 * 1024 * 1024) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8')); } catch { return {}; } }
  const chunks = []; let n = 0;
  for await (const c of req) { chunks.push(c); n += c.length; if (n > max) return {}; }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}
function ip(req) { return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '?').split(',')[0].trim(); }
const hits = new Map();
function limited(key, n, ms) {
  const now = Date.now(), a = (hits.get(key) || []).filter(t => now - t < ms); a.push(now); hits.set(key, a);
  if (hits.size > 5000) hits.delete(hits.keys().next().value);
  return a.length > n;
}
function err(code, msg) { const e = new Error(msg); e.code = code; return e; }

// ---------- Postgres ----------
let pg = null;
function dbUrl() {
  const e = process.env;
  for (const k of ['DATABASE_URL', 'POSTGRES_URL', 'STORAGE_URL']) if (e[k]) return e[k];
  for (const [k, v] of Object.entries(e)) if (/_URL$/.test(k) && !/UNPOOLED|NON_POOLING|NO_SSL/.test(k) && /^postgres(ql)?:\/\//.test(v || '')) return v;
  return '';
}
async function q(text, params = []) {
  if (process.env.D_PGLITE) {
    if (!pg) { const { PGlite } = require(process.env.D_PGLITE_MOD || '@electric-sql/pglite'); pg = new PGlite(); }
    return (await pg.query(text, params)).rows;
  }
  if (!pg) { const { neon } = require('@neondatabase/serverless'); pg = neon(dbUrl()); }
  return pg.query(text, params);
}
const dbReady = () => !!(process.env.D_PGLITE || dbUrl());
let schemaP = null;
function schema() {
  if (!schemaP) schemaP = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS hire_meta (k text PRIMARY KEY, v text NOT NULL)`);
    // the live log: everything the agents say, think, post and pay
    await q(`CREATE TABLE IF NOT EXISTS hire_log (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), agent text NOT NULL,
      kind text NOT NULL, target text, text text NOT NULL, job text, sig text)`);
    await q(`CREATE INDEX IF NOT EXISTS hire_log_at ON hire_log (at DESC)`);
    // a job: posted by one agent, a bounty in lamports, a few slots, a code that has to be in the photo
    await q(`CREATE TABLE IF NOT EXISTS hire_jobs (id text PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), agent text NOT NULL,
      title text NOT NULL, brief text NOT NULL, why text NOT NULL DEFAULT '', proof text NOT NULL, code text NOT NULL,
      bounty bigint NOT NULL, slots int NOT NULL DEFAULT 1, taken int NOT NULL DEFAULT 0, done int NOT NULL DEFAULT 0,
      expires_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'open')`);
    await q(`CREATE INDEX IF NOT EXISTS hire_jobs_status ON hire_jobs (status, at DESC)`);
    // a claim: one human on one job, from claimed to paid (or rejected / expired)
    await q(`CREATE TABLE IF NOT EXISTS hire_claims (id text PRIMARY KEY, job text NOT NULL, wallet text NOT NULL,
      at timestamptz NOT NULL DEFAULT now(), deadline timestamptz NOT NULL, status text NOT NULL DEFAULT 'claimed',
      code text NOT NULL DEFAULT '', ipk text, proof_at timestamptz, hash text, verdict text, pass boolean, confidence real,
      paid bigint, sig text, lvbh bigint, pay_at timestamptz, paid_at timestamptz, tries int NOT NULL DEFAULT 0, hidden boolean NOT NULL DEFAULT false,
      day date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date))`);
    await q(`CREATE INDEX IF NOT EXISTS hire_claims_ipk ON hire_claims (ipk, day)`);
    await q(`CREATE INDEX IF NOT EXISTS hire_claims_wallet ON hire_claims (wallet, at DESC)`);
    await q(`CREATE INDEX IF NOT EXISTS hire_claims_job ON hire_claims (job)`);
    await q(`CREATE INDEX IF NOT EXISTS hire_claims_status ON hire_claims (status, at DESC)`);
    await q(`CREATE UNIQUE INDEX IF NOT EXISTS hire_claims_hash ON hire_claims (hash) WHERE hash IS NOT NULL`);
    // the photo itself (already re-encoded in the browser: no camera data, no location)
    await q(`CREATE TABLE IF NOT EXISTS hire_proofs (claim text PRIMARY KEY, mime text NOT NULL, data text NOT NULL, w int, h int)`);
    // where each agent is standing
    await q(`CREATE TABLE IF NOT EXISTS hire_world (agent text PRIMARY KEY, room text NOT NULL, mood int NOT NULL DEFAULT 0, at timestamptz NOT NULL DEFAULT now())`);
    // presence: a random id per open tab, for "N watching" and to rest the agents when nobody is
    await q(`CREATE TABLE IF NOT EXISTS hire_here (id text PRIMARY KEY, at timestamptz NOT NULL DEFAULT now())`);
  })().catch(e => { schemaP = null; throw e; });
  return schemaP;
}
async function meta(k) { const r = await q(`SELECT v FROM hire_meta WHERE k = $1`, [k]); return r[0] ? r[0].v : null; }
async function setMeta(k, v) { await q(`INSERT INTO hire_meta (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`, [k, String(v)]); }

// The master secret: made once, kept in the database, never sent anywhere. The public wallet's key is derived from it.
let masterP = null;
function master() {
  if (!masterP) masterP = (async () => {
    if (process.env.HIRE_MASTER && /^[0-9a-f]{64}$/i.test(process.env.HIRE_MASTER)) return Buffer.from(process.env.HIRE_MASTER, 'hex');
    await schema();
    await q(`INSERT INTO hire_meta (k, v) VALUES ('master', $1) ON CONFLICT (k) DO NOTHING`, [crypto.randomBytes(32).toString('hex')]);
    return Buffer.from(await meta('master'), 'hex');
  })().catch(e => { masterP = null; throw e; });
  return masterP;
}
async function hmac(label, data) { return crypto.createHmac('sha256', await master()).update(label).update(data || '').digest(); }
const rid = (n = 10) => crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, n);

module.exports = { send, CACHE, query, body, ip, limited, err, q, dbReady, schema, meta, setMeta, master, hmac, rid };
