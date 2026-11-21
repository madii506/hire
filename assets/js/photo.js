// HIRE · the proof photo, made ready in your browser: turned the right way up, shrunk to 1280 px and saved again as a
// plain JPEG. Saving it again drops everything a camera hides in a file (location, phone model, time), so none of
// that ever leaves your phone. The SHA-256 of the exact bytes goes into the line your wallet signs.
export async function prepare(file, max = 1280) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('That is not a photo.');
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { src = await viaImg(file); }
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  if (!sw || !sh) throw new Error('That photo could not be opened.');
  const k = Math.min(1, max / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
  if (src.close) try { src.close(); } catch {}
  let q = .86, blob;
  for (;;) { blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); if (!blob) throw new Error('That photo could not be saved.'); if (blob.size < 1.1e6 || q < .5) break; q -= .12; }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { url: 'data:image/jpeg;base64,' + btoa(s), sha, w, h, size: bytes.length, preview: URL.createObjectURL(blob) };
}
function viaImg(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That photo could not be opened (try a JPEG).')); i.src = u; });
}
