import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {themisTranslocoTesting} from '../../../testing/transloco-testing';
import {ConfirmDialogComponent, ConfirmDialogData} from './confirm-dialog.component';

const PHRASE = 'Themis: Matching Information System';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let el: HTMLElement;
  const dialogRef = {close: vi.fn()};

  async function render(data: Partial<ConfirmDialogData> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, themisTranslocoTesting()],
      providers: [
        provideTranslocoMessageformat(),
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {titleKey: 'title', bodyKey: 'body', confirmKey: 'confirm', ...data}}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  function confirmButton(): HTMLButtonElement {
    return el.querySelector<HTMLButtonElement>('.confirm-dialog__confirm')!;
  }

  async function type(value: string): Promise<HTMLInputElement> {
    const input = el.querySelector<HTMLInputElement>('.confirm-dialog__input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    return input;
  }

  beforeEach(() => dialogRef.close.mockClear());

  it('confirms straight away without a phrase', async () => {
    await render();
    expect(el.querySelector('.confirm-dialog__input')).toBeNull();
    expect(confirmButton().disabled).toBe(false);
  });

  it('enables confirm only on the exact phrase', async () => {
    await render({phrase: PHRASE, danger: true});
    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().classList).toContain('confirm-dialog__confirm--danger');

    for (const wrong of ['Themis', PHRASE.toLowerCase(), `${PHRASE}!`]) {
      await type(wrong);
      expect(confirmButton().disabled).toBe(true);
    }

    await type(`  ${PHRASE} `);
    expect(confirmButton().disabled).toBe(false);
  });

  it('closes on Enter only once the phrase matches', async () => {
    await render({phrase: PHRASE});

    const input = await type('Themis: Matching');
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expect(dialogRef.close).not.toHaveBeenCalled();

    await type(PHRASE);
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
