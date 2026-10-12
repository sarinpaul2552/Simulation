/**
 * INVESTMENT PERSPECTIVES (Batch 8 · Stage 2)
 *
 * For each investment bucket: what each executive function would look at when weighing it. These are lenses, not
 * positions — no line endorses or opposes the investment, and no line says what any executive (or student) thinks.
 * Facts quoted (timing, what it builds) come from the engine's documented calibration (maturation schedules, targets).
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import type { Bucket } from '../insights/consequences';
import { mt, ModeText } from './modes';

export const BUCKET_PERSPECTIVES: Record<Bucket, Partial<Record<V2Role, ModeText>>> = {
  consumer: {
    Growth: mt('Acts on winning and keeping individual learners: watch the cost to win a customer and retention.', 'Lever on consumer acquisition and retention; the test is CAC and churn, not spend.'),
    CFO: mt('About half of the capability lands this quarter, so it is one of the faster paybacks — if customers respond.', 'Fastest maturation (≈50% in-quarter); payback still depends on market response.'),
    Product: mt('Consumer features compete for the same product teams as everything else.', 'Shares product delivery capacity with AI and core quality work.'),
    People: mt('Adds change workload; larger amounts stretch teams more than proportionally.', 'Load rises with spend; check the capacity estimate before scaling.'),
    CEO: mt('Ask whether it fits the direction the company is choosing.', 'Test alignment with the intended destination.'),
  },
  enterprise: {
    Growth: mt('Builds the ability to sell to companies and keep them; results show up in the pipeline before revenue.', 'Builds enterprise capability and customer success; the pipeline leads revenue by several quarters.'),
    CFO: mt('Slower: about a quarter of the capability lands this quarter, the rest over the next two.', 'Slow maturation (25 / 45 / 30%): cash out now, returns later.'),
    Product: mt('Enterprise customers ask for reliability and integration, not only new features.', 'Enterprise demand raises reliability and integration requirements.'),
    People: mt('Selling and serving large clients needs experienced people.', 'Requires enterprise sales and delivery talent.'),
    CEO: mt('A slower-building bet: ask how long the team is willing to wait for it.', 'A longer-horizon bet; clarify the time the board will allow.'),
  },
  aiProduct: {
    Product: mt('Builds AI capability and some product quality; it takes time before AI features are good enough to sell.', 'Builds AI capability and some Product Quality; commercial readiness lags capability.'),
    CFO: mt('Slowest to land: only about a fifth arrives this quarter.', 'Slowest maturation (20 / 40 / 40%).'),
    Growth: mt('Usage of AI features is not the same as customers paying for them.', 'Adoption and willingness to pay are separate questions.'),
    People: mt('AI engineers are scarce and expensive to keep.', 'Talent market for AI engineers is tight.'),
    CEO: mt('Ask what this builds towards, and whether the market will reward it in time.', 'Clarify the strategic purpose and timing of the AI build.'),
  },
  people: {
    People: mt('Raises talent and the amount of change the company can absorb at once.', 'Raises talent and organizational capacity — the constraint on every other initiative.'),
    CFO: mt('It does not create revenue directly; its return comes through everything else working better.', 'No direct revenue; returns are indirect via absorption and execution.'),
    Product: mt('More capacity means product work is less likely to stall.', 'Capacity reduces delivery slippage on product work.'),
    Growth: mt('Customers do not see this investment directly.', 'Not customer-facing; effects are second-order.'),
    CEO: mt('Ask how much change the team is planning over the next few quarters.', 'Size it against the change agenda ahead.'),
  },
  universityCredentials: {
    Growth: mt('University deals are slow to win but tend to renew.', 'Institutional sales cycles are long; renewals are sticky.'),
    CFO: mt('Slow to land: about a fifth this quarter, the rest over the next two.', 'Slow maturation (20 / 40 / 40%).'),
    Product: mt('Accredited courses need quality and integrity that can be checked.', 'Accreditation raises assessment-integrity requirements.'),
    People: mt('Builds relationships that take time and continuity of people.', 'Relationship-intensive; depends on staff continuity.'),
    CEO: mt('Ask whether credentials are central to the company’s direction or a side bet.', 'Decide whether credentials are core or peripheral to the strategy.'),
  },
};

export const PERSPECTIVE_ORDER: V2Role[] = ['CEO', 'CFO', 'Product', 'Growth', 'People'];
