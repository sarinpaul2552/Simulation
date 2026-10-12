/**
 * Quarter chapters (Batch 7.5): the narrative frame of each quarter-opening screen. Derived only from what the
 * scenario already announces to every team at the start of the quarter — never from hidden demand, future events or
 * the engine's truth references. The chapter colour is presentation only.
 */
import { mt, ModeText } from './modes';

export interface Chapter { quarter: number; year: number; title: string; sub: ModeText }

export const CHAPTERS: Record<number, Chapter> = {
  1: { quarter: 1, year: 1, title: 'Take the helm', sub: mt('You take control of the company. Five leaders, one budget, and a market that is starting to move.', 'You take control of the company: a $200M-a-quarter learning business with a $30M strategic budget and five leaders who see different parts of it.') },
  2: { quarter: 2, year: 1, title: 'The disruption', sub: mt('AI disruption threatens the business. Decide whether to defend, adapt or wait.', 'AI disruption threatens the core business. Defend, pivot or hedge — with incomplete evidence.') },
  3: { quarter: 3, year: 1, title: 'Mixed signals', sub: mt('The evidence is conflicting. Some numbers say one thing, others the opposite.', 'The evidence is conflicting. Separate signal from noise before the board’s Q4 2023 deadline for a strategic direction.') },
  4: { quarter: 4, year: 1, title: 'The commitment', sub: mt('Choose the company’s future. This decision shapes everything that follows.', 'Choose the company’s strategic destination. Commitment buys focus and costs flexibility.') },
  5: { quarter: 5, year: 2, title: 'The offer', sub: mt('A major growth opportunity appears. Is it the right one for the company you are building?', 'A major growth opportunity appears. Weigh fit, capacity and cash against the upside.') },
  6: { quarter: 6, year: 2, title: 'The downturn', sub: mt('Recession tests your resilience. Protect cash, protect people, or keep investing?', 'Recession tests your resilience: liquidity, cost structure and the capabilities you refuse to cut.') },
  7: { quarter: 7, year: 2, title: 'The crisis', sub: mt('Your chosen strategy creates a crisis. How you respond matters.', 'Your chosen strategy creates its own crisis. The response trades cash against trust.') },
  8: { quarter: 8, year: 2, title: 'The final move', sub: mt('Make the final strategic decision. Your options depend on the company you built.', 'Make the final strategic decision. The options open to you were earned over seven quarters.') },
};
