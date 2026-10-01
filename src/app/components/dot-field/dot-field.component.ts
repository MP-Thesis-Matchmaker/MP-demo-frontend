import {afterNextRender, Component, DestroyRef, DOCUMENT, effect, ElementRef, inject, viewChild} from '@angular/core';
import {IntroMode, MotionService} from '../../services/motion.service';
import {ThemeService} from '../../services/theme.service';
import {DotColors, DotFieldEngine, GatherTarget, Point, Rect} from './dot-field.engine';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, Math.max(0, ms)));

/**
 * A canvas filling its (positioned) parent, drawing DotFieldEngine. The render loop runs only while
 * something moves, and pauses while the tab is hidden or the field is scrolled out of view.
 *
 * Positions passed in (`scan`, `gather`) are in this element's coordinates; `toLocal` converts a
 * `getBoundingClientRect()`. Under reduced motion the field is drawn once, still, and every promise resolves
 * straight away. Without a 2D context (jsdom) it draws nothing, and the promises still resolve on time.
 */
@Component({
  selector: 'themis-dot-field',
  template: '<canvas #canvas></canvas>',
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
      /* Read back resolved by readColors(): light-dark() tokens become plain colours on real properties. */
      color: var(--themis-dot);
      border-color: var(--themis-accent);
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: {'aria-hidden': 'true'}
})
export class DotFieldComponent {

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly doc = inject(DOCUMENT);
  private readonly motion = inject(MotionService);
  private readonly engine = new DotFieldEngine(Math.random, this.motion.reduced$$());

  private ctx: CanvasRenderingContext2D | null = null;
  private colors: DotColors = {dot: 'transparent', accent: 'transparent'};
  private frame?: number;
  private inView = true;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const theme = inject(ThemeService);

    afterNextRender(() => {
      this.ctx = this.canvas().nativeElement.getContext('2d');
      this.readColors();
      this.fit();

      const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => this.fit());
      resize?.observe(this.host);
      const intersection = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        this.kick();
      });
      intersection?.observe(this.host);
      const onVisibility = () => this.kick();
      this.doc.addEventListener('visibilitychange', onVisibility);

      destroyRef.onDestroy(() => {
        resize?.disconnect();
        intersection?.disconnect();
        this.doc.removeEventListener('visibilitychange', onVisibility);
        if (this.frame !== undefined) {
          cancelAnimationFrame(this.frame);
        }
      });
    });

    // The colours are light-dark() tokens; re-read them once the new colour scheme has been applied.
    effect(() => {
      theme.resolved$$();
      requestAnimationFrame(() => {
        this.readColors();
        this.render(performance.now());
      });
    });
  }

  /** The landing intro: drift dots fade in one by one (`full`), quickly (`short`), or are simply there. */
  public intro(mode: IntroMode): void {
    const now = performance.now();
    if (mode === 'full') {
      this.engine.introDrift(now, 800, 2000);
    } else if (mode === 'short') {
      this.engine.introDrift(now, 400, 300);
    } else {
      this.engine.introDrift(now, 0, 0);
    }
    this.kick();
  }

  /** Records being found: violet dots flicker inside `region` until `gather` or `absorb`. */
  public scan(region: Rect): void {
    if (this.motion.reduced$$()) {
      return;
    }
    this.engine.scan(performance.now(), region);
    this.kick();
  }

  /** Sends dots into a row at each target, lines drawn from `origin`; resolves when the last one lands. */
  public gather(targets: GatherTarget[], origin: Point): Promise<void> {
    if (this.motion.reduced$$()) {
      return Promise.resolve();
    }
    const now = performance.now();
    const end = this.engine.gather(now, targets, origin);
    this.kick();
    return wait(end - now);
  }

  /** The dots are taken up by what they gathered at; the field fades to `driftTo`. */
  public absorb(driftTo = 0): Promise<void> {
    const now = performance.now();
    const end = this.engine.absorb(now, driftTo);
    this.kick();
    return wait(end - now);
  }

  /** A viewport rect (getBoundingClientRect) in this field's coordinates. */
  public toLocal(rect: DOMRect | Rect): Rect {
    const origin = this.host.getBoundingClientRect();
    const {x, y, width, height} = rect;
    return {x: x - origin.x, y: y - origin.y, width, height};
  }

  private fit(): void {
    const canvas = this.canvas().nativeElement;
    const {width, height} = this.host.getBoundingClientRect();
    const ratio = this.doc.defaultView?.devicePixelRatio ?? 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.engine.resize(width, height);
    this.render(performance.now());
    this.kick();
  }

  private readColors(): void {
    const style = this.doc.defaultView?.getComputedStyle(this.host);
    if (style) {
      this.colors = {dot: style.color, accent: style.borderTopColor};
    }
  }

  /** Starts the loop if something moves and anyone can see it; the loop stops itself when that ends. */
  private kick(): void {
    if (this.frame === undefined && this.inView && !this.doc.hidden && this.engine.isAnimating(performance.now())) {
      this.frame = requestAnimationFrame(now => this.loop(now));
    }
  }

  private loop(now: number): void {
    this.frame = undefined;
    this.render(now);
    this.kick();
  }

  private render(now: number): void {
    this.engine.step(now);
    if (this.ctx) {
      this.engine.draw(this.ctx, now, this.colors);
    }
  }
}
