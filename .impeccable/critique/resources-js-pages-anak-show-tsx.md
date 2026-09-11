# Critique — Detail anak (resources/js/pages/anak/show.tsx)

Date: 2026-09-11
Method: dual-agent (A design review isolated from detector; B detector + browser measurement)
Mode: Operate
Viewports: 1267x627 (user's real laptop), 820x1180, 375x812
Children inspected: 123 (2 records), 12/23 (6 records), 71 (stale + corrupt), 82 (empty)

## Score: 19/40 (applicable max 40, no heuristics n/a)

| # | Heuristic | Score |
|---|---|---|
| 1 | Visibility of System Status | 2 |
| 2 | Match System / Real World | 3 |
| 3 | User Control and Freedom | 2 |
| 4 | Consistency and Standards | 2 |
| 5 | Error Prevention | 1 |
| 6 | Recognition Rather Than Recall | 1 |
| 7 | Flexibility and Efficiency | 2 |
| 8 | Aesthetic and Minimalist Design | 2 |
| 9 | Error Recovery | 1 |
| 10 | Help and Documentation | 3 |

## Deterministic scan: UNAVAILABLE
impeccable-engine 0.1.5 does not parse .tsx. Canary: identical 9px construct flags in .html
(1 finding, exit 2) and returns [] in .tsx. Treat "0 findings" on TSX as no signal, not clean.
This invalidates earlier "detector clean" claims in this session for TSX sources.

## Priority issues

- [P1] Detail page ignores the period selector. `detailAnak(rute.id)` takes no periodeId.
  22/123 children (18%) last weighed before June show stale green status under a sidebar
  reading "Juni 2026". Stale `umur` also drives PB/U-vs-TB/U labels and the measurement-method
  sentence. Fix: pass periodeId, add "Belum ditimbang pada <periode>" banner, compute age from
  the period date. -> /impeccable harden

- [P1] Wrong data unmarked, empty data unexplained. `statusKehadiran` read 0x in show.tsx.
  Child 71: 97,0cm -> 85,5cm passes clean because tidakWajar is false. History table prints
  no category text, so a typo-driven -3,05 reads as an ordinary number.
  Fix: surface statusKehadiran per row; add category column; flag month-over-month deltas
  against the thresholds Pengaturan already exposes. -> /impeccable harden

- [P1] KMS chart axis text below the type floor. 16/17px inside a 1100-unit viewBox scaled
  0.862 => 13,8px (x56) and 14,7px (x15) at 1267; 11,0px at 820; 10,5px at 375.
  Spec 2.4 floor is 16px. Fix: scale SVG text inversely to render scale. -> /impeccable typeset

- [P1] Chart is 552px = 88% of a 627px viewport, page is 2253px = 3.59 screens, chart has no
  <h2> (only 2 h2 on the page), and plots BB/U while the actionable verdict is BB/TB.
  -> /impeccable layout

- [P2] Three z-score cards (160/244/160px, ragged) give three verdicts with no resolution and
  no StatusGiziBadge (used 3x on the list, 2x on dashboard, 0x here). -> /impeccable distill

## Verified false positives
1. A: "bg-accent row tint does not render" — FALSE. aria-current row computes rgb(233,243,236).
2. B: "KMS svg is aria-hidden, no role/label/title" — FALSE. B measured the 20px lucide
   ArrowLeft. Chart has role="img", aria-label, 6 <title>.
3. B: "0 elements under 16px" — true for HTML, false for SVG (see typography issue).
4. B: card border 1.69:1 — real number, but WCAG 1.4.11 excludes decorative dividers.

## Strengths
- KMS chart is authored, not templated: line broken across unweighed months (not interpolated),
  KIA band colours, dual kg axis, per-point <title>.
- lib/format.ts number discipline: em-dash never 0, U+2212 minus, comma decimals, units always
  written, dates parsed as text to avoid UTC day-shift.
- Back control deliberately un-minimalised to "<- Data Anak" at 48px, citing principle P1.
- Responsive containment: 0 body overflow at 375px, internal scroll with written hints.

## Accessibility facts (measured)
- 0 interactive elements under 48px at any viewport/role.
- 0 tabindex="-1", 0 clickable-but-not-focusable.
- All text contrast passes: lowest 6.30:1.
- Table scroll wrapper has tabIndex=0 but no role and no aria-label (chart wrapper has both).
- <table> has no <caption>, no aria-label.

---

## Follow-up: fixes applied 2026-09-11 (same session)

All four selected fixes landed. Verified live at 1267x627, 820x1180, 375x812 across
kader/bidan/admin on children 12, 27, 71, 123.

- [P1 stale data] FIXED. `periode` + `ambang` now passed to DetailAnak. Banner fires:
  "Belum ditimbang pada Juni 2026. Angka di bawah berasal dari pengukuran 11 April 2026."
  Age recomputed from the period via new `umurBulanPada()` in lib/format.ts — child 71 reads
  2 tahun 6 bulan in June and 2 tahun 1 bulan in January (was frozen at last-weighing age).
  Page now reacts to the period selector; previously byte-identical.
- [P1 wrong/empty data] FIXED. `statusKehadiran` surfaced per row (Pindah / Tidak hadir /
  Tidak dapat diukur — verified on children 27, 66, 1). Month-over-month delta check against
  Pengaturan thresholds: child 71 row 14 Mar now reads "Tinggi berkurang 11,5 cm dari bulan
  sebelumnya". ZScoreCell now prints the category, so the -3,05 reads "Gizi buruk".
  Phantom "panjang badan" no longer printed under non-existent measurements.
- [P1 chart type] FIXED at laptop, improved elsewhere. Declared 16/17 -> 19/20 viewBox units,
  min-w 720 -> 900px. Rendered: 1267 = 16,4/17,2px (was 13,8/14,7); 820 and 375 = 15,5/16,4px
  (was 11,0/11,7 and 10,5/11,2). Cost: chart scroll 1.00 -> 1.19x at 820, 2.10 -> 2.62x at 375.
- [P1 structure] FIXED. Chart section now has an <h2>; page has 4 headings (was 2).
  Identity moved below the verdict. Subtitle now "4 tahun 11 bulan, RT 05" instead of
  "Data Anak, detail."
- [P2 three verdicts] FIXED. Severest index leads with StatusGiziBadge + an explicit
  "Perlu tindak lanjut bulan ini." / "Tidak perlu…" line; other two demoted to a supporting
  row. Ragged 160/244/160 card grid gone. z-score-block.tsx deleted (orphaned).

Not fixed: page height grew 2253 -> 2560px (3.59 -> 4.08 screens). The growth is category
text, absence reasons and warnings — information the critique asked for, not decoration.
Chart is still 552px (88% of a 627px viewport).
