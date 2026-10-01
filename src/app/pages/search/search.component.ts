import {Component, computed, effect, inject, input, untracked} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {TextFieldModule} from '@angular/cdk/text-field';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TranslocoDirective} from '@jsverse/transloco';
import {MatchCardComponent} from '../../components/match-card/match-card.component';
import {MatcherErrorComponent} from '../../components/matcher-error/matcher-error.component';
import {RecommendationPanelComponent} from '../../components/recommendation-panel/recommendation-panel.component';
import {MatchRequest} from '../../models/matcher.model';
import {MatcherApiService} from '../../services/matcher-api.service';
import {MatcherError, toMatcherError} from '../../utils/matcher-error.util';

export const DEFAULT_TOP_K = 5;
const TOP_K_OPTIONS = [3, 5, 10, 20];

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
    RecommendationPanelComponent
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
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

  constructor() {
    // URL → form, so the box shows what the results are for (also after back/forward).
    effect(() => {
      const request = this.request$$();
      untracked(() => this.form.setValue({
        query: request?.query ?? '',
        topK: request?.top_k ?? DEFAULT_TOP_K
      }));
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

  private toError(error: unknown): MatcherError | undefined {
    return error ? toMatcherError(error) : undefined;
  }
}
