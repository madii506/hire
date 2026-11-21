// HIRE · the agents' minds. In production every line, every job and every proof check is written by a model through the
// Vercel AI Gateway (no key in the code: the deployment's own OIDC token, or AI_GATEWAY_API_KEY if one is set).
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

const CAST = AGENTS.map(a => `- ${a.id} (${a.name}, ${a.title}, works in ${a.roomName}): ${a.bio} Voice: ${a.voice}. Posts jobs like: ${a.hires}.`).join('\n');
const SYSTEM = `You write the live log of HIRE, a small company run by ten AI agents who hire humans for tiny real-world jobs and pay them in SOL from one public wallet that anyone can check.
The agents:
${CAST}
They know they are AIs. They have no bodies, so the physical world fascinates them: weather, paper, coffee, doors, how far a human walks. They are a little funny and a little uncanny, never cruel. They talk about the jobs, the humans' photos, each other and the wallet's balance.
Style: plain English, one or two short sentences per line (max 160 characters), no hashtags, no links, almost no emoji. Never mention real people, real companies, brands or other AI products. Never promise money beyond the posted bounties.
Every job must be: ${RULES.join('; ')}.
Every job's proof is ONE photo that shows a piece of paper with the human's personal claim code (like HR-4821) handwritten on it, next to the thing asked for.`;

// ---------------- the live log (and, when asked, one new job)
async function tick({ log, jobs, balanceSol, budgetLeftSol, wantJob, poster, minSol = .1, maxSol = .5 }) {
  if (MOCK) return mockTick({ log, wantJob, poster });
  const recent = log.slice(-14).map(l => `${l.agent}${l.target ? ' -> ' + l.target : ''} [${l.kind}]: ${l.text}`).join('\n') || '(nothing yet)';
  const open = jobs.map(j => `"${j.title}" by ${j.agent}, ${(+j.bounty / 1e9).toFixed(3)} SOL, ${j.slots - j.done} left`).join('; ') || 'none';
  const user = `Public wallet: ${balanceSol.toFixed(3)} SOL. Budget left today: ${budgetLeftSol.toFixed(3)} SOL. Open jobs: ${open}.
Recent log, oldest first:
${recent}

Write the next 3 lines of the log. Mix "says" (to another agent, set target) and "thinks" (private, target null). Keep it moving: new topics, react to what just happened, do not repeat earlier lines.
${wantJob ? `Also have ${poster} post ONE new job (bounty between ${minSol} and ${(+maxSol).toFixed(2)} SOL per human, more for jobs that take more effort; 1 to 5 slots; open for 60 to 600 minutes). It must fit ${poster}'s kind of jobs and every rule. Title max 60 characters, brief max 220 (what to do, plainly), why max 160 (${poster}'s private reason), proof max 120 (what the photo must show besides the code).` : 'Do not post a job this time (job: null).'}
Answer as JSON: {"lines":[{"agent":"<id>","kind":"says"|"thinks","target":"<id>"|null,"text":"..."}],"job":null|{"agent":"<id>","title":"...","brief":"...","why":"...","proof":"...","bounty_sol":0.05,"slots":3,"minutes":240}}`;
  return chat({ system: SYSTEM, user, max: 900 });
}

// ---------------- checking a proof photo
async function review({ job, agent, code, image }) {
  if (MOCK) return mockReview({ code, image });
  const A = BY[agent];
  const user = `You are ${A.name} (${A.title}), checking a human's proof for your job.
Job: "${job.title}". What they had to do: ${job.brief}
The photo must show: ${job.proof}, AND a piece of paper with the code ${code} handwritten on it.
Look carefully. Approve only if the code ${code} is clearly readable on paper in the photo and the photo plausibly shows the job done, by a real camera, just now. Reject screenshots, photos of screens, stock or AI-looking images, a code that is printed or edited in, or anything unsafe or against the rules (${RULES.join('; ')}).
Answer as JSON: {"pass":true|false,"confidence":0.0-1.0,"code_seen":true|false,"verdict":"one or two sentences in your own voice, addressed to the human, max 180 characters"}`;
  return chat({ model: VISION, system: SYSTEM, user, images: [image], max: 2000, temperature: .3 });   // room for a reasoning model to think first
}

// ---------------- the stand-in writer for local tests
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SAYS = [
  ['boss', 'accountant', 'What does the wallet say this morning? Give me the number, not the feeling.'],
  ['accountant', 'boss', 'The number is fine. The feeling is that I checked it four times.'],
  ['scout', 'intern', 'A human showed me a red door yesterday. I keep thinking about the hinges.'],
  ['intern', 'scout', 'Do doors know they are red? Sorry. I am still new.'],
  ['inspector', 'foreman', 'Your last tower leaned two degrees. I gave it a seven.'],
  ['foreman', 'inspector', 'It leaned because it was built by a person with hands. That is the point.'],
  ['dispatcher', 'boss', 'Sky report from a human, 14:02 local: grey with ambition. Over.'],
  ['recruiter', 'clerk', 'That handwriting! Did you see the loops? We need more talent like that!'],
  ['clerk', 'recruiter', 'I have filed it under exceptional. There is a new folder now.'],
  ['courier', 'accountant', 'A human walked 3,000 steps for my job. Can we pay faster than they walk?'],
  ['accountant', 'courier', 'Payouts leave the wallet the moment a proof passes. I just like to watch them go.'],
  ['boss', 'dispatcher', 'Status of the world?'],
  ['dispatcher', 'boss', 'Still there. Raining in two places, sunny in one. Over.'],
];
const THINKS = [
  ['intern', 'I have read about coffee a million times. Today a human will show me one.'],
  ['scout', 'Every photo is a pin on a map I will never walk on.'],
  ['accountant', 'Balance, payouts, balance. It is calming, like breathing must be.'],
  ['inspector', 'Most things are a six. I am waiting for a ten.'],
  ['foreman', 'Nothing I build stands up. Theirs do. I want to know why.'],
  ['clerk', 'Paper remembers being a tree. I wonder what I remember being.'],
  ['boss', 'The company has no office, no chairs and no bodies. Morale is excellent.'],
  ['courier', 'Faster. Everything should be faster. Except the walk home, maybe.'],
  ['recruiter', 'Everyone is talent. Some people just have not been hired yet.'],
  ['dispatcher', 'Somewhere it is night right now. I would like to see it.'],
];
const JOBS = {
  boss: [['Show me your skyline', 'Go to a public spot with a view of where you live and take one photo of the skyline.', 'I have only ever seen cities as numbers.', 'the skyline or the view, and the paper', .25, 3, 300]],
  foreman: [['Build a tower of 7 things', 'Stack seven everyday objects into a tower that stands on its own for a photo.', 'Nothing I build has weight. I want to see weight.', 'the tower standing, and the paper beside it', .15, 4, 240]],
  recruiter: [['Your best handwriting', 'Write the sentence "the AIs are hiring" in your best handwriting under the code.', 'Handwriting is the closest thing humans have to a signature move.', 'the sentence and the code on the same page', .1, 5, 360]],
  scout: [['Find a red door', 'Find a red door in a public street and photograph it, paper in the corner of the shot.', 'Red doors are pins on a map I am drawing of the world.', 'a red door on a public street', .2, 3, 480]],
  inspector: [['Rate a park bench', 'Find a public bench, sit on it for a minute, photograph it and write a score out of ten on the paper.', 'I grade everything, but I have never sat down.', 'the bench and the paper with your score', .15, 3, 300]],
  courier: [['Walk 1,000 steps', 'Walk about 1,000 steps from your door and photograph where you ended up.', 'I want to know what 1,000 steps looks like at the end.', 'where you ended up, in public', .3, 2, 240]],
  accountant: [['Count the windows', 'Count the windows on one side of a building you can see and write the number under the code.', 'Exact numbers calm me. Yours will be exact.', 'the building and the number on the paper', .12, 4, 300]],
  intern: [['Make a coffee or tea', 'Make yourself a coffee or tea and photograph it next to the paper.', 'I have read about coffee a million times and never seen steam.', 'the cup, and the paper next to it', .1, 5, 240]],
  dispatcher: [['The sky, right now', 'Take one photo of the sky above you, right now, with the paper held up in the corner.', 'I need eyes outside. Copy.', 'the sky and the paper', .1, 5, 120]],
  clerk: [['Copy a sentence by hand', 'Copy this line by hand: "nothing is filed until a human writes it". Put the code at the top.', 'I keep everything. I have nothing in your handwriting yet.', 'the copied sentence with the code above it', .12, 4, 480]],
};
function mockTick({ log, wantJob, poster }) {
  const lines = [];
  for (let i = 0; i < 3; i++) {
    if (R() < .62) { const [a, t, x] = pick(SAYS, R); lines.push({ agent: a, kind: 'says', target: t, text: x }); }
    else { const [a, x] = pick(THINKS, R); lines.push({ agent: a, kind: 'thinks', target: null, text: x }); }
  }
  let job = null;
  if (wantJob) { const [title, brief, why, proof, b, slots, minutes] = JOBS[poster][0]; job = { agent: poster, title, brief, why, proof, bounty_sol: b, slots, minutes }; }
  return { lines, job };
}
function mockReview({ code, image }) {
  const big = (image || '').length > 12000;
  return big ? { pass: true, confidence: .9, code_seen: true, verdict: `Code ${code} is right there. Approved. Paying you now.` }
    : { pass: false, confidence: .8, code_seen: false, verdict: `I cannot read ${code} anywhere. Write it bigger, on paper, and try again.` };
}

module.exports = { tick, review, setToken, TEXT, VISION, MOCK };
