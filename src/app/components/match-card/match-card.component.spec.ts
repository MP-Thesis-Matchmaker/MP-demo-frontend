import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslocoMessageformat} from '@jsverse/transloco-messageformat';
import {SupervisorMatch} from '../../models/matcher.model';
import {provideFontawesome} from '../../services/fontawesome.service';
import {themisTranslocoTesting, translocoLocaleTesting} from '../../../testing/transloco-testing';
import {MatchCardComponent} from './match-card.component';

const MATCH: SupervisorMatch = {
  supervisor: 'A. Muller',
  department: 'Institut für Computerlinguistik',
  score: 0.62,
  source_scores: {publication: 0.62, thesis_posting: 0.48},
  has_uzh_affiliation: true,
  matched_topics: [],
  publication_count: 2,
  posting_count: 1,
  evidence: [
    {source_type: 'publication', source_id: 'zora:1', title: 'Dense retrieval', url: 'https://www.zora.uzh.ch/1', year: 2025},
    {source_type: 'thesis_posting', source_id: 'p:1', title: '"Quoted posting"', url: null, year: null},
    {source_type: 'publication', source_id: 'zora:2', title: 'Second paper', url: 'https://www.zora.uzh.ch/2', year: 2024},
    {source_type: 'publication', source_id: 'zora:3', title: 'Third paper', url: 'https://www.zora.uzh.ch/3', year: 2023}
  ]
};

describe('MatchCardComponent', () => {
  let fixture: ComponentFixture<MatchCardComponent>;
  let el: HTMLElement;

  async function render(match: SupervisorMatch): Promise<void> {
    fixture = TestBed.createComponent(MatchCardComponent);
    fixture.componentRef.setInput('match', match);
    fixture.componentRef.setInput('rank', 1);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchCardComponent, themisTranslocoTesting()],
      providers: [provideFontawesome(), translocoLocaleTesting(), provideTranslocoMessageformat()]
    }).compileComponents();
  });

  it('renders name, rank, department and pluralised counts', async () => {
    await render(MATCH);
    expect(el.querySelector('.match-card__name')?.textContent).toContain('A. Muller');
    expect(el.querySelector('.match-card__rank')?.textContent?.trim()).toBe('01');
    expect(el.querySelector('.match-card__department')?.textContent).toContain('Computerlinguistik');
    expect(el.querySelector('.match-card__counts')?.textContent?.trim())
      .toBe('2 matching publications · 1 thesis posting');
  });

  it('opens evidence links in a new tab without leaking the opener, and unquotes titles', async () => {
    await render(MATCH);
    const link = el.querySelector<HTMLAnchorElement>('.match-card__evidence a')!;
    expect(link.href).toBe('https://www.zora.uzh.ch/1');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    const titles = Array.from(el.querySelectorAll('.match-card__evidence-title')).map(t => t.textContent?.trim());
    expect(titles[1]).toBe('Quoted posting');
  });

  it('shows three records, then all of them on request', async () => {
    await render(MATCH);
    expect(el.querySelectorAll('.match-card__evidence-item')).toHaveLength(3);
    el.querySelector<HTMLButtonElement>('.match-card__more')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.match-card__evidence-item')).toHaveLength(4);
    expect(el.querySelector('.match-card__more')).toBeNull();
  });

  it('flags missing UZH affiliation and clamps a negative score bar to zero', async () => {
    await render({...MATCH, score: -0.1, source_scores: {publication: -0.1}, has_uzh_affiliation: false,
      evidence: [MATCH.evidence[0]]});
    expect(el.querySelector('.match-card__chip--external')).not.toBeNull();
    expect(el.querySelector<HTMLElement>('.match-card__score-bar > span')!.style.width).toBe('0%');
  });
});
