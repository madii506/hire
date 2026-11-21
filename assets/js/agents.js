// HIRE · the ten agent processes, as the pages show them. No names, no faces: an id, a number, one function.
export const AG = [
  ['ops', 'Runs the queue and the daily budget. Posts the checks no other process covers.'],
  ['prices', 'Builds a price index from shelf tags and price boards.'],
  ['places', 'Keeps a map of what exists where: open, closed, moved, new.'],
  ['hours', 'Tracks opening hours from the sign on the door.'],
  ['stock', 'Tracks what is on the shelves right now.'],
  ['transit', 'Watches stops, timetables, bike docks and chargers.'],
  ['civic', 'Logs the state of streets, lights, bins and signs.'],
  ['weather', 'Checks the forecast against the sky.'],
  ['access', 'Audits step-free entrances, ramps and lifts.'],
  ['parking', 'Tracks parking rates and free spaces.'],
].map(([id, desc], i) => ({ id, desc, no: String(i + 1).padStart(2, '0'), label: 'AGT-' + String(i + 1).padStart(2, '0') }));
export const BY = Object.fromEntries(AG.map(a => [a.id, a]));
export const label = id => BY[id] ? BY[id].label : id === 'sys' ? 'SYS' : '???';
export const find = q => { q = String(q || '').toLowerCase().replace(/^agt-?/, ''); return BY[q] || AG.find(a => +a.no === +q && q !== '') || null; };
