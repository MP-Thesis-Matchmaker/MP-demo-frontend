import {seededRandom} from '../../utils/easing.util';
import {DotFieldEngine, ROW_PITCH, TRAVEL} from './dot-field.engine';

const REGION = {x: 100, y: 200, width: 600, height: 300};

describe('DotFieldEngine', () => {
  let engine: DotFieldEngine;

  beforeEach(() => {
    engine = new DotFieldEngine(seededRandom(1));
    engine.resize(900, 600);
  });

  function runTo(from: number, to: number): void {
    for (let now = from; now <= to; now += 16) {
      engine.step(now);
    }
  }

  it('lays the drift out by area and fades it in during the intro', () => {
    engine.introDrift(0, 800, 2000);
    expect(engine.snapshot(0).drift).toHaveLength(60);
    expect(engine.snapshot(0).drift.every(dot => dot.alpha === 0)).toBe(true);
    expect(engine.snapshot(2800).drift.every(dot => dot.alpha === 1)).toBe(true);
    expect(engine.isAnimating(5000)).toBe(true);
  });

  it('spawns flickering accent dots inside the scan region, ramping up', () => {
    engine.scan(0, REGION);
    runTo(0, 100);
    const early = engine.snapshot(100).accent.length;
    runTo(100, 700);
    const accent = engine.snapshot(700).accent;

    expect(early).toBeLessThan(accent.length);
    expect(accent.length).toBe(36);
    for (const dot of accent) {
      expect(dot.x).toBeGreaterThanOrEqual(REGION.x - 2);
      expect(dot.x).toBeLessThanOrEqual(REGION.x + REGION.width + 2);
      expect(dot.y).toBeGreaterThanOrEqual(REGION.y - 2);
      expect(dot.y).toBeLessThanOrEqual(REGION.y + REGION.height + 2);
    }
  });

  it('gathers n dots per target into a row and lets the rest fade', () => {
    engine.scan(0, REGION);
    runTo(0, 1000);
    const end = engine.gather(1000, [{x: 50, y: 60, n: 3}, {x: 50, y: 300, n: 2}], {x: 400, y: 0});
    expect(end).toBe(1000 + 4 * 30 + TRAVEL);

    runTo(1000, end + 600);
    const claimed = engine.snapshot(end).accent.filter(dot => dot.claimed);
    expect(claimed.map(dot => [Math.round(dot.x), Math.round(dot.y)])).toEqual([
      [50, 60], [50 + ROW_PITCH, 60], [50 + 2 * ROW_PITCH, 60], [50, 300], [50 + ROW_PITCH, 300]
    ]);
    expect(engine.snapshot(end + 600).accent.filter(dot => !dot.claimed)).toHaveLength(0);
  });

  it('spawns extra dots when a gather wants more than are alive', () => {
    const end = engine.gather(0, [{x: 10, y: 10, n: 8}], {x: 0, y: 0});
    expect(engine.snapshot(end).accent.filter(dot => dot.claimed)).toHaveLength(8);
  });

  it('draws lines from the origin while dots travel, gone once they land', () => {
    engine.scan(0, REGION);
    runTo(0, 800);
    const end = engine.gather(800, [{x: 50, y: 60, n: 2}], {x: 400, y: 0});
    expect(engine.snapshot(1200).lines.length).toBeGreaterThan(0);
    expect(engine.snapshot(1200).lines[0].from).toEqual({x: 400, y: 0});
    expect(engine.snapshot(end + 200).lines).toHaveLength(0);
  });

  it('absorbs everything and comes to rest', () => {
    engine.scan(0, REGION);
    runTo(0, 800);
    const gathered = engine.gather(800, [{x: 50, y: 60, n: 2}], {x: 0, y: 0});
    const empty = engine.absorb(gathered);
    runTo(gathered, empty + 700);

    expect(engine.snapshot(empty + 700).accent).toHaveLength(0);
    expect(engine.isAnimating(empty + 700)).toBe(false);
  });

  it('lands every change at once when still', () => {
    const still = new DotFieldEngine(seededRandom(1), true);
    still.resize(900, 600);
    still.introDrift(0, 800, 2000);
    expect(still.snapshot(0).drift.every(dot => dot.alpha === 1)).toBe(true);
    expect(still.snapshot(0).drift[0]).toEqual(still.snapshot(9999).drift[0]);
    expect(still.gather(0, [{x: 0, y: 0, n: 1}], {x: 0, y: 0})).toBe(0);
  });
});
