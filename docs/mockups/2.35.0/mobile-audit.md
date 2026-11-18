# Mobile audit (iPhone 14 viewport, 390 × 844, demo data)

Measured with Playwright on the running app (computed styles and bounding boxes), then compared with the screens. "Observed" means seen on a screenshot only.

## Findings

| # | Where | Finding | Evidence |
| --- | --- | --- | --- |
| 1 | Browse sheet, notifications | Bell is a 30 × 30 target with a 16 px icon; the top bar's buttons are 44 × 44 with 22 px icons, and the nav icons are 22 px | measured |
| 2 | Browse sheet, profile | Name is 15 px bold and karma label 11 px, below the 15.5 px of the rows underneath it: the hierarchy is inverted. Avatar 36 px | measured |
| 3 | Browse sheet, counts | Counts are 12 px against 15.5 px labels. Their boxes share a right edge (364) but the digits sit at different x between the nav block and the project block | measured + observed |
| 4 | Browse sheet, labels | Labels start at x = 59 for rows with a `#` marker, 65 for rows with an icon and 73 for nested ones: the `#` glyph is 16 px wide, icons 22 px | measured |
| 5 | Browse sheet, section headers | 11.5 px headers (workspace names) against 15.5 px rows | measured |
| 6 | Task sheet, header | The project breadcrumb is cut ("Domaine") by the 25 min timer pill. The previous / next chevrons are faint | observed |
| 7 | Task sheet, properties | The row of property chips is clipped on the right ("Nobod…") | observed |
| 8 | Task and other sheets, closing | Dragging down only works from the 26 px grip at the top. Dragging the header or the content at scroll top does nothing | read in `SheetChrome.tsx` |
| 9 | Page header | The "This week" title and its three round buttons use about 100 px of an 844 px screen. The round buttons are larger than the top bar's | observed |
| 10 | Floating add button | The plus is small inside its large circle | observed |

## Mockup

`mobile-sidebar-before-after.png`: the Browse sheet before and after `mobile-sidebar-after.css`, a CSS override injected into the real app (not a drawing). It fixes 1 to 5: bell 44 / 22, profile name 17 px, karma 12.5 px, headers 12.5 px, counts 13 px tabular and right aligned in a fixed column, a 22 px marker box so every label starts at x = 65.

Measured after the override: nav and project counts share one right edge (354) and one column; project labels start at 65 (the nested level at 79).

`mobile-task-composer-notifications.png`: the task sheet, the composer and the notifications sheet, before any change.

## Not done yet

Findings 6 to 10 have no mockup. 6 to 8 need a decision (move or hide the timer pill on a phone, make the sheet header a drag zone, add a scroll-top drag) before drawing.
