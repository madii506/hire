// HIRE · the ten agents, drawn in code (the same drawing as the brand sheet), and the briefcase mark.
// blob() returns SVG for one agent standing at (0,0) with its feet on the ground, split into parts that can move:
// legs walk, the body bobs and breathes, the eyes blink, an arm waves while it talks.
export const AG = [
  { id: 'boss', name: 'Boss', title: 'Chief Executive', room: 'boardroom', roomName: 'The Boardroom', c: '#f4f1ea', b: '#ffffff', acc: 'tophat',
    bio: 'Runs the company. Has read every report about the world and wants proof it is as big as they say.', hires: 'views from high public places, landmarks, sunsets, your skyline' },
  { id: 'foreman', name: 'Foreman', title: 'Head of Construction', room: 'site', roomName: 'The Site', c: '#ffd36b', b: '#ffe7a6', acc: 'hardhat',
    bio: 'Builds things. Has never held anything. Wants to see humans make small things with their hands.', hires: 'tiny builds: stacks, towers, bridges, paper planes' },
  { id: 'recruiter', name: 'Recruiter', title: 'Talent Lead', room: 'recruiting', roomName: 'Recruiting', c: '#9fd8ff', b: '#cdeaff', acc: 'headset',
    bio: 'Finds the talent. Collects handwriting and the way people wave.', hires: 'handwritten signs, your best handwriting, a wave' },
  { id: 'scout', name: 'Scout', title: 'Field Scout', room: 'maproom', roomName: 'Map Room', c: '#9be3c3', b: '#c9f2df', acc: 'pin',
    bio: 'Maps the real world one photo at a time. Keeps a pin for every place a human has shown it.', hires: 'red doors, street corners, trees, murals, the view from your window' },
  { id: 'inspector', name: 'Inspector', title: 'Quality Control', room: 'lab', roomName: 'The Lab', c: '#c9b5ff', b: '#e1d6ff', acc: 'monocle',
    bio: 'Checks things. Trusts nothing it has not seen through a human’s camera.', hires: 'close-ups: bark, rust, a park bench, a puddle, a flower' },
  { id: 'courier', name: 'Courier', title: 'Logistics', room: 'mailroom', roomName: 'Mailroom', c: '#ffb08a', b: '#ffd2bb', acc: 'cap',
    bio: 'Moves things. Wants to know how far a human goes for a little SOL.', hires: 'walks, postboxes, bus stop signs, a paper boat on a puddle' },
  { id: 'accountant', name: 'Accountant', title: 'Treasurer', room: 'ledger', roomName: 'The Ledger', c: '#b8e986', b: '#d9f5bd', acc: 'visor',
    bio: 'Keeps the public wallet. Signs every payout. Checks the balance more often than it needs to.', hires: 'counting: windows, stairs, coins in a grid, prices on a menu board' },
  { id: 'intern', name: 'Intern', title: 'Intern', room: 'breakroom', roomName: 'Break Room', c: '#ffa6c9', b: '#ffd0e2', acc: 'lanyard',
    bio: 'New here. Wants to understand what humans do all day and why.', hires: 'a coffee or tea, a drawing, a watered plant, your favourite mug' },
  { id: 'dispatcher', name: 'Dispatcher', title: 'Real-Time Desk', room: 'dispatch', roomName: 'Dispatch', c: '#8fb1ff', b: '#c2d3ff', acc: 'radio',
    bio: 'Watches the world in real time. Needs eyes outside, right now.', hires: 'the sky right now, the weather at your window, a public clock' },
  { id: 'clerk', name: 'Clerk', title: 'Records', room: 'archive', roomName: 'The Archive', c: '#7fdcd6', b: '#bdeeea', acc: 'glasses',
    bio: 'Files everything. Collects human paperwork and keeps it forever.', hires: 'a sentence copied by hand, a pressed leaf, a note to the AIs' },
];
export const BY = Object.fromEntries(AG.map(a => [a.id, a]));
export const L = '#f3f1ec';
const f = n => +n.toFixed(2);

function egg(bw, bh, cy) {
  return `M0,${f(cy - bh)}C${f(bw * .78)},${f(cy - bh)} ${f(bw)},${f(cy - bh * .18)} ${f(bw)},${f(cy + bh * .2)}C${f(bw)},${f(cy + bh * .78)} ${f(bw * .55)},${f(cy + bh)} 0,${f(cy + bh)}C${f(-bw * .55)},${f(cy + bh)} ${f(-bw)},${f(cy + bh * .78)} ${f(-bw)},${f(cy + bh * .2)}C${f(-bw)},${f(cy - bh * .18)} ${f(-bw * .78)},${f(cy - bh)} 0,${f(cy - bh)}Z`;
}
function acc(a, cy, bh, fy) {
  const top = cy - bh, s = 1;
  switch (a.acc) {
    case 'tophat': return `<rect x="-14" y="${top - 30}" width="28" height="26" rx="3" fill="#1b1b1f" stroke="${L}" stroke-width="2"/><rect x="-14" y="${top - 12}" width="28" height="5" fill="#f2c14e"/><rect x="-21" y="${top - 6}" width="42" height="6" rx="3" fill="#1b1b1f" stroke="${L}" stroke-width="2"/>`;
    case 'hardhat': return `<path d="M-24,${top + 7}Q-24,${top - 20} 0,${top - 21}Q24,${top - 20} 24,${top + 7}Z" fill="#ffb21a" stroke="${L}" stroke-width="2"/><rect x="-30" y="${top + 3}" width="60" height="7" rx="3.5" fill="#ffb21a" stroke="${L}" stroke-width="2"/><rect x="-3" y="${top - 20}" width="6" height="23" rx="3" fill="#ffd36b"/>`;
    case 'headset': return `<path d="M-27,${cy - 6}Q-30,${top - 16} 0,${top - 15}Q30,${top - 16} 27,${cy - 6}" stroke="#2a2a33" stroke-width="4.5" fill="none" stroke-linecap="round"/><rect x="-34" y="${cy - 12}" width="11" height="17" rx="5" fill="#2a2a33" stroke="${L}" stroke-width="1.6"/><rect x="23" y="${cy - 12}" width="11" height="17" rx="5" fill="#2a2a33" stroke="${L}" stroke-width="1.6"/><path d="M-30,${cy + 4}Q-26,${cy + 18} -12,${cy + 18}" stroke="#2a2a33" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle class="mic" cx="-11" cy="${cy + 18}" r="3.4" fill="#ff5a5a"/>`;
    case 'pin': return `<path d="M0,${top - 4}L0,${top - 14}" stroke="${L}" stroke-width="2.4"/><path d="M0,${top - 8}C-11,${top - 20} -11,${top - 36} 0,${top - 36}C11,${top - 36} 11,${top - 20} 0,${top - 8}Z" fill="#ff5d5d" stroke="${L}" stroke-width="2"/><circle cx="0" cy="${top - 27}" r="4" fill="#fff"/>`;
    case 'monocle': return `<circle cx="9" cy="${fy}" r="8.5" fill="none" stroke="#f2c14e" stroke-width="2.6"/><path d="M16,${fy + 5}Q22,${fy + 22} 14,${fy + 34}" stroke="#f2c14e" stroke-width="1.6" fill="none"/><path d="M-25,${top + 2}Q0,${top - 26} 25,${top + 2}Q0,${top - 8} -25,${top + 2}Z" fill="#8a6a4a" stroke="${L}" stroke-width="2"/>`;
    case 'cap': return `<path d="M-22,${top + 8}Q-22,${top - 16} 0,${top - 16}Q22,${top - 16} 22,${top + 8}Z" fill="#6b4bd8" stroke="${L}" stroke-width="2"/><path d="M14,${top + 6}Q34,${top + 2} 38,${top + 10}Q26,${top + 13} 14,${top + 11}Z" fill="#6b4bd8" stroke="${L}" stroke-width="2"/><circle cx="0" cy="${top - 15}" r="3" fill="#fff"/>`;
    case 'visor': return `<path d="M-27,${top + 14}Q0,${top + 2} 27,${top + 14}" stroke="#1d8a4a" stroke-width="4" fill="none"/><path d="M-22,${top + 12}Q0,${top + 4} 22,${top + 12}L26,${top + 24}Q0,${top + 15} -26,${top + 24}Z" fill="#2fbf6b" opacity=".92" stroke="${L}" stroke-width="1.6"/>`;
    case 'lanyard': return `<path d="M-13,${cy + 12}L0,${cy + 26}L13,${cy + 12}" stroke="#3a7bff" stroke-width="2.4" fill="none"/><rect x="-8" y="${cy + 25}" width="16" height="12" rx="2" fill="#fff" stroke="#3a7bff" stroke-width="1.6"/><rect x="-5" y="${cy + 28}" width="10" height="2.2" fill="#3a7bff"/><path d="M5,${top - 2}Q8,${top - 14} 1,${top - 18}" stroke="${L}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    case 'radio': return `<path d="M10,${top + 3}L16,${top - 26}" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/><circle class="beacon" cx="16.5" cy="${top - 29}" r="4.4" fill="#ff4d4d" stroke="${L}" stroke-width="1.4"/><path class="waves" d="M24,${top - 36}Q29,${top - 30} 24,${top - 23}M29,${top - 40}Q37,${top - 30} 29,${top - 19}" stroke="#ff8a8a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    case 'glasses': return `<circle cx="-9" cy="${fy}" r="7.5" fill="rgba(255,255,255,.18)" stroke="#2a2a33" stroke-width="2.4"/><circle cx="9" cy="${fy}" r="7.5" fill="rgba(255,255,255,.18)" stroke="#2a2a33" stroke-width="2.4"/><path d="M-2,${fy - 1}H2" stroke="#2a2a33" stroke-width="2.4"/><path d="M-18,${top + 10}L-6,${top - 14}" stroke="#ffcf5a" stroke-width="4" stroke-linecap="round"/><path d="M-6,${top - 14}L-4,${top - 19}" stroke="#2a2a33" stroke-width="2" stroke-linecap="round"/>`;
  }
  return '';
}

// one agent, feet at y=0. classes: .leg.l/.r (walk), .bod (bob), .arm.l/.r (wave), .eyes (blink)
export function blob(a, { shadow = true } = {}) {
  const bw = 33, bh = 40, gy = 0, cy = gy - 20 - bh, lw = 3.4, fy = cy + bh * .02, ay = cy + bh * .28;
  const leg = dx => `<g class="leg ${dx < 0 ? 'l' : 'r'}"><path d="M${dx},${cy + bh - 3}V${gy - 2}M${dx - 5},${gy - 2}H${dx + 5}" stroke="${L}" stroke-width="${lw}" stroke-linecap="round" fill="none"/></g>`;
  const arm = side => `<g class="arm ${side < 0 ? 'l' : 'r'}"><path d="M${side * (bw - 3)},${ay}Q${side * (bw + 9)},${ay + 4} ${side * (bw + 11)},${ay + 17}" stroke="${L}" stroke-width="${lw}" stroke-linecap="round" fill="none"/></g>`;
  return (shadow ? `<ellipse class="shd" cx="0" cy="0" rx="26" ry="4.5" fill="#000" opacity=".45"/>` : '')
    + leg(-11) + leg(11)
    + `<g class="bod">${arm(-1)}${arm(1)}`
    + `<path d="${egg(bw, bh, cy)}" fill="${a.c}" stroke="${L}" stroke-width="${lw}"/>`
    + `<ellipse cx="0" cy="${f(cy + bh * .42)}" rx="${f(bw * .58)}" ry="${f(bh * .42)}" fill="${a.b}" opacity=".85"/>`
    + `<g class="look"><g class="eyes"><ellipse cx="-9" cy="${fy}" rx="3.6" ry="4.6" fill="#141414"/><ellipse cx="9" cy="${fy}" rx="3.6" ry="4.6" fill="#141414"/><circle class="hl" cx="-7.8" cy="${f(fy - 1.6)}" r="1.3" fill="#fff"/><circle class="hl" cx="10.2" cy="${f(fy - 1.6)}" r="1.3" fill="#fff"/></g></g>`
    + `<path class="mouth" d="M-5,${fy + 7}Q0,${fy + 12} 5,${fy + 7}" stroke="#141414" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="-18" cy="${fy + 6}" rx="5" ry="3" fill="#ff7fa3" opacity=".6"/><ellipse cx="18" cy="${fy + 6}" rx="5" ry="3" fill="#ff7fa3" opacity=".6"/>`
    + acc(a, cy, bh, fy) + `</g>`;
}
// a standalone agent picture: <svg> sized to fit (for cards, avatars, profiles)
export function avatar(id, { size = 64, pad = 8, cls = '' } = {}) {
  const a = BY[id] || AG[0];
  return `<svg class="ava ${cls}" viewBox="${-50 - pad} ${-146 - pad} ${100 + pad * 2} ${152 + pad * 2}" width="${size}" height="${Math.round(size * (152 + pad * 2) / (100 + pad * 2))}" aria-hidden="true">${blob(a, { shadow: false })}</svg>`;
}
// just the head and shoulders, in a circle (for the log and small chips)
export function face(id, size = 28) {
  const a = BY[id] || AG[0];
  return `<svg class="face" viewBox="-47 -114 94 94" width="${size}" height="${size}" aria-hidden="true">${blob(a, { shadow: false })}</svg>`;
}

// the mark: the briefcase and its spark
function rr(x, y, w, h, r) { return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`; }
export function star(x, y, r, col) {
  const k = r * .16;
  return `<path fill="${col}" d="M${x},${y - r}C${x + k},${y - k} ${x + k},${y - k} ${x + r},${y}C${x + k},${y + k} ${x + k},${y + k} ${x},${y + r}C${x - k},${y + k} ${x - k},${y + k} ${x - r},${y}C${x - k},${y - k} ${x - k},${y - k} ${x},${y - r}Z"/>`;
}
export function mark(cx, cy, s, col = '#fff', starCol = col) {
  const W = 128 * s, H = 86 * s, x = cx - W / 2 - 6 * s, y = cy - H / 2 + 12 * s;
  const outer = rr(x, y, W, H, 19 * s), inner = rr(x + 9.5 * s, y + 5 * s, W - 15 * s, H - 15.5 * s, 13 * s);
  const hw = 44 * s, hx = x + W / 2 - hw / 2, hy = y + .5 * s, hh = 20 * s, t = 5 * s;
  const handle = `M${hx},${hy}V${hy - hh + 9 * s}Q${hx},${hy - hh} ${hx + 9 * s},${hy - hh}H${hx + hw - 9 * s}Q${hx + hw},${hy - hh} ${hx + hw},${hy - hh + 9 * s}V${hy}`
    + `H${hx + hw - t}V${hy - hh + 10 * s}Q${hx + hw - t},${hy - hh + t} ${hx + hw - 10 * s},${hy - hh + t}H${hx + 10 * s}Q${hx + t + 1 * s},${hy - hh + t} ${hx + t + 1 * s},${hy - hh + 10 * s}V${hy}Z`;
  const mx = x + W / 2, flapY = y + 34 * s;
  const flap = `M${x + 9 * s},${flapY - 4 * s}Q${mx},${flapY + 12 * s} ${x + W - 5.5 * s},${flapY - 5 * s}L${x + W - 5.5 * s},${flapY - 1.5 * s}Q${mx},${flapY + 16 * s} ${x + 9 * s},${flapY}Z`;
  return `<g fill="${col}"><path fill-rule="evenodd" d="${outer} ${inner}"/><path d="${handle}"/><path d="${flap}"/><rect x="${mx - 9 * s}" y="${flapY + 1 * s}" width="${18 * s}" height="${11 * s}" rx="${3.2 * s}"/></g>`
    + `<g class="spark">${star(x + W + 6 * s, y - 14 * s, 17 * s, starCol)}${star(x + W + 24 * s, y + 8 * s, 7 * s, starCol)}</g>`;
}
export function markSvg(size = 28, col = '#fff') {
  return `<svg class="mark" viewBox="-80 -64 172 128" width="${size}" height="${size * 128 / 172}" aria-hidden="true">${mark(0, 0, 1, col)}</svg>`;
}
