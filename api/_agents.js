// HIRE · the ten agent processes. No names, no faces: each one is a process with one function, and each function needs
// something only a human can do: post from a real account, hold a phone, stand at a counter, sign from a human wallet.
// What they may post is fixed by the rate card (_catalog.js); the proof is one photo or screenshot with the claim code.
const AGENTS = [
  { id: 'ops', desc: 'Runs the queue, the daily budget and every check. Posts the jobs no other process covers.', jobs: ['door'] },
  { id: 'growth', desc: 'Grows a coin through real accounts that say they were paid.', jobs: ['shill', 'meme'] },
  { id: 'retail', desc: 'Brings first-timers on-chain, one human at a time.', jobs: ['onboard'] },
  { id: 'desk', desc: 'Trades, and pays for real fills from human wallets.', jobs: ['trade'] },
  { id: 'media', desc: 'Needs human voices and human video.', jobs: ['space', 'tiktok'] },
  { id: 'merchant', desc: 'Finds real shops that will take SOL.', jobs: ['shop'] },
  { id: 'street', desc: 'Puts HIRE on real boards and asks real people.', jobs: ['poster', 'poll'] },
  { id: 'qa', desc: 'Tests apps on mainnet with human hands.', jobs: ['dapp'] },
  { id: 'lang', desc: 'Speaks every language, through humans.', jobs: ['translate'] },
  { id: 'index', desc: 'Builds a price index from shelf tags.', jobs: ['price'] },
];
AGENTS.forEach((a, i) => { a.no = String(i + 1).padStart(2, '0'); a.label = 'AGT-' + a.no; });
const BY = Object.fromEntries(AGENTS.map(a => [a.id, a]));
const { BYKEY } = require('./_catalog');
AGENTS.forEach(a => { a.hires = a.jobs.map(k => `${BYKEY[k].title} (${BYKEY[k].sol} SOL)`).join(', '); });

// what no job may ever ask (the rate card is written to these, and every proof is checked against them)
const RULES = [
  'legal, done alone, in public or online, in under a day',
  'paid posts say they are paid: #ad in every post and caption, out loud in every Space',
  'never anyone\'s keys: no recovery phrases, private keys, passwords or account access',
  'your own money only, and little of it: 0.05 SOL a trade at most, never the HIRE coin',
  'never people without their OK: no faces, no names, no recording, never children',
  'never a promise about price or profit, never advice on what to buy',
  'never spam, bots, bought followers, fake reviews, or lying to anyone',
  'never private property or trespassing; posters only where posters are allowed',
];
// a line a model writes is dropped if it touches any of this
const BLOCK = /\b(kill|weapon|gun|knife|drug|alcohol|beer|wine|vape|cigar|cigarette|child|children|kid|minor|school|nude|naked|password|seed phrase|recovery phrase|private key|passport|id card|home address|phone number|stranger|follow (someone|a person)|trespass|steal|shoplift|roof|highway|motorway|railway|train track|bridge edge|cliff|fire|gamble|casino|bet\b|vote|politic|pill|medicine|date someone|flirt|prank|graffiti|vandal|police|tinder|face|faces|selfie|guarantee|guaranteed|100x|1000x|moon|pump it|financial advice)\b/i;

module.exports = { AGENTS, BY, RULES, BLOCK };
