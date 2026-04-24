#!/usr/bin/env python3
"""Inspect a fillable PDF and emit a structured field map.

Usage:
    python inspect.py <pdf_path> [--page N] [--filter SUBSTR] [--json]

Outputs (text mode by default) one row per field with:
    page  index  name  type  hint(s)  rect

Hints surface the gotchas other scripts must respect:
    comb=N          -> AcroForm 'comb' flag set; field has N evenly-spaced
                       character cells. Write raw characters with no
                       separators (e.g. an SSN must be "123456789", not
                       "123-45-6789").
    maxlen=N        -> hard character limit. Often paired with comb.
    multiline       -> newlines are honored, wrap manually.
    align=right     -> PDF /Q=2. Comb fields with this need leading-space
                       padding to right-align; pdf_fill.py does this
                       automatically.
    whole_dollars   -> tooltip says the last 2 cells are pre-printed ".00"
                       form art; fill.py writes into maxlen-2 cells.
    onstate=V       -> the value to write to *check* this checkbox. Each
                       checkbox can have a distinct on-state ('1','2','Yes',
                       etc.); writing the wrong token leaves it unchecked.
    radio           -> multiple widgets share a stem (c1_8[0], c1_8[1], ...);
                       only one in the group can be on at once.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF


COMB_FLAG = 1 << 24       # 16777216 - characters rendered in evenly spaced cells
MULTILINE_FLAG = 1 << 12  # 4096
PASSWORD_FLAG = 1 << 13   # 8192
DO_NOT_SCROLL = 1 << 23   # 8388608 (informational, not a gotcha)


def field_hints(doc, widget) -> dict:
    hints = {}
    flags = widget.field_flags or 0
    maxlen = getattr(widget, "text_maxlen", 0) or 0
    if widget.field_type_string == "Text":
        if flags & COMB_FLAG:
            hints["comb"] = maxlen or True
        if flags & MULTILINE_FLAG:
            hints["multiline"] = True
        if flags & PASSWORD_FLAG:
            hints["password"] = True
        if maxlen:
            hints["maxlen"] = maxlen
        # /Q (quadding) and /TU (tooltip) live in the raw annotation dict
        # and expose right-align + "whole dollars" conventions that
        # pdf_fill.py needs to honor.
        try:
            q_entry = doc.xref_get_key(widget.xref, "Q")
            if q_entry and q_entry[0] == "int" and int(q_entry[1]) == 2:
                hints["align"] = "right"
            tu_entry = doc.xref_get_key(widget.xref, "TU")
            if tu_entry and tu_entry[0] == "string":
                if "whole dollar" in tu_entry[1].lower():
                    hints["whole_dollars"] = True
        except Exception:
            pass
    elif widget.field_type_string == "CheckBox":
        states = widget.button_states() or {}
        on_states = [s for s in states.get("normal", []) if s != "Off"]
        if on_states:
            hints["onstate"] = on_states[0]
    return hints


def collect_fields(pdf_path: Path) -> list[dict]:
    doc = fitz.open(pdf_path)
    rows: list[dict] = []
    # Detect radio-like groups: same stem, indexed siblings (foo[0], foo[1])
    stem_counts: dict[str, int] = {}
    for page in doc:
        for w in page.widgets():
            if w.field_type_string != "CheckBox":
                continue
            name = w.field_name or ""
            if name.endswith("]"):
                stem = name.rsplit("[", 1)[0]
                stem_counts[stem] = stem_counts.get(stem, 0) + 1

    for page_num, page in enumerate(doc):
        for idx, w in enumerate(page.widgets()):
            row = {
                "page": page_num,
                "index": idx,
                "name": w.field_name,
                "type": w.field_type_string,
                "rect": [round(c, 2) for c in w.rect],
                "value": w.field_value,
                "hints": field_hints(doc, w),
            }
            if w.field_type_string == "CheckBox" and (w.field_name or "").endswith("]"):
                stem = (w.field_name or "").rsplit("[", 1)[0]
                if stem_counts.get(stem, 0) > 1:
                    row["hints"]["radio"] = stem
            rows.append(row)
    doc.close()
    return rows


def fmt_text(rows: list[dict], filt: str | None) -> str:
    out = []
    for r in rows:
        if filt and filt.lower() not in (r["name"] or "").lower():
            continue
        hint_str = " ".join(f"{k}={v}" for k, v in r["hints"].items()) or "-"
        out.append(
            f"P{r['page']}#{r['index']:<3} {r['type']:<8} {r['name']}\n"
            f"    rect={r['rect']} hints={hint_str} value={r['value']!r}"
        )
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--page", type=int, default=None, help="Only this page (0-indexed)")
    ap.add_argument("--filter", default=None, help="Substring filter on field name")
    ap.add_argument("--json", action="store_true", help="Emit JSON")
    args = ap.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(2)

    rows = collect_fields(args.pdf)
    if args.page is not None:
        rows = [r for r in rows if r["page"] == args.page]
    if args.filter:
        rows = [r for r in rows if args.filter.lower() in (r["name"] or "").lower()]

    if args.json:
        print(json.dumps(rows, indent=2))
    else:
        print(fmt_text(rows, None))
        print(f"\n{len(rows)} fields")


if __name__ == "__main__":
    main()
