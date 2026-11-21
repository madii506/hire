// HIRE · the dot map: a land mask drawn as cells, and a pin for every verified value whose place a human typed.
// Places are matched against a small built-in list of cities and countries; anything unknown is listed, never guessed.
import { LAND } from './land.js?v=4';

const C = [
  // europe
  ['london', 51.5, -.1], ['paris', 48.9, 2.35], ['berlin', 52.5, 13.4], ['madrid', 40.4, -3.7], ['barcelona', 41.4, 2.2], ['lisbon', 38.7, -9.1], ['lisboa', 38.7, -9.1], ['porto', 41.15, -8.6],
  ['rome', 41.9, 12.5], ['roma', 41.9, 12.5], ['milan', 45.5, 9.2], ['milano', 45.5, 9.2], ['naples', 40.85, 14.25], ['amsterdam', 52.4, 4.9], ['rotterdam', 51.9, 4.5], ['brussels', 50.85, 4.35],
  ['vienna', 48.2, 16.4], ['wien', 48.2, 16.4], ['prague', 50.1, 14.4], ['warsaw', 52.2, 21], ['krakow', 50.06, 19.94], ['budapest', 47.5, 19], ['bucharest', 44.4, 26.1], ['sofia', 42.7, 23.3],
  ['athens', 37.98, 23.73], ['istanbul', 41, 29], ['ankara', 39.9, 32.9], ['stockholm', 59.3, 18.1], ['gothenburg', 57.7, 12], ['goteborg', 57.7, 12], ['malmo', 55.6, 13], ['uppsala', 59.86, 17.64],
  ['oslo', 59.9, 10.75], ['bergen', 60.39, 5.32], ['copenhagen', 55.7, 12.6], ['kobenhavn', 55.7, 12.6], ['helsinki', 60.2, 24.9], ['tallinn', 59.4, 24.75], ['riga', 56.95, 24.1], ['vilnius', 54.7, 25.3],
  ['dublin', 53.35, -6.26], ['edinburgh', 55.95, -3.19], ['glasgow', 55.86, -4.25], ['manchester', 53.48, -2.24], ['birmingham', 52.48, -1.9], ['leeds', 53.8, -1.55], ['liverpool', 53.4, -3],
  ['bristol', 51.45, -2.59], ['zurich', 47.37, 8.54], ['geneva', 46.2, 6.15], ['munich', 48.14, 11.58], ['munchen', 48.14, 11.58], ['hamburg', 53.55, 10], ['frankfurt', 50.1, 8.7], ['cologne', 50.94, 6.96],
  ['koln', 50.94, 6.96], ['lyon', 45.76, 4.84], ['marseille', 43.3, 5.37], ['nice', 43.7, 7.27], ['toulouse', 43.6, 1.44], ['bordeaux', 44.84, -.58], ['valencia', 39.47, -.38], ['seville', 37.39, -5.98],
  ['sevilla', 37.39, -5.98], ['kyiv', 50.45, 30.52], ['kiev', 50.45, 30.52], ['moscow', 55.76, 37.62], ['saint petersburg', 59.94, 30.31], ['belgrade', 44.8, 20.46], ['zagreb', 45.8, 15.98],
  ['ljubljana', 46.05, 14.5], ['reykjavik', 64.15, -21.94], ['luxembourg', 49.61, 6.13], ['antwerp', 51.22, 4.4], ['the hague', 52.08, 4.3], ['utrecht', 52.09, 5.12], ['bratislava', 48.15, 17.11],
  // americas
  ['new york', 40.71, -74], ['nyc', 40.71, -74], ['brooklyn', 40.68, -73.94], ['manhattan', 40.78, -73.97], ['los angeles', 34.05, -118.24], ['la', 34.05, -118.24], ['san francisco', 37.77, -122.42],
  ['sf', 37.77, -122.42], ['chicago', 41.88, -87.63], ['houston', 29.76, -95.37], ['dallas', 32.78, -96.8], ['austin', 30.27, -97.74], ['miami', 25.76, -80.19], ['atlanta', 33.75, -84.39],
  ['boston', 42.36, -71.06], ['seattle', 47.61, -122.33], ['portland', 45.52, -122.68], ['denver', 39.74, -104.99], ['phoenix', 33.45, -112.07], ['las vegas', 36.17, -115.14], ['san diego', 32.72, -117.16],
  ['philadelphia', 39.95, -75.17], ['washington', 38.9, -77.04], ['dc', 38.9, -77.04], ['detroit', 42.33, -83.05], ['minneapolis', 44.98, -93.27], ['nashville', 36.16, -86.78], ['new orleans', 29.95, -90.07],
  ['toronto', 43.65, -79.38], ['montreal', 45.5, -73.57], ['vancouver', 49.28, -123.12], ['calgary', 51.05, -114.07], ['ottawa', 45.42, -75.7], ['mexico city', 19.43, -99.13], ['cdmx', 19.43, -99.13],
  ['guadalajara', 20.67, -103.35], ['monterrey', 25.67, -100.31], ['bogota', 4.71, -74.07], ['medellin', 6.24, -75.58], ['lima', -12.05, -77.04], ['santiago', -33.45, -70.67], ['buenos aires', -34.6, -58.38],
  ['sao paulo', -23.55, -46.63], ['rio de janeiro', -22.91, -43.17], ['rio', -22.91, -43.17], ['brasilia', -15.8, -47.88], ['caracas', 10.48, -66.9], ['quito', -.18, -78.47], ['montevideo', -34.9, -56.16],
  ['havana', 23.11, -82.37], ['san juan', 18.47, -66.1], ['panama', 8.98, -79.52],
  // africa + middle east
  ['cairo', 30.04, 31.24], ['lagos', 6.52, 3.38], ['abuja', 9.06, 7.49], ['nairobi', -1.29, 36.82], ['johannesburg', -26.2, 28.05], ['cape town', -33.92, 18.42], ['casablanca', 33.57, -7.59],
  ['marrakesh', 31.63, -8], ['tunis', 36.8, 10.18], ['algiers', 36.75, 3.06], ['accra', 5.6, -.19], ['addis ababa', 9.03, 38.74], ['dakar', 14.72, -17.47], ['kampala', .35, 32.58], ['kinshasa', -4.44, 15.27],
  ['dubai', 25.2, 55.27], ['abu dhabi', 24.45, 54.38], ['riyadh', 24.71, 46.68], ['doha', 25.29, 51.53], ['tel aviv', 32.09, 34.78], ['jerusalem', 31.77, 35.21], ['amman', 31.95, 35.93], ['beirut', 33.89, 35.5],
  ['tehran', 35.69, 51.39], ['baghdad', 33.31, 44.36],
  // asia + oceania
  ['tokyo', 35.68, 139.69], ['osaka', 34.69, 135.5], ['kyoto', 35.01, 135.77], ['seoul', 37.57, 126.98], ['busan', 35.18, 129.08], ['beijing', 39.9, 116.4], ['shanghai', 31.23, 121.47],
  ['shenzhen', 22.54, 114.06], ['guangzhou', 23.13, 113.26], ['hong kong', 22.32, 114.17], ['taipei', 25.03, 121.57], ['singapore', 1.35, 103.82], ['kuala lumpur', 3.14, 101.69], ['jakarta', -6.2, 106.85],
  ['bali', -8.65, 115.22], ['bangkok', 13.76, 100.5], ['hanoi', 21.03, 105.85], ['ho chi minh city', 10.82, 106.63], ['saigon', 10.82, 106.63], ['manila', 14.6, 120.98], ['mumbai', 19.08, 72.88],
  ['delhi', 28.61, 77.21], ['new delhi', 28.61, 77.21], ['bangalore', 12.97, 77.59], ['bengaluru', 12.97, 77.59], ['chennai', 13.08, 80.27], ['kolkata', 22.57, 88.36], ['hyderabad', 17.39, 78.49],
  ['karachi', 24.86, 67], ['lahore', 31.55, 74.34], ['dhaka', 23.81, 90.41], ['kathmandu', 27.72, 85.32], ['colombo', 6.93, 79.86], ['almaty', 43.24, 76.89], ['tashkent', 41.3, 69.24],
  ['sydney', -33.87, 151.21], ['melbourne', -37.81, 144.96], ['brisbane', -27.47, 153.03], ['perth', -31.95, 115.86], ['adelaide', -34.93, 138.6], ['auckland', -36.85, 174.76], ['wellington', -41.29, 174.78],
  // countries (their middle), for when only a country is typed
  ['usa', 39, -98], ['us', 39, -98], ['united states', 39, -98], ['america', 39, -98], ['uk', 54, -2], ['united kingdom', 54, -2], ['england', 52.5, -1.5], ['scotland', 56.8, -4.2], ['germany', 51, 10],
  ['deutschland', 51, 10], ['france', 46.5, 2.5], ['spain', 40, -3.7], ['espana', 40, -3.7], ['italy', 42.8, 12.5], ['italia', 42.8, 12.5], ['sweden', 62, 15], ['sverige', 62, 15], ['norway', 61, 9],
  ['denmark', 56, 10], ['finland', 63, 26], ['netherlands', 52.2, 5.5], ['holland', 52.2, 5.5], ['poland', 52, 19], ['portugal', 39.5, -8], ['brazil', -10, -52], ['brasil', -10, -52], ['argentina', -34, -64],
  ['mexico', 23, -102], ['canada', 56, -106], ['australia', -25, 134], ['india', 22, 79], ['china', 35, 103], ['japan', 36, 138], ['nigeria', 9, 8], ['kenya', .5, 38], ['south africa', -29, 25], ['egypt', 26, 30],
  ['turkey', 39, 35], ['turkiye', 39, 35], ['indonesia', -2, 118], ['philippines', 13, 122], ['vietnam', 16, 107], ['thailand', 15, 101], ['uae', 24, 54], ['ireland', 53.2, -8], ['switzerland', 46.8, 8.2],
  ['austria', 47.5, 14.5], ['belgium', 50.6, 4.6], ['greece', 39, 22], ['romania', 46, 25], ['ukraine', 49, 32], ['korea', 36.5, 127.8], ['south korea', 36.5, 127.8], ['colombia', 4, -73], ['chile', -33, -71],
  ['peru', -10, -76], ['new zealand', -41, 174], ['singapore', 1.35, 103.82],
];
const IDX = new Map(C.map(([n, la, lo]) => [n, [la, lo]]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s,]/g, ' ').replace(/\s+/g, ' ').trim();
export function locate(place) {
  const n = norm(place); if (!n) return null;
  const parts = n.split(',').map(x => x.trim()).filter(Boolean);
  for (const p of parts) { if (IDX.has(p)) return IDX.get(p); }
  for (const p of parts) { const w = p.split(' '); for (let k = Math.min(3, w.length); k >= 1; k--) for (let i = 0; i + k <= w.length; i++) { const q = w.slice(i, i + k).join(' '); if (q.length > 3 && IDX.has(q)) return IDX.get(q); } }   // short names only as a whole part
  return null;
}
let BITS = null;
const bits = () => {
  if (BITS) return BITS;
  const per = LAND.cols / 4; BITS = [];
  for (let r = 0; r < LAND.rows; r++) { const hx = LAND.hex.slice(r * per, (r + 1) * per); let row = ''; for (const ch of hx) row += parseInt(ch, 16).toString(2).padStart(4, '0'); BITS.push(row); }
  return BITS;
};
// draw the map into a canvas: land cells dim, every pin amber (newest brightest), with a soft square pulse on the newest
export function drawMap(canvas, pins, t = 0) {
  const B = bits(), dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return [];
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const cw = W / LAND.cols, ch = Math.min(H / LAND.rows, cw * 1.35), oy = (H - ch * LAND.rows) / 2, s = Math.max(1.2, Math.min(cw, ch) * .6);
  g.fillStyle = '#46453f';
  for (let r = 0; r < LAND.rows; r++) for (let c = 0; c < LAND.cols; c++) if (B[r][c] === '1') g.fillRect(c * cw + (cw - s) / 2, oy + r * ch + (ch - s) / 2, s, s);
  const out = [];
  pins.forEach((p, i) => {
    const x = (p.lon + 180) / 360 * W, y = oy + (LAND.lat0 - p.lat) / (LAND.lat0 - LAND.lat1) * ch * LAND.rows;
    if (y < oy - 4 || y > oy + ch * LAND.rows + 4) return;
    const z = Math.max(3, s * 2.1);
    if (i === 0) { const k = (t % 1600) / 1600, rr = z + k * z * 3.2; g.strokeStyle = `rgba(255,176,0,${(1 - k) * .7})`; g.lineWidth = 1; g.strokeRect(x - rr / 2, y - rr / 2, rr, rr); }
    g.fillStyle = i === 0 ? '#ffb000' : 'rgba(255,176,0,.75)'; g.fillRect(x - z / 2, y - z / 2, z, z);
    out.push({ x, y, p });
  });
  return out;
}
