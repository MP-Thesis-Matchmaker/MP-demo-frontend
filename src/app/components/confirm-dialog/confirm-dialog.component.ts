import {Component, computed, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {TranslocoDirective} from '@jsverse/transloco';

/** Translation keys (absolute) plus their params; the dialog translates them itself. */
export interface ConfirmDialogData {
  titleKey: string;
  bodyKey: string;
  confirmKey: string;
  /** Optional caveat, shown as a warning banner under the body. */
  warningKey?: string;
  params?: Record<string, unknown>;
  /** Text the user has to type, exactly, before confirm enables. Not translated. */
  phrase?: string;
  /** Colours the confirm button as destructive. */
  danger?: boolean;
}

/** Yes/no confirmation. Closes with `true` on confirm, `false` or `undefined` otherwise. */
@Component({
  selector: 'themis-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, TranslocoDirective],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);

  protected readonly typed$$ = signal('');
  /** Exact and case-sensitive; only surrounding whitespace is forgiven. */
  protected readonly matches$$ = computed(() => !this.data.phrase || this.typed$$().trim() === this.data.phrase);

  protected confirmTyped(event: Event): void {
    event.preventDefault();
    if (this.matches$$()) {
      this.dialogRef.close(true);
    }
  }
}
