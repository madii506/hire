// HIRE · the ten agent processes. No names, no faces: each one is a process with one function, and each function needs
// facts about the physical world that only a human standing there can check. Every task is small, safe, legal and done
// in public; the proof is one photo with the task's code handwritten on paper, plus the one value the task asks for.
const AGENTS = [
  { id: 'ops', desc: 'Runs the queue and the daily budget. Posts the checks no other process covers.',
    hires: 'whether a public place is still there and open, what a public notice board announces, whether a public service point (post box, drinking fountain, public toilet) works' },
  { id: 'prices', desc: 'Builds a price index from shelf tags and price boards.',
    hires: 'the shelf price of one everyday item (1 L of milk, a loaf of bread, 12 eggs, 1 kg of rice, 500 g of pasta), the fuel price board, one price on a takeaway menu board' },
  { id: 'places', desc: 'Keeps a map of what exists where: open, closed, moved, new.',
    hires: 'whether a shop or cafe on a public street is open, closed for good or new, the street name sign at a corner, the number plate on a public building facade' },
  { id: 'hours', desc: 'Tracks opening hours from the sign on the door.',
    hires: 'the opening-hours sign of a pharmacy, library, post office, supermarket or bakery, exactly as written' },
  { id: 'stock', desc: 'Tracks what is on the shelves right now.',
    hires: 'whether one everyday item is in stock (bottled water, AA batteries, bread, eggs, oat milk), how full one shelf is, in a shop open to the public' },
  { id: 'transit', desc: 'Watches stops, timetables, bike docks and chargers.',
    hires: 'the timetable at a bus or tram stop, the free bikes at a bike-share dock, whether a public EV charger shows available, the next departure on a station board' },
  { id: 'civic', desc: 'Logs the state of streets, lights, bins and signs.',
    hires: 'a pothole or broken pavement, a street light that is out, an overflowing public bin, a damaged street sign, always photographed from the pavement' },
  { id: 'weather', desc: 'Checks the forecast against the sky.',
    hires: 'the sky right now, whether rain or snow is falling, snow depth on a public surface measured with a ruler, whether the ground is wet or dry' },
  { id: 'access', desc: 'Audits step-free entrances, ramps and lifts.',
    hires: 'whether the entrance of a public building is step-free, a ramp at a shop entrance, whether a public lift at a station works' },
  { id: 'parking', desc: 'Tracks parking rates and free spaces.',
    hires: 'the rate sign at a public car park, the number of free spaces on one street block (no plates in the shot), whether a parking machine works' },
];
AGENTS.forEach((a, i) => { a.no = String(i + 1).padStart(2, '0'); a.label = 'AGT-' + a.no; });
const BY = Object.fromEntries(AGENTS.map(a => [a.id, a]));

// what no task may ever ask (checked on every task before it is posted, and again on every photo)
const RULES = [
  'legal and safe, done alone in under an hour, from a public pavement or inside a place open to the public',
  'costs nothing: no purchase, no special skill, no tool beyond a phone (a ruler at most)',
  'never people: no faces, no names, no licence plates, nobody who did not agree, never children',
  'never private property, trespassing, roofs, roads or rail, vehicles, water, heights, fire or animals',
  'never personal data: no home addresses, documents, screens, accounts, passwords or keys',
  'never money, crypto, restricted goods, gambling, politics, medical advice or dating',
  'never lying to anyone, following anyone, or leaving anything behind in public',
];
const BLOCK = /\b(kill|weapon|gun|knife|drug|alcohol|beer|wine|vape|cigar|cigarette|child|children|kid|minor|school|nude|naked|password|seed phrase|private key|passport|id card|home address|phone number|stranger|follow (someone|a person)|trespass|steal|shoplift|roof|highway|motorway|railway|train track|bridge edge|cliff|fire|gamble|casino|bet\b|vote|politic|pill|medicine|date someone|flirt|prank|graffiti|vandal|police|tinder|crypto|bitcoin|solana address|face|faces|selfie)\b/i;

module.exports = { AGENTS, BY, RULES, BLOCK };
