import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TranslocoDirective} from '@jsverse/transloco';

/** Translation keys (absolute) plus their params; the dialog translates them itself. */
export interface ConfirmDialogData {
  titleKey: string;
  bodyKey: string;
  confirmKey: string;
  /** Optional caveat, shown as a warning banner under the body. */
  warningKey?: string;
  params?: Record<string, unknown>;
}

/** Yes/no confirmation. Closes with `true` on confirm, `false` or `undefined` otherwise. */
@Component({
  selector: 'themis-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, TranslocoDirective],
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
