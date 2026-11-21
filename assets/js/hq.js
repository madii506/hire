// HIRE HQ · the building the ten agents work in, drawn as a cutaway at night on the horizon. Every line in the live log
// is played here: the speaker takes the stairs to whoever they are talking to, a bubble opens, a job card goes up on
// the board in the lobby, the Accountant walks down to the vault and the coins leave the building. Nothing here is
// invented: the bubbles are the log, the cards are the open jobs, the number on the vault is the wallet's balance.
import { AG, BY, blob, L, star, mark } from './blob.js?v=2';
import { pointer } from './eyes.js?v=2';
const LINE = L;
const markMini = () => mark(0, 0, 1, '#fff', '#f6d58a');

const NS = 'http://www.w3.org/2000/svg';
const ROOMNAME = { boardroom: 'The Boardroom', ledger: 'The Ledger', recruiting: 'Recruiting', lab: 'The Lab', archive: 'The Archive', maproom: 'Map Room',
  breakroom: 'Break Room', mailroom: 'Mailroom', dispatch: 'Dispatch', site: 'The Site', board: 'Lobby · Job Board', vault: 'The Vault' };
const OWNER = Object.fromEntries(AG.map(a => [a.room, a.id]));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let seed = 11; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- the floor plans (wide screens and phones)
function plan(mode) {
  if (mode === 'wide') {
    const W = 1200, H = 850, FH = 128, G = 690, bx0 = 112, sx = 206, bx1 = 978;
    const lv = [G + FH, G, G - FH, G - 2 * FH, G - 3 * FH, G - 4 * FH];
    const w3 = (bx1 - sx) / 3, w2 = (bx1 - sx) / 2;
    return { mode, W, H, FH, G, bx0, sx, bx1, lv, s: .6, roof: 5, out: { l: [0, bx0], r: [bx1, W] }, R: {
      vault: [0, sx, bx1], board: [1, sx, bx1], site: [1, 1000, 1190],
      maproom: [2, sx, sx + w3], breakroom: [2, sx + w3, sx + 2 * w3], mailroom: [2, sx + 2 * w3, bx1],
      recruiting: [3, sx, sx + w3], lab: [3, sx + w3, sx + 2 * w3], archive: [3, sx + 2 * w3, bx1],
      boardroom: [4, sx, sx + w2], ledger: [4, sx + w2, bx1], dispatch: [5, 560, 820] } };
  }
  const W = 640, FH = 124, bx0 = 12, sx = 90, bx1 = 628, G = 822;
  const lv = [G + FH, G, G - FH, G - 2 * FH, G - 3 * FH, G - 4 * FH, G - 5 * FH];
  const w2 = (bx1 - sx) / 2;
  return { mode, W, H: G + FH + 26, FH, G, bx0, sx, bx1, lv, s: .56, roof: 6, out: null, R: {
    vault: [0, sx, bx1], board: [1, sx, sx + w2 + 50], site: [1, sx + w2 + 50, bx1],
    breakroom: [2, sx, sx + w2], mailroom: [2, sx + w2, bx1], archive: [3, sx, sx + w2], maproom: [3, sx + w2, bx1],
    recruiting: [4, sx, sx + w2], lab: [4, sx + w2, bx1], boardroom: [5, sx, sx + w2], ledger: [5, sx + w2, bx1], dispatch: [6, 230, 470] } };
}
const room = (P, id) => { const r = P.R[id] || P.R.board; return { lv: r[0], x0: r[1], x1: r[2], y: P.lv[r[0]], w: r[2] - r[1] }; };
// where an agent likes to stand in a room
function spot(P, id, agent, k = 0) {
  const r = room(P, id), home = OWNER[id] === agent;
  const base = { board: .32, vault: .62, site: .55, dispatch: .62 }[id] || (home ? .6 : .38);
  return clamp(r.x0 + r.w * base + (home ? 0 : k * 44), r.x0 + 30, r.x1 - 30);
}

// ---------------------------------------------------------------- drawing
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const ln = (d, col = L, w = 2, extra = '') => `<path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const shape = (d, fill, sw = 2, extra = '') => `<path d="${d}" fill="${fill}" stroke="${L}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
function windowAt(x, y, w, h) {
  return `<g class="win">${rect(x, y, w, h, '#0a0c1a', `stroke="${L}" stroke-width="2" rx="3"`)}${ln(`M${x + w / 2},${y + 2}V${y + h - 2}M${x + 2},${y + h * .55}H${x + w - 2}`, L, 1.4, 'opacity=".55"')}`
    + `${star(x + w * .28, y + h * .3, 2.6, '#f6d58a')}${star(x + w * .76, y + h * .22, 1.8, '#fff')}</g>`;
}
function lamp(x, top, len, h) {
  const y = top + len;
  return `<g class="lamp">${ln(`M${x},${top}V${y}`, L, 1.4, 'opacity=".6"')}<polygon class="cone" points="${x - 9},${y + 7} ${x + 9},${y + 7} ${x + 58},${top + h} ${x - 58},${top + h}" fill="url(#cone)"/>`
    + shape(`M${x - 11},${y + 8}L${x - 6},${y}H${x + 6}L${x + 11},${y + 8}Z`, '#2a2a33', 1.6) + `<circle class="bulb" cx="${x}" cy="${y + 9}" r="3" fill="#ffd77a"/></g>`;
}
function plant(x, y, k = 1) {
  return `<g transform="translate(${x},${y}) scale(${k})">${shape('M-9,0L-11,-16H11L9,0Z', '#b0643a', 1.8)}${shape('M0,-16C-14,-24 -16,-40 -4,-44C-2,-34 0,-26 0,-16Z', '#3fbf7f', 1.6)}${shape('M0,-16C12,-26 18,-38 8,-48C3,-38 1,-28 0,-16Z', '#2fa56b', 1.6)}${shape('M0,-16C-2,-30 2,-44 0,-54C6,-44 6,-28 0,-16Z', '#55d08f', 1.6)}</g>`;
}
function sign(x, y, text, k = 1) {
  const w = text.length * 7.4 * k + 18 * k;
  return `<g class="sign" transform="translate(${x},${y})">${ln(`M${6 * k},${-10 * k}V0M${w - 6 * k},${-10 * k}V0`, L, 1.2, 'opacity=".5"')}`
    + `${rect(0, 0, w, 19 * k, '#16161c', `stroke="${L}" stroke-width="1.4" rx="${4 * k}" opacity=".95"`)}<text x="${w / 2}" y="${14 * k}" text-anchor="middle" class="rn" font-size="${13 * k}">${esc(text)}</text></g>`;
}
function props(id, r, P) {
  const { x0, w, y } = r, top = y - P.FH + 8, o = [], N = P.mode === 'narrow';
  const X = f => x0 + w * f;
  switch (id) {
    case 'boardroom':
      o.push(windowAt(X(.06), top + 26, 58, 46));
      o.push(`<g>${rect(X(.66), top + 24, 74, 50, '#14141a', `stroke="${L}" stroke-width="2" rx="3"`)}${ln(`M${X(.66) + 8},${top + 64}L${X(.66) + 24},${top + 52}L${X(.66) + 38},${top + 58}L${X(.66) + 62},${top + 34}`, '#59e39a', 2.6)}${ln(`M${X(.66) + 56},${top + 34}H${X(.66) + 63}V${top + 41}`, '#59e39a', 2.6)}</g>`);
      o.push(shape(`M${X(.26)},${y - 40}H${X(.74)}V${y - 33}H${X(.26)}Z`, '#5c3b22', 2));
      o.push(ln(`M${X(.3)},${y - 33}V${y}M${X(.7)},${y - 33}V${y}`, L, 2.4));
      for (const f of [.3, .44, .58]) o.push(shape(`M${X(f)},${y}V${y - 26}H${X(f) + 14}`, 'none', 2.2));
      break;
    case 'ledger':
      o.push(windowAt(X(.72), top + 24, 50, 44));
      o.push(`<g>${rect(X(.1), top + 20, 62, 56, '#0f2a1d', `stroke="${L}" stroke-width="2" rx="3"`)}${[0, 1, 2, 3, 4].map(i => rect(X(.1) + 8 + i * 10, top + 64 - (i * 7 + 8) % 34 - 6, 7, (i * 7 + 8) % 34 + 6, '#59e39a', 'opacity=".85"')).join('')}</g>`);
      o.push(shape(`M${X(.36)},${y - 36}H${X(.66)}V${y - 30}H${X(.36)}Z`, '#5c3b22', 2) + ln(`M${X(.39)},${y - 30}V${y}M${X(.63)},${y - 30}V${y}`, L, 2.2));
      o.push(shape(`M${X(.43)},${y - 36}L${X(.45)},${y - 44}H${X(.59)}L${X(.6)},${y - 36}Z`, '#efe8d8', 1.6));
      o.push(`<g transform="translate(${X(.84)},${y})">${shape('M-10,0V-46H10V0', 'none', 2)}${[0, 1, 2, 3].map(i => ln(`M-10,${-10 - i * 10}H10`, L, 1, 'opacity=".6"') + `<circle cx="${-5 + (i * 7) % 12}" cy="${-10 - i * 10}" r="3" fill="#f2c14e"/>`).join('')}</g>`);
      break;
    case 'recruiting':
      o.push(`<g class="banner">${ln(`M${X(.16)},${top + 8}Q${X(.5)},${top + 22} ${X(.84)},${top + 8}`, L, 1.2, 'opacity=".6"')}<text x="${X(.5)}" y="${top + 34}" text-anchor="middle" class="hand" font-size="${N ? 18 : 17}" fill="#ffd36b">we're hiring!</text></g>`);
      for (let i = 0; i < 4; i++) { const nx = X(.12) + i * (w * .2), ny = top + 44 + (i % 2) * 6; o.push(`<g transform="rotate(${(i % 2 ? 4 : -5)} ${nx + 12} ${ny})">${rect(nx, ny, 24, 26, '#efe8d8', 'rx="2"')}${ln(`M${nx + 5},${ny + 9}q4,-3 7,0t7,0M${nx + 5},${ny + 16}q4,-3 7,0`, '#333', 1.2)}<circle cx="${nx + 12}" cy="${ny + 2}" r="2.2" fill="#ff5d5d"/></g>`); }
      o.push(shape(`M${X(.5)},${y - 32}H${X(.86)}V${y}H${X(.5)}Z`, '#3a3d46', 2));
      o.push(plant(X(.12), y, .8));
      break;
    case 'lab':
      o.push(shape(`M${X(.1)},${y - 34}H${X(.6)}V${y - 28}H${X(.1)}Z`, '#d9dde6', 2) + ln(`M${X(.14)},${y - 28}V${y}M${X(.56)},${y - 28}V${y}`, L, 2.2));
      o.push(shape(`M${X(.18)},${y - 34}V${y - 46}L${X(.18) - 8},${y - 58}H${X(.18) + 8}Z`, '#9be3c3', 1.6));
      o.push(shape(`M${X(.3)},${y - 34}V${y - 54}H${X(.3) + 10}V${y - 34}Z`, '#c9b5ff', 1.6));
      o.push(`<g class="bubbling">${shape(`M${X(.44)},${y - 34}L${X(.44) - 10},${y - 34}L${X(.44) - 4},${y - 50}V${y - 58}H${X(.44) + 4}V${y - 50}L${X(.44) + 10},${y - 34}Z`, '#ffb08a', 1.6)}<circle cx="${X(.44)}" cy="${y - 64}" r="2" fill="#ffd2bb"/><circle cx="${X(.44) + 3}" cy="${y - 72}" r="1.5" fill="#ffd2bb"/></g>`);
      o.push(`<g>${rect(X(.7), top + 20, 52, 58, '#16161c', `stroke="${L}" stroke-width="2" rx="3"`)}<text x="${X(.7) + 26}" y="${top + 58}" text-anchor="middle" class="hand" font-size="26" fill="#c9b5ff">7/10</text></g>`);
      break;
    case 'archive':
      for (let i = 0; i < 3; i++) { const cx = X(.52) + i * 30; o.push(shape(`M${cx},${y}V${y - 70}H${cx + 26}V${y}Z`, '#3a3d46', 2)); for (let d = 0; d < 3; d++) o.push(ln(`M${cx + 4},${y - 22 - d * 22}H${cx + 22}M${cx + 10},${y - 14 - d * 22}H${cx + 16}`, L, 1.4, 'opacity=".7"')); }
      for (let i = 0; i < 5; i++) o.push(rect(X(.14), y - 6 - i * 6, 34, 5, i % 2 ? '#efe8d8' : '#e2d6bc', `stroke="${L}" stroke-width=".8"`));
      o.push(windowAt(X(.12), top + 22, 44, 40));
      break;
    case 'maproom':
      o.push(`<g>${rect(X(.16), top + 18, w * .58, 60, '#16324a', `stroke="${L}" stroke-width="2" rx="4"`)}`
        + shape(`M${X(.2)},${top + 34}q10,-10 24,-4t18,10q-6,12 -20,10t-22,-16Z`, '#3fae7d', 1.2)
        + shape(`M${X(.42)},${top + 30}q14,-8 30,0t10,18q-12,8 -24,4t-16,-22Z`, '#3fae7d', 1.2)
        + shape(`M${X(.58)},${top + 52}q8,-6 16,0t2,14q-10,4 -18,-14Z`, '#3fae7d', 1.2)
        + [[.27, 36], [.47, 40], [.63, 56], [.36, 58]].map(([f, yy]) => `<circle class="pin" cx="${X(f)}" cy="${top + yy}" r="3.4" fill="#ff5d5d" stroke="${L}" stroke-width="1"/>`).join('') + '</g>');
      o.push(`<g transform="translate(${X(.84)},${y})">${ln('M0,0V-30M-8,0H8', L, 2.2)}<circle cx="0" cy="-42" r="13" fill="#16324a" stroke="${L}" stroke-width="2"/>${ln('M-13,-42H13M0,-55Q-8,-42 0,-29Q8,-42 0,-55', L, 1.2, 'opacity=".7"')}</g>`);
      break;
    case 'breakroom':
      o.push(`<g transform="translate(${X(.14)},${y})">${shape('M0,0V-34H34V0', '#3a3d46', 2)}${shape('M2,-34V-64H32V-34', '#6b7080', 2)}${rect(8, -58, 18, 9, '#0f2a1d')}${shape('M12,-34V-42H22V-34', '#efe8d8', 1.4)}`
        + `<g class="steam">${ln('M14,-68q-4,-6 0,-12t0,-12', L, 1.6, 'opacity=".55"')}${ln('M20,-70q4,-6 0,-12t0,-12', L, 1.6, 'opacity=".45"')}</g></g>`);
      o.push(shape(`M${X(.46)},${y}V${y - 22}H${X(.86)}V${y}M${X(.46)},${y - 22}V${y - 40}Q${X(.46)},${y - 44} ${X(.5)},${y - 44}H${X(.82)}Q${X(.86)},${y - 44} ${X(.86)},${y - 40}V${y - 22}`, '#7a4b8a', 2));
      o.push(plant(X(.92), y, .7));
      o.push(windowAt(X(.5), top + 18, 50, 40));
      break;
    case 'mailroom':
      o.push(`<g>${rect(X(.12), top + 16, 74, 62, '#5c3b22', `stroke="${L}" stroke-width="2" rx="2"`)}${[1, 2].map(i => ln(`M${X(.12)},${top + 16 + i * 20.7}H${X(.12) + 74}`, L, 1.4)).join('')}${[1, 2, 3].map(i => ln(`M${X(.12) + i * 18.5},${top + 16}V${top + 78}`, L, 1.4)).join('')}`
        + [[0, 0], [2, 1], [1, 2], [3, 0]].map(([c, r2]) => rect(X(.12) + 4 + c * 18.5, top + 22 + r2 * 20.7, 11, 9, '#efe8d8')).join('') + '</g>');
      for (const [f, s2, h2] of [[.6, 30, 22], [.7, 24, 18], [.64, 20, 14]]) o.push(shape(`M${X(f)},${y - (f === .64 ? 22 : 0)}v${-h2}h${s2}v${h2}Z`, '#c8975a', 1.8) + ln(`M${X(f) + s2 / 2},${y - (f === .64 ? 22 : 0) - h2}v${h2}`, '#8a5a35', 2));
      break;
    case 'dispatch': {
      const hx0 = x0 + 8, hx1 = x0 + w - 8, ht = y - 96;
      o.push(shape(`M${hx0},${y}V${ht + 14}L${(hx0 + hx1) / 2},${ht - 10}L${hx1},${ht + 14}V${y}`, '#121218', 2.6));
      o.push(`<g class="tower">${ln(`M${hx1 - 40},${ht + 2}L${hx1 - 34},${ht - 70}L${hx1 - 28},${ht + 2}M${hx1 - 38},${ht - 20}H${hx1 - 30}M${hx1 - 36},${ht - 44}H${hx1 - 32}`, L, 2)}<circle class="blink" cx="${hx1 - 34}" cy="${ht - 74}" r="4.5" fill="#ff4d4d"/></g>`);
      o.push(`<g>${shape(`M${hx0 + 18},${y - 30}H${hx0 + 98}V${y}H${hx0 + 18}Z`, '#3a3d46', 2)}${[0, 1, 2].map(i => `<circle cx="${hx0 + 32 + i * 20}" cy="${y - 18}" r="5" fill="#16161c" stroke="${L}" stroke-width="1.4"/>`).join('')}${rect(hx0 + 26, y - 46, 48, 14, '#0f2a1d', `stroke="${L}" stroke-width="1.4" rx="2"`)}<path class="scope" d="M${hx0 + 28},${y - 39}l6,-4l6,6l6,-8l6,8l6,-4l6,2" stroke="#59e39a" stroke-width="1.4" fill="none"/></g>`);
      o.push(`<g class="clock">${rect(hx1 - 92, ht + 26, 64, 22, '#16161c', `stroke="${L}" stroke-width="1.6" rx="4"`)}<text class="mono clk" x="${hx1 - 60}" y="${ht + 42}" text-anchor="middle" font-size="13" fill="#ff8a8a">--:--</text></g>`);
      break;
    }
    case 'site': {
      const cx0 = x0 + 10;
      if (P.mode === 'wide') o.push(`<g class="crane">${ln(`M${cx0 + 30},${y}V${y - 190}M${cx0 + 20},${y}V${y - 180}M${cx0 + 20},${y - 180}L${cx0 + 30},${y - 190}`, '#ffb21a', 3)}${[0, 1, 2, 3, 4, 5].map(i => ln(`M${cx0 + 20},${y - 10 - i * 28}L${cx0 + 30},${y - 28 - i * 28}`, '#ffb21a', 1.6)).join('')}${ln(`M${cx0 - 4},${y - 190}H${cx0 + 168}`, '#ffb21a', 3.4)}${ln(`M${cx0 + 140},${y - 190}V${y - 120}`, L, 1.4)}${shape(`M${cx0 + 132},${y - 120}h16v12h-16Z`, '#3a3d46', 1.6)}</g>`);
      // a tower of 7 things, on the ground
      const tx = x0 + w * (P.mode === 'wide' ? .62 : .5);
      const blocks = [[34, 14, '#ff7a59'], [26, 12, '#9fd8ff'], [30, 10, '#ffd36b'], [20, 14, '#9be3c3'], [24, 9, '#c9b5ff'], [14, 12, '#ffa6c9'], [16, 8, '#efe8d8']];
      let by = y; for (const [bw, bh, col] of blocks) { by -= bh; o.push(rect(tx - bw / 2, by, bw, bh, col, `stroke="${L}" stroke-width="1.4" rx="2"`)); }
      for (const f of [.2, .86]) o.push(shape(`M${x0 + w * f - 8},${y}L${x0 + w * f},${y - 20}L${x0 + w * f + 8},${y}Z`, '#ff8a3d', 1.6) + ln(`M${x0 + w * f - 5},${y - 7}H${x0 + w * f + 5}`, '#fff', 2));
      break;
    }
    case 'board': {
      const bw = Math.min(260, w * .5), bx = x0 + w * .5 - bw / 2 + (P.mode === 'wide' ? 40 : 10), by = top + 14, bh = 66;
      o.push(`<g class="jobboard" data-go="/jobs">${rect(bx - 6, by - 6, bw + 12, bh + 12, '#5c3b22', `stroke="${L}" stroke-width="2.4" rx="5"`)}${rect(bx, by, bw, bh, '#b98a5a', 'rx="2"')}<g class="cards"></g>`
        + `<text class="hand bcount" x="${bx + bw / 2}" y="${by + bh + 26}" text-anchor="middle" font-size="15" fill="${L}">job board</text></g>`);
      o.push(shape(`M${X(.08)},${y}V${y - 30}H${X(.08) + 64}V${y}`, '#3a3d46', 2) + `<circle cx="${X(.08) + 46}" cy="${y - 34}" r="5" fill="#f2c14e" stroke="${L}" stroke-width="1.4"/>`);
      o.push(plant(x0 + w - 26, y, .85));
      break;
    }
    case 'vault': {
      const vx = x0 + w * .62, vy = y - 58;
      o.push(`<g class="vaultdoor">${`<circle cx="${vx}" cy="${vy}" r="50" fill="#26262c" stroke="${L}" stroke-width="3"/><circle cx="${vx}" cy="${vy}" r="40" fill="#30303a" stroke="${L}" stroke-width="1.6"/>`}`
        + `<g class="wheel">${[0, 60, 120].map(a => ln(`M${vx + Math.cos(a * Math.PI / 180) * 16},${vy + Math.sin(a * Math.PI / 180) * 16}L${vx - Math.cos(a * Math.PI / 180) * 16},${vy - Math.sin(a * Math.PI / 180) * 16}`, '#f2c14e', 3)).join('')}<circle cx="${vx}" cy="${vy}" r="6" fill="#f2c14e"/></g>`
        + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${vx + Math.cos(i * Math.PI / 4) * 45}" cy="${vy + Math.sin(i * Math.PI / 4) * 45}" r="2.2" fill="${L}"/>`).join('') + '</g>');
      const px = x0 + (P.mode === 'wide' ? 34 : 18), pw = P.mode === 'wide' ? 190 : 150;
      o.push(`<g class="vpanel">${rect(px, top + 18, pw, 54, '#0f1210', `stroke="${L}" stroke-width="2" rx="5"`)}<text class="rn" x="${px + 10}" y="${top + 34}" font-size="11" fill="#9aa39a">PUBLIC WALLET</text><text class="mono vbal" x="${px + 10}" y="${top + 60}" font-size="${P.mode === 'wide' ? 22 : 18}" fill="#f2c14e">— SOL</text></g>`);
      o.push('<g class="stacks"></g>');
      break;
    }
  }
  return o.join('');
}
function stairs(P) {
  const o = [], ex = P.bx0 + 14, lx = P.sx - 14;
  for (let i = 0; i < P.lv.length - 1; i++) {
    const a = P.lv[i], b = P.lv[i + 1], m = (a + b) / 2, n = 7;
    let d = `M${ex},${a}`; for (let k = 1; k <= n; k++) d += `H${ex + (lx - ex) * k / n}V${a - (a - m) * k / n}`;
    o.push(ln(d, L, 1.6, 'opacity=".5"'));
    d = `M${lx},${m}`; for (let k = 1; k <= n; k++) d += `H${lx - (lx - ex) * k / n}V${m - (m - b) * k / n}`;
    o.push(ln(d, L, 1.6, 'opacity=".5"'));
    o.push(ln(`M${lx + 2},${m}H${P.sx - 2}`, L, 2, 'opacity=".7"'));
  }
  return `<g class="stairs">${o.join('')}</g>`;
}
function building(P) {
  const o = [], { W, H, G, bx0, sx, bx1, lv, FH } = P, roofY = lv[P.roof], botY = lv[0];
  // sky stars
  seed = 11;
  for (let i = 0; i < (P.mode === 'wide' ? 46 : 34); i++) {
    const x = R() * W, y = R() * (G - 40);
    if (x > bx0 - 6 && x < bx1 + 6 && y > roofY - 110) continue;
    o.push(R() < .22 ? `<g class="tw" style="--d:${(R() * 4).toFixed(2)}s">${star(x, y, 2 + R() * 3.2, R() < .5 ? '#f6d58a' : '#ffffff')}</g>` : `<circle class="tw" style="--d:${(R() * 4).toFixed(2)}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.6 + R() * 1.1).toFixed(2)}" fill="#fff" opacity="${(.25 + R() * .5).toFixed(2)}"/>`);
  }
  // the seer: an eye in the sky that watches the building, and you
  { const wide = P.mode === 'wide', cx = wide ? 1092 : 566, cy = wide ? 112 : 96, r = wide ? 46 : 32;
    let veins = ''; seed = 3;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28 + R() * .5, x0 = Math.cos(a) * r, y0 = Math.sin(a) * r * .8, x1 = x0 * .55 + (R() - .5) * 8, y1 = y0 * .55 + (R() - .5) * 6; veins += `M${x0.toFixed(1)},${y0.toFixed(1)}Q${((x0 + x1) / 2 + (R() - .5) * 8).toFixed(1)},${((y0 + y1) / 2).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
    o.push(`<g class="seer" transform="translate(${cx},${cy})" data-r="${r}"><ellipse class="sglow" rx="${r * 2.6}" ry="${r * 1.6}" fill="url(#seerGlow)"/>`
      + `<clipPath id="seerClip"><path class="slid" d="M${-r * 1.3},0Q0,0 ${r * 1.3},0Q0,0 ${-r * 1.3},0Z"/></clipPath>`
      + `<g clip-path="url(#seerClip)"><ellipse rx="${r * 1.3}" ry="${r}" fill="url(#seerBall)"/><path d="${veins}" stroke="#c2272d" stroke-width="1.1" fill="none" opacity=".55"/>`
      + `<g class="siris"><circle r="${r * .5}" fill="url(#seerIris)"/><circle r="${r * .5}" fill="none" stroke="#ff3b3b" stroke-width="2"/><circle class="spupil" r="${r * .2}" fill="#000"/><circle cx="${-r * .16}" cy="${-r * .18}" r="${r * .08}" fill="#fff" opacity=".85"/></g></g>`
      + `<path class="sline" d="M${-r * 1.3},0Q0,0 ${r * 1.3},0" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round"/>`
      + `<text class="whisper" x="0" y="${r * 1.9}" text-anchor="middle">we see you.</text></g>`); }
  // earth below the horizon, and the horizon itself
  o.push(rect(0, G, W, H - G, 'url(#earth)'));
  o.push(rect(0, G - 26, W, 26, 'url(#glowUp)') + rect(0, G, W, 18, 'url(#glowDn)'));
  // the building: back walls of each room, tinted by who works there
  for (const [id, [l, x0, x1]] of Object.entries(P.R)) {
    if (id === 'dispatch' || (id === 'site' && P.mode === 'wide')) continue;
    const y = lv[l], top = y - FH, tint = OWNER[id] ? BY[OWNER[id]].c : (id === 'vault' ? '#f2c14e' : '#ffffff');
    o.push(`<g class="room r-${id}" data-room="${id}">${rect(x0, top, x1 - x0, FH, '#101015')}${rect(x0, top, x1 - x0, FH, tint, 'class="tint" opacity=".05"')}`);
    o.push(lamp(x0 + (x1 - x0) * (id === 'board' ? .2 : .5), top + 4, 18, FH - 8));
    o.push(props(id, { x0, w: x1 - x0, y }, P));
    o.push(sign(x0 + 10, top + 12, ROOMNAME[id] || id, P.mode === 'wide' ? 1 : 1.05));
    o.push('</g>');
  }
  // stairwell
  o.push(rect(bx0, roofY - 0, sx - bx0, botY - roofY, '#0c0c10'));
  o.push(stairs(P));
  // floors (slabs), outer walls, inner walls with doorways
  for (let i = 0; i < lv.length; i++) {
    const y = lv[i];
    o.push(rect(bx0 - 4, y - 1, bx1 - bx0 + 8, 8, '#24242b', `stroke="${L}" stroke-width="2"`));
  }
  o.push(ln(`M${bx0},${roofY}V${botY + 7}M${bx1},${roofY}V${P.mode === 'wide' ? G - 74 : botY + 7}${P.mode === 'wide' ? `M${bx1},${G - 4}V${botY + 7}` : ''}`, L, 3));
  o.push(ln(`M${sx},${roofY + 6}V${botY}`, L, 2, 'opacity=".35" stroke-dasharray="2 8"'));
  for (const [id, [l, x0]] of Object.entries(P.R)) {
    if (x0 <= sx + 1 || id === 'dispatch' || id === 'site' && P.mode === 'wide') continue;
    const y = lv[l];
    o.push(rect(x0 - 3, y - FH + 7, 6, 40, '#24242b', `stroke="${L}" stroke-width="1.6"`));
  }
  // the roof: parapet, the stair bulkhead, and the dispatch hut (drawn by props)
  o.push(ln(`M${bx0 - 4},${roofY - 12}H${bx1 + 4}`, L, 2.4) + ln(`M${bx0 - 4},${roofY - 12}V${roofY}M${bx1 + 4},${roofY - 12}V${roofY}`, L, 2.4));
  o.push(shape(`M${bx0},${roofY}V${roofY - 40}H${sx}V${roofY}`, '#121218', 2.4) + rect(bx0 + 30, roofY - 30, 26, 30, '#0c0c10', `stroke="${L}" stroke-width="1.6"`));
  const d = P.R.dispatch;
  o.push(`<g class="room r-dispatch" data-room="dispatch">${props('dispatch', { x0: d[1], w: d[2] - d[1], y: lv[d[0]] }, P)}${sign(d[1] + 20, lv[d[0]] - 70, 'Dispatch')}</g>`);
  if (P.mode === 'wide') {
    const s = P.R.site;
    o.push(`<g class="room r-site out" data-room="site">${props('site', { x0: s[1], w: s[2] - s[1], y: lv[s[0]] }, P)}${sign(s[1] + 60, G - 98, 'The Site')}</g>`);
    // the street on the left: a lamp post and a bench
    o.push(`<g class="street">${ln(`M44,${G}V${G - 120}Q44,${G - 132} 58,${G - 132}H68`, L, 3)}<polygon class="cone on" points="62,${G - 126} 74,${G - 126} 104,${G} 32,${G}" fill="url(#cone)"/>${shape(`M60,${G - 134}h16l-3,8h-10Z`, '#2a2a33', 1.6)}<circle cx="68" cy="${G - 125}" r="3" fill="#ffd77a"/>`
      + `${shape(`M8,${G}V${G - 14}M8,${G - 14}H40M40,${G}V${G - 14}M10,${G - 22}H38`, 'none', 2.4)}</g>`);
  }
  // the name on the building
  { const wide = P.mode === 'wide', sx0 = wide ? 270 : 100, sw = wide ? 210 : 124, sh = wide ? 62 : 40, sy = roofY - 12 - (wide ? 30 : 18) - sh;
    o.push(`<g class="roofsign">${ln(`M${sx0 + sw * .2},${sy + sh}V${roofY - 12}M${sx0 + sw * .8},${sy + sh}V${roofY - 12}M${sx0 + sw * .2},${roofY - 22}L${sx0 + sw * .8},${sy + sh}`, L, 2, 'opacity=".7"')}`
      + `${rect(sx0, sy, sw, sh, '#0c0c10', `stroke="${L}" stroke-width="2.4" rx="6"`)}<text class="hqname" x="${sx0 + sw * (wide ? .42 : .4)}" y="${sy + sh * .74}" text-anchor="middle" font-size="${wide ? 40 : 23}">HIRE</text>`
      + `<g transform="translate(${sx0 + sw * (wide ? .84 : .83)},${sy + sh * .52}) scale(${wide ? .2 : .115})">${markMini()}</g></g>`); }
  return o.join('');
}
const DEFS = `<defs>
  <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17120a"/><stop offset=".25" stop-color="#0c0a07"/><stop offset="1" stop-color="#070605"/></linearGradient>
  <linearGradient id="glowUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f2b84b" stop-opacity=".28"/><stop offset="1" stop-color="#f2b84b" stop-opacity="0"/></linearGradient>
  <linearGradient id="glowDn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2b84b" stop-opacity=".22"/><stop offset="1" stop-color="#f2b84b" stop-opacity="0"/></linearGradient>
  <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd77a" stop-opacity=".22"/><stop offset="1" stop-color="#ffd77a" stop-opacity="0"/></linearGradient>
  <radialGradient id="seerGlow"><stop offset="0" stop-color="#ff2a2a" stop-opacity=".34"/><stop offset=".45" stop-color="#a1121a" stop-opacity=".14"/><stop offset="1" stop-color="#a1121a" stop-opacity="0"/></radialGradient>
  <radialGradient id="seerBall" cx=".45" cy=".4"><stop offset="0" stop-color="#fbf6ea"/><stop offset=".7" stop-color="#e6dcc6"/><stop offset="1" stop-color="#a8957a"/></radialGradient>
  <radialGradient id="seerIris"><stop offset="0" stop-color="#14040a"/><stop offset=".55" stop-color="#7a0f1a"/><stop offset=".85" stop-color="#3a070d"/><stop offset="1" stop-color="#1a0306"/></radialGradient>
  <linearGradient id="hz" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2b84b" stop-opacity="0"/><stop offset=".15" stop-color="#f2b84b"/><stop offset=".85" stop-color="#f2b84b"/><stop offset="1" stop-color="#f2b84b" stop-opacity="0"/></linearGradient>
</defs>`;

// ---------------------------------------------------------------- the live part
export function mountHQ(host, { onAgent } = {}) {
  host.classList.add('hq');
  host.innerHTML = `<svg class="hqsvg" role="img" aria-label="HIRE HQ: ten AI agents at work, live"></svg><div class="bubs" aria-live="polite"></div><div class="hqtag" hidden></div><div class="reticle" hidden><i></i></div><div class="hqred"></div>`;
  const svg = host.querySelector('svg'), bubs = host.querySelector('.bubs'), tag = host.querySelector('.hqtag'), ret = host.querySelector('.reticle');
  let P = null, A = {}, where = {}, cards = [], queue = [], lastPlay = 0, stateRef = null, raf = 0, visible = true, coins = [], H = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seer = { o: 0, tgt: 1, blinkAt: 0, ix: 0, iy: 0, pupil: 1, look: null, gold: 0 };
  let noticeUntil = 0, nextNotice = performance.now() + 22000 + Math.random() * 14000, nextFlick = performance.now() + 3000;

  function build() {
    const mode = host.clientWidth < 720 ? 'narrow' : 'wide';
    if (P && P.mode === mode) return;
    P = plan(mode);
    svg.setAttribute('viewBox', `0 0 ${P.W} ${P.H}`);
    svg.innerHTML = DEFS + building(P) + rect(0, P.G - 1, P.W, 2, 'url(#hz)') + '<g class="humans"></g><g class="coins"></g><g class="agents"></g>';
    H = []; coins = [];
    // the lights come on room by room the first time the building is drawn
    host.classList.add('boot'); [...svg.querySelectorAll('.room')].forEach((g, i) => g.style.setProperty('--ld', (.25 + i * .13).toFixed(2) + 's'));
    setTimeout(() => host.classList.remove('boot'), 3200);
    const layer = svg.querySelector('.agents');
    A = {};
    AG.forEach((a, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'agent'); g.dataset.id = a.id; g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', a.name);
      g.innerHTML = `<g class="flip"><g class="blob" style="--o:${(i * .37).toFixed(2)}s">${blob(a)}</g></g>`;
      layer.appendChild(g);
      const rid = where[a.id] || a.room, r = room(P, rid), x = spot(P, rid, a.id, visitors(rid, a.id));
      A[a.id] = { id: a.id, a, g, flip: g.firstChild, x, y: r.y, lv: r.lv, room: rid, path: [], face: 1, idle: 2 + Math.random() * 6, talkUntil: 0, speed: 0 };
      g.addEventListener('click', () => onAgent && onAgent(a.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAgent && onAgent(a.id); } });
      g.addEventListener('pointerenter', () => showTag(a.id)); g.addEventListener('pointerleave', () => { tag.hidden = true; });
    });
    svg.querySelector('.jobboard').addEventListener('click', () => onAgent && onAgent(null, '/jobs'));
    renderCards(true); paintWallet(); place();
  }
  function visitors(rid, me) { let k = 0; for (const o of Object.values(A)) if (o.id !== me && o.room === rid) k++; return k; }
  function showTag(id) {
    const o = A[id]; if (!o) return;
    tag.hidden = false; tag.innerHTML = `<b>${esc(o.a.name)}</b> · ${esc(o.a.title)}`;
    const k = svg.clientWidth / P.W; tag.style.left = (svg.offsetLeft + o.x * k) + 'px'; tag.style.top = (svg.offsetTop + (o.y + 14) * k) + 'px';
  }
  // ---- walking
  function route(o, toRoom, toX) {
    const r = room(P, toRoom), pts = [], ex = P.bx0 + 14, lx = P.sx - 14;
    if (o.lv !== r.lv) {
      pts.push({ x: ex, y: P.lv[o.lv] });
      const dir = r.lv > o.lv ? 1 : -1;
      for (let i = o.lv; i !== r.lv; i += dir) { const a = P.lv[i], b = P.lv[i + dir]; pts.push({ x: lx, y: (a + b) / 2, st: 1 }); pts.push({ x: ex, y: b, st: 1, lv: i + dir }); }
    }
    pts.push({ x: toX, y: r.y, lv: r.lv });
    o.path = pts; o.room = toRoom;
  }
  function goTo(id, toRoom, near) {
    const o = A[id]; if (!o) return 0;
    let x;
    if (near && A[near] && A[near].room === toRoom) { const t = A[near]; x = clamp(t.x + (o.x < t.x ? -52 : 52), room(P, toRoom).x0 + 26, room(P, toRoom).x1 - 26); if (Math.abs(x - t.x) < 40) x = t.x + (t.x - room(P, toRoom).x0 > 60 ? -52 : 52); }
    else x = spot(P, toRoom, id, visitors(toRoom, id));
    route(o, toRoom, x); o.speed = 120;
    let d = 0, px = o.x, py = o.y; for (const p of o.path) { d += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y; }
    return d / o.speed;
  }
  function step(dt, now) {
    for (const o of Object.values(A)) {
      if (o.path.length) {
        const p = o.path[0], dx = p.x - o.x, dy = p.y - o.y, dist = Math.hypot(dx, dy), v = (p.st ? .7 : 1) * o.speed * dt;
        if (Math.abs(dx) > .5) o.face = dx < 0 ? -1 : 1;
        if (dist <= v) { o.x = p.x; o.y = p.y; if (p.lv != null) o.lv = p.lv; o.path.shift(); }
        else { o.x += dx / dist * v; o.y += dy / dist * v; }
        o.walking = true;
      } else {
        o.walking = false;
        if (now > o.talkUntil && (o.idle -= dt) <= 0) {             // a little wander inside the room
          o.idle = 4 + Math.random() * 9;
          const r = room(P, o.room);
          if (Math.random() < .6) { o.path = [{ x: clamp(o.x + (Math.random() - .5) * 90, r.x0 + 26, r.x1 - 26), y: r.y }]; o.speed = 34; }
          else o.face = -o.face;
        }
      }
    }
  }
  function place() {
    const s = P.s;
    for (const o of Object.values(A)) {
      o.g.setAttribute('transform', `translate(${o.x.toFixed(1)},${o.y.toFixed(1)}) scale(${s})`);
      o.flip.setAttribute('transform', o.face < 0 ? 'scale(-1,1)' : '');
      o.g.classList.toggle('walk', !!o.walking);
      o.g.classList.toggle('talk', o.talkUntil > performance.now());
    }
    const k = svg.clientWidth / P.W, ox = svg.offsetLeft, oy = svg.offsetTop;
    for (const b of bubs.children) {
      const o = A[b.dataset.a]; if (!o) continue;
      const bw = b.offsetWidth, cw = host.clientWidth, px = ox + o.x * k, left = clamp(px, bw / 2 + 4, cw - bw / 2 - 4);
      b.style.left = left + 'px'; b.style.top = (oy + (o.y - (o.a.acc === 'pin' || o.a.acc === 'radio' ? 150 : 136) * P.s) * k) + 'px';
      b.style.setProperty('--tail', (px - left) + 'px');
    }
    // lights: a room is lit while someone is in it
    const busy = new Set(Object.values(A).filter(o => !o.path.length).map(o => o.room));
    for (const g of svg.querySelectorAll('.room')) g.classList.toggle('lit', busy.has(g.dataset.room) || g.dataset.room === 'board');
  }
  // ---- bubbles: the log, line by line
  function bubble(o, line) {
    const kind = line.kind, b = document.createElement('div');
    b.className = 'bub k-' + kind; b.dataset.a = o.id;
    const to = line.target && BY[line.target] ? ` <i>→ ${esc(BY[line.target].name)}</i>` : '';
    const lab = { posts: 'posted a job', hires: 'hired a human', reviews: 'checked a photo', pays: 'paid a human', thinks: 'thinking' }[kind];
    b.innerHTML = `<div class="bh"><b style="color:${o.a.c}">${esc(o.a.name)}</b>${to}${lab ? ` <em>${lab}</em>` : ''}</div><div class="bt"><span class="ty"></span><span class="ghost">${esc(line.text)}</span></div>`;
    { const ty = b.querySelector('.ty'), gh = b.querySelector('.ghost'), full = String(line.text), step2 = Math.max(1, Math.round(full.length / 45)); let n = 0;
      const tick = () => { n = Math.min(full.length, n + step2); ty.textContent = full.slice(0, n); gh.textContent = full.slice(n); if (n < full.length && b.isConnected) setTimeout(tick, 26); };
      if (reduced) { ty.textContent = full; gh.textContent = ''; } else setTimeout(tick, 120); }
    while (bubs.children.length >= 2) bubs.firstChild.remove();
    bubs.appendChild(b);
    const ms = clamp(2600 + line.text.length * 55, 4200, 9000);
    o.talkUntil = performance.now() + Math.min(ms, 3000);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, ms);
    requestAnimationFrame(() => b.classList.add('in'));
  }
  function play(line) {
    const o = A[line.agent]; if (!o) return;
    let to = null, near = null;
    if (line.kind === 'says' && line.target && A[line.target]) { to = where[line.target] || BY[line.target].room; near = line.target; }
    else if (line.kind === 'thinks') to = BY[line.agent].room;
    else if (line.kind === 'posts') to = 'board';
    else if (line.kind === 'pays') to = 'vault';
    let t = 0, hu = null;
    if (line.kind === 'hires' || line.kind === 'pays') hu = humanIn(line.kind);
    if (to && (to !== o.room || near)) t = goTo(o.id, to, near);
    if (to) where[o.id] = to;
    const fast = queue.length > 4 || reduced;
    if (fast && o.path.length) { const last = o.path[o.path.length - 1]; o.x = last.x; o.y = last.y; o.lv = last.lv != null ? last.lv : o.lv; o.path = []; t = 0; }
    setTimeout(() => {
      if (near && A[near]) { A[near].face = A[near].x < o.x ? 1 : -1; o.face = A[near].x < o.x ? -1 : 1; A[near].idle = 6; }
      bubble(o, line); seer.look = o.id;
      if (line.kind === 'pays') { payCoins(hu); seer.gold = performance.now() + 2600; }
      if (line.kind === 'posts') { const c = svg.querySelector('.cards'); if (c) { c.classList.remove('pop'); void c.getBoundingClientRect(); c.classList.add('pop'); } }
    }, Math.min(t, 7) * 1000 + 120);
    return Math.min(t, 7) + clamp(2.4 + line.text.length * .035, 3.4, 7);
  }
  let busyUntil = 0;
  function pump(now) {
    if (!queue.length || now < busyUntil) return;
    const line = queue.shift();
    const dur = play(line);
    busyUntil = now + (queue.length > 4 ? 900 : dur * 1000 * .8);
    if (opts.onPlay) opts.onPlay(line);
  }
  const opts = {};
  // ---- the humans: a grey figure with a sheet of paper walks in when one is hired, and comes by to be paid
  const HUMAN = `<ellipse cx="0" cy="0" rx="17" ry="3.6" fill="#000" opacity=".4"/><g class="leg l"><path d="M-6,-30V-3" stroke="#a9a49a" stroke-width="6" stroke-linecap="round"/></g><g class="leg r"><path d="M6,-30V-3" stroke="#a9a49a" stroke-width="6" stroke-linecap="round"/></g>`
    + `<g class="hb"><path d="M-15,-29V-57Q-15,-69 -3,-69H3Q15,-69 15,-57V-29Z" fill="#a9a49a" stroke="${LINE}" stroke-width="2"/><circle cx="0" cy="-83" r="12" fill="#a9a49a" stroke="${LINE}" stroke-width="2"/>`
    + `<g transform="rotate(-8 -20 -50)"><rect x="-29" y="-58" width="17" height="13" rx="1" fill="#efe8d8" stroke="#3a3a3a" stroke-width="1"/><path d="M-26,-53h10M-26,-49h7" stroke="#3a3a3a" stroke-width="1.2"/></g></g>`;
  function humanIn(kind) {
    const layer = svg.querySelector('.humans'); if (!layer || H.length > 3) return null;
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'human'); g.innerHTML = `<g class="hflip">${HUMAN}</g>`; layer.appendChild(g);
    const out = P.W + 40, br = room(P, 'board');
    const stand = kind === 'pays' ? (P.mode === 'wide' ? 1118 : P.R.site[2] - 36) : clamp(br.x0 + br.w * (P.mode === 'wide' ? .8 : .74) + (Math.random() - .5) * 30, br.x0 + 30, br.x1 - 30);
    const h = { g, x: out, y: P.G, out, path: [{ x: stand }], stand, leaveAt: kind === 'pays' ? 0 : performance.now() + ((out - stand) / 70) * 1000 + 3600, leaving: false, face: -1 };
    H.push(h); return h;
  }
  function stepHumans(dt, now) {
    H = H.filter(h => {
      if (h.path.length) { const p = h.path[0], dx = p.x - h.x, v = 70 * dt; h.face = dx < 0 ? -1 : 1; if (Math.abs(dx) <= v) { h.x = p.x; h.path.shift(); } else h.x += Math.sign(dx) * v; h.walking = true; }
      else { h.walking = false; if (h.leaving) { h.g.remove(); return false; } if (h.leaveAt && now > h.leaveAt) { h.leaving = true; h.path = [{ x: h.out }]; } else h.face = -1; }
      h.g.setAttribute('transform', `translate(${h.x.toFixed(1)},${h.y}) scale(${(P.s * .95).toFixed(3)})`);
      h.g.firstChild.setAttribute('transform', h.face > 0 ? 'scale(-1,1)' : '');
      h.g.classList.toggle('walk', h.walking);
      return true;
    });
  }
  // ---- coins out of the vault, out of the building, into a human's hands
  function payCoins(h) {
    const g = svg.querySelector('.coins'); if (!g) return;
    const vr = room(P, 'vault'), sx = vr.x0 + vr.w * .62, sy = vr.y - 58, tx = h ? h.stand : P.W + 20, ty = P.G - (h ? 46 : 120);
    for (let i = 0; i < 6; i++) coins.push({ t0: performance.now() + i * 140, sx, sy, tx, ty: ty - i * 3, el: null });
    if (h) h.leaveAt = performance.now() + 3400;
  }
  function drawCoins(now) {
    const g = svg.querySelector('.coins'); if (!g) return;
    coins = coins.filter(c => {
      const t = (now - c.t0) / 1600; if (t < 0) return true;
      if (!c.el) { c.el = document.createElementNS(NS, 'g'); c.el.innerHTML = '<circle r="9" fill="#b7791f"/><circle r="7.4" fill="#f6c453"/><circle r="4.8" fill="none" stroke="#c98a1c" stroke-width="1.4"/>'; g.appendChild(c.el); }
      if (t >= 1) { c.el.remove(); return false; }
      const e = t * t * (3 - 2 * t), mx = (c.sx + c.tx) / 2, my = Math.min(c.sy, c.ty) - 260;
      const x = (1 - e) * (1 - e) * c.sx + 2 * (1 - e) * e * mx + e * e * c.tx, y = (1 - e) * (1 - e) * c.sy + 2 * (1 - e) * e * my + e * e * c.ty;
      c.el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(Math.abs(Math.cos(t * 14)) * .8 + .2).toFixed(2)},1)`);
      return true;
    });
  }
  // ---- the board in the lobby: one card per open job
  function renderCards(force) {
    const c = svg.querySelector('.cards'), cnt = svg.querySelector('.bcount'); if (!c) return;
    const jobs = (stateRef && stateRef.jobs) || [];
    const ids = jobs.map(j => j.id).join(',');
    if (!force && ids === cards.join(',')) return;
    const board = c.previousSibling, bx = +board.getAttribute('x'), by = +board.getAttribute('y'), bw = +board.getAttribute('width'), cols = 5;
    const cw = (bw - 12) / cols;
    c.innerHTML = jobs.slice(0, 10).map((j, i) => {
      const x = bx + 6 + (i % cols) * cw + 2, y = by + 5 + Math.floor(i / cols) * 30, a = BY[j.agent] || AG[0], rot = ((i * 37) % 9) - 4;
      return `<g class="card${cards.includes(j.id) ? '' : ' new'}" transform="rotate(${rot} ${x + cw / 2} ${y + 12})"><rect x="${x}" y="${y}" width="${cw - 5}" height="25" rx="1.5" fill="#efe8d8"/><rect x="${x}" y="${y}" width="${cw - 5}" height="4" fill="${a.c}"/>`
        + `<path d="M${x + 4},${y + 12}h${cw - 18}M${x + 4},${y + 18}h${(cw - 18) * .6}" stroke="#555" stroke-width="1.2"/><circle cx="${x + (cw - 5) / 2}" cy="${y + 2}" r="2.4" fill="#ff5d5d"/></g>`;
    }).join('');
    cards = jobs.map(j => j.id);
    cnt.textContent = jobs.length ? `${jobs.length} open job${jobs.length > 1 ? 's' : ''}` : 'no open jobs right now';
  }
  function paintWallet() {
    const t = svg.querySelector('.vbal'), st = svg.querySelector('.stacks'); if (!t || !stateRef) return;
    const sol = stateRef.wallet.lamports / 1e9;
    t.textContent = (sol >= 100 ? sol.toFixed(1) : sol.toFixed(3)) + ' SOL';
    const vr = room(P, 'vault'), n = sol <= 0 ? 0 : clamp(Math.ceil(sol / 10), 1, P.mode === 'wide' ? 10 : 6), x0 = vr.x0 + (P.mode === 'wide' ? 40 : 20), y = vr.y;
    let o = '';
    for (let i = 0; i < n; i++) { const h = 3 + ((i * 5) % 4); for (let k = 0; k < h; k++) o += `<rect x="${x0 + i * 19}" y="${y - 6 - k * 5}" width="15" height="5" rx="1.5" fill="${k % 2 ? '#f6c453' : '#e0a93a'}" stroke="#7a5214" stroke-width=".8"/>`; }
    st.innerHTML = o;
  }
  function clock() { const c = svg.querySelector('.clk'); if (c) { const d = new Date(); c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } }
  // ---- the watching: where the cursor is in the building, the seer, the agents' eyes, and the moments they notice you
  function cursorSvg() {
    if (performance.now() - pointer.at > 4000) return null;
    const r = svg.getBoundingClientRect(); if (!r.width || pointer.x < r.left - 80 || pointer.x > r.right + 80 || pointer.y < r.top - 200 || pointer.y > r.bottom + 200) return null;
    return { x: (pointer.x - r.left) / r.width * P.W, y: (pointer.y - r.top) / r.height * P.H };
  }
  function watch(now) {
    const g = svg.querySelector('.seer'); if (!g) return;
    const r = +g.dataset.r, cur = cursorSvg(), noticing = now < noticeUntil;
    // blink every few seconds; open wider while it notices you
    if (!seer.blinkAt) seer.blinkAt = now + 4000 + Math.random() * 5000;
    let o = noticing ? 1.18 : 1;
    if (now > seer.blinkAt) { const b = (now - seer.blinkAt) / 240; if (b >= 1) seer.blinkAt = now + 5000 + Math.random() * 7000; else o *= Math.abs(1 - b * 2); }
    seer.o += (o - seer.o) * .25;
    const h = r * .78 * Math.max(0, seer.o), w = r * 1.3;
    g.querySelector('.slid').setAttribute('d', `M${-w},0Q0,${-h * 2} ${w},0Q0,${h * 2} ${-w},0Z`);
    g.querySelector('.sline').setAttribute('d', `M${-w},0Q0,${-h * 2} ${w},0`);
    // what it looks at: you, else whoever is talking, else the board
    const tr = g.transform.baseVal.consolidate().matrix, cx = tr.e, cy = tr.f;
    let tx = cx, ty = cy + 100;
    if (cur) { tx = cur.x; ty = cur.y; }
    else if (seer.look && A[seer.look]) { tx = A[seer.look].x; ty = A[seer.look].y - 50; }
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
    seer.ix += (dx / d * k * r * .62 - seer.ix) * .18; seer.iy += (dy / d * k * r * .42 - seer.iy) * .18;
    seer.pupil += ((noticing ? 1.75 : cur ? 1.15 : 1) - seer.pupil) * .12;
    const iris = g.querySelector('.siris'); iris.setAttribute('transform', `translate(${seer.ix.toFixed(1)},${seer.iy.toFixed(1)})`);
    iris.querySelector('.spupil').setAttribute('r', (r * .2 * seer.pupil).toFixed(1));
    // the agents' eyes: at you when you are near the building, at the one talking, or straight ahead
    const talker = Object.values(A).find(x => x.talkUntil > now);
    for (const a of Object.values(A)) {
      const look = a.g.querySelector('.look'); if (!look) continue;
      let lx = 0, ly = 0, t = null;
      if (cur) t = cur; else if (talker && talker !== a) t = { x: talker.x, y: talker.y - 60 * P.s };
      if (t) { const vx = t.x - a.x, vy = t.y - (a.y - 62 * P.s), vd = Math.hypot(vx, vy) || 1, kk = Math.min(1, vd / 160); lx = vx / vd * kk * 3.2 * (a.face < 0 ? -1 : 1); ly = vy / vd * kk * 2.6; }
      if (noticing) { lx = cur ? lx : 0; ly = cur ? ly : 1.5; }
      a.lx = (a.lx || 0) + (lx - (a.lx || 0)) * .25; a.ly = (a.ly || 0) + (ly - (a.ly || 0)) * .25;
      look.setAttribute('transform', `translate(${a.lx.toFixed(2)},${a.ly.toFixed(2)})`);
    }
    // now and then, they all stop and stare at you
    if (!reduced && now > nextNotice && visible && !document.hidden && !queue.length) {
      noticeUntil = now + 2900; nextNotice = now + 30000 + Math.random() * 25000;
      host.classList.add('notice'); setTimeout(() => host.classList.remove('notice'), 2900);
      for (const a of Object.values(A)) a.face = cur ? (cur.x < a.x ? -1 : 1) : a.face;
    }
    // a light that flickers somewhere
    if (!reduced && now > nextFlick) {
      nextFlick = now + 2500 + Math.random() * 5000;
      const lit = [...svg.querySelectorAll('.room.lit')]; const pick = lit[(Math.random() * lit.length) | 0];
      if (pick) { pick.classList.add('flick'); setTimeout(() => pick.classList.remove('flick'), 900); }
    }
    g.classList.toggle('gold', now < seer.gold);
    // a reticle where you point: the building sees your cursor too
    const hr = host.getBoundingClientRect(), inside = !pointer.touch && now - pointer.at < 3000 && pointer.x > hr.left && pointer.x < hr.right && pointer.y > hr.top && pointer.y < hr.bottom;
    ret.hidden = !inside;
    if (inside) { ret.style.left = (pointer.x - hr.left) + 'px'; ret.style.top = (pointer.y - hr.top) + 'px'; }
  }
  // ---- the loop
  let last = performance.now();
  function frame(now) {
    raf = 0;
    if (!P) return;
    if (document.body.classList.contains('intro-on')) { raf = requestAnimationFrame(frame); last = now; return; }   // the intro has the GPU
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    pump(now); if (now > noticeUntil) step(dt, now); stepHumans(dt, now); place(); drawCoins(now); watch(now);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }, { rootMargin: '100px' });
  io.observe(host);
  const vis = () => wake(); document.addEventListener('visibilitychange', vis);
  const ro = new ResizeObserver(() => { const m = host.clientWidth < 720 ? 'narrow' : 'wide'; if (P && m !== P.mode) { build(); } });
  ro.observe(host);
  const clk = setInterval(clock, 15000);
  // a timer as a backstop, in case animation frames are paused (background tabs)
  const back = setInterval(() => { if (!raf && P) { const now = performance.now(); pump(now); } }, 1500);

  let seen = 0;
  return {
    set onPlay(f) { opts.onPlay = f; },
    update(st, { replay = 0 } = {}) {
      const first = !stateRef;
      stateRef = st;
      if (first) {
        where = { ...st.world };
        build(); clock();
        const lines = st.log.slice(0, Math.max(0, replay)).reverse();
        seen = st.log.length ? st.log[0].id : 0;
        lines.forEach((l, i) => setTimeout(() => { const o = A[l.agent]; if (o) bubble(o, l); }, 600 + i * 2600));
        wake(); return;
      }
      const fresh = st.log.filter(l => l.id > seen).reverse();
      if (fresh.length) { seen = st.log[0].id; queue.push(...fresh.slice(-12)); }
      renderCards(); paintWallet();
      // when nothing is left to play, make sure everyone is where the server says
      if (!queue.length) for (const [id, rid] of Object.entries(st.world || {})) {
        const o = A[id]; if (!o || o.path.length || o.room === rid) continue;
        if (performance.now() > busyUntil + 4000) { where[id] = rid; goTo(id, rid); }
      }
      wake();
    },
    destroy() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); clearInterval(clk); clearInterval(back); document.removeEventListener('visibilitychange', vis); host.innerHTML = ''; },
  };
}
