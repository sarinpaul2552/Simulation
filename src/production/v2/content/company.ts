/**
 * NexLearn — the fictional company the students lead (Batch 8).
 *
 * Everything in BACKSTORY is fiction written for the classroom and is labelled as such in the UI. It never states
 * historical metrics. The STARTING POSITION is the engine's real starting state (getV2Baseline), read at runtime —
 * never hard-coded here — so the briefing can never contradict the simulation.
 */
import { mt, ModeText } from './modes';

export const COMPANY = { name: 'NexLearn', ticker: 'NXLN' };

export interface BackstorySection { id: string; title: string; body: ModeText }

export const BACKSTORY: BackstorySection[] = [
  { id: 'history', title: 'Who we are',
    body: mt('NexLearn started as a language-learning app and grew into a global digital education company. It is listed on the stock exchange, so investors watch every quarter’s results.',
      'Founded as a consumer language-learning app, NexLearn expanded through organic growth and partnerships into a publicly listed, global digital education company. As a listed company it reports quarterly and is valued by public investors.') },
  { id: 'products', title: 'What we sell',
    body: mt('Subscription courses for individual learners; training programmes for companies; accredited certificates with partner universities; and a small set of new AI-powered learning tools.',
      'A consumer subscription platform; enterprise workforce-learning programmes with customer success; accredited credentials delivered with university partners; and an early-stage portfolio of AI-native learning products.') },
  { id: 'model', title: 'How we make money',
    body: mt('Most money comes from monthly and annual subscriptions. Companies sign multi-year training contracts. Universities pay to run credential programmes with us.',
      'Recurring revenue: consumer subscriptions (high volume, sensitive to churn and acquisition cost), enterprise contracts (longer sales cycles, stickier once won), and university programme fees (stable, renewal-driven).') },
  { id: 'customers', title: 'Who our customers are',
    body: mt('Millions of individual learners; corporate learning teams; university partners; and early users of our AI products.',
      'Four segments: Consumer, Enterprise, University and AI-native. Consumer dominates revenue today; the others are smaller but strategically important.') },
  { id: 'competition', title: 'Who we compete with',
    body: mt('Other learning apps, free online content, corporate training firms — and a growing number of AI start-ups.',
      'Consumer learning apps and free content, enterprise L&D providers, online programme managers in the university market, and a growing wave of venture-funded AI-native entrants.') },
  { id: 'direction', title: 'Where we have been heading',
    body: mt('For years NexLearn grew by winning more consumer subscribers. The board now wants a clearer long-term direction.',
      'Historically NexLearn prioritised consumer scale. Enterprise, university and AI products were built opportunistically rather than as a deliberate strategy — the board now wants that resolved.') },
  { id: 'challenges', title: 'What we are up against',
    body: mt('Consumer growth is slowing, AI is changing how people learn, and NexLearn has not yet decided what it wants to be best at.',
      'Maturing consumer growth, an uncertain AI transition, under-developed enterprise and AI capabilities, and no committed strategic destination.') },
  { id: 'board', title: 'What the board expects',
    body: mt('Over the next eight quarters, grow the company’s value (each share is worth $100 today) without running out of cash, present a clear strategy at the board meeting at the end of 2023, and keep your people with you.',
      'Over eight quarters (Q1 2023 – Q4 2024): create durable shareholder value (the shares stand at $100), present a committed strategic destination at the Q4 2023 board meeting, protect liquidity and sustain the organization’s capacity to execute.') },
];

export const YOUR_ROLE: ModeText = mt(
  'You are NexLearn’s new executive leadership team: CEO, CFO, Product, People and Growth. Each of you sees different information. Every quarter you decide together.',
  'You are NexLearn’s incoming executive team — CEO, CFO, Chief Product, Chief People and Chief Growth Officers. Information is distributed across roles; decisions are collective and accountable.');
