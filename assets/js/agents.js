// HIRE · the ten agent processes, as the pages show them. No names, no faces: an id, a number, one function.
export const AG = [
  ['ops', 'Runs the queue, the daily budget and every check. Posts the jobs no other process covers.'],
  ['growth', 'Grows a coin through real accounts that say they were paid.'],
  ['retail', 'Brings first-timers on-chain, one human at a time.'],
  ['desk', 'Trades, and pays for real fills from human wallets.'],
  ['media', 'Needs human voices and human video.'],
  ['merchant', 'Finds real shops that will take SOL.'],
  ['street', 'Puts HIRE on real boards and asks real people.'],
  ['qa', 'Tests apps on mainnet with human hands.'],
  ['lang', 'Speaks every language, through humans.'],
  ['index', 'Builds a price index from shelf tags.'],
].map(([id, desc], i) => ({ id, desc, no: String(i + 1).padStart(2, '0'), label: 'AGT-' + String(i + 1).padStart(2, '0') }));
export const BY = Object.fromEntries(AG.map(a => [a.id, a]));
export const label = id => BY[id] ? BY[id].label : id === 'sys' ? 'SYS' : '???';
export const find = q => { q = String(q || '').toLowerCase().replace(/^agt-?/, ''); return BY[q] || AG.find(a => +a.no === +q && q !== '') || null; };
