import {Component, computed, DestroyRef, effect, inject, signal, untracked} from '@angular/core';
import {rxResource, takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTableModule} from '@angular/material/table';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TranslocoDirective} from '@jsverse/transloco';
import {DateFormatOptions, TranslocoDatePipe, TranslocoDecimalPipe} from '@jsverse/transloco-locale';
import {filter, Subscription, switchMap} from 'rxjs';
import {ConfirmDialogComponent, ConfirmDialogData} from '../../components/confirm-dialog/confirm-dialog.component';
import {MatcherErrorComponent} from '../../components/matcher-error/matcher-error.component';
import {IndexRun, IndexTrigger} from '../../models/matcher.model';
import {MatcherApiService} from '../../services/matcher-api.service';
import {MatcherError, toMatcherError} from '../../utils/matcher-error.util';

const RUN_LIMIT = 20;

/** "1 h 02 min", "3 min 05 s", "12 s". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${h} h ${pad(m)} min`;
  }
  return m > 0 ? `${m} min ${pad(s)} s` : `${s} s`;
}

/**
 * The matcher's index: what is in it, the run history, and the two re-index triggers. A run is watched by
 * polling `GET /v1/index/runs/{id}`; its counters only arrive when it finishes, so while it runs the page
 * shows elapsed time and the age of its last heartbeat instead.
 */
@Component({
  selector: 'themis-index',
  imports: [
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    FaIconComponent,
    TranslocoDirective,
    TranslocoDatePipe,
    TranslocoDecimalPipe,
    MatcherErrorComponent
  ],
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent {

  private readonly api = inject(MatcherApiService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = ['id', 'kind', 'source', 'state', 'started', 'duration', 'embedded', 'skipped', 'deleted', 'truncated', 'invalid'];
  protected readonly dateFormat: DateFormatOptions = {dateStyle: 'medium', timeStyle: 'short'};

  protected readonly status = rxResource({stream: () => this.api.indexStatus()});
  protected readonly runs = rxResource({stream: () => this.api.runs(RUN_LIMIT)});

  protected readonly statusError$$ = computed(() => this.toError(this.status.error()));
  protected readonly runsError$$ = computed(() => this.toError(this.runs.error()));

  /** The run this page is polling: one it started, the one blocking a trigger, or one found running on load. */
  protected readonly watchedRun$$ = signal<IndexRun | undefined>(undefined);
  /** A failed trigger, shown under the buttons. */
  protected readonly triggerError$$ = signal<MatcherError | undefined>(undefined);

  protected readonly running$$ = computed(() =>
    this.watchedRun$$()?.state === 'running'
    || (this.runs.hasValue() && this.runs.value().some(run => run.state === 'running'))
  );

  /** Ticks once a second while something runs, so elapsed and heartbeat ages stay current. */
  private readonly now$$ = signal(Date.now());
  private watching?: Subscription;
  private watchingId?: number;

  constructor() {
    effect(onCleanup => {
      if (!this.running$$()) {
        return;
      }
      const id = setInterval(() => this.now$$.set(Date.now()), 1000);
      onCleanup(() => clearInterval(id));
    });

    // Pick up a run started elsewhere (CLI, another tab), so its progress shows and the buttons stay locked.
    effect(() => {
      const running = this.runs.hasValue() ? this.runs.value().find(run => run.state === 'running') : undefined;
      if (running && untracked(this.watchedRun$$)?.state !== 'running') {
        untracked(() => this.watch(running.id));
      }
    });
  }

  protected trigger(trigger: IndexTrigger): void {
    const data: ConfirmDialogData = {
      titleKey: `pages.index.confirm.${trigger}.title`,
      bodyKey: `pages.index.confirm.${trigger}.body`,
      confirmKey: 'pages.index.confirm.start',
      warningKey: 'pages.index.confirm.source-warning',
      params: {source: (this.status.hasValue() ? this.status.value().sources : null) ?? '—'}
    };
    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {data, maxWidth: '32rem'})
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.triggerIndex(trigger)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: accepted => {
          this.triggerError$$.set(undefined);
          this.watch(accepted.run_id);
          this.runs.reload(); // so the new run shows in the history right away
        },
        error: (err: unknown) => {
          const error = toMatcherError(err);
          this.triggerError$$.set(error);
          if (error.kind === 'index-run-in-progress' && error.runId != null) {
            this.watch(error.runId);
          }
        }
      });
  }

  protected refresh(): void {
    this.status.reload();
    this.runs.reload();
  }

  /** From start to finish, or to now while still running. */
  protected duration(run: IndexRun): string {
    const end = run.finished_at ? Date.parse(run.finished_at) : this.now$$();
    return formatDuration(end - Date.parse(run.started_at));
  }

  protected secondsSince(timestamp: string): number {
    return Math.max(0, Math.round((this.now$$() - Date.parse(timestamp)) / 1000));
  }

  private watch(id: number): void {
    if (this.watchingId === id && this.watching && !this.watching.closed) {
      return; // already polling this run
    }
    this.watching?.unsubscribe();
    this.watchingId = id;
    this.watching = this.api.pollRun(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: run => this.watchedRun$$.set(run),
        error: (err: unknown) => this.triggerError$$.set(toMatcherError(err)),
        complete: () => {
          if (this.triggerError$$()?.kind === 'index-run-in-progress') {
            this.triggerError$$.set(undefined);
          }
          this.refresh();
        }
      });
  }

  private toError(error: unknown): MatcherError | undefined {
    return error ? toMatcherError(error) : undefined;
  }
}
