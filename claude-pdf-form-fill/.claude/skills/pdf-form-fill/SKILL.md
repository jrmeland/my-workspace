---
name: pdf-form-fill
description: Precisely fill AcroForm PDF fields (tax forms, government forms, W-9s) while automatically handling the common gotchas — comb fields like SSN/EIN/routing numbers, per-checkbox on-states, radio-group sibling clearing, maxlen enforcement, multiline text, and currency formatting. Use whenever the user wants values placed into a fillable PDF.
---

# pdf-form-fill

Scripts for reading and writing AcroForm PDF fields without the usual footguns. Built against IRS Form 1040 but deliberately generic — the same scripts work on any AcroForm PDF (Schedule C, W-9, state tax forms, etc.).

## The gotchas this skill exists to hide

These are the things that go wrong if you naively call `widget.field_value = "..."`:

1. **Comb fields** — two flavors, same flag. Fields like SSN, EIN, ZIP, phone, bank routing/account have the AcroForm *comb* flag set (bit 24). Each character is rendered in its own evenly-spaced cell. But whether separators belong inside the cells depends on the field's `maxlen`:
   - **Tight comb** (IRS Form 1040 SSN, `maxlen=9`): the 9 cells are *just* the 9 digits. Dashes don't fit.
   - **Wide comb** (Oregon OR-40 SSN, `maxlen=11`; dates, `maxlen=10`): the 11 (or 10) cells *include* the `-` / `/` characters as literal cell contents. Writing `"555123456"` into an 11-cell SSN leaves 2 cells blank and looks wrong.
   `pdf_fill.py` tries the raw value as-is first; if it exceeds `maxlen`, it falls back to stripping non-alphanumerics. So `"555-12-3456"` works for both: IRS (overflows 9, strips to `"555123456"`) and Oregon (fits 11, preserved).
2. **Checkbox on-states are not `"Yes"`.** Each checkbox has its own "on" export value. On Form 1040, the first filing-status radio member's on-state is `"1"`, the second is `"2"`, etc. Writing `"Yes"` or `"On"` silently leaves the box unchecked.
3. **Radio-like checkbox groups.** Sibling checkboxes sharing a stem (`c1_8[0]`, `c1_8[1]`, `c1_8[2]`) act as a single-choice group. Checking one doesn't clear the others — you have to do that yourself.
4. **maxlen truncation.** Text fields with `maxlen` silently truncate. A truncated SSN is a *data bug*, not a rendering bug.
5. **Multiline vs single-line.** A `\n` in a single-line field corrupts it; the viewer will render a literal glyph.
6. **Currency formatting.** Dollar columns look nicer with commas, but a field with a small `maxlen` can't fit them.
7. **NeedAppearances.** If you only set `field_value` without updating the widget's appearance stream, many viewers (Preview.app in particular) show the old visual until the user clicks the field.
8. **`fitz` shadowing.** Naming your script `inspect.py` silently breaks PyMuPDF (it imports stdlib `inspect` internally).
9. **Right-aligned comb fields (`/Q=2`).** Oregon/state tax forms often use comb fields for dollar amounts that expect right-aligned input. PyMuPDF's appearance-stream generator ignores `/Q` and writes everything left-aligned, which silently puts your thousands into the millions column. `pdf_fill.py` detects `/Q=2` from the raw annotation dict and left-pads with spaces to simulate right alignment.
10. **"Whole dollars" comb with pre-printed `.00` art.** Same Oregon forms often declare `maxlen=11` on a dollar field whose last two cells have `.00` pre-printed as page art (the field itself is 9 writable dollar cells, not 11). The tooltip says `"Dollar amount in whole dollars: "`. Writing your value into all 11 cells overwrites the art and shifts everything wrong; `pdf_fill.py` recognizes the tooltip and targets `maxlen-2` cells only.

All of these are handled for you by the scripts below.

## Scripts

All scripts live in `scripts/`. They require `pymupdf` (also importable as `fitz`). Run with `python3`.

### `pdf_label.py` — visual field→name map (run this first on any new form)

```
python3 scripts/pdf_label.py <pdf> <out_dir> [--dpi 180]
```

Produces `<out_dir>/<stem>_labeled.pdf` plus one `<stem>_p<N>.png` per page, where every text field is filled with its own short name and every checkbox (plus any text field too small to hold a readable label — `maxlen ≤ 3`, i.e. "Initial", "State", "Code") has a small red label drawn beside it. Open the PNGs, read off which `fN_XX` corresponds to which line on the form's own numbering, and you have a definitive field→line map to write your values JSON against.

**Do this before anything else on an unfamiliar form.** The time sink during initial bring-up is always "is `f2_06` line 15 or line 16?" and a labeled render answers that in one pass. The IRS periodically rearranges sub-lines (e.g. Form 1040 2025 has `12e`, `13a`, `13b`, and a middle-column `25a` that isn't in the main dollar column), so don't assume last year's field map still applies.

### `pdf_inspect.py` — field map with gotcha hints

```
python3 scripts/pdf_inspect.py <pdf>                # all fields
python3 scripts/pdf_inspect.py <pdf> --page 0       # page 0 only
python3 scripts/pdf_inspect.py <pdf> --filter f1_16 # substring match
python3 scripts/pdf_inspect.py <pdf> --json         # machine-readable
```

Output includes a `hints=` column listing the relevant gotchas for each field: `comb=9`, `maxlen=17`, `multiline`, `align=right`, `whole_dollars`, `onstate=2`, `radio=<stem>`. **Always inspect before filling** so you know which fields are comb / right-aligned / have maxlen / belong to radio groups.

### `pdf_fill.py` — apply values

```
python3 scripts/pdf_fill.py <input.pdf> <output.pdf> --values values.json
python3 scripts/pdf_fill.py <input.pdf> <output.pdf> --set 'f1_16=123-45-6789' --set 'c1_5=true'
```

`--values` takes a JSON object mapping field name (or a unique substring of one) to value. `--set` is a shortcut for one-off CLI writes. Both can be combined.

**Value conventions:**
- Strings go to text fields as written, subject to cleaning for comb fields.
- `true` / `false` / `"yes"` / `"no"` / `1` / `0` map to the correct checkbox on-state automatically.
- Numbers (`12345` or `12345.67`) are formatted with thousands separators for currency unless the target is comb or too narrow.
- You can pass a raw checkbox on-state string (`"1"`, `"2"`) if you need explicit control.

**Ambiguous substring matching:** if the key matches multiple field names, the script errors out with a sample of the matches. Pass `--allow-ambiguous` to apply the value to every match.

**Radio groups:** when you set one member of a radio group (siblings like `c1_8[0]`, `c1_8[1]`) to a truthy value, the other members are cleared automatically in the same pass.

### `pdf_render.py` — visual verification

```
python3 scripts/pdf_render.py <pdf> --page 0 --out page0.png
python3 scripts/pdf_render.py <pdf> --field f1_16 --out ssn.png --pad 40 --dpi 250
```

Renders a whole page or a zoomed crop around a specific field. Use this after filling to screenshot the result and confirm the value landed where you expected. `--field` accepts a unique substring.

### `pdf_verify.py` — read values back

```
python3 scripts/pdf_verify.py <pdf> --all-filled
python3 scripts/pdf_verify.py <pdf> --filter SSN
```

Dumps the current value of each field. Use to diff two PDFs or confirm a fill round-trip.

## Recommended workflow

1. **Label the form.** `pdf_label.py <pdf> /tmp/formmap` and read the PNGs. Match `fN_XX` names to the form's own line numbers. This is the single biggest time-saver on any unfamiliar PDF.
2. **Inspect for gotchas.** `pdf_inspect.py <pdf>` and scan the `hints=` column for `comb`, `maxlen`, `onstate`, `radio` on the fields you care about.
3. **Write a values file.** JSON is easiest for batches. Use the shortest unique substring per field, e.g. `"f1_16"` for the taxpayer SSN. Underscore-prefixed keys (`"_comment_foo"`) are ignored, so you can annotate sections.
4. **Fill one logical group at a time** when iterating on a new form: taxpayer identity → filing status → dependents → income lines → payments → signature. Run fill, then render, then look.
5. **Verify visually** with `pdf_render.py --field <name>` after each write during bring-up. Once you know the form's quirks, you can batch.
6. **Round-trip check** with `pdf_verify.py --all-filled` to make sure nothing was silently dropped.

## Common use cases

### SSN, EIN, routing number (comb)

Pass whatever format is convenient. The fill script tries your value as-is first, and only strips non-alphanumerics if it overflows `maxlen`:
- IRS 1040 SSN (`comb=9 maxlen=9`): `"123-45-6789"` → overflows → strip → `"123456789"`.
- Oregon OR-40 SSN (`comb=11 maxlen=11`): `"123-45-6789"` → fits → preserved, dashes render in their own cells.

Always pass the human-readable form with separators — it round-trips on both.

### Date fields (comb)

Same story. An Oregon DOB is `comb=10 maxlen=10` and expects `"04/10/2025"` literally; a hypothetical 8-cell digits-only date comb would strip the slashes. Pass `"MM/DD/YYYY"` and let the script figure it out.

### Bank account number (comb, maxlen up to ~17)

`"9876-5432-1098-7654"` → `"9876543210987654"`. If the cleaned value exceeds maxlen the script errors rather than truncating.

### Phone number

Two flavors:
- **Comb** phone field: write any format, it's cleaned to digits.
- **Non-comb** phone field (has a plain `maxlen` like 11 but no comb flag): the field renders whatever you pass literally, so `"555-1212"` stays `"555-1212"`. Check `hints=` to tell them apart.

### Currency columns

Pass numbers, not strings, so the formatter can pick the right style:
```json
{"f1_47": 1234567, "f1_48": 25000.50}
```
Becomes `"1,234,567"` and `"25,000.50"`. If you need exact literal control (e.g. `"(500)"` for a negative), pass a string.

### Right-aligned comb dollar fields (Oregon / state forms)

These look like `[_,_,_] , [_,_,_] , [_,_,_] . [_,_]` drawn on the form art, with `comb=11 maxlen=11 align=right whole_dollars=True` in the hints. Just pass a plain integer dollar value:
```json
{"or-40-p3-2": 125400}
```
`pdf_fill.py` will convert it to `"   125400"` (3 leading spaces + 6 digits = 9 chars) so the number right-aligns in the 9 writable dollar cells and the pre-printed `.00` art shows through the 2 cent cells. Floats are rounded to int — the cents cells are form art, not writable, so a value like `125400.75` becomes `125400` with a warning-free round trip. If you actually need cents on a field without a "whole dollars" tooltip, `align=right` alone just right-pads to `maxlen` instead.

### Filing status / radio choice

Find the radio group via `pdf_inspect.py --filter c1_8` — look for `radio=<stem>` hints. Then set the one you want:
```json
{"Checkbox_ReadOrder[0].c1_8[1]": true}
```
Siblings are cleared automatically.

### Independent checkboxes (not a radio group)

Just set each one:
```json
{"c1_5": true, "c1_7": false}
```
No sibling logic applies.

### Multiline explanation / address block

Multiline fields honor `\n`:
```json
{"f2_37": "Line one\nLine two\nLine three"}
```
Check that the field actually has the `multiline` hint first; writing a newline to a single-line field errors out.

## Extending

- Add new value-type handlers in `pdf_fill.py` → `apply_text` (e.g. dates in a specific format).
- To support a new checkbox on-state convention, extend `TRUE_TOKENS` / `FALSE_TOKENS` or use the raw on-state string directly.
- The scripts work on any AcroForm PDF. For pure XFA forms (rare; most IRS forms are hybrid), PyMuPDF won't see the XFA widgets — use `pdftk` or `Okular` to convert first.

## Known issues

- **`MuPDF error: format error: No common ancestor in structure tree`** printed during render/save is benign noise from PyMuPDF's StructTreeRoot traversal — IRS PDFs have a partial structure tree and mupdf complains about it every time. The output PNG/PDF is still correct. *Do not* suppress stderr globally to hide this; it would also mute real warnings like xref table damage or font load failures. Just ignore the line.
- Some PDFs embed both AcroForm *and* dynamic XFA. AcroForm writes are visible in Preview.app, Okular, and any modern non-Adobe viewer. Adobe Reader may regenerate the visual from XFA on open — if that's a concern, flatten with `pdftk output.pdf output_flat.pdf flatten` as a final step.
