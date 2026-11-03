// Graded sky: re-renders the four real planet bodies in the mountains' palette, offline and deterministically.
// Reads the ORIGINAL textures from src/assets/planet-sources/ (never referenced by a page) and writes graded WebP to
// public/mountains/ with the same pixel size and unchanged alpha. Node built-ins and sharp only. Exits non-zero on failure.
//
//   node scripts/grade-planets.mjs [--weighted-blur]
//
// By default the Gaussian blur is a plain per-channel blur (the look Son approved). --weighted-blur makes it alpha-weighted
// (blur(c * a) / blur(a)), which stops transparent-pixel RGB from darkening the limb; it is not used for the approved look.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src/assets/planet-sources');
const outDir = path.join(root, 'public/mountains');
const weighted = process.argv.includes('--weighted-blur');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const STOPS = {
  dark: [[0, '#050912'], [0.3, '#152549'], [0.55, '#26375d'], [0.8, '#586e9b'], [1, '#b2c4e2']],
  light: [[0, '#6a85b2'], [0.4, '#98b2d4'], [0.7, '#c3d7ee'], [1, '#eef1f6']],
};
const SKY = { dark: hex('#03050e'), light: hex('#dbe0e8') };
const RIM = { dark: hex('#96acd2'), light: hex('#5a73a0') };

// keep = share of the blurred source colour kept in the mix; haze = distance tier mix toward the theme sky;
// shown = desktop (1440x900) displayed width in CSS px of the texture box, used for the rim width.
const BODIES = {
  neptune: { keep: 0.25, haze: 0, shown: 727, quality: 68 },
  earth: { keep: 0.35, haze: 0.2, shown: 56, quality: 80 },
  moon: { keep: 0.15, haze: 0.1, shown: 164, quality: 80 },
  saturn: { keep: 0.3, haze: 0.2, shown: 104, quality: 80 },
};
const FILES = [
  ['real-neptune.webp', 'neptune', 'dark'],
  ['real-neptune-morning.webp', 'neptune', 'light'],
  ['real-earth-night.webp', 'earth', 'dark'],
  ['real-earth-morning.webp', 'earth', 'light'],
  ['real-moon-night.webp', 'moon', 'dark'],
  ['real-moon-morning.webp', 'moon', 'light'],
  ['real-saturn.webp', 'saturn', 'dark'],
  ['real-saturn-morning.webp', 'saturn', 'light'],
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function ramp(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}

function kernel(sigma) {
  const r = Math.ceil(sigma * 3);
  const k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += (k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return { k, r };
}

// Separable Gaussian on one plane, edges clamped.
function blur(src, w, h, sigma) {
  const { k, r } = kernel(sigma);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i;
        a += src[row + xx] * k[i + r];
      }
      tmp[row + x] = a;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i;
        a += tmp[yy * w + x] * k[i + r];
      }
      out[y * w + x] = a;
    }
  }
  return out;
}

function blurPlane(plane, alpha, w, h, sigma) {
  if (!weighted) return blur(plane, w, h, sigma);
  const num = new Float32Array(w * h);
  for (let i = 0; i < num.length; i++) num[i] = plane[i] * alpha[i];
  const n = blur(num, w, h, sigma);
  const d = blur(alpha, w, h, sigma);
  for (let i = 0; i < n.length; i++) n[i] = d[i] > 1e-6 ? n[i] / d[i] : plane[i];
  return n;
}

function percentile(sorted, p) {
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function grade(rgba, w, h, body, theme) {
  const cfg = BODIES[body];
  const n = w * h;
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), A = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let r = rgba[i * 4] / 255, g = rgba[i * 4 + 1] / 255, b = rgba[i * 4 + 2] / 255;
    if (theme === 'light') {
      // The light sources carry a baked daytime chroma boost: halve chroma about each pixel's own luminance.
      const y = lum(r, g, b);
      r = clamp01(y + (r - y) * 0.5);
      g = clamp01(y + (g - y) * 0.5);
      b = clamp01(y + (b - y) * 0.5);
    }
    R[i] = r; G[i] = g; B[i] = b; A[i] = rgba[i * 4 + 3] / 255;
  }
  const Y = new Float32Array(n);
  const inside = [];
  for (let i = 0; i < n; i++) {
    Y[i] = lum(R[i], G[i], B[i]);
    if (A[i] > 0.5) inside.push(Y[i]);
  }
  if (inside.length === 0) throw new Error('no pixels with alpha > 0.5');
  inside.sort();
  const lo = percentile(inside, 0.02);
  const hi = percentile(inside, 0.995);
  if (!(hi > lo)) throw new Error('degenerate luminance range');

  const sigma = Math.max(1, 0.012 * Math.max(w, h));
  const bY = blurPlane(Y, A, w, h, sigma);
  const bR = blurPlane(R, A, w, h, sigma);
  const bG = blurPlane(G, A, w, h, sigma);
  const bB = blurPlane(B, A, w, h, sigma);

  // Rim: alpha > 0.5 pixels with any alpha < 0.5 pixel inside their (2k+1) square, via a summed-area table.
  const k = Math.max(1, Math.round(w / cfg.shown));
  const sat = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += A[y * w + x] < 0.5 ? 1 : 0;
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + rowSum;
    }
  }
  const transparentIn = (x0, y0, x1, y1) =>
    sat[(y1 + 1) * (w + 1) + x1 + 1] - sat[y0 * (w + 1) + x1 + 1] - sat[(y1 + 1) * (w + 1) + x0] + sat[y0 * (w + 1) + x0];

  const stops = STOPS[theme].map(([t, c]) => [t, hex(c)]);
  const sky = SKY[theme];
  const rim = RIM[theme];
  const L = [-Math.SQRT1_2, -Math.SQRT1_2];
  const out = Buffer.alloc(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i * 4 + 3] = rgba[i * 4 + 3];
      let c;
      if (A[i] === 0 && rgba[i * 4 + 3] === 0) {
        c = [0, 0, 0];
      } else {
        const t = clamp01((bY[i] - lo) / (hi - lo));
        const rc = ramp(stops, t);
        const bc = [bR[i], bG[i], bB[i]];
        c = [0, 1, 2].map((j) => rc[j] * (1 - cfg.keep) + bc[j] * cfg.keep);
        c = c.map((v, j) => v * (1 - cfg.haze) + sky[j] * cfg.haze);
        if (A[i] > 0.5 &&
            transparentIn(Math.max(0, x - k), Math.max(0, y - k), Math.min(w - 1, x + k), Math.min(h - 1, y + k)) > 0) {
          const dx = x + 0.5 - w / 2, dy = y + 0.5 - h / 2;
          const len = Math.hypot(dx, dy) || 1;
          const d = clamp01((dx / len) * L[0] + (dy / len) * L[1]);
          const wgt = Math.pow(d, 0.8) * 0.85;
          c = c.map((v, j) => v * (1 - wgt) + rim[j] * wgt);
        }
      }
      for (let j = 0; j < 3; j++) out[i * 4 + j] = Math.round(clamp01(c[j]) * 255);
    }
  }
  return out;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const manifest = [];
  for (const [file, body, theme] of FILES) {
    const input = await readFile(path.join(srcDir, file));
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4) throw new Error(`${file}: expected RGBA, got ${info.channels} channels`);
    const px = grade(data, info.width, info.height, body, theme);
    const webp = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: BODIES[body].quality, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toBuffer();
    // Verify: same size, alpha unchanged.
    const back = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (back.info.width !== info.width || back.info.height !== info.height) throw new Error(`${file}: size changed`);
    for (let i = 3; i < data.length; i += 4) {
      if (back.data[i] !== data[i]) throw new Error(`${file}: alpha changed at byte ${i}`);
    }
    await writeFile(path.join(outDir, file), webp);
    manifest.push({
      file, width: info.width, height: info.height, bytes: webp.length,
      sha256: createHash('sha256').update(webp).digest('hex'),
    });
  }
  console.log(`grade-planets: ${weighted ? 'alpha-weighted' : 'plain'} blur`);
  console.log('file\twidth\theight\tbytes\tsha256');
  for (const m of manifest) console.log(`${m.file}\t${m.width}\t${m.height}\t${m.bytes}\t${m.sha256}`);
  const nep = manifest.filter((m) => m.file.startsWith('real-neptune')).reduce((s, m) => s + m.bytes, 0);
  console.log(`neptune pair total: ${nep} bytes${nep > 40000 ? ' (OVER the 40000-byte inner-page budget)' : ''}`);
}

main().catch((err) => {
  console.error(`grade-planets failed: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
