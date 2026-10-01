import {TestBed} from '@angular/core/testing';
import {MotionService} from './motion.service';

describe('MotionService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('plays the full intro once, then the short one', () => {
    const motion = TestBed.inject(MotionService);
    expect(motion.takeIntro()).toBe('full');
    expect(motion.takeIntro()).toBe('short');
    expect(motion.takeIntro()).toBe('short');
  });

  it('plays no intro when the system asks for reduced motion', () => {
    const real = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({...real(query), matches: query.includes('reduce')}));
    const motion = TestBed.inject(MotionService);
    expect(motion.reduced$$()).toBe(true);
    expect(motion.takeIntro()).toBe('none');
  });
});
