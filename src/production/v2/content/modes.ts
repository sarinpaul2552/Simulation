/**
 * Presentation modes (Batch 7). A mode changes WHAT IS SHOWN and HOW IT IS WORDED — never the decisions available,
 * the engine inputs, the economics, the financing, the scenario effects or the scoring.
 */
export type V2PresentationMode = 'undergraduate' | 'mba';
export const V2_PRESENTATION_MODES: V2PresentationMode[] = ['undergraduate', 'mba'];
export const DEFAULT_PRESENTATION_MODE: V2PresentationMode = 'mba';

/** Text with an optional plainer variant for undergraduate mode. */
export interface ModeText { ug: string; mba: string }
export const mt = (ug: string, mba: string = ug): ModeText => ({ ug, mba });
export const pick = (mode: V2PresentationMode, t: ModeText | string): string => (typeof t === 'string' ? t : mode === 'undergraduate' ? t.ug : t.mba);

export function normalizeMode(raw: unknown): V2PresentationMode {
  return raw === 'undergraduate' || raw === 'mba' ? raw : DEFAULT_PRESENTATION_MODE;
}

export const MODE_LABEL: Record<V2PresentationMode, string> = {
  undergraduate: 'Undergraduate',
  mba: 'MBA',
};
