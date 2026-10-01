import {TestBed} from '@angular/core/testing';
import {ThemeService} from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root.style.colorScheme = '';
    root.removeAttribute('data-bs-theme');
    TestBed.resetTestingModule();
  });

  it('follows the system by default, leaving color-scheme to the stylesheet', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(service.mode$$()).toBe('system');
    expect(root.style.colorScheme).toBe('');
    // test-setup's matchMedia stub reports a light system.
    expect(root.getAttribute('data-bs-theme')).toBe('light');
  });

  it('applies an explicit mode to both Material and Bootstrap', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('dark');
    TestBed.tick();

    expect(root.style.colorScheme).toBe('dark');
    expect(root.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('cycles system → light → dark → system', () => {
    const service = TestBed.inject(ThemeService);
    const seen = [service.mode$$()];
    for (let i = 0; i < 3; i++) {
      service.cycle();
      seen.push(service.mode$$());
    }
    expect(seen).toEqual(['system', 'light', 'dark', 'system']);
  });

  it('remembers the choice across page loads', () => {
    TestBed.inject(ThemeService).setMode('light');
    TestBed.resetTestingModule();

    expect(TestBed.inject(ThemeService).mode$$()).toBe('light');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem('themis.theme-mode', 'sepia');
    expect(TestBed.inject(ThemeService).mode$$()).toBe('system');
  });
});
