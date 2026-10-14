/** Batch 10D: every market path has complete, path-consistent student content. */
import { describe, it, expect } from 'vitest';
import { pathArc } from '../../../simulationV3/engineV3Paths';
import { chapterFor, quarterCardFor, signalPlainFor, quarterBriefFor, q3AssessmentsFor, revealSummaryFor, PATH_INFO } from './paths';
import { PATH_B_CONTENT } from './pathB';
import { PATH_C_CONTENT } from './pathC';
import { CHAPTERS } from './chapters';
import { QUARTER_CARDS } from './scenarioContent';
import { Q3_SIGNAL_ASSESSMENTS } from './signalAssessments';
import { DECISION_FRAMING } from './decisionFraming';

const ROLES = ['CEO', 'CFO', 'Product', 'People', 'Growth'] as const;
const PATH_QUARTERS = [2, 3, 5, 6, 7, 8];
const CONTENT = { B: PATH_B_CONTENT, C: PATH_C_CONTENT };

describe.each(['B', 'C'] as const)('path %s content', p => {
  const C = CONTENT[p];
  it('has its own chapter subtitle, quarter card and five role briefs for Q2, Q3 and Q5–Q8', () => {
    for (const q of PATH_QUARTERS) {
      expect(C.chapters[q], `chapter Q${q}`).toBeDefined();
      expect(C.quarterCards[q], `card Q${q}`).toBeDefined();
      expect(C.quarterCards[q]!.quarter).toBe(q);
      for (const r of ROLES) {
        const b = C.quarterBriefs[q]?.[r];
        expect(b, `brief Q${q} ${r}`).toBeDefined();
        expect(b!.suggests.length).toBeGreaterThanOrEqual(2);
        expect(b!.uncertain.length).toBeGreaterThanOrEqual(1);
        expect(b!.discuss.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('shares Q1 and Q4 framing with path A', () => {
    expect(chapterFor(1, p)).toBe(CHAPTERS[1]);
    expect(chapterFor(4, p)).toBe(CHAPTERS[4]);
    expect(quarterCardFor(1, p)).toBe(QUARTER_CARDS[1]);
  });
  it('has plain-language text for every signal of the path', () => {
    for (const sq of pathArc(p)) for (const s of sq.signals) expect(signalPlainFor(s.id, p), `${p} ${s.id}`).toBeTruthy();
  });
  it('assesses exactly the eight Q3 signals (the Batch 10A evidence options), with this path’s own wording', () => {
    const ids = pathArc(p).find(q => q.quarter === 3)!.signals.map(s => s.id);
    expect(q3AssessmentsFor(p).map(a => a.id).sort()).toEqual([...ids].sort());
    expect(DECISION_FRAMING[3].evidence!.map(e => e.id).sort()).toEqual([...ids].sort());
    for (const a of q3AssessmentsFor(p)) expect(a.showed).not.toBe(Q3_SIGNAL_ASSESSMENTS.find(x => x.id === a.id)!.showed);
    expect(revealSummaryFor(p).length).toBeGreaterThan(80);
  });
  it('never exposes engine indices or the word "truth" to students', () => {
    const text = JSON.stringify(C);
    expect(text).not.toMatch(/\b[0-2]\.\d{2}\b/);
    expect(text.toLowerCase()).not.toContain('truthreference');
    expect(text.toLowerCase()).not.toContain('demand index');
  });
  it('uses each quarter brief and card through the accessors', () => {
    expect(quarterBriefFor(5, 'CFO', p)).toBe(C.quarterBriefs[5]!.CFO);
    expect(quarterCardFor(6, p)).toBe(C.quarterCards[6]);
    expect(PATH_INFO[p].name.length).toBeGreaterThan(3);
  });
});

describe('path A and V2 content are unchanged', () => {
  it('path A reads the original content', () => {
    expect(quarterCardFor(5, 'A')).toBe(QUARTER_CARDS[5]);
    expect(q3AssessmentsFor('A')).toBe(Q3_SIGNAL_ASSESSMENTS);
  });
});
