/**
 * Israeli national ID validation.
 *
 * An Israeli ID is nine digits, the last of which is a check digit. Digits are
 * multiplied alternately by 1 and 2; a two-digit product is replaced by the
 * sum of its digits, and the total must be divisible by 10.
 *
 * This catches typing errors and transposed digits at the point of entry
 * rather than letting them propagate into the wrong record. It does not verify
 * that the number belongs to a real person.
 */
export function isValidIsraeliId(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 9) return false;
  const padded = digits.padStart(9, "0");

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let value = Number(padded[i]) * ((i % 2) + 1);
    if (value > 9) value -= 9;
    sum += value;
  }
  return sum % 10 === 0;
}

/** Normalises to nine digits with leading zeros, as medical records do. */
export function normaliseIsraeliId(raw: string): string {
  return raw.replace(/\D/g, "").padStart(9, "0").slice(-9);
}
