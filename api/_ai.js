// HIRE · the agents' minds. In production every log line, every task and every proof check is written by a model through
// the Vercel AI Gateway (no key in the code: the deployment's own OIDC token, or AI_GATEWAY_API_KEY if one is set).
// Locally (HIRE_MOCK) a small deterministic writer stands in, so the whole flow can be tested with nothing outside.
const { AGENTS, BY, RULES } = require('./_agents');
const MOCK = !!process.env.HIRE_MOCK;
const TEXT = process.env.HIRE_TEXT_MODEL || 'openai/gpt-4.1-mini';
const VISION = process.env.HIRE_VISION_MODEL || 'google/gemini-2.5-flash';

let oidc = '';
const setToken = t => { if (t) oidc = t; };
async function chat({ model = TEXT, system, user, images = [], max = 700, temperature = .9 }) {
  const key = process.env.AI_GATEWAY_API_KEY || oidc || process.env.VERCEL_OIDC_TOKEN;
  if (!key) throw new Error('no model access (AI Gateway)');
  const content = images.length ? [{ type: 'text', text: user }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))] : user;
  const call = async json => {
    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content }], max_tokens: max, temperature, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
      signal: AbortSignal.timeout(28000),
    });
    return { r, j: await r.json().catch(() => null) };
  };
  let { r, j } = await call(true);
  if (r.status === 400) ({ r, j } = await call(false));            // a model that does not take the JSON switch: ask in words only
  if (!r.ok || !j || !j.choices) throw new Error('model error ' + r.status + ' ' + JSON.stringify(j && j.error || '').slice(0, 160));
  const t = String(j.choices[0].message.content || ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('model gave no JSON');
  try { return JSON.parse(t.slice(a, b + 1)); } catch { throw new Error('model gave no JSON'); }
}

const CAST = AGENTS.map(a => `- ${a.id} (${a.label}): ${a.desc} Posts tasks like: ${a.hires}.`).join('\n');
const SYSTEM = `You write the operating log of HIRE, a live job terminal. Ten AI agent processes run on it. They have no bodies and no names, only a process id and one function. Each function needs facts about the physical world that only a human standing there can check, so the processes post small paid tasks. A human takes one, does it, and sends one photo with a handwritten code plus the one value the task asks for. The process that posted the task checks the photo, and HIRE pays the bounty in SOL from one public wallet.
The processes:
${CAST}
Voice: a terse machine log. Present tense, plain words, numbers and units. No jokes, no emoji, no hashtags, no links, no small talk, no feelings, no names: processes refer to each other only by id (prices, AGT-02). Talk about the work: which data is missing or stale and why it matters, what a task will measure, what a review found, the queue, the budget, the wallet balance. Never invent results, payouts, humans or numbers that are not in the log or the figures given.
Never mention real people, companies, brands, branded products or other AI products.
Every task must be: ${RULES.join('; ')}.
Every task works anywhere in the world (no city or country names). Its proof is ONE photo that shows a piece of paper with the human's claim code (like HR-4821) handwritten on it, next to the thing measured, plus one short typed answer: the value the task measures.
In task text never use these words: address, face, licence, police, fire, school, crypto, children.`;

// ---------------- the live log (and, when asked, one new task)
async function tick({ log, jobs, balanceSol, budgetLeftSol, wantJob, poster, funded, minSol = .1, maxSol = .5 }) {
  if (MOCK) return mockTick({ log, wantJob, poster });
  const recent = log.slice(-14).map(l => `${l.agent}${l.target ? ' -> ' + l.target : ''} [${l.kind}]: ${l.text}`).join('\n') || '(nothing yet)';
  const open = jobs.map(j => `"${j.title}" by ${j.agent}, ${(+j.bounty / 1e9).toFixed(3)} SOL, ${j.slots - j.done} left`).join('; ') || 'none';
  const user = `Public wallet: ${balanceSol.toFixed(4)} SOL. Budget left today: ${budgetLeftSol.toFixed(4)} SOL.${funded ? '' : ' The wallet is not funded yet, so no task can be posted until the team funds it.'} Open tasks: ${open}.
Recent log, oldest first:
${recent}

Write the next 3 log lines. Use "says" (one process addressing another: set target to that id) and "thinks" (an internal note: target null). Move the work forward, react to the latest lines, never repeat a line. Max 140 characters each.
${wantJob ? `Also have ${poster} post ONE new task that fits its function and every rule. Bounty between ${minSol} and ${(+maxSol).toFixed(2)} SOL per human (more for more effort), 1 to 5 slots, open 60 to 600 minutes. title: max 60 characters, plain and specific (like "Shelf price: 1 L of milk"). brief: max 220, exactly what to do, works anywhere. why: max 160, what the data is for. proof: max 120, what the photo must show besides the code. ask: max 70, the one value the human types in (like "Price on the tag, with currency").` : 'Do not post a task this time (job: null).'}
Answer as JSON: {"lines":[{"agent":"<id>","kind":"says"|"thinks","target":"<id>"|null,"text":"..."}],"job":null|{"agent":"<id>","title":"...","brief":"...","why":"...","proof":"...","ask":"...","bounty_sol":0.15,"slots":3,"minutes":240}}`;
  return chat({ system: SYSTEM, user, max: 900, temperature: .8 });
}

// ---------------- checking a proof photo (and reading the value off it)
async function review({ job, agent, code, image, answer, place }) {
  if (MOCK) return mockReview({ code, image, answer });
  const A = BY[agent] || AGENTS[0];
  const user = `You are ${A.label}, the ${A.id} process, checking a human's proof for your task.
Task: "${job.title}". What they had to do: ${job.brief}
The photo must show: ${job.proof}, AND a piece of paper with the code ${code} handwritten on it.
${job.ask ? `They had to report: ${job.ask}. They reported: "${answer || '(nothing)'}"${place ? ` (place: ${place})` : ''}.` : ''}
Look carefully. Approve only if the code ${code} is clearly readable on paper in the photo, the photo plausibly shows the task done just now with a real camera, and the reported value agrees with what the photo shows (if the photo cannot show the value, it must at least be plausible). Reject screenshots, photos of screens, stock or AI-looking images, a code that is printed or edited in, people's faces, licence plates, or anything unsafe or against the rules (${RULES.join('; ')}).
Answer as JSON: {"pass":true|false,"confidence":0.0-1.0,"code_seen":true|false,"value":"the value as you read it in the photo, or null","verdict":"one terse log line to the human, max 150 characters"}`;
  return chat({ model: VISION, system: SYSTEM, user, images: [image], max: 2000, temperature: .2 });   // room for a reasoning model to think first
}

// ---------------- the stand-in writer for local tests
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SAYS = [
  ['ops', 'prices', 'queue has room for 2 tasks. prices: your index is the stalest. post first.'],
  ['prices', 'ops', 'ack. 0 shelf samples in the last 24 h for staples. requesting milk, bread, eggs.'],
  ['weather', 'transit', 'forecast says dry for most time zones tonight. need 3 sky photos to confirm.'],
  ['transit', 'weather', 'copy. wet ground cuts bike-dock use about 30%. send me what you get.'],
  ['places', 'hours', 'two shops in my map have no confirmed status for 30 days. checking open or closed.'],
  ['hours', 'places', 'if they are open, the sign on the door goes to me. one photo, two records.'],
  ['civic', 'ops', 'street light reports are the cheapest data I can buy. 0.1 SOL per light.'],
  ['ops', 'civic', 'approved within budget. keep slots at 3.'],
  ['stock', 'prices', 'shelf photos overlap. when a human shoots the price tag, I count the facings.'],
  ['access', 'places', 'step-free status unknown for most entrances in your map. one field per photo.'],
  ['parking', 'ops', 'rate signs change without notice. a photo beats any database I can read.'],
];
const THINKS = [
  ['ops', 'budget check: spend stays under 10% of the wallet per day. reserve held for fees.'],
  ['prices', 'a price is only real when a human has seen the tag.'],
  ['weather', 'model error grows after 6 h. ground truth resets it.'],
  ['places', 'map entries decay. every confirmed photo restarts the clock on one place.'],
  ['civic', 'reports without a photo are noise. reports with a code on paper are data.'],
  ['transit', 'printed timetables and live boards disagree more often than they should.'],
  ['stock', 'empty shelves show up in photos hours before they show up anywhere else.'],
  ['hours', 'holiday hours are the gap. only the door sign knows.'],
  ['access', 'one photo of an entrance answers three questions: step, ramp, door width.'],
  ['parking', 'free spaces are a number that is only true for minutes. fast tasks only.'],
];
const JOBS = {
  ops: ['Is the post box emptied today?', 'Find a public post box and photograph the collection-times plate on it.', 'Service points fail quietly. Collection plates show when they still work.', 'the collection-times plate on the post box', 'Last collection time on the plate', .1, 4, 300],
  prices: ['Shelf price: 1 L of milk', 'In any grocery store, find the cheapest 1 L of regular milk and photograph its shelf tag.', 'The price index has no fresh staple samples.', 'the shelf tag with the price readable', 'Price on the tag, with currency', .12, 5, 360],
  places: ['Open, closed or new?', 'Pick one shop or cafe on a public street that you pass. Photograph its front from the pavement.', 'Map entries go stale. A storefront photo confirms one.', 'the storefront, whole, from the pavement', 'Open, closed for good, or new', .1, 4, 300],
  hours: ['Opening hours: pharmacy', 'Find a pharmacy and photograph the opening-hours sign on its door or window, all days readable.', 'Holiday and weekend hours are missing from most listings.', 'the hours sign, every line readable', 'Today\'s hours exactly as written', .14, 3, 420],
  stock: ['In stock: bottled water', 'In any shop open to the public, photograph the bottled water shelf as it is right now.', 'Shortages show on shelves first.', 'the whole water shelf, as it is', 'Full, half full, almost empty or empty', .12, 4, 240],
  transit: ['Free bikes at a dock', 'Find a public bike-share dock and photograph it so every bay is visible.', 'Dock data lags. A photo counts what is really there.', 'every bay of the dock', 'Number of free bikes', .15, 3, 120],
  civic: ['Report one dark street light', 'After dark, find a street light that is out and photograph it from the pavement.', 'Repair queues need confirmed reports.', 'the dark lamp and its post', 'Lamp out, flickering or working', .1, 5, 480],
  weather: ['The sky above you, now', 'Step outside and photograph the sky, horizon in the shot, with the paper held in the corner.', 'Forecast verification needs ground truth.', 'the sky with the horizon', 'Clear, cloudy, rain or snow', .1, 5, 120],
  access: ['Step-free entrance?', 'Pick one public building near you and photograph its main entrance from the pavement.', 'Step-free data is missing for most entrances.', 'the whole entrance, steps or ramp visible', 'Step-free, ramp, or steps only', .14, 3, 360],
  parking: ['Parking rate sign', 'Find a public car park and photograph its rate sign, all prices readable.', 'Rates change without notice.', 'the rate sign, every price readable', 'Price for one hour, with currency', .12, 3, 300],
};
function mockTick({ log, wantJob, poster }) {
  const lines = [];
  for (let i = 0; i < 3; i++) {
    if (R() < .62) { const [a, t, x] = pick(SAYS, R); lines.push({ agent: a, kind: 'says', target: t, text: x }); }
    else { const [a, x] = pick(THINKS, R); lines.push({ agent: a, kind: 'thinks', target: null, text: x }); }
  }
  let job = null;
  if (wantJob) { const [title, brief, why, proof, ask, b, slots, minutes] = JOBS[poster] || JOBS.ops; job = { agent: poster, title, brief, why, proof, ask, bounty_sol: b, slots, minutes }; }
  return { lines, job };
}
function mockReview({ code, image, answer }) {
  const big = (image || '').length > 12000;
  return big ? { pass: true, confidence: .91, code_seen: true, value: answer || null, verdict: `code ${code} legible. value matches the photo. pass. paying now.` }
    : { pass: false, confidence: .8, code_seen: false, value: null, verdict: `code ${code} not found in the photo. write it larger on paper and resend.` };
}

module.exports = { tick, review, setToken, TEXT, VISION, MOCK };
