// HIRE · the one API: /api/<op> is rewritten here (vercel.json). Reads are cached a few seconds at the edge; writes are
// signed by the human's wallet (one line of text, never a transaction). The public wallet's key never leaves this server.
const L = require('./_lib');
const W = require('./_world');
const C = require('./_chain');
const AI = require('./_ai');

const ok = (res, obj, cache) => L.send(res, 200, obj, cache);
const reqOk = s => typeof s === 'string' && s.length > 0 && s.length < 200;

module.exports = async (req, res) => {
  const qy = L.query(req);
  const op = String(qy.op || '').toLowerCase().replace(/[^a-z]/g, '');
  AI.setToken(req.headers['x-vercel-oidc-token']);
  try {
    if (!L.dbReady()) return L.send(res, 503, { error: 'The database is not connected yet.' });
    await L.schema();
    const ip = L.ip(req);

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (L.limited('get:' + ip, 240, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
      switch (op) {
        case 'state': return ok(res, await W.state(), L.CACHE(3, 12));
        case 'since': return ok(res, await W.since(qy.after), L.CACHE(2, 6));
        case 'jobs': return ok(res, await W.jobs({ status: qy.status, agent: qy.agent }), L.CACHE(4, 12));
        case 'job': return ok(res, await W.job(qy.id), L.CACHE(3, 9));
        case 'me': return ok(res, await W.me(qy.wallet), 'no-store');
        case 'payouts': return ok(res, await W.payouts({ before: qy.before }), L.CACHE(8, 24));
        case 'humans': return ok(res, await W.humans(), L.CACHE(15, 45));
        case 'agent': return ok(res, await W.agent(qy.id), L.CACHE(5, 15));
        case 'data': return ok(res, await W.data({ before: qy.before }), L.CACHE(8, 24));
        case 'photo': {
          const p = await W.photo(qy.c);
          if (!p) return L.send(res, 404, { error: 'No such photo.' }, 'public, max-age=60');
          res.statusCode = 200; res.setHeader('Content-Type', p.mime); res.setHeader('Cache-Control', 'public, max-age=86400');
          res.setHeader('X-Content-Type-Options', 'nosniff'); return res.end(p.bytes);
        }
        case 'tick': {                                    // the cron's knock (each minute)
          const secret = process.env.CRON_SECRET;
          if (secret && req.headers.authorization !== `Bearer ${secret}`) return L.send(res, 401, { error: 'Not the clock.' });
          return ok(res, await W.tick(), 'no-store');
        }
        case 'simpay': {                                  // the self-test: a real payout transaction, simulated on mainnet, nothing sent
          if (L.limited('sim:' + ip, 6, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
          const from = C.isAddr(qy.from) ? qy.from : await C.address(), to = C.isAddr(qy.to) ? qy.to : from;
          const lamports = Math.round(Math.min(Math.max(+qy.sol || W.CFG.minBounty, .001), 1) * 1e9);
          if (C.MOCK) return ok(res, { from, to, lamports, err: null, units: 450, logs: ['(local test: no network)'], bytes: 258, mock: true }, 'no-store');
          return ok(res, { from, to, lamports, ...(await C.simulatePay(from, to, lamports)) }, 'no-store');
        }
      }
      return L.send(res, 404, { error: 'Not found.' });
    }

    if (req.method === 'POST') {
      if (L.limited('post:' + ip, 50, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
      const b = await L.body(req);
      switch (op) {
        case 'here': {                                    // "someone is watching": the agents only work when someone is
          const counted = await W.here(b.id);
          const last = +(await L.meta('tick_at') || 0);
          let t = null;
          if (counted && Date.now() - last > 70000) t = await W.tick().catch(() => null);   // the cron is late or missing: nudge
          return ok(res, { ok: counted, tick: t ? (t.skipped || 'ran') : undefined }, 'no-store');
        }
        case 'tick': {
          if (L.limited('tick:' + ip, 6, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
          return ok(res, await W.tick({ force: !!(C.MOCK && b.force) }), 'no-store');
        }
        case 'claim': {
          if (L.limited('claim:' + ip, 8, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
          if (!reqOk(b.job) || !reqOk(b.wallet)) return L.send(res, 400, { error: 'Missing the job or the wallet.' });
          return ok(res, await W.claim({ job: b.job, wallet: b.wallet, ts: b.ts, sig: b.sig, ip }), 'no-store');
        }
        case 'proof': {
          if (L.limited('proof:' + ip, 6, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
          if (!reqOk(b.claim) || !reqOk(b.wallet)) return L.send(res, 400, { error: 'Missing the claim or the wallet.' });
          return ok(res, await W.proof({ claim: b.claim, wallet: b.wallet, ts: b.ts, sig: b.sig, image: b.image, answer: b.answer, place: b.place }), 'no-store');
        }
        case 'sweep': {
          if (L.limited('sweep:' + ip, 4, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
          return ok(res, await W.sweep({ wallet: b.wallet, ts: b.ts, sig: b.sig, amount: b.amount }), 'no-store');
        }
        case 'hide': {
          if (L.limited('hide:' + ip, 20, 60000)) return L.send(res, 429, { error: 'Slow down a little.' });
          return ok(res, await W.hide({ claim: b.claim, wallet: b.wallet, ts: b.ts, sig: b.sig }), 'no-store');
        }
      }
      return L.send(res, 404, { error: 'Not found.' });
    }
    res.setHeader('Allow', 'GET, POST');
    return L.send(res, 405, { error: 'Method not allowed.' });
  } catch (e) {
    if (e && e.code === '23505') return L.send(res, 409, { error: 'That was already sent. Refresh and try again.' });
    const code = e && Number.isInteger(e.code) && e.code >= 400 && e.code < 600 ? e.code : 500;
    if (code === 500) console.error('[hire]', op, e && (e.stack || e.message || e));
    return L.send(res, code, { error: code === 500 ? 'Something went wrong on our side. Try again in a moment.' : e.message });
  }
};
