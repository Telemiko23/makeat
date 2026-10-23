import { describe, expect, it } from 'vitest';
import { roundQty } from './format';

describe('roundQty', () => {
  it('rounds large weights and volumes to measurable steps', () => {
    expect(roundQty(437, 'g')).toBe(440);
    expect(roundQty(62.5, 'ml')).toBe(65);
  });

  it('keeps small amounts close to the recipe', () => {
    expect(roundQty(1.25, 'g')).toBe(1.5);
    expect(roundQty(0.1, 'g')).toBe(0.5);
    expect(roundQty(0.3, 'tsp')).toBe(0.25);
    expect(roundQty(0.6, 'tbsp')).toBe(0.5);
    expect(roundQty(1.3, 'pcs')).toBe(1.5);
  });

  it('never shows zero', () => {
    expect(roundQty(0.01, 'tsp')).toBe(0.25);
    expect(roundQty(0.01, 'pcs')).toBe(0.5);
  });
});
