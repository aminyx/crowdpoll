/**
 * Join-code generation. Uppercase Crockford-ish alphabet with ambiguous
 * glyphs removed (no 0/O, 1/I/L) so codes survive being read aloud from a
 * projector and typed on a phone.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;

export function generateJoinCode(
  random: (max: number) => number = defaultRandom,
): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[random(ALPHABET.length)];
  }
  return code;
}

export function isValidJoinCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((c) => ALPHABET.includes(c));
}

/** Normalize user input: uppercase, strip separators and invalid glyphs. */
export function normalizeJoinCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^2-9A-HJ-KM-NP-Z]/g, "")
    .slice(0, CODE_LENGTH);
}

function defaultRandom(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}
