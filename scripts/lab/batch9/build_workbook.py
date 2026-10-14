"""Build NEXLEARN_ECONOMIC_BALANCE_STUDY.xlsx from docs/batch9/lab-results.json (Batch 9).

Every number in the workbook is either a recorded engine output (from the JSON written by
scripts/lab/batch9/write.test.ts) or an Excel formula over those outputs. Nothing is estimated here.
Usage: python3 scripts/lab/batch9/build_workbook.py [out.xlsx]
"""
import json, sys
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.comments import Comment

SRC = 'docs/batch9/lab-results.json'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/batch9/NEXLEARN_ECONOMIC_BALANCE_STUDY.xlsx'
d = json.load(open(SRC))
meta = d['meta']

FONT = 'Arial'
F = lambda **k: Font(name=FONT, size=k.pop('size', 10), **k)
HDR_FILL = PatternFill('solid', fgColor='193F3B')
SUB_FILL = PatternFill('solid', fgColor='E8E4DA')
NOTE_FILL = PatternFill('solid', fgColor='F5F2EB')
KEY_FILL = PatternFill('solid', fgColor='FFF2CC')
THIN = Side(style='thin', color='DDD8CD')
BOX = Border(bottom=THIN)
M = '#,##0.0;(#,##0.0);-'
M0 = '#,##0;(#,##0);-'
P = '$#,##0.00'
PCT = '0.0%;(0.0%);-'
N1 = '0.0'

wb = Workbook()
wb.remove(wb.active)


def sheet(name, title, subtitle=None, widths=None):
    ws = wb.create_sheet(name)
    ws.sheet_view.showGridLines = False
    ws['A1'] = title
    ws['A1'].font = F(size=14, bold=True, color='17232D')
    if subtitle:
        ws['A2'] = subtitle
        ws['A2'].font = F(size=9, italic=True, color='5B666D')
    for i, w in enumerate(widths or [], start=1):
        ws.column_dimensions[L(i)].width = w
    return ws


def section(ws, row, text, note=None):
    ws.cell(row=row, column=1, value=text).font = F(size=11, bold=True, color='193F3B')
    if note:
        ws.cell(row=row + 1, column=1, value=note).font = F(size=9, italic=True, color='5B666D')
        return row + 2
    return row + 1


def header(ws, row, cols, col0=1):
    for j, c in enumerate(cols):
        cell = ws.cell(row=row, column=col0 + j, value=c)
        cell.font = F(bold=True, color='FFFFFF', size=9)
        cell.fill = HDR_FILL
        cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
    ws.row_dimensions[row].height = 30


def put(ws, row, col, v, fmt=None, bold=False, color=None, fill=None, wrap=False):
    c = ws.cell(row=row, column=col, value=v)
    c.font = F(bold=bold, color=color or '000000')
    if fmt:
        c.number_format = fmt
    if fill:
        c.fill = fill
    if wrap:
        c.alignment = Alignment(wrap_text=True, vertical='top')
    c.border = BOX
    return c


def para(ws, row, text, cols=10, height=None, bold=False, fill=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=cols)
    c = ws.cell(row=row, column=1, value=text)
    c.font = F(bold=bold)
    c.alignment = Alignment(wrap_text=True, vertical='top')
    if fill:
        c.fill = fill
    ws.row_dimensions[row].height = height or max(15, 13 * (len(text) // 150 + 1))
    return row + 1


STRATS = meta['strategies']
SNAME = {s['id']: s['name'] for s in STRATS}
CORE_IDS = [s['id'] for s in STRATS[:10]]
ALL_IDS = [s['id'] for s in STRATS]
core = {r['id']: r for r in d['core']}

# ═════════════════════════════════ About ═════════════════════════════════
ws = sheet('About', 'NexLearn Economic Balance Study — Batch 9', 'How the numbers were produced and how to reproduce them', [30, 22, 22, 22, 22, 22, 22, 22, 22, 22])
r = 4
r = section(ws, r, 'Provenance')
rows = [
    ('Engine', 'NexLearn V2 frozen economic engine (src/simulation). Diff against baseline commit 003f697: ' + meta['engineDiff']),
    ('Valuation model', meta['versions']['valuation'] + ' (src/production/v2/insights/valuation.ts) — production implementation'),
    ('Executive scoring', meta['versions']['executive'] + ' (src/production/v2/insights/executive.ts) — production implementation'),
    ('Terminal score', 'scoreV2Company (src/simulation/engineV2Scoring.ts)'),
    ('Runner', 'scripts/lab/batch9/runner.ts → Test Lab runArc (full eight-quarter arc: market path, Q4 commitment, Q5 contract, Q6 recession, Q7 crisis, Q8 final option, CFO liquidity forecast and financing)'),
    ('Repository commit', meta['commit']),
    ('Generated', meta['generated']),
    ('Reproduce', 'LAB_WRITE=1 npx vitest run scripts/lab/batch9/write.test.ts  →  docs/batch9/lab-results.json;  python3 scripts/lab/batch9/build_workbook.py'),
    ('Verification', 'npx vitest run scripts/lab/batch9/lab.test.ts — engine unchanged; lab results equal the production replay path (price, executive, terminal, cash) for all ten strategies; ledgers reconcile; overrides restored; re-based mixes are steady states'),
]
for k, v in rows:
    put(ws, r, 1, k, bold=True)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=10)
    c = put(ws, r, 2, v, wrap=True)
    ws.row_dimensions[r].height = 28 if len(v) > 110 else 15
    r += 1
r += 1
r = section(ws, r, 'Assumptions that apply to every run')
for t in [
    'All money in $M. Quarter 1 = Q1 2023; Q8 = Q4 2024. Starting company: revenue $200M (Consumer $140M, Enterprise $40M, University $16M, AI-native $4M), operating profit $30M, cash $60M.',
    'Allocations are $30M per quarter (the strategic envelope); any unallocated amount is held as Cash Reserve. At Q8 the earned final option may raise the envelope to $45M (scale independently) or $60M (raise growth capital); the extra goes to the destination-aligned buckets (Test Lab policy).',
    'Every strategy uses the same event policy (Test Lab DEFAULT_POLICY): accept the Q5 contract when on strategy and deliverable (fit ≥ 0.3) or fit ≥ 0.55; recession: hiring freeze when not investing in People, plus a targeted cut and $10M slower investment when cash < $40M; debt-first liquidity to keep closing cash ≥ $25M; crisis response by severity; Q8 option by eligibility. Differences between strategies therefore come from the investment strategy and destination.',
    'Market: the engine’s market path is deterministic (one authored scenario). Sensitivity uses the runner’s supported market-override hook to vary conditions; player briefings (signals) stay as authored, so only the adaptive strategy could react to them. No stochastic outcomes were invented.',
    'Executive scores (NXLN-EXEC-1.1) are reported only for runs that start from the production company, because the scoring compares against that starting company.',
    'Starting-mix experiments change calibration constants in memory for one run and restore them afterwards (verified by test). Valuation for those runs is anchored on the production starting company; “price from own start” rescales to the experiment’s own Q0.',
    'Allocation grid: every allocation of $30M in $5M steps across the six buckets (462 allocations) × five destinations = 2,310 eight-quarter runs.',
]:
    r = para(ws, r, '• ' + t, height=30)
r += 1
r = section(ws, r, 'Strategy definitions')
header(ws, r, ['Id', 'Name', 'Family', 'Allocation (per quarter)', 'Description'])
ws.column_dimensions['D'].width = 40
r += 1
for s in STRATS:
    put(ws, r, 1, s['id']); put(ws, r, 2, s['name']); put(ws, r, 3, s['family']); put(ws, r, 4, s['allocation'], wrap=True)
    ws.merge_cells(start_row=r, start_column=5, end_row=r, end_column=10)
    put(ws, r, 5, s['description'], wrap=True)
    ws.row_dimensions[r].height = 28
    r += 1
r += 1
r = section(ws, r, 'Market scenarios (sensitivity)')
header(ws, r, ['Id', 'Label', 'Definition'])
r += 1
for s in meta['scenarios']:
    put(ws, r, 1, s['id']); put(ws, r, 2, s['label'])
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=10)
    put(ws, r, 3, s['description'], wrap=True)
    r += 1
r += 1
r = section(ws, r, 'Workbook map')
for name, desc in [
    ('Executive comparison', 'Q8 outcomes for every strategy, ranks, and how Consumer-only compares with the field'),
    ('Quarter-by-quarter results', 'Every quarter of every strategy; revenue, profit, cash and share-price matrices'),
    ('Investment & capability', 'Capabilities built, marginal return of each bucket, allocation-grid main effects, bucket economics'),
    ('Starting revenue distribution', 'Alternative A and B mixes: validity check, required re-base, and results'),
    ('Sensitivity analysis', 'Ten market scenarios × ten strategies: prices, scores and ranks'),
    ('Contract & financing audit', 'Contract, envelope, financing and recession mechanics'),
    ('Recommendations', 'Answers, tested calibration packages and proposed rule changes'),
    ('Allocation grid', 'Appendix: 2,310 runs (462 allocations × 5 destinations)'),
    ('Destination sweep', 'Appendix: 14 strategies × 5 destinations'),
    ('Proposal tests', 'Appendix: every candidate change and package × 6 scenarios × 10 strategies'),
]:
    put(ws, r, 1, name, bold=True)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=10)
    put(ws, r, 2, desc)
    r += 1

# ═════════════════════════════════ 1. Executive comparison ═════════════════════════════════
ws = sheet('Executive comparison', '1 · Executive comparison — Q8 (Q4 2024) outcomes', 'Authored market, production starting company, identical event policy. Ranks and comparisons are formulas over the recorded results.',
           [28, 12, 40, 24] + [11] * 30)
r = 4
r = section(ws, r, 'Key findings', None)
grid_best = {}
for g in d['grid']:
    k = tuple(g['alloc'][b] for b in ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials', 'cashReserve'])
    if k not in grid_best or g['price8'] > grid_best[k]['price8']:
        grid_best[k] = g
gb = list(grid_best.values())
def pct_of(alloc, m):
    k = tuple(alloc)
    v = grid_best[k][m]
    return sum(1 for x in gb if x[m] < v) / len(gb)
findings = [
    'Consumer investment is not the dominant strategy. Consumer-only ranks 7th of 10 on Q8 share price and 8th on the terminal score, and sits at the 27th percentile of all 462 tested allocations. It is near the top only in Q1–Q2 (2nd–3rd, within $1 of the leader) and falls to 5th–7th from Q3.',
    'AI/Product is the dominant investment. Every best allocation for every destination contains $10M AI/Product; the best allocation without AI scores $116–$133 against $156–$166 with it. An extra $10M a quarter in AI adds $25M of Q8 revenue versus $8M for Consumer.',
    'Enterprise is not commercially viable as a lead strategy: Enterprise-only finishes last and Enterprise-led 9th in all ten market scenarios. Each extra $5M of Enterprise lowers the average Q8 price. University-led holds a $111 price but University revenue does not grow within eight quarters.',
    'The strongest single play is Consumer + AI ($15M each, Consumer AI destination): $164.5 share price, 99th percentile. Consumer works as AI’s complement: it defends the 70% revenue base from the AI disruption (strategies without Consumer investment lose up to $19M of Consumer revenue by Q8), carries no recurring cost commitment and matures 50% in the quarter invested.',
]
for t in findings:
    r = para(ws, r, '• ' + t, cols=14, height=28)
r += 1
r = section(ws, r, 'Q8 outcomes by strategy', 'Rows 1–10 are the required strategies; rows 11–14 are supplementary. Rank formulas rank the ten required strategies only.')
cols = ['Strategy', 'Family', 'Allocation', 'Destination', 'Q8 revenue ($M)', 'Q8 operating profit ($M)', 'Cumulative OP Q1–Q8 ($M)', 'Q8 cash ($M)', 'Q8 debt ($M)', 'Net cash ($M)',
        'Share price Q8 ($)', 'Price change vs $100', 'Terminal score', 'Financial', 'Strategic', 'Organizational', 'Executive team avg', 'CEO', 'CFO', 'CPO', 'CGO', 'CPeO', 'Culture Q8', 'Capability gain (pts)',
        'Financing raised ($M)', 'Ever insolvent', 'Distressed quarters', 'Q8 option', 'Q5 contract', 'Grid percentile (price)', 'Rank: price', 'Rank: terminal', 'Rank: cumulative OP']
header(ws, r, cols)
h = r
r += 1
first = r
for sid in ALL_IDS:
    s = core[sid]
    st = next(x for x in STRATS if x['id'] == sid)
    e = s['exec'] or {}
    vals = [st['name'], st['family'], st['allocation'], s['destination'], s['rev8'], s['op8'], s['cumOP'], s['cash8'], s['debt8'], None, s['price8'], None, s['terminal'], s['tFin'], s['tStr'], s['tOrg'], s['execTeam'],
            e.get('CEO'), e.get('CFO'), e.get('Product'), e.get('Growth'), e.get('People'), s['culture8'], s['capGain'], s['financingRaised'], 'yes' if s['everInsolvent'] else 'no', s['distressedQ'], s['finalOption'],
            'accepted' if s['contract'] else 'declined']
    fmts = [None, None, None, None, M, M, M, M, M, M, P, PCT, N1, N1, N1, N1, N1, N1, N1, N1, N1, N1, N1, N1, M, None, '0', None, None]
    for j, (v, f) in enumerate(zip(vals, fmts), start=1):
        put(ws, r, j, v, f)
    put(ws, r, 10, f'=H{r}-I{r}', M)
    put(ws, r, 12, f'=K{r}/100-1', PCT)
    alloc_lookup = {'consumer-led': (20, 0, 0, 10, 0, 0), 'enterprise-led': (0, 20, 0, 10, 0, 0), 'ai-led': (0, 0, 20, 10, 0, 0), 'diversified': (10, 10, 10, 0, 0, 0), 'consumer-only': (30, 0, 0, 0, 0, 0),
                    'enterprise-only': (0, 30, 0, 0, 0, 0), 'ai-only': (0, 0, 30, 0, 0, 0), 'university-led': (0, 0, 0, 10, 20, 0), 'university-only': (0, 0, 0, 0, 30, 0), 'consumer-ai-pair': (15, 0, 15, 0, 0, 0),
                    'enterprise-ai-pair': (0, 15, 15, 0, 0, 0), 'enterprise-ai-people': (0, 15, 10, 5, 0, 0)}
    if sid in alloc_lookup:
        c = put(ws, r, 30, pct_of(alloc_lookup[sid], 'price8'), '0%')
    else:
        put(ws, r, 30, 'n/a (not a constant $5M-step allocation)')
    r += 1
last_core = first + 9
for rr in range(first, first + 10):
    put(ws, rr, 31, f'=RANK(K{rr},$K${first}:$K${last_core})', '0')
    put(ws, rr, 32, f'=RANK(M{rr},$M${first}:$M${last_core})', '0')
    put(ws, rr, 33, f'=RANK(G{rr},$G${first}:$G${last_core})', '0')
ws.freeze_panes = ws.cell(row=h + 1, column=2)
ws.cell(row=h, column=30).comment = Comment('Share of the 462 $5M-step allocations (each with its best destination) that this allocation beats on Q8 share price. Source: Allocation grid sheet.', 'Batch 9')
r += 1
r = section(ws, r, 'Does Consumer-only outperform most alternatives? (formulas over the table above)')
co = first + ALL_IDS.index('consumer-only')
checks = [
    ('Required strategies with a lower Q8 share price than Consumer-only', f'=COUNTIF($K${first}:$K${last_core},"<"&K{co})', '0'),
    ('… with a lower terminal score', f'=COUNTIF($M${first}:$M${last_core},"<"&M{co})', '0'),
    ('… with lower Q8 revenue', f'=COUNTIF($E${first}:$E${last_core},"<"&E{co})', '0'),
    ('… with lower cumulative operating profit', f'=COUNTIF($G${first}:$G${last_core},"<"&G{co})', '0'),
    ('Consumer-only price gap to the best required strategy ($)', f'=K{co}-MAX($K${first}:$K${last_core})', P),
    ('Spread of Q8 share price across required strategies ($)', f'=MAX($K${first}:$K${last_core})-MIN($K${first}:$K${last_core})', P),
]
for k, f, fmt in checks:
    put(ws, r, 1, k)
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
    put(ws, r, 5, f, fmt, bold=True)
    r += 1
put(ws, r, 1, 'Out of 9 alternatives. Consumer-only beats only Enterprise-led, Enterprise-only and (on price) Cash preservation.', color='5B666D')
CORE_ROWS = {sid: first + i for i, sid in enumerate(ALL_IDS)}

# ═════════════════════════════════ 2. Quarter-by-quarter ═════════════════════════════════
ws = sheet('Quarter-by-quarter results', '2 · Quarter-by-quarter results', 'Every quarter of every strategy (authored market). Matrices at the right are SUMIFS formulas over the long table.', [24, 6] + [11] * 22)
r = 4
cols = ['Strategy', 'Q', 'Revenue', 'Consumer', 'Enterprise', 'University', 'AI-native', 'Operating profit', 'Margin', 'Strategic investment', 'Event costs', 'Financing', 'Cash', 'Debt',
        'Share price', 'Culture', 'Org capacity', 'Load ÷ capacity', 'Solvency', 'Distressed']
header(ws, r, cols)
r += 1
q0 = r
cq = {x['id']: x for x in d['coreQuarters']}
for sid in ALL_IDS:
    for qq in cq[sid]['quarters']:
        vals = [SNAME[sid], qq['q'], qq['revenue'], qq['consumer'], qq['enterprise'], qq['university'], qq['aiNative'], qq['operatingProfit'], None, qq['investment'], qq['eventCosts'], qq['financing'], qq['cash'], qq['debt'], qq['price'], qq['culture'], qq['orgCapacity'], qq['loadRatio'], qq['solvency'], 'yes' if qq['distressed'] else 'no']
        fm = [None, '0', M, M, M, M, M, M, PCT, M, M, M, M, M, P, N1, N1, '0.00', None, None]
        for j, (v, f) in enumerate(zip(vals, fm), start=1):
            put(ws, r, j, v, f)
        put(ws, r, 9, f'=IF(C{r}=0,0,H{r}/C{r})', PCT)
        r += 1
qN = r - 1
ws.freeze_panes = 'C5'
# matrices
mc = 22
mr = 4
for title, col in [('Revenue ($M)', 'C'), ('Operating profit ($M)', 'H'), ('Cash ($M)', 'M'), ('Share price ($)', 'O')]:
    ws.cell(row=mr, column=mc, value=title).font = F(bold=True, color='193F3B')
    mr += 1
    header(ws, mr, ['Strategy'] + [f'Q{i}' for i in range(1, 9)], col0=mc)
    mr += 1
    for sid in ALL_IDS:
        put(ws, mr, mc, SNAME[sid])
        for qi in range(1, 9):
            put(ws, mr, mc + qi, f'=SUMIFS(${col}${q0}:${col}${qN},$A${q0}:$A${qN},${L(mc)}{mr},$B${q0}:$B${qN},{qi})', P if col == 'O' else M)
        mr += 1
    mr += 1
ws.column_dimensions[L(mc)].width = 24

# ═════════════════════════════════ Allocation grid (appendix, built early for references) ═════════════════════════════════
wg = sheet('Allocation grid', 'Appendix · Allocation grid — 462 allocations × 5 destinations', 'Each row is one complete eight-quarter run. “Best dest.” = 1 for the destination with the highest Q8 price for that allocation.', [9] * 6 + [24] + [10] * 12)
gr = 4
header(wg, gr, ['Consumer', 'Enterprise', 'AI/Product', 'People', 'University', 'Reserve', 'Destination', 'Rev Q2', 'Rev Q4', 'Rev Q8', 'Cum OP', 'Net cash Q8', 'Price Q4', 'Price Q8', 'Terminal', 'Insolvent', 'Financing', 'Culture Q8', 'Best dest.'])
gr += 1
g0 = gr
bestkeys = {id(v) for v in grid_best.values()}
for g in d['grid']:
    a = g['alloc']
    vals = [a['consumer'], a['enterprise'], a['aiProduct'], a['people'], a['universityCredentials'], a['cashReserve'], g['destination'], g['rev2'], g['rev4'], g['rev8'], g['cumOP'], g['netCash8'], g['price4'], g['price8'], g['terminal'], 1 if g['insolvent'] else 0, g['financing'], g['culture8'], 1 if id(g) in bestkeys else 0]
    for j, v in enumerate(vals, start=1):
        c = wg.cell(row=gr, column=j, value=v)
        c.font = F(size=9)
        if j >= 8 and j not in (16, 19):
            c.number_format = '0.0'
    gr += 1
gN = gr - 1
wg.freeze_panes = 'A5'
GRID = lambda col: f"'Allocation grid'!${col}${g0}:${col}${gN}"

# ═════════════════════════════════ 3. Investment & capability ═════════════════════════════════
ws = sheet('Investment & capability', '3 · Investment and capability outcomes', 'Capabilities built by Q8, the marginal return of each bucket, allocation-grid main effects and the bucket economics that drive them.', [26] + [11] * 16)
r = 4
r = section(ws, r, 'A · Capability and organizational state at Q8 (start: Consumer 55, Enterprise 30, AI 10, Talent 55, Credential 40, Culture 72; capability ceiling 120)')
header(ws, r, ['Strategy', 'Consumer', 'Enterprise', 'AI', 'Talent', 'Credential', 'Culture', 'Org capacity', 'Capability gain', 'Consumer rev Q8', 'Enterprise rev Q8', 'University rev Q8', 'AI-native rev Q8', 'Δ Consumer rev vs Q0', 'Δ Enterprise rev vs Q0', 'Δ University rev vs Q0', 'Δ AI-native rev vs Q0'])
r += 1
for sid in ALL_IDS:
    s = core[sid]
    vals = [SNAME[sid], s['consumerCap'], s['enterpriseCap'], s['aiCap'], s['talentCap'], s['credentialCap'], s['culture8'], s['org8'], s['capGain'], s['seg8']['consumer'], s['seg8']['enterprise'], s['seg8']['university'], s['seg8']['aiNative']]
    for j, v in enumerate(vals, start=1):
        put(ws, r, j, v, N1 if j > 1 else None)
    for j, (col, base) in enumerate([('J', 140), ('K', 40), ('L', 16), ('M', 4)], start=14):
        put(ws, r, j, f'={col}{r}-{base}', M)
    r += 1
r += 1
r = section(ws, r, 'B · Marginal return of $10M a quarter in each bucket', 'Base: $3M in each bucket + $15M reserve; one bucket +$10M, reserve −$10M; Balanced Marketplace destination; contract declined; 12 quarters (Q9–Q12 extend the last authored market). Deltas vs the base run.')
header(ws, r, ['Starting mix', 'Bucket', 'Δ Rev Q2', 'Δ Rev Q4', 'Δ Rev Q8', 'Δ Rev Q12', 'Δ Cum OP Q8', 'Δ Cum OP Q12', 'Δ Net cash Q8', 'Δ Price Q4', 'Δ Price Q8', 'Δ Consumer rev Q8', 'Δ Enterprise rev Q8', 'Δ University rev Q8', 'Δ AI-native rev Q8', 'Cum OP Q8 per $80M invested'])
r += 1
lab = {'consumer': 'Consumer', 'enterprise': 'Enterprise', 'aiProduct': 'AI/Product', 'people': 'People', 'universityCredentials': 'University'}
mixlab = {'baseline': 'Baseline (production)', 'altA:rebased': 'Alt A re-based (proportional)', 'altB:rebased': 'Alt B re-based (proportional)', 'altA:rebased-aifixed': 'Alt A re-based (AI reward fixed)', 'altB:rebased-aifixed': 'Alt B re-based (AI reward fixed)'}
for m in d['marginal']:
    vals = [mixlab.get(m['mix'], m['mix']), lab[m['bucket']], m['dRev2'], m['dRev4'], m['dRev8'], m['dRevLast'], m['dCumOP8'], m['dCumOPLast'], m['dNetCash8'], m['dPrice4'], m['dPrice8'], m['dSegment8']['consumer'], m['dSegment8']['enterprise'], m['dSegment8']['university'], m['dSegment8']['aiNative']]
    for j, v in enumerate(vals, start=1):
        put(ws, r, j, v, M if j > 2 else None, fill=KEY_FILL if (m['mix'] == 'baseline' and j in (5, 7, 11)) else None)
    put(ws, r, 16, f'=G{r}/80', '0.00')
    r += 1
r += 1
r = section(ws, r, 'C · Allocation-grid main effects (AVERAGEIFS over the Allocation grid, best destination per allocation)', 'Average Q8 outcome of all allocations that put the given amount in the bucket. Reads as: how much does a bucket help on average, whatever else is funded.')
amounts = [0, 5, 10, 15, 20, 25, 30]
for metric, col, fmt in [('Mean Q8 share price ($)', 'N', P), ('Mean terminal score', 'O', N1), ('Mean Q8 revenue ($M)', 'J', M)]:
    ws.cell(row=r, column=1, value=metric).font = F(bold=True)
    header(ws, r, [f'${a}M' for a in amounts], col0=2)
    r += 1
    for bi, (bcol, bname) in enumerate([('A', 'Consumer'), ('B', 'Enterprise'), ('C', 'AI/Product'), ('D', 'People'), ('E', 'University'), ('F', 'Reserve')]):
        put(ws, r, 1, bname)
        for j, a in enumerate(amounts, start=2):
            put(ws, r, j, f'=AVERAGEIFS({GRID(col)},{GRID(bcol)},{a},{GRID("S")},1)', fmt)
        r += 1
    r += 1
r = section(ws, r, 'D · Bucket economics in the frozen engine (constants from src/simulation; for reference)')
header(ws, r, ['Bucket', 'Gain at $30M (pts)', 'Secondary gains at $30M', 'Maturation (in-quarter / +1 / +2)', 'Transformation load at $30M', 'Recurring cost commitment', 'Commitment duration', 'Revenue channel'])
for c in 'CDFGH':
    ws.column_dimensions[c].width = 20
r += 1
for row in [
    ('Consumer', 17, '—', '50% / 35% / 15%', 28, 'none', '—', 'Retention and CAC on the $140M base (70% of revenue); acquisition'),
    ('Enterprise', 21, 'Customer Success +5', '25% / 45% / 30%', 26, '4% of investment per quarter', '6 quarters', 'Pipeline inflow and win rate → bookings (ACV ÷ 4) recognized 25/50/25% over the next three quarters'),
    ('AI/Product', 27, 'Product Quality +2', '20% / 40% / 40%', 32, '6% of investment per quarter', '6 quarters', 'AI adoption → new AI-native monetization every quarter ($0.08M per adoption point above 10); retention and pricing synergies'),
    ('People', 13, 'Org capacity +12, Product Quality +4', '50% / 35% / 15%', 16, '6% of investment per quarter', '8 quarters', 'Indirect: capacity, absorption, AI readiness support'),
    ('University/Credentials', 17, 'Trust +2.5', '20% / 40% / 40%', 22, 'none', '—', 'University pipeline (resolution 20%) → wins recognized 10/30/30/30% from Q+2 to Q+5; credential-network spillovers'),
]:
    for j, v in enumerate(row, start=1):
        put(ws, r, j, v, wrap=True)
    ws.row_dimensions[r].height = 30
    r += 1

# ═════════════════════════════════ 4. Starting revenue distribution ═════════════════════════════════
ws = sheet('Starting revenue distribution', '4 · Starting revenue distribution comparison', 'Experimental only — production economics unchanged. Total revenue stays $200M in every mix.', [30] + [13] * 16)
r = 4
r = section(ws, r, 'A · The three mixes')
header(ws, r, ['Mix', 'Consumer', 'Enterprise', 'University', 'AI-native', 'Total', 'Consumer share'])
r += 1
for k, lbl in [('baseline', 'Baseline (production)'), ('altA', 'Alternative A'), ('altB', 'Alternative B')]:
    m = meta['mixes'][k]
    vals = [lbl, m['consumer'], m['enterprise'], m['university'], m['aiNative']]
    for j, v in enumerate(vals, start=1):
        put(ws, r, j, v, M0 if j > 1 else None, color='0000FF' if j > 1 else None)
    put(ws, r, 6, f'=SUM(B{r}:E{r})', M0)
    put(ws, r, 7, f'=B{r}/F{r}', PCT)
    r += 1
r += 1
r = section(ws, r, 'B · Does the engine support changing the starting segment revenues? — No, not by itself',
            'Steady-state test: no investment, neutral market, three quarters. A valid opening barely moves (baseline drifts −$0.4M). “Naive” changes only the four revenues; “re-based” also changes the constants below.')
header(ws, r, ['Variant', 'Segment', 'Q0', 'Q3', 'Drift'])
r += 1
for x in d['steadyState']:
    vals = [x['mix'], x['segment'], x['q0'], x['q4'], None]
    for j, v in enumerate(vals, start=1):
        put(ws, r, j, v, M if j > 2 else None)
    put(ws, r, 5, f'=D{r}-C{r}', M, fill=KEY_FILL if 'naive' in x['mix'] else None)
    r += 1
r += 1
r = section(ws, r, 'C · Initial conditions that must change with the mix (proportional re-base)', 'Each flow is calibrated so the starting company is a fixed point. Re-basing scales each segment’s flows by (new revenue ÷ baseline revenue).')
header(ws, r, ['Constant (source)', 'Baseline', 'Alt A', 'Alt B', 'Why it must change'])
ws.column_dimensions['E'].width = 60
r += 1
oA, oB = meta['mixes']['altA']['overrides'], meta['mixes']['altB']['overrides']
rb = [
    ('Headroom anchor = starting segment revenue (revenue.start)', '140 / 40 / 16 / 4', '100 / 60 / 25 / 15', '80 / 70 / 30 / 20', 'Headroom multiplier is 1 only at the anchor; otherwise growth is distorted from Q1'),
    ('Consumer base acquisition $M/q (revenue.consumer.baseAcquisition)', 6.3, oA['consumerBaseAcquisition'], oB['consumerBaseAcquisition'], 'Must equal baseline churn (base × 30% × 15%)'),
    ('Consumer acquisition spend $M/q (costs.variable)', 6.3, oA['consumerAcquisitionSpend'], oB['consumerAcquisitionSpend'], 'Marketing spend scales with the consumer base'),
    ('AI-native monetization to baseline $M/pt (revenue.aiNative)', 0.04, oA['aiMonetizationToBaseline'], oB['aiMonetizationToBaseline'], 'Must replace AI-native churn at starting adoption'),
    ('AI-native monetization above baseline $M/pt (revenue.aiNative)', 0.08, f"{oA['aiMonetizationAbove']:.2f} (proportional) or 0.08 (AI reward fixed)", f"{oB['aiMonetizationAbove']:.2f} (proportional) or 0.08 (AI reward fixed)", 'A choice, not a requirement: whether the AI growth reward scales with the AI base. Both variants are reported.'),
    ('Enterprise pipeline base inflow $M/q (commercial.enterprise.baseInflow)', 24, oA['enterpriseBaseInflow'], oB['enterpriseBaseInflow'], 'Bookings must replace enterprise churn'),
    ('Enterprise starting pipeline $M (commercial start)', 80, oA['enterprisePipelineStart'], oB['enterprisePipelineStart'], 'Pipeline stock at steady state'),
    ('University pipeline base inflow $M/q (commercial.university.baseInflow)', 4.8, oA['universityBaseInflow'], oB['universityBaseInflow'], 'Wins must replace university churn'),
    ('University starting pipeline $M (commercial start; also the adoption anchor)', 24, oA['universityPipelineStart'], oB['universityPipelineStart'], 'Pipeline stock; credential-network anchor'),
    ('Enterprise and University backlogs (state)', 'steady state', 'recomputed', 'recomputed', 'Contracted-not-live revenue consistent with the new churn'),
    ('Fixed/semi-fixed cost pool $M/q (state.costs)', 170 - (0.255 * 140 + 6.3 + 0.2 * 40 + 0.75 + 0.2 * 16 + 0.15 * 4), meta['mixes']['altA']['rebasedFixedPool'], meta['mixes']['altB']['rebasedFixedPool'], 'Keeps Q0 operating cost at $170M (profit $30M). Consumer carries the highest servicing rate (25.5%), so a naive mix raises Q0 profit by $2–4M.'),
    ('Segment capacity (market)', '300 / 120→135 / 40 / 80→150', '× 0.71 / × 1.5 / × 1.56 / × 3.75', '× 0.57 / × 1.75 / × 1.88 / × 5', 'Keeps the starting market-fill ratio; University capacity 40 would otherwise bind at $30M'),
]
for row in rb:
    for j, v in enumerate(row, start=1):
        put(ws, r, j, v, M if isinstance(v, float) else None, wrap=True)
    ws.row_dimensions[r].height = 30
    r += 1
put(ws, r, 1, 'Capabilities, culture, trust, cash and competitor benchmarks are held at production values to isolate the revenue-mix effect.', color='5B666D')
r += 2
r = section(ws, r, 'D · Results by mix', 'Share price from the experiment’s own starting point (=100 × P8 ÷ P0). Ranks are formulas within each variant.')
variants = ['baseline', 'altA:naive', 'altA:rebased', 'altA:rebased-aifixed', 'altB:naive', 'altB:rebased', 'altB:rebased-aifixed']
vlab = {'baseline': 'Baseline', 'altA:naive': 'A naive', 'altA:rebased': 'A re-based', 'altA:rebased-aifixed': 'A re-based, AI fixed', 'altB:naive': 'B naive', 'altB:rebased': 'B re-based', 'altB:rebased-aifixed': 'B re-based, AI fixed'}
mx = defaultdict(dict)
for x in d['mixes']:
    mx[x['id']][x['mix']] = x
for metric, key, fmt in [('Q8 share price (from own start, $)', 'priceFromOwnStart', P), ('Terminal score', 'terminal', N1), ('Q8 revenue ($M)', 'rev8', M), ('Cumulative operating profit ($M)', 'cumOP', M)]:
    ws.cell(row=r, column=1, value=metric).font = F(bold=True)
    header(ws, r, [vlab[v] for v in variants], col0=2)
    r += 1
    t0 = r
    for sid in CORE_IDS:
        put(ws, r, 1, SNAME[sid])
        for j, v in enumerate(variants, start=2):
            put(ws, r, j, mx[sid][v][key], fmt)
        r += 1
    ws.cell(row=r, column=1, value='Rank of Consumer-only').font = F(italic=True)
    co_r = t0 + CORE_IDS.index('consumer-only')
    en_r = t0 + CORE_IDS.index('enterprise-only')
    for j in range(2, 2 + len(variants)):
        c = L(j)
        put(ws, r, j, f'=RANK({c}{co_r},{c}{t0}:{c}{t0 + 9})', '0')
    r += 1
    ws.cell(row=r, column=1, value='Rank of Enterprise-only').font = F(italic=True)
    for j in range(2, 2 + len(variants)):
        c = L(j)
        put(ws, r, j, f'=RANK({c}{en_r},{c}{t0}:{c}{t0 + 9})', '0')
    r += 1
    ws.cell(row=r, column=1, value='Best − worst').font = F(italic=True)
    for j in range(2, 2 + len(variants)):
        c = L(j)
        put(ws, r, j, f'=MAX({c}{t0}:{c}{t0 + 9})-MIN({c}{t0}:{c}{t0 + 9})', fmt)
    r += 2
r = section(ws, r, 'E · What the mix experiment shows')
for t in [
    'Changing only the four starting revenues is not valid: within three quarters with no investment, Consumer drifts +$9M (A) and +$14M (B) and AI-native −$3M to −$5M, because every flow is calibrated to the baseline mix. A proportional re-base (section C) makes both alternatives steady states (drift within the baseline’s −$0.4M).',
    'With the AI growth reward held fixed, AI/Product is still the highest-return bucket in every mix (+$27–28M Q8 revenue for $10M a quarter; see Investment & capability, B). AI dominance therefore comes from the investment-return formulas, not the mix.',
    'Consumer’s return shrinks with its base (cumulative OP +$20M → +$13M → +$10M), and Enterprise-only rises from $75 to $96 (A) and $112 (B), mainly because less revenue is exposed to the consumer-side AI disruption. The Consumer-versus-Enterprise gap is partly a mix effect.',
    'If the AI growth reward scales with the AI base (proportional variant), AI-led strategies reach $171–$182 and the imbalance becomes extreme. Any future mix change should keep the AI reward absolute.',
]:
    r = para(ws, r, '• ' + t, cols=9, height=42)

# ═════════════════════════════════ 5. Sensitivity ═════════════════════════════════
ws = sheet('Sensitivity analysis', '5 · Sensitivity analysis — ten market scenarios × ten strategies', 'The engine market path is deterministic; scenarios are explicit variations through the supported market-override hook (definitions on the About sheet). Player briefings stay as authored.', [24] + [12] * 12)
r = 4
SC = [s['id'] for s in meta['scenarios']]
SCL = {s['id']: s['label'] for s in meta['scenarios']}
sen = defaultdict(dict)
for x in d['sensitivity']:
    sen[x['scenario']][x['id']] = x
blocks = {}
for metric, key, fmt in [('Q8 share price ($)', 'price8', P), ('Terminal score', 'terminal', N1), ('Q8 revenue ($M)', 'rev8', M), ('Cumulative operating profit ($M)', 'cumOP', M)]:
    ws.cell(row=r, column=1, value=metric).font = F(bold=True, color='193F3B')
    header(ws, r, ['Strategy'] + [SCL[s] for s in SC] + ['Mean', 'Min', 'Max'])
    r += 1
    t0 = r
    for sid in CORE_IDS:
        put(ws, r, 1, SNAME[sid])
        for j, s in enumerate(SC, start=2):
            put(ws, r, j, sen[s][sid][key], fmt)
        e = L(1 + len(SC))
        put(ws, r, 2 + len(SC), f'=AVERAGE(B{r}:{e}{r})', fmt, bold=True)
        put(ws, r, 3 + len(SC), f'=MIN(B{r}:{e}{r})', fmt)
        put(ws, r, 4 + len(SC), f'=MAX(B{r}:{e}{r})', fmt)
        r += 1
    blocks[key] = (t0, r - 1)
    put(ws, r, 1, 'Leader', bold=True)
    for j in range(2, 2 + len(SC)):
        c = L(j)
        put(ws, r, j, f'=INDEX($A${t0}:$A${r - 1},MATCH(MAX({c}{t0}:{c}{r - 1}),{c}{t0}:{c}{r - 1},0))', wrap=True)
    ws.row_dimensions[r].height = 28
    r += 2
t0, t1 = blocks['price8']
ws.cell(row=r, column=1, value='Rank by Q8 share price (1 = best)').font = F(bold=True, color='193F3B')
header(ws, r, ['Strategy'] + [SCL[s] for s in SC] + ['Best rank', 'Worst rank'])
r += 1
rk0 = r
for i, sid in enumerate(CORE_IDS):
    put(ws, r, 1, SNAME[sid])
    for j in range(2, 2 + len(SC)):
        c = L(j)
        put(ws, r, j, f'=RANK({c}{t0 + i},{c}${t0}:{c}${t1})', '0')
    e = L(1 + len(SC))
    put(ws, r, 2 + len(SC), f'=MIN(B{r}:{e}{r})', '0', bold=True)
    put(ws, r, 3 + len(SC), f'=MAX(B{r}:{e}{r})', '0', bold=True)
    r += 1
r += 1
r = section(ws, r, 'Reading')
for t in [
    'Rankings are stable across all ten scenarios. Enterprise-only is last in every one and Enterprise-led 9th in every one. Consumer-only ranks 6th–7th everywhere: it is never dominant.',
    'Even favourable conditions do not rescue the weak families. An Enterprise boom (demand ×1.2) adds only $3 to Enterprise-only, and a University boom adds $4 to University-led: their conversion formulas, not demand, limit them.',
    'Consumer-led and Consumer-only do best without the AI disruption ($132 and $126, 4th and 6th). Adaptive or AI-led wins every scenario.',
]:
    r = para(ws, r, '• ' + t, cols=12, height=28)

# ═════════════════════════════════ 6. Contract & financing audit ═════════════════════════════════
ws = sheet('Contract & financing audit', '6 · Contract, financing and recession audit', 'Forced accept/decline of the Q5 contract and forced recession responses, everything else identical. Deltas are formulas.', [24, 30] + [11] * 16)
r = 4
r = section(ws, r, 'A · Does the strategic envelope cap investment regardless of cash? (direct engine validation)')
header(ws, r, ['Check', 'Result'])
r += 1
for x in d['envelope']:
    put(ws, r, 1, x['check'], wrap=True)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
    put(ws, r, 2, x['result'], fill=KEY_FILL if x['result'].startswith('rejected') else None)
    ws.row_dimensions[r].height = 28
    r += 1
r += 1
r = section(ws, r, 'B · Q5 global enterprise contract: accept vs decline', 'Contract costs are event costs (cash) and a recurring delivery-team commitment; the Q5 investment and envelope are identical either way.')
header(ws, r, ['Strategy', 'Choice', 'Q5 investment', 'Q5 envelope', 'Q5 contract cash cost', 'Q5 closing cash', 'Delivery team $M/q', 'Load ÷ capacity Q5', 'Q8 revenue', 'Q8 Enterprise rev', 'Cum OP', 'Net cash Q8', 'Price Q8', 'Terminal', 'Financing raised', 'Insolvent'])
r += 1
pairs = []
for x in d['contract']:
    vals = [x['label'], x['choice'], x['q5Investment'], x['q5Envelope'], x['q5EventCosts'], x['q5Cash'], x['deliveryCommitment'], x['q5LoadRatio'], x['rev8'], x['ent8'], x['cumOP'], x['netCash8'], x['price8'], x['terminal'], x['financing'], 'yes' if x['insolvent'] else 'no']
    fm = [None, None, M, M, M, M, M, '0.00', M, M, M, M, P, N1, M, None]
    for j, (v, f) in enumerate(zip(vals, fm), start=1):
        put(ws, r, j, v, f)
    if x['choice'] == 'accept':
        pairs.append(r)
    r += 1
r += 1
ws.cell(row=r, column=1, value='Effect of accepting (accept − decline)').font = F(bold=True)
header(ws, r + 1, ['Strategy', '', 'Δ Q5 investment', '', 'Contract cash', 'Δ Q5 cash', 'Delivery $M/q', 'Δ Load', 'Δ Q8 revenue', 'Δ Q8 Enterprise', 'Δ Cum OP', 'Δ Net cash', 'Δ Price', 'Δ Terminal'])
r += 2
for pr in pairs:
    put(ws, r, 1, f'=A{pr}')
    for col in 'CEFGHIJKLMN':
        j = ord(col) - 64
        fmt = P if col == 'M' else ('0.00' if col == 'H' else (N1 if col == 'N' else M))
        if col in 'EG':
            put(ws, r, j, f'={col}{pr}', fmt)
        else:
            put(ws, r, j, f'={col}{pr}-{col}{pr + 1}', fmt)
    r += 1
r += 1
r = section(ws, r, 'C · Financing: default debt-first policy vs refusing all financing')
header(ws, r, ['Strategy', 'Policy', 'Q8 revenue', 'Q8 cash', 'Minimum cash', 'Q8 debt', 'Equity raised', 'Ownership', 'Price Q8', 'Terminal', 'Ever insolvent', 'Insolvent quarters', 'Distressed quarters'])
r += 1
for x in d['financing']:
    vals = [x['label'], x['policy'], x['rev8'], x['cash8'], x['minCash'], x['debt8'], x['equity'], x['ownership'], x['price8'], x['terminal'], 'yes' if x['insolvent'] else 'no', x['insolventQ'], x['distressedQ']]
    fm = [None, None, M, M, M, M, M, '0%', P, N1, None, '0', '0']
    for j, (v, f) in enumerate(zip(vals, fm), start=1):
        put(ws, r, j, v, f, fill=KEY_FILL if (x['policy'].startswith('refuse') and x['distressedQ'] > 0) else None)
    r += 1
r += 1
r = section(ws, r, 'D · Q6 recession responses (forced)', 'Hiring freeze is rejected by the engine whenever the quarter includes People investment. Deep reductions raise the share price for most strategies while lowering the terminal score.')
header(ws, r, ['Strategy', 'Response', 'Feasible', 'Q6 operating profit', 'Q8 cash', 'Q8 revenue', 'Cum OP', 'Price Q8', 'Terminal', 'Culture Q8', 'Talent Q8', 'Q8 option', 'Δ Price vs no action', 'Δ Terminal vs no action'])
r += 1
base_row = {}
for x in d['recession']:
    put(ws, r, 1, x['label']); put(ws, r, 2, x['response']); put(ws, r, 3, 'yes' if x['feasible'] else 'no', fill=None if x['feasible'] else KEY_FILL)
    if x['feasible']:
        for j, k, f in [(4, 'q6Savings', M), (5, 'cash8', M), (6, 'rev8', M), (7, 'cumOP', M), (8, 'price8', P), (9, 'terminal', N1), (10, 'culture8', N1), (11, 'talent8', N1)]:
            put(ws, r, j, x[k], f)
        put(ws, r, 12, x.get('finalOption'))
        if x['response'] == 'no action':
            base_row[x['id']] = r
        b = base_row.get(x['id'])
        put(ws, r, 13, f'=H{r}-H{b}', P)
        put(ws, r, 14, f'=I{r}-I{b}', N1)
    else:
        ws.merge_cells(start_row=r, start_column=4, end_row=r, end_column=14)
        put(ws, r, 4, x['reason'], color='8F3434')
    r += 1
r += 1
r = section(ws, r, 'E · Answers')
for t in [
    'Contracts reduce cash, not investment capacity. Accepting costs $6.6–10.4M of Q5 cash, plus a $1.5M-a-quarter delivery team for six quarters and +0.07–0.25 on the load ratio. The Q5 investment and envelope are identical whether the contract is accepted or declined, for all ten strategies.',
    'Teams can spend the full $30M and accept the contract in the same quarter. They can also borrow to cover the cash. Financing adds cash but never investment capacity: $40M within a $30M envelope is rejected. Only the Q8 options raise the envelope ($45M or $60M).',
    'Most strategies never need financing. Only the Enterprise strategies drew on it ($27M debt for Enterprise-only). Refusing financing leaves them distressed for 1–2 quarters, with cash falling to $6M.',
    'Recession responses are optional today. A hiring freeze is infeasible for 5 of the 10 strategies because they invest in People. A deep reduction raises the share price for 8 of 10 strategies (up to +$16) while cutting culture by about 20 points and the terminal score by 2–12: the share price rewards cuts the board report penalizes.',
]:
    r = para(ws, r, '• ' + t, cols=14, height=30)

# ═════════════════════════════════ Destination sweep (appendix) ═════════════════════════════════
wd = sheet('Destination sweep', 'Appendix · Destination sweep — each strategy under each of the five Q4 destinations', None, [26, 26] + [11] * 10)
r = 4
header(wd, r, ['Strategy', 'Destination', 'Q8 revenue', 'Cum OP', 'Net cash Q8', 'Price Q8', 'Terminal', 'Exec team avg', 'Contract', 'Q8 option', 'Best for strategy (price)'])
r += 1
ds0 = r
for x in d['destinationSweep']:
    vals = [SNAME[x['id']], x['destination'], x['rev8'], x['cumOP'], x['netCash8'], x['price8'], x['terminal'], x['execTeam'], 'accepted' if x['contract'] else 'declined', x['finalOption']]
    fm = [None, None, M, M, M, P, N1, N1, None, None]
    for j, (v, f) in enumerate(zip(vals, fm), start=1):
        put(wd, r, j, v, f)
    r += 1
dsN = r - 1
for rr in range(ds0, dsN + 1):
    put(wd, rr, 11, f'=IF(F{rr}=_xlfn.MAXIFS($F${ds0}:$F${dsN},$A${ds0}:$A${dsN},A{rr}),"best","")')
wd.freeze_panes = 'C5'

# ═════════════════════════════════ Proposal tests (appendix) ═════════════════════════════════
wp = sheet('Proposal tests', 'Appendix · Candidate calibration changes — tested in memory, not implemented', 'Every row is a complete eight-quarter run with the package’s constants overridden for that run only.', [10, 18, 24] + [11] * 12)
r = 4
header(wp, r, ['Package', 'Scenario', 'Strategy', 'Family', 'Q8 revenue', 'Q8 Enterprise rev', 'Q8 University rev', 'Q8 AI-native rev', 'Cum OP', 'Net cash Q8', 'Price Q8', 'Terminal', 'Exec team avg', 'Insolvent'])
r += 1
pt0 = r
fam = {s['id']: s['family'] for s in STRATS}
for res in d['proposals']['results']:
    for x in res['rows']:
        vals = [res['pkg'], res['scenario'], SNAME[x['id']], fam[x['id']], x['rev8'], x['seg8']['enterprise'], x['seg8']['university'], x['seg8']['aiNative'], x['cumOP'], x['netCash8'], x['price8'], x['terminal'], x['execTeam'], 1 if x['everInsolvent'] else 0]
        for j, v in enumerate(vals, start=1):
            c = wp.cell(row=r, column=j, value=v)
            c.font = F(size=9)
            if j >= 5:
                c.number_format = '0.0'
        r += 1
ptN = r - 1
wp.freeze_panes = 'D5'
PT = lambda col: f"'Proposal tests'!${col}${pt0}:${col}${ptN}"

# ═════════════════════════════════ 7. Recommendations ═════════════════════════════════
ws = sheet('Recommendations', '7 · Findings and recommendations', 'Answers draw on sheets 1–6. Package metrics are formulas over the Proposal tests appendix; grid metrics are recorded engine results.', [34] + [13] * 12)
r = 4
r = section(ws, r, 'A · Answers')
answers = [
    ('Is Consumer investment disproportionately rewarded?',
     'Against Enterprise and University, yes; against AI/Product, no. $10M a quarter adds, by Q8: Consumer +$8.3M revenue, +$20M cumulative OP and +$10.9 a share; Enterprise +$2.0M, −$7.4M and +$3.1; University +$3.6M, +$6.7M and +$11.5 (price via strategic readiness, with almost no revenue); AI/Product +$25.0M, +$44.9M and +$30.3. Consumer’s advantage over Enterprise comes from defending the 70% Consumer base, which the AI disruption erodes by $11–19M by Q8 when neither Consumer nor People is funded (Enterprise-only −$19M, AI-only −$13M, Cash preservation −$11M), with no recurring cost commitment and fast maturation.'),
    ('Does a Consumer-only strategy outperform most alternatives?',
     'No. It ranks 7th of 10 on Q8 share price ($109.9) and 8th on the terminal score (61.8), and sits at the 27th percentile of 462 allocations on price (13th on score). It ranks 6th–7th in all ten market scenarios; it is 2nd–3rd in Q1–Q2, within $1 of the leader, and falls back from Q3. Consumer is valuable as a complement: Consumer + AI ($15M each) is the single best constant strategy ($164.5, 99th percentile).'),
    ('Are Enterprise, University and AI commercially viable strategic choices?',
     'AI: yes; it is the dominant and effectively mandatory investment. Every destination’s best allocation includes $10M AI, and the best allocation without AI is $116–133 against $156–166 with it. Enterprise: not as a lead investment. Enterprise capability reaches the 120 ceiling, yet win rate moves only 25% → 29% and Enterprise revenue only $40M → $46M (or $52M with the contract). Enterprise-only is last in every scenario, and each $5M of Enterprise lowers the average outcome. It works only paired with AI ($148). University: viable for share price ($111) and score but not commercially. University revenue stays at about $16M through Q8 even with Credential at 120, because wins are recognized from Q+2 to Q+5 and the $40M University market is small. Every destination is reachable at a similar best ($156–166), but only with AI.'),
    ('Does the starting revenue mix create the imbalance, or do the investment-return formulas?',
     'Mostly the formulas, with the mix amplifying Consumer over Enterprise. Under valid re-based mixes (AI reward held fixed), AI/Product remains the top-return bucket in every mix, and Enterprise’s return stays weak (cumulative OP still negative at Q8): formula effects. Consumer’s return falls as its base shrinks (+$20M → +$13M → +$10M cumulative OP), and Enterprise-only rises from $75 to $96–112 as less revenue is exposed to the consumer disruption: a mix effect. The engine does not support changing the mix on its own; the nine constants and the cost pool on the Starting revenue distribution sheet must change with it.'),
    ('What is the smallest set of economic changes needed for credible strategic trade-offs?',
     'Five calibration changes, all of which preserve the starting company exactly (package PR, below): (1) AI adoption reward above baseline $0.08M → $0.05M per point; (2) Enterprise conversion: win rate per point of relative capability 0.08 → 0.30 and pipeline inflow amplitude 1.2 → 3.0; (3) Enterprise bookings go live 50/50% over two quarters instead of 25/50/25% over three; (4) Enterprise delivery commitment 4% → 2%; (5) University pipeline: inflow amplitude 0.8 → 4.0 and resolution 0.2 → 0.4. Effects in the authored market: the lead-family price range narrows from $82–149 to $114–135. Enterprise-led moves from 9th to 5th, and AI-only falls from the 49th to the 17th percentile. Enterprise’s share of the top-5% allocations rises from $1.0M to $4.6M. Two issues remain: AI is still part of every winning allocation (a design choice, given the AI-disruption theme), and University revenue still does not grow within eight quarters, which needs a structural change (a larger University market or Credential in the win rate), not calibration.'),
    ('How should contract costs, recession actions and financing interact with the investment budget?',
     'Make each one a claim on the same capital decision, as set out in section C. The contract’s upfront cost should come out of that quarter’s strategic envelope. The recession response should be an explicit, always-feasible choice. Financing raised in a quarter should be able to expand that quarter’s envelope within debt, dilution, cash-floor and absorption limits, so long-payback strategies (Enterprise, University) have a funding path that costs something.'),
]
for q, a in answers:
    put(ws, r, 1, q, bold=True, wrap=True)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=13)
    put(ws, r, 2, a, wrap=True)
    ws.row_dimensions[r].height = max(45, 14 * (len(a) // 140 + 1))
    r += 1
r += 1
r = section(ws, r, 'B · Candidate calibration changes (tested in memory; not implemented)')
header(ws, r, ['Change', 'Constant', 'Current', 'Tested', 'Rationale'])
ws.column_dimensions['B'].width = 30
r += 1
for c in d['proposals']['candidates']:
    if c['id'] == 'none':
        continue
    for i, o in enumerate(c['overrides']):
        put(ws, r, 1, c['label'] if i == 0 else '', bold=i == 0, wrap=True)
        put(ws, r, 2, o['target'], wrap=True)
        put(ws, r, 3, json.dumps(o['from']) if isinstance(o['from'], list) else o['from'])
        put(ws, r, 4, json.dumps(o['to']) if isinstance(o['to'], list) else o['to'], color='0000FF')
        ws.merge_cells(start_row=r, start_column=5, end_row=r, end_column=13)
        put(ws, r, 5, c['rationale'] if i == 0 else '', wrap=True)
        ws.row_dimensions[r].height = 30
        r += 1
r += 1
r = section(ws, r, 'C · Packages compared (formulas over the Proposal tests appendix)', 'Lead family = Consumer-led, Enterprise-led, AI-led, University-led ($20M lead + $10M People).')
pk = d['proposals']['packages']
header(ws, r, ['Package', 'Contents', 'Scenario', 'Lead-family min price', 'Lead-family max price', 'Lead-family spread', 'Enterprise-led price', 'University-led price', 'Consumer-only price', 'AI-only price', 'Best price (any)', 'Lowest price (any)'])
ws.column_dimensions['B'].width = 30
r += 1
for p in pk:
    for sc in ['authored', 'consumer-weak', 'enterprise-boom', 'ai-boom', 'no-disruption', 'severe-recession']:
        put(ws, r, 1, p['id'], bold=True, fill=KEY_FILL if p['id'] == 'PR' else None)
        put(ws, r, 2, p['label'], wrap=True)
        put(ws, r, 3, sc)
        cond = f'{PT("A")},$A{r},{PT("B")},$C{r}'
        lead = ['Consumer-led', 'Enterprise-led', 'AI-led', 'University-led']
        mins = ','.join([f'SUMIFS({PT("K")},{cond},{PT("C")},"{n}")' for n in lead])
        put(ws, r, 4, f'=MIN({mins})', P)
        put(ws, r, 5, f'=MAX({mins})', P)
        put(ws, r, 6, f'=E{r}-D{r}', P, bold=True)
        for j, n in [(7, 'Enterprise-led'), (8, 'University-led'), (9, 'Consumer-only'), (10, 'AI-only')]:
            put(ws, r, j, f'=SUMIFS({PT("K")},{cond},{PT("C")},"{n}")', P)
        put(ws, r, 11, f'=_xlfn.MAXIFS({PT("K")},{cond})', P)
        put(ws, r, 12, f'=_xlfn.MINIFS({PT("K")},{cond})', P)
        ws.row_dimensions[r].height = 26
        r += 1
r += 1
r = section(ws, r, 'D · Package effects on the full allocation grid (462 allocations × 5 destinations each; recorded results)')
header(ws, r, ['Package', 'Top-5% avg Consumer $M', 'Top-5% avg Enterprise $M', 'Top-5% avg AI $M', 'Top-5% avg People $M', 'Top-5% avg University $M', 'Consumer-only pct', 'Enterprise-only pct', 'AI-only pct', 'University-only pct', 'Best price overall', 'Spread of destination bests', 'Best Enterprise AI'])
r += 1
for g in d['proposals']['grid']:
    t = g['topShare']; pc = g['pct']
    vals = [g['pkg'], t['consumer'], t['enterprise'], t['aiProduct'], t['people'], t['universityCredentials'], pc['consumer'] / 100, pc['enterprise'] / 100, pc['aiProduct'] / 100, pc['universityCredentials'] / 100, g['overallBest'], g['spreadBestDest'], g['byDestination']['enterprise-ai']['best']]
    fm = [None, N1, N1, N1, N1, N1, '0%', '0%', '0%', '0%', P, P, P]
    for j, (v, f) in enumerate(zip(vals, fm), start=1):
        put(ws, r, j, v, f, bold=j == 1, fill=KEY_FILL if g['pkg'] == 'PR' else None)
    r += 1
r += 1
r = section(ws, r, 'E · Proposed rules for contracts, recession and financing (documented only — not implemented)')
rules = [
    ('Contract claims capital', 'When the Q5 contract is accepted, its upfront cost (implementation + customization, $6.6–10.4M today) is deducted from that quarter’s strategic envelope, so the team chooses between the contract and part of its investment. The delivery team stays a recurring operating commitment and is shown in the next quarters’ plan as committed spend. Accepting with no room in the envelope requires financing (rule 3).'),
    ('Recession response: required and always feasible', 'In Q6 the team must choose one stance: Protect (keep investing; the CFO forecast shows the cash consequence), Slow (move at least $5M of investment to reserve), or Cut (hiring freeze, targeted or deep reduction, marketing cut). When People investment is planned, a hiring freeze is offered as “freeze and move People investment to reserve” rather than rejected. Pair it with a valuation change (NXLN-VAL-1.1): an organizational-health term (culture and talent below their starting levels) in the retention-and-trust factor, so deep cuts are no longer a free share-price gain (today up to +$16 a share while culture falls about 20 points).'),
    ('Financing can expand investment, with limits', 'Envelope(t) = $30M + min($15M, new capital raised in quarter t), in Q2–Q7. New capital = debt drawn + equity issued that quarter, and every dollar above $30M must be funded by it. Limits: debt within the existing debt capacity and covenants (interest is an operating cost; leverage lowers the financial-health factor); equity within the existing maximum share of pre-money, with dilution through ownership^0.6 in the price; the CFO forecast must show closing cash ≥ $25M after the expanded plan, or the expansion is refused; the extra spend adds transformation load, so the absorption curve penalizes over-expansion. Q8 options keep their $45M and $60M envelopes. This gives long-payback strategies a funding path with a visible cost.'),
    ('Secondary observations', '(a) A single bucket funded at $30M a quarter hits the 120 capability ceiling by Q6–Q7, and later spend is wasted; the decision screen could flag “near ceiling”. (b) Cash preservation builds $187M of cash but the price ignores cash above $40M by design, so hoarding is correctly unrewarded. (c) University-led’s $111 price comes from strategic readiness, not revenue; the report should say so.'),
]
for k, v in rules:
    put(ws, r, 1, k, bold=True, wrap=True)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=13)
    put(ws, r, 2, v, wrap=True)
    ws.row_dimensions[r].height = max(45, 14 * (len(v) // 140 + 1))
    r += 1

# order sheets: About, 1..7, appendices
order = ['About', 'Executive comparison', 'Quarter-by-quarter results', 'Investment & capability', 'Starting revenue distribution', 'Sensitivity analysis', 'Contract & financing audit', 'Recommendations', 'Allocation grid', 'Destination sweep', 'Proposal tests']
wb._sheets = [wb[n] for n in order]
for w in wb.worksheets:
    w.page_setup.orientation = 'landscape'
    w.page_setup.fitToWidth = 1
    w.page_setup.fitToHeight = 0
    w.sheet_properties.pageSetUpPr.fitToPage = True
    w.sheet_properties.tabColor = '193F3B' if w.title in order[1:8] else 'A77A24'
wb.save(OUT)
print('saved', OUT)
