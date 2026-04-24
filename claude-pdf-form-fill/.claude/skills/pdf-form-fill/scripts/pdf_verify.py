#!/usr/bin/env python3
"""Read back the current value of one or more form fields.

Use after fill.py to confirm values were written as expected, or to
diff an original vs filled PDF.

Usage:
    python pdf_verify.py <pdf> --filter f1_16
    python pdf_verify.py <pdf> --all-filled
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pymupdf as fitz


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--filter", default=None, help="Substring filter on field name")
    ap.add_argument("--all-filled", action="store_true", help="Only show fields with a non-empty / non-Off value")
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    rows = 0
    for page_num, page in enumerate(doc):
        for w in page.widgets():
            name = w.field_name or ""
            if args.filter and args.filter.lower() not in name.lower():
                continue
            value = w.field_value
            if args.all_filled and value in (None, "", "Off"):
                continue
            print(f"P{page_num} {w.field_type_string:<8} {name} = {value!r}")
            rows += 1
    doc.close()
    print(f"\n{rows} fields")


if __name__ == "__main__":
    main()
