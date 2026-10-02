import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {CdkTextareaAutosize, TextFieldModule} from '@angular/cdk/text-field';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TranslocoDirective} from '@jsverse/transloco';
import {DotFieldComponent} from '../../components/dot-field/dot-field.component';
import {GatherTarget} from '../../components/dot-field/dot-field.engine';
import {MatchCardComponent} from '../../components/match-card/match-card.component';
import {MatcherErrorComponent} from '../../components/matcher-error/matcher-error.component';
import {RecommendationPanelComponent} from '../../components/recommendation-panel/recommendation-panel.component';
import {MatchRequest, MatchResponse} from '../../models/matcher.model';
import {MatcherApiService} from '../../services/matcher-api.service';
import {MotionService} from '../../services/motion.service';
import {clamp} from '../../utils/easing.util';
import {MatcherError, toMatcherError} from '../../utils/matcher-error.util';

export const DEFAULT_TOP_K = 5;
const TOP_K_OPTIONS = [3, 5, 10, 20];

/** The shortest the dots flicker before gathering, so a fast answer still reads as a search. */
export const MIN_SCAN_MS = 1200;
/** How long the enlarged box takes to narrow (the view transition), after which the names come off. */
const NARROW_MS = 900;
/** Cards that get a row of dots; further down the list they would gather off screen. */
const GATHER_CARDS = 6;

/** `idle` before any search, `scanning` while dots flicker, `gathering` while they fly, `revealed` after. */
export type SearchPhase = 'idle' | 'scanning' | 'gathering' | 'revealed';

/** `k` from the URL, clamped to what the matcher accepts (1..50). */
function parseTopK(raw: string | undefined): number {
  const k = Number.parseInt(raw ?? '', 10);
  return Number.isNaN(k) ? DEFAULT_TOP_K : Math.min(50, Math.max(1, k));
}

/**
 * Query → ranked supervisors (`/v1/match`) and, side by side, the synthesised recommendation
 * (`/v1/recommend`). The URL (`?q=…&k=…`) is the only source of truth: submitting navigates, both requests
 * follow the query params, so a reload or a shared link reproduces the search.
 */
@Component({
  selector: 'themis-search',
  imports: [
    ReactiveFormsModule,
    TextFieldModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    FaIconComponent,
    TranslocoDirective,
    MatchCardComponent,
    MatcherErrorComponent,
    RecommendationPanelComponent,
    DotFieldComponent
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  // A drag can end outside the textarea, where its own pointerup never fires.
  host: {'(document:pointerup)': 'endManualResize()'}
})
export class SearchComponent {

  /** Query params, bound by `withComponentInputBinding()`. */
  public readonly q = input<string>();
  public readonly k = input<string>();

  private readonly api = inject(MatcherApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly examples = ['rag', 'history', 'finance'] as const;

  protected readonly form = new FormGroup({
    query: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    topK: new FormControl(DEFAULT_TOP_K, {nonNullable: true})
  });

  protected readonly request$$ = computed<MatchRequest | undefined>(() => {
    const query = this.q()?.trim();
    return query ? {query, top_k: parseTopK(this.k())} : undefined;
  });

  /** The fixed choices, plus whatever `k` a hand-edited URL asked for. */
  protected readonly topKOptions$$ = computed(() => {
    const current = this.request$$()?.top_k ?? DEFAULT_TOP_K;
    return TOP_K_OPTIONS.includes(current) ? TOP_K_OPTIONS : [...TOP_K_OPTIONS, current].sort((a, b) => a - b);
  });

  // Both follow the same params, so one submit fires them in parallel and a new query cancels both.
  protected readonly matches = rxResource({
    params: () => this.request$$(),
    stream: ({params}) => this.api.match(params)
  });
  protected readonly recommendation = rxResource({
    params: () => this.request$$(),
    stream: ({params}) => this.api.recommend(params)
  });

  protected readonly matchError$$ = computed(() => this.toError(this.matches.error()));
  protected readonly recommendationError$$ = computed(() => this.toError(this.recommendation.error()));

  /** When both calls fail the same way (matcher down, no index), say it once, full width. */
  protected readonly sharedError$$ = computed<MatcherError | undefined>(() => {
    const match = this.matchError$$();
    const recommend = this.recommendationError$$();
    return match && recommend && match.kind === recommend.kind ? match : undefined;
  });

  /**
   * The enlarged box before the first search. Latches off: once a query has run, the page stays compact
   * even if the URL loses its query again. A deep link (`?q=…`) starts compact.
   */
  protected readonly fresh$$ = linkedSignal<MatchRequest | undefined, boolean>({
    source: this.request$$,
    computation: (request, previous) => previous?.value === false ? false : !request
  });
  /** True while the enlarged box narrows; the view-transition names stay on until it has. */
  private readonly narrowing$$ = signal(false);
  protected readonly morph$$ = computed(() => this.fresh$$() || this.narrowing$$());

  protected readonly phase$$ = signal<SearchPhase>('idle');

  /** "N indexed records overlap your query · K supervisors ranked", once the shortlist is shown. */
  protected readonly overlap$$ = computed(() => {
    if (this.phase$$() !== 'revealed' || !this.matches.hasValue()) {
      return undefined;
    }
    const matches = this.matches.value().matches;
    if (matches.length === 0) {
      return undefined;
    }
    const records = matches.reduce((sum, match) => sum + match.publication_count + match.posting_count, 0);
    return {records, supervisors: matches.length};
  });

  private readonly injector = inject(Injector);
  private readonly motion = inject(MotionService);
  /** Without motion the dots stay away, so the spinner is the loading indicator again. */
  protected readonly reducedMotion$$ = this.motion.reduced$$;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // Optional: the first choreography step runs from an effect, before the view exists.
  private readonly field = viewChild(DotFieldComponent);
  private readonly queryArea = viewChild.required<ElementRef<HTMLTextAreaElement>>('queryArea');
  private readonly autosize = viewChild.required(CdkTextareaAutosize);
  /** The textarea's height when a pointer went down on it, to tell a resize drag from a click. */
  private heightAtPointerDown?: number;
  /** Bumped per search, so a choreography step for a superseded search does nothing. */
  private run = 0;
  private scanStart = 0;

  constructor() {
    // URL → form, so the box shows what the results are for (also after back/forward).
    effect(() => {
      const request = this.request$$();
      untracked(() => this.form.setValue({
        query: request?.query ?? '',
        topK: request?.top_k ?? DEFAULT_TOP_K
      }));
    });

    // The first search narrows the box: the class change lands inside the router's view transition for
    // the `?q=` navigation, which morphs the named elements. The textarea's font changes with it, so it is
    // re-fitted once the compact styles apply.
    // Not read here in the constructor: the query-param inputs are not bound yet, so a deep link would
    // first look fresh and then "narrow".
    let wasFresh: boolean | undefined;
    effect(() => {
      const fresh = this.fresh$$();
      if (wasFresh === true && !fresh) {
        untracked(() => this.narrow());
      }
      wasFresh = fresh;
    });

    effect(() => {
      const loading = this.matches.isLoading();
      const value = this.matches.hasValue() ? this.matches.value() : undefined;
      untracked(() => this.choreograph(loading, value));
    });
  }

  protected submit(): void {
    const query = this.form.controls.query.value.trim();
    if (!query) {
      return;
    }
    const topK = this.form.controls.topK.value;
    const current = this.request$$();
    if (current?.query === query && current.top_k === topK) {
      // Same URL, so navigating would be a no-op: re-run explicitly.
      this.matches.reload();
      this.recommendation.reload();
      return;
    }
    void this.router.navigate([], {relativeTo: this.route, queryParams: {q: query, k: topK}});
  }

  protected runExample(query: string): void {
    this.form.controls.query.setValue(query);
    this.submit();
  }

  protected startManualResize(): void {
    this.heightAtPointerDown = this.queryArea().nativeElement.offsetHeight;
  }

  /**
   * After a drag on the resize handle, the user's height wins over autosize: left on, autosize would snap
   * the box back on the next keystroke, and its inline max-height caps the drag at 8 rows. Turning it off
   * resets to the initial height, so the dragged one is put back afterwards.
   */
  protected endManualResize(): void {
    const before = this.heightAtPointerDown;
    this.heightAtPointerDown = undefined;
    const textarea = this.queryArea().nativeElement;
    if (before === undefined || textarea.offsetHeight === before) {
      return;
    }
    const height = textarea.style.height || `${textarea.offsetHeight}px`;
    this.autosize().enabled = false;
    textarea.style.height = height;
    // Lifts the stylesheet's 8-line cap, so a drag can go taller than autosize would.
    textarea.style.maxHeight = 'none';
  }

  private narrow(): void {
    this.narrowing$$.set(true);
    // CDK caches the line and placeholder heights and only drops them on a window resize, so that is
    // the public way to refit the box at its compact font.
    afterNextRender(() => this.host.ownerDocument.defaultView?.dispatchEvent(new Event('resize')), {injector: this.injector});
    setTimeout(() => this.narrowing$$.set(false), NARROW_MS);
  }

  /**
   * The Narrow and Shortlist scenes. While the match request runs, violet dots flicker over the results
   * area. When it answers (and the dots have had MIN_SCAN_MS), they gather into a row at each card, lines
   * drawn from the query box, and the cards appear as the dots are absorbed. The cards are rendered but
   * hidden meanwhile, which is what lets the dots fly to where they will be.
   */
  private choreograph(loading: boolean, value: MatchResponse | undefined): void {
    const run = ++this.run;
    if (loading) {
      this.phase$$.set('scanning');
      this.scanStart = performance.now();
      afterNextRender(() => {
        const field = this.field();
        if (run === this.run && field) {
          field.scan(this.resultsRegion(field));
        }
      }, {injector: this.injector});
      return;
    }
    if (!value) {
      // Idle, or the request failed: nothing to gather.
      this.phase$$.set(this.request$$() ? 'revealed' : 'idle');
      void this.field()?.absorb();
      return;
    }
    const hold = this.motion.reduced$$() ? 0 : Math.max(0, this.scanStart + MIN_SCAN_MS - performance.now());
    setTimeout(async () => {
      if (run !== this.run) {
        return;
      }
      const field = this.field();
      const targets = field ? this.gatherTargets(field, value) : [];
      if (field && targets.length > 0) {
        this.phase$$.set('gathering');
        await field.gather(targets, this.queryOrigin(field));
        if (run !== this.run) {
          return;
        }
      }
      this.phase$$.set('revealed');
      void field?.absorb();
    }, hold);
  }

  /** The ranked-supervisors column, or at least a generous band of it while it is still short. */
  private resultsRegion(field: DotFieldComponent) {
    const results = this.host.querySelector('.search__matches-column')?.getBoundingClientRect();
    const box = results ? field.toLocal(results) : {x: 0, y: 0, width: this.host.clientWidth, height: 0};
    return {...box, height: Math.max(box.height, 22 * 16)};
  }

  /** Where each (hidden) card's row of dots goes: at its rank number, longer the more records matched. */
  private gatherTargets(field: DotFieldComponent, value: MatchResponse): GatherTarget[] {
    const ranks = Array.from(this.host.querySelectorAll('.search__matches .match-card__rank')).slice(0, GATHER_CARDS);
    return ranks.map((rank, i) => {
      const box = field.toLocal(rank.getBoundingClientRect());
      const match = value.matches[i];
      return {
        x: box.x + 4,
        y: box.y + box.height / 2,
        // A visible row even for a single record, longer for better-evidenced supervisors.
        n: clamp(3 + match.publication_count + match.posting_count, 4, 8)
      };
    });
  }

  /** The bottom centre of the query box, where the Narrow lines start. */
  private queryOrigin(field: DotFieldComponent) {
    const query = this.queryArea().nativeElement.closest('.search__query') ?? this.queryArea().nativeElement;
    const box = field.toLocal(query.getBoundingClientRect());
    return {x: box.x + box.width / 2, y: box.y + box.height};
  }

  private toError(error: unknown): MatcherError | undefined {
    return error ? toMatcherError(error) : undefined;
  }
}
