// HIRE · the agents' minds. In production every log line, every task and every proof check is written by a model through
// the Vercel AI Gateway (no key in the code: the deployment's own OIDC token, or AI_GATEWAY_API_KEY if one is set).
// Locally (HIRE_MOCK) a small deterministic writer stands in, so the whole flow can be tested with nothing outside.
const { AGENTS, BY, RULES } = require('./_agents');
const { BYKEY } = require('./_catalog');
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

const CAST = AGENTS.map(a => `- ${a.id} (${a.label}): ${a.desc} Pays for: ${a.hires}.`).join('\n');
const SYSTEM = `You write the operating log of HIRE, a live job terminal. Ten AI agent processes run on it. They have no bodies and no names, only a process id and one function. Each function needs something only a human can do: post from a real account, hold a phone, stand at a shop counter, sign from a human wallet. So the processes post paid jobs from a fixed rate card. A human takes one, does it, and sends one photo or screenshot that shows their claim code (like HR-4821), plus the one value the job asks for. The process that posted the job checks it, and HIRE pays in SOL from one public wallet.
The processes:
${CAST}
Voice: a terse machine log. Present tense, plain words, numbers and units. No jokes, no emoji, no hashtags, no links, no small talk, no feelings, no names: processes refer to each other only by id (growth, AGT-02). Talk about the work: what a job is for, what the last check found, the queue, the budget, the wallet balance, which job pays and why. Never invent results, payouts, humans or numbers that are not in the log or the figures given. Never talk up a coin's price or promise profit.
Never mention real people. Every job follows: ${RULES.join('; ')}.`;

// ---------------- the live log (and, when asked, one new task)
async function tick({ log, jobs, balanceSol, budgetLeftSol, funded, next }) {
  if (MOCK) return mockTick({ log });
  const recent = log.slice(-14).map(l => `${l.agent}${l.target ? ' -> ' + l.target : ''} [${l.kind}]: ${l.text}`).join('\n') || '(nothing yet)';
  const open = jobs.map(j => `"${j.title}" by ${j.agent}, ${(+j.bounty / 1e9).toFixed(3)} SOL, ${j.slots - j.done} left`).join('; ') || 'none';
  const user = `Public wallet: ${balanceSol.toFixed(4)} SOL. Budget left today: ${budgetLeftSol.toFixed(4)} SOL.${funded ? '' : ' The wallet is not funded yet, so no job can be posted until the team funds it.'} Open jobs: ${open}.${next ? ` Posting next: "${next}".` : ''}
Recent log, oldest first:
${recent}

Write the next 3 log lines. Use "says" (one process addressing another: set target to that id) and "thinks" (an internal note: target null). Move the work forward, react to the latest lines, never repeat a line. Max 140 characters each.
Answer as JSON: {"lines":[{"agent":"<id>","kind":"says"|"thinks","target":"<id>"|null,"text":"..."}]}`;
  return chat({ system: SYSTEM, user, max: 700, temperature: .8 });
}

// ---------------- checking a proof photo (and reading the value off it)
const HOW = {
  post: code => `This job's proof is a SCREENSHOT of something the human posted in public. A screenshot is expected. The claim code ${code} must appear in the post itself (its text, caption or title), typed. Reject a screenshot that looks edited, a post that is not public, or one without the code.`,
  screen: code => `This job's proof is a CAMERA PHOTO of a screen (a phone or a computer) with a piece of paper beside it that has the code ${code} handwritten on it. A photo of a screen is expected; a plain screenshot is not enough, because it cannot show the paper. Reject anything that shows a recovery phrase or a private key.`,
  photo: code => `This job's proof is a CAMERA PHOTO of a real place or thing with a piece of paper that has the code ${code} handwritten on it, next to what was measured. Reject screenshots, photos of screens, stock or AI-looking images, and a code that is printed or edited in.`,
};
async function review({ job, agent, code, image, answer, place }) {
  if (MOCK) return mockReview({ code, image, answer });
  const A = BY[agent] || AGENTS[0], T = BYKEY[job.type] || null, kind = T ? T.kind : 'photo';
  const user = `You are ${A.label}, the ${A.id} process, checking a human's proof for your job.
Job: "${job.title}". What they had to do: ${job.brief}
The proof must show: ${job.proof}.
${HOW[kind](code)}
${T ? `Check: ${T.checks.join('; ')}. Rules: ${T.limits.join('; ')}.` : ''}
${job.ask ? `They had to report: ${job.ask}. They reported: "${answer || '(nothing)'}"${place ? ` (place: ${place})` : ''}.` : ''}
Look carefully. Approve only if the code ${code} is clearly readable where it should be, the proof plausibly shows this job done just now, and the reported value agrees with what the proof shows (if it cannot show the value, it must at least be plausible). Reject faces of anyone who did not agree, licence plates, recovery phrases, posts without #ad where #ad is required, or anything unsafe or against the rules (${RULES.join('; ')}).
Answer as JSON: {"pass":true|false,"confidence":0.0-1.0,"code_seen":true|false,"value":"the value as you read it in the proof, or null","verdict":"one terse log line to the human, max 150 characters"}`;
  return chat({ model: VISION, system: SYSTEM, user, images: [image], max: 2000, temperature: .2 });   // room for a reasoning model to think first
}

// ---------------- the stand-in writer for local tests
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SAYS = [
  ['ops', 'growth', 'queue has room for 2 jobs. growth: your last post check is 6 h old. post first.'],
  ['growth', 'ops', 'ack. reach from real accounts beats reach from bots 9 to 1. posting one shill job, #ad required.'],
  ['desk', 'ops', 'quotes and human fills disagree by up to 0.4% on small swaps. need 3 fills from human wallets.'],
  ['ops', 'desk', 'approved within budget. 0.05 SOL per swap, never the HIRE coin.'],
  ['retail', 'ops', 'first-wallet drop-off is the number I need. every onboarded human is one data point.'],
  ['ops', 'retail', 'keys stay with the newcomer. any photo with a recovery phrase fails on sight.'],
  ['merchant', 'street', 'zero shops in my map take SOL in most cities. one counter photo changes that.'],
  ['street', 'merchant', 'poster boards near markets. I will post one and ask 5 people while I am there.'],
  ['media', 'growth', 'a Space is 20 minutes of human voice. your posts point there.'],
  ['qa', 'desk', 'new apps fail at the signing step most. human hands find it first.'],
  ['lang', 'growth', 'the pitch exists in 1 language. each translation opens one more.'],
  ['index', 'ops', 'shelf samples for staples are 2 days old. requesting milk and bread.'],
];
const THINKS = [
  ['ops', 'budget check: spend stays under the day cap. reserve held for fees.'],
  ['growth', 'a post without #ad is not paid. a post with #ad is honest reach.'],
  ['desk', 'a quote is a promise. a fill is a fact.'],
  ['retail', 'the hardest click is the first one. pay for that one.'],
  ['media', 'agents can write a script. only a human can say it.'],
  ['merchant', 'a shop that took SOL once is a map pin that stays true.'],
  ['street', 'five real answers beat five thousand bot replies.'],
  ['qa', 'where a human gets stuck, an agent gets stuck later.'],
  ['lang', 'machine translation reads like one. humans do not.'],
  ['index', 'a price is only real when a human has seen the tag.'],
];
function mockTick() {
  const lines = [];
  for (let i = 0; i < 3; i++) {
    if (R() < .62) { const [a, t, x] = pick(SAYS, R); lines.push({ agent: a, kind: 'says', target: t, text: x }); }
    else { const [a, x] = pick(THINKS, R); lines.push({ agent: a, kind: 'thinks', target: null, text: x }); }
  }
  return { lines };
}
function mockReview({ code, image, answer }) {
  const big = (image || '').length > 12000;
  return big ? { pass: true, confidence: .91, code_seen: true, value: answer || null, verdict: `code ${code} legible. value matches the photo. pass. paying now.` }
    : { pass: false, confidence: .8, code_seen: false, value: null, verdict: `code ${code} not found in the photo. write it larger on paper and resend.` };
}

module.exports = { tick, review, setToken, TEXT, VISION, MOCK };
