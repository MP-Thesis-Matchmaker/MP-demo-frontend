import {clamp, easeInOutCubic, easeInOutQuart, easeOutCubic, progress, seededRandom} from './easing.util';

describe('easing.util', () => {
  it.each([easeOutCubic, easeInOutCubic, easeInOutQuart])('%o runs from 0 to 1 without going back', ease => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let previous = 0;
    for (let t = .05; t <= 1; t += .05) {
      expect(ease(t)).toBeGreaterThanOrEqual(previous);
      previous = ease(t);
    }
  });

  it('clamps progress to its window', () => {
    expect(progress(50, 100, 200)).toBe(0);
    expect(progress(200, 100, 200)).toBe(.5);
    expect(progress(400, 100, 200)).toBe(1);
    expect(progress(100, 100, 0)).toBe(1);
    expect(clamp(5, 0, 1)).toBe(1);
  });

  it('repeats a seeded sequence', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const values = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(values);
    expect(values.every(v => v >= 0 && v < 1)).toBe(true);
  });
});
