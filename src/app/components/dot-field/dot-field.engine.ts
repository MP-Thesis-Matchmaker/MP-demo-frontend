import {clamp, easeInOutCubic, easeInOutQuart, easeOutCubic, lerp, progress, seededRandom} from '../../utils/easing.util';

// The landing video's record field, without Angular so it can be stepped and inspected in a spec. Two
// populations share the canvas:
//   - drift dots: grey, laid out once from a seed, swaying on slow sines (the video's 10px / 8px at
//     .35 / .28 rad/s). They are the "index", always there on the landing page, faint behind a search.
//   - accent dots: violet, only while a search runs. `scan` spawns short-lived dots that pop in, grow and
//     flicker (records being found); `gather` sends some of them into a row at each shortlist card, with
//     lines drawn from the query box like the video's Narrow scene; `absorb` lets the cards take them.
// All times are milliseconds on the caller's clock (performance.now() in the browser).

export interface DotColors {
  dot: string;
  accent: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A shortlist slot: `n` dots line up starting at (x, y). */
export interface GatherTarget extends Point {
  n: number;
}

export interface DotSnapshot extends Point {
  size: number;
  alpha: number;
}

export interface FieldSnapshot {
  drift: DotSnapshot[];
  accent: (DotSnapshot & {claimed: boolean})[];
  lines: {from: Point; to: Point; alpha: number}[];
}

interface DriftDot {
  u: number;
  v: number;
  size: number;
  phase: number;
  delay: number;
}

interface Travel {
  from: Point;
  to: Point;
  start: number;
  size: number;
  alpha: number;
}

interface AccentDot extends Point {
  born: number;
  life: number;
  omega: number;
  phase: number;
  travel?: Travel;
  dyingFrom?: number;
}

interface Tween {
  from: number;
  to: number;
  start: number;
  duration: number;
}

export const DRIFT_POOL = 220;
/** One drift dot per this many square pixels, up to DRIFT_POOL. */
const DRIFT_AREA_PER_DOT = 9000;
const SCAN_RAMP = 600;
export const TRAVEL = 900;
const TRAVEL_STAGGER = 30;
const LINE_DRAW = 700;
const ABSORB = 350;
const DIE = 400;
/** Gap between the dots of one shortlist row (the video's 22px at 1920 wide). */
export const ROW_PITCH = 12;

function inside(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export class DotFieldEngine {

  private width = 0;
  private height = 0;
  private readonly drift: DriftDot[];
  private driftLevel: Tween = {from: 0, to: 0, start: 0, duration: 0};
  private introStart = -Infinity;
  private introDuration = 0;

  private accents: AccentDot[] = [];
  private scanRegion?: Rect;
  /** While a search runs, drift shows only inside its region, so it never sits over the form. */
  private clip?: Rect;
  private scanStart = 0;
  private origin?: Point;
  private absorbStart?: number;

  /**
   * @param random  source for the scan's spawn points and lifetimes (seed it in specs)
   * @param still   reduced motion: no sway and no tweening, every change lands at once
   * @param seed    the drift layout, so the field looks the same on every visit
   */
  constructor(private readonly random: () => number = Math.random, private readonly still = false, seed = 7) {
    const layout = seededRandom(seed);
    this.drift = Array.from({length: DRIFT_POOL}, () => ({
      u: .03 + layout() * .94,
      v: .04 + layout() * .92,
      size: 3 + layout() * 3,
      phase: layout() * Math.PI * 2,
      delay: 0
    }));
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Drift dots fade in one by one over `stagger`, each taking `duration`: the intro. */
  public introDrift(now: number, duration: number, stagger: number, level = 1): void {
    this.introStart = now;
    this.introDuration = this.still ? 0 : duration;
    this.drift.forEach(dot => dot.delay = this.still ? 0 : this.random() * stagger);
    this.driftLevel = {from: level, to: level, start: now, duration: 0};
  }

  /** Fades the whole drift population to `to` (0..1). */
  public fadeDrift(now: number, to: number, duration: number): void {
    this.driftLevel = {from: this.level(now), to, start: now, duration: this.still ? 0 : duration};
  }

  /** Starts (or restarts) the flicker of found records inside `region`. */
  public scan(now: number, region: Rect): void {
    this.scanRegion = region;
    this.clip = region;
    this.scanStart = now;
    this.origin = undefined;
    this.absorbStart = undefined;
    this.accents = [];
    if (this.level(now) === 0) {
      this.introDrift(now, 500, 600, .6);
    } else {
      this.fadeDrift(now, .6, 500);
    }
  }

  /**
   * Stops spawning, claims `n` dots per target and sends them into a row there; the rest fade. Lines draw
   * from `origin` to the travelling dots. Returns the time the last dot lands.
   */
  public gather(now: number, targets: GatherTarget[], origin: Point): number {
    const region = this.scanRegion ?? {x: 0, y: 0, width: this.width, height: this.height};
    this.origin = origin;
    this.scanRegion = undefined;
    this.absorbStart = undefined;

    const free = this.accents.filter(dot => !dot.travel && dot.dyingFrom === undefined);
    let order = 0;
    for (const target of targets) {
      for (let j = 0; j < target.n; j++) {
        let dot = free.shift();
        if (!dot) {
          dot = this.spawn(now - 200, region);
          this.accents.push(dot);
        }
        const look = this.look(dot, now);
        dot.travel = {
          from: {x: look.x, y: look.y},
          to: {x: target.x + j * ROW_PITCH, y: target.y},
          start: now + order++ * TRAVEL_STAGGER,
          size: Math.max(look.size, 3),
          alpha: Math.max(look.alpha, .5)
        };
      }
    }
    free.forEach(dot => dot.dyingFrom = now);
    this.fadeDrift(now, .25, 600);
    return this.still ? now : now + Math.max(0, order - 1) * TRAVEL_STAGGER + TRAVEL;
  }

  /** The cards take the gathered dots and the field empties. Returns the time it is empty. */
  public absorb(now: number, driftTo = 0): number {
    this.scanRegion = undefined;
    this.absorbStart = now;
    this.fadeDrift(now, driftTo, 600);
    return this.still ? now : now + ABSORB;
  }

  /** Whether anything still moves, i.e. whether the render loop has to keep going. */
  public isAnimating(now: number): boolean {
    const swaying = !this.still && this.level(now) > 0;
    const tweening = now < this.driftLevel.start + this.driftLevel.duration;
    return swaying || tweening || this.accents.length > 0 || this.scanRegion !== undefined;
  }

  /** Advances the population: spawns while scanning, retires what has finished. */
  public step(now: number): void {
    if (this.absorbStart !== undefined && now >= this.absorbStart + ABSORB) {
      this.accents = [];
      this.absorbStart = undefined;
      this.origin = undefined;
    }
    if (this.clip && !this.scanRegion && this.accents.length === 0 && this.level(now) === 0) {
      this.clip = undefined;
    }
    this.accents = this.accents.filter(dot =>
      dot.travel || (dot.dyingFrom === undefined ? now < dot.born + dot.life : now < dot.dyingFrom + DIE));

    const region = this.scanRegion;
    if (region) {
      const max = clamp(Math.round(region.width * region.height / 5000), 18, 60);
      const wanted = Math.round(max * progress(now, this.scanStart, SCAN_RAMP));
      while (this.accents.length < wanted) {
        this.accents.push(this.spawn(now, region));
      }
    }
  }

  public snapshot(now: number): FieldSnapshot {
    const t = this.still ? 0 : now / 1000;
    const level = this.level(now);
    const count = Math.min(DRIFT_POOL, Math.round(this.width * this.height / DRIFT_AREA_PER_DOT));
    const drift: DotSnapshot[] = [];
    if (level > 0) {
      for (let i = 0; i < count; i++) {
        const dot = this.drift[i];
        const x = dot.u * this.width + Math.sin(t * .35 + dot.phase) * 10;
        const y = dot.v * this.height + Math.cos(t * .28 + dot.phase) * 8;
        if (this.clip && !inside(this.clip, x, y)) {
          continue;
        }
        drift.push({x, y, size: dot.size, alpha: level * progress(now, this.introStart + dot.delay, this.introDuration, easeOutCubic)});
      }
    }

    const absorbed = this.absorbStart === undefined ? 0 : progress(now, this.absorbStart, ABSORB, easeInOutCubic);
    const accent = this.accents.map(dot => {
      const look = this.look(dot, now);
      return {...look, size: look.size * (1 - absorbed), alpha: look.alpha * (1 - absorbed), claimed: !!dot.travel};
    });

    const lines: FieldSnapshot['lines'] = [];
    const origin = this.origin;
    if (origin && !this.still) {
      this.accents.forEach((dot, i) => {
        if (!dot.travel) {
          return;
        }
        const drawn = progress(now, dot.travel.start, LINE_DRAW, easeInOutCubic);
        const fade = 1 - progress(now, dot.travel.start + TRAVEL - 300, 400, easeInOutCubic);
        if (drawn > 0 && fade > 0) {
          const end = accent[i];
          lines.push({from: origin, to: {x: lerp(origin.x, end.x, drawn), y: lerp(origin.y, end.y, drawn)}, alpha: .4 * fade});
        }
      });
    }
    return {drift, accent, lines};
  }

  public draw(ctx: CanvasRenderingContext2D, now: number, colors: DotColors): void {
    const {drift, accent, lines} = this.snapshot(now);
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = colors.dot;
    for (const dot of drift) {
      this.disc(ctx, dot);
    }

    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    for (const line of lines) {
      ctx.globalAlpha = line.alpha;
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    }

    ctx.fillStyle = colors.accent;
    for (const dot of accent) {
      this.disc(ctx, dot);
    }
    ctx.globalAlpha = 1;
  }

  private disc(ctx: CanvasRenderingContext2D, dot: DotSnapshot): void {
    if (dot.alpha <= .005 || dot.size <= .1) {
      return;
    }
    ctx.globalAlpha = Math.min(1, dot.alpha);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private level(now: number): number {
    const {from, to, start, duration} = this.driftLevel;
    return lerp(from, to, progress(now, start, duration, easeInOutCubic));
  }

  private spawn(now: number, region: Rect): AccentDot {
    return {
      x: region.x + this.random() * region.width,
      y: region.y + this.random() * region.height,
      born: now,
      life: 600 + this.random() * 800,
      omega: 6 + this.random() * 10,
      phase: this.random() * Math.PI * 2
    };
  }

  /** Where an accent dot is and how it looks at `now`. */
  private look(dot: AccentDot, now: number): DotSnapshot {
    const travel = dot.travel;
    if (travel) {
      const moved = this.still ? 1 : progress(now, travel.start, TRAVEL, easeInOutQuart);
      const settled = this.still ? 1 : progress(now, travel.start, 300, easeOutCubic);
      return {
        x: lerp(travel.from.x, travel.to.x, moved),
        y: lerp(travel.from.y, travel.to.y, moved),
        size: lerp(travel.size, 6, settled),
        alpha: lerp(travel.alpha, 1, settled)
      };
    }
    const age = clamp((now - dot.born) / dot.life, 0, 1);
    const pop = easeOutCubic(clamp(age / .2, 0, 1));
    const fade = age > .75 ? 1 - (age - .75) / .25 : 1;
    const dying = dot.dyingFrom === undefined ? 1 : 1 - progress(now, dot.dyingFrom, DIE, easeInOutCubic);
    const t = now / 1000;
    return {
      x: dot.x + Math.sin(t * 3 + dot.phase) * 1.5,
      y: dot.y + Math.cos(t * 2.6 + dot.phase) * 1.5,
      size: lerp(3, 7, easeOutCubic(clamp(age / .5, 0, 1))) * pop,
      alpha: (.55 + .45 * Math.sin(dot.omega * t + dot.phase)) * pop * fade * dying
    };
  }
}
