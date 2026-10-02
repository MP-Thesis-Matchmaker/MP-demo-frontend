import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {provideFontawesome} from '../../services/fontawesome.service';
import {MotionService} from '../../services/motion.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../../../testing/transloco-testing';
import {ARRIVE_END_MS, HomeComponent, INTRO_END_MS} from './home.component';

describe('HomeComponent', () => {

  async function setup(providers: unknown[] = []): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, themisTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideFontawesome(),
        translocoLocaleTesting(),
        provideTranslocoMessageformat(),
        ...providers as never[]
      ]
    }).compileComponents();
  }

  async function render(): Promise<{fixture: ComponentFixture<HomeComponent>; el: HTMLElement}> {
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    return {fixture, el: fixture.nativeElement as HTMLElement};
  }

  afterEach(() => vi.useRealTimers());

  it('plays the full intro on the first visit and the short one after', async () => {
    await setup();
    const first = await render();
    expect(first.el.querySelector('main')!.classList).toContain('home--full');
    expect(first.el.querySelector('.home__arrive')).not.toBeNull();
    expect(first.el.querySelector('.home__skip')).not.toBeNull();
    expect(first.el.querySelectorAll('.home__letter')).toHaveLength(6);
    first.fixture.destroy();

    const again = await render();
    expect(again.el.querySelector('main')!.classList).toContain('home--short');
    expect(again.el.querySelector('.home__arrive')).toBeNull();
    expect(again.el.querySelector('.home__skip')).toBeNull();
  });

  it('retires the Arrive lines and the skip button as the full intro plays out', async () => {
    await setup();
    // Synchronous change detection: whenStable() waits on timers, which are fake here.
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(HomeComponent);
    const el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    expect(el.querySelector('.home__arrive')).not.toBeNull();

    vi.advanceTimersByTime(ARRIVE_END_MS);
    fixture.detectChanges();
    expect(el.querySelector('.home__arrive')).toBeNull();
    expect(el.querySelector('.home__skip')).not.toBeNull();

    vi.advanceTimersByTime(INTRO_END_MS - ARRIVE_END_MS);
    fixture.detectChanges();
    expect(el.querySelector('.home__skip')).toBeNull();
  });

  it('skips to the settled hero', async () => {
    await setup();
    const {fixture, el} = await render();
    el.querySelector<HTMLButtonElement>('.home__skip')!.click();
    await fixture.whenStable();

    expect(el.querySelector('main')!.classList).toContain('home--short');
    expect(el.querySelector('.home__arrive')).toBeNull();
    expect(el.querySelector('.home__skip')).toBeNull();
  });

  it('plays nothing under reduced motion', async () => {
    await setup([{provide: MotionService, useValue: {reduced$$: () => true, takeIntro: () => 'none'}}]);
    const {el} = await render();
    expect(el.querySelector('main')!.classList).toContain('home--none');
    expect(el.querySelector('.home__arrive')).toBeNull();
  });

  it('starts a query with what was typed', async () => {
    await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const {fixture, el} = await render();

    const input = el.querySelector<HTMLInputElement>('.home__query input')!;
    input.value = '  dense retrieval ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.home__start')!.click();

    expect(navigate).toHaveBeenCalledWith(['/', 'en', 'search'], {queryParams: {q: 'dense retrieval'}});
  });
});
