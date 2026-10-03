import type { Units } from '@/lib/workouts';

/**
 * Body height and weight are stored in cm and kg; these convert them for showing and entering in
 * the user's units. Lifting weights (sets) stay in kg.
 */

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

export const weightUnit = (units: Units) => (units === 'imperial' ? 'lb' : 'kg');

/** kg as a number in the user's unit, to one decimal. */
export function toDisplayWeight(kg: number, units: Units): number {
  return oneDecimal(units === 'imperial' ? kg / KG_PER_LB : kg);
}

/**
 * A weight typed in the user's unit, as kg. Pounds keep two decimals of kg so 180 lb reads back
 * as 180, not 179.9.
 */
export function fromDisplayWeight(value: number, units: Units): number {
  return units === 'imperial' ? Math.round(value * KG_PER_LB * 100) / 100 : oneDecimal(value);
}

/** "80.6 kg" or "177.7 lb"; empty when there's no weight. */
export function formatBodyWeight(kg: string | number, units: Units): string {
  const n = Number(kg);
  return n > 0 ? `${toDisplayWeight(n, units)} ${weightUnit(units)}` : '';
}

export function toFeetInches(cm: number): { ft: number; in: number } {
  const total = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(total / 12), in: total % 12 };
}

export const fromFeetInches = (ft: number, inches: number) => oneDecimal((ft * 12 + inches) * CM_PER_IN);

/** "178 cm" or "5 ft 10 in"; empty when there's no height. */
export function formatHeight(cm: string | number, units: Units): string {
  const n = Number(cm);
  if (!(n > 0)) return '';
  if (units === 'metric') return `${n} cm`;
  const { ft, in: inches } = toFeetInches(n);
  return `${ft} ft ${inches} in`;
}

/** Body mass index (kg/m²) to one decimal, or null without both a height and a weight. */
export function bmi(heightCm: string | number, weightKg: string | number): number | null {
  const m = Number(heightCm) / 100;
  const kg = Number(weightKg);
  return m > 0 && kg > 0 ? oneDecimal(kg / (m * m)) : null;
}
