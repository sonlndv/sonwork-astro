// Pure helpers for the initial-paint baseline of the pixel controls in tests/e2e/sky-valley.spec.ts. Erasable TypeScript only
// (no enums, namespaces or parameter properties), so Node's built-in type stripping can run it from tests/unit as well.

// Strict pixel comparison shared by the restoration control: the per-channel tolerance is 2/255 and nothing is loosened here.
export type Pixels = { width: number; height: number; channels: number; data: Uint8Array };
export type Difference = { maximumChannel: number; materialPixels: number };

export function compareRaster(base: Pixels, other: Pixels, tolerance = 2): Difference {
  if (base.width !== other.width || base.height !== other.height || base.channels !== other.channels) {
    throw new Error('Rasters differ in size or channel count: ' + [base.width, base.height, base.channels] + ' vs ' + [other.width, other.height, other.channels]);
  }
  let maximumChannel = 0;
  let materialPixels = 0;
  for (let i = 0; i < base.data.length; i += base.channels) {
    let delta = 0;
    for (let channel = 0; channel < base.channels; channel++) delta = Math.max(delta, Math.abs(base.data[i + channel] - other.data[i + channel]));
    maximumChannel = Math.max(maximumChannel, delta);
    if (delta > tolerance) materialPixels += 1;
  }
  return { maximumChannel, materialPixels };
}

// Bounded capture-convergence precondition. Successive rendered frames are captured until two CONSECUTIVE frames agree (`same`),
// and the later of that pair is the baseline. A first frame that disagrees with its successor (for example a body not yet
// painted) is therefore not chosen, and the sequence keeps going. If no consecutive pair agrees within `maxFrames` captures it
// throws. Agreement is convergence between those two samples only: two equal but still-incomplete frames would be accepted, and
// it does not prove that a delayed image cannot appear later. It makes no claim about which decode, raster, upload or
// compositor step was pending, and it must never be used to resample a failed restoration check.
export async function settledFrame<T>(
  capture: () => Promise<T>,
  same: (previous: T, current: T) => boolean,
  options: { maxFrames?: number; label?: string } = {},
): Promise<{ frame: T; captures: number }> {
  const maxFrames = options.maxFrames ?? 8;
  if (!Number.isInteger(maxFrames) || maxFrames < 2) throw new Error('settledFrame needs maxFrames >= 2');
  let previous = await capture();
  for (let captures = 2; captures <= maxFrames; captures++) {
    const current = await capture();
    if (same(previous, current)) return { frame: current, captures };
    previous = current;
  }
  throw new Error((options.label ? options.label + ': ' : '') + 'initial paint never stabilised: no two consecutive captures agreed within ' + maxFrames + ' frames');
}
