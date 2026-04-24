#!/usr/bin/env python3
"""Produce a "field map" of a fillable PDF: every text field filled with
its own name, every checkbox annotated with a red label beside it, and
a PNG render of each page.

This is the fastest way to figure out which field name corresponds to
which line on an unfamiliar form. Run once per form, open the PNGs, and
you have a definitive name→line map to write your values JSON against.

Usage:
    python3 pdf_label.py <input.pdf> <out_dir> [--dpi 180]

Output:
    <out_dir>/<stem>_labeled.pdf   — PDF with field names visible
    <out_dir>/<stem>_p0.png        — page 0 render
    <out_dir>/<stem>_p1.png        — page 1 render
    ...
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import pymupdf as fitz


COMB_FLAG = 1 << 24


def compact_label(field_name: str) -> str:
    """Turn 'topmostSubform[0].Page1[0].f1_16[0]' into 'f1_16'."""
    tail = field_name.split(".")[-1]
    # Strip trailing [n] index
    tail = re.sub(r"\[\d+\]$", "", tail)
    return tail


def comb_safe(label: str, maxlen: int) -> str:
    """Comb fields only render alphanumerics cleanly (no '_'), so collapse
    the label to what will actually show up in cells."""
    collapsed = re.sub(r"[^0-9A-Za-z]", "", label)
    return collapsed[:maxlen] if maxlen else collapsed


def draw_side_label(page, rect, label: str) -> None:
    """Draw a red text label just to the right of a widget rect."""
    x = rect.x1 + 1
    y = rect.y0 + (rect.height * 0.85)
    page.insert_text(
        (x, y),
        label,
        fontsize=4.5,
        color=(0.85, 0, 0),
        overlay=True,
    )


def annotate(doc: fitz.Document) -> None:
    """Fill every text field with its own short name and put a red side
    label next to every checkbox and every field that's too short to
    hold a readable label.

    Small maxlen fields (maxlen ≤ 3 — 'Initial', 'State', 'Code') would
    truncate to 1-3 meaningless characters, so we annotate them beside
    the rect instead of filling."""
    for page in doc:
        for w in page.widgets():
            name = w.field_name or ""
            label = compact_label(name)
            if w.field_type_string == "Text":
                flags = w.field_flags or 0
                maxlen = getattr(w, "text_maxlen", 0) or 0
                too_small = maxlen and maxlen <= 3
                if too_small:
                    try:
                        draw_side_label(page, w.rect, label)
                    except Exception as e:
                        print(f"skip text annot {name}: {e}", file=sys.stderr)
                    continue
                text = comb_safe(label, maxlen) if (flags & COMB_FLAG) else label
                if maxlen and len(text) > maxlen:
                    text = text[:maxlen]
                try:
                    w.field_value = text
                    w.update()
                except Exception as e:
                    print(f"skip text {name}: {e}", file=sys.stderr)
            elif w.field_type_string == "CheckBox":
                # Empty box + side label is easier to read than a checked
                # box with no name.
                try:
                    draw_side_label(page, w.rect, label)
                except Exception as e:
                    print(f"skip checkbox label {name}: {e}", file=sys.stderr)


def render_pages(doc: fitz.Document, out_dir: Path, stem: str, dpi: int) -> list[Path]:
    written: list[Path] = []
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=mat, alpha=False)
        path = out_dir / f"{stem}_p{i}.png"
        pix.save(path)
        written.append(path)
    return written


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--dpi", type=int, default=180)
    args = ap.parse_args()

    if not args.input.exists():
        print(f"input PDF not found: {args.input}", file=sys.stderr)
        sys.exit(2)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.input.stem

    doc = fitz.open(args.input)
    annotate(doc)
    labeled_pdf = args.out_dir / f"{stem}_labeled.pdf"
    doc.save(labeled_pdf, deflate=True)
    pngs = render_pages(doc, args.out_dir, stem, args.dpi)
    doc.close()

    print(f"Wrote {labeled_pdf}")
    for p in pngs:
        print(f"Wrote {p}")


if __name__ == "__main__":
    main()
