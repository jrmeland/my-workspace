#!/usr/bin/env python3
"""Render a PDF page (or a cropped region around a field) to a PNG.

Intended use: after filling a field, call this with the same field name to
get a zoomed screenshot centered on that field so you can visually confirm
the text landed in the right box.

Usage:
    python pdf_render.py <pdf> --page 0 --out page0.png [--dpi 200]
    python pdf_render.py <pdf> --field topmostSubform[0].Page1[0].f1_16[0] --out ssn.png
    python pdf_render.py <pdf> --field f1_16 --pad 40  # substring match + padding
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pymupdf as fitz


def find_widget(doc, needle: str):
    for page_num, page in enumerate(doc):
        for w in page.widgets():
            if needle == w.field_name or needle in (w.field_name or ""):
                return page_num, w
    return None, None


def render_page(doc, page_num: int, dpi: int, clip=None) -> bytes:
    page = doc[page_num]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    return pix.tobytes("png")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--page", type=int, default=None, help="Render this page (0-indexed)")
    ap.add_argument("--field", default=None, help="Field name (or substring) to center on")
    ap.add_argument("--pad", type=float, default=30.0, help="Padding in PDF points around field rect")
    ap.add_argument("--dpi", type=int, default=200, help="Render DPI (default 200)")
    args = ap.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(2)
    if args.page is None and args.field is None:
        print("Need --page or --field", file=sys.stderr)
        sys.exit(2)

    doc = fitz.open(args.pdf)
    clip = None
    if args.field:
        page_num, widget = find_widget(doc, args.field)
        if widget is None:
            print(f"Field not found: {args.field}", file=sys.stderr)
            sys.exit(2)
        r = widget.rect
        page_rect = doc[page_num].rect
        clip = fitz.Rect(
            max(page_rect.x0, r.x0 - args.pad),
            max(page_rect.y0, r.y0 - args.pad),
            min(page_rect.x1, r.x1 + args.pad),
            min(page_rect.y1, r.y1 + args.pad),
        )
        page_to_render = page_num
    else:
        page_to_render = args.page

    png = render_page(doc, page_to_render, args.dpi, clip=clip)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(png)
    doc.close()
    print(f"Wrote {args.out} ({len(png)} bytes)")


if __name__ == "__main__":
    main()
