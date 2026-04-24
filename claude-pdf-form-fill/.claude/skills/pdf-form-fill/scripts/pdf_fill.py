#!/usr/bin/env python3
"""Fill a PDF AcroForm, handling the common gotchas so callers don't have to.

Usage:
    python pdf_fill.py <input.pdf> <output.pdf> --values values.json
    python pdf_fill.py <input.pdf> <output.pdf> --set 'f1_16=123-45-6789' --set 'c1_5=true'

Matching:
  * Field keys in --values or --set may be the full dotted name
    (topmostSubform[0].Page1[0].f1_16[0]) OR any unique substring
    (e.g. "f1_16"). Ambiguous substrings error out; use --allow-ambiguous
    to apply to every match.

Gotchas handled automatically (see GOTCHAS.md):

  * Comb fields (SSN, EIN, ZIP, phone, routing/account, etc.): each
    character lands in its own cell, so separators like "-" / " " / "("
    eat a cell and shift everything. We strip everything except digits
    and letters before writing. "123-45-6789" -> "123456789",
    "(503) 555-1212" -> "5035551212".

  * maxlen truncation: when a maxlen is set and the (cleaned) value is
    longer, we raise an error rather than silently truncate — a
    truncated SSN is a data-integrity bug, not a cosmetic one.

  * Checkbox on-states: each checkbox has its own "on" export value
    ('1','2','Yes','X',...). Passing True/true/yes/1/on maps to the
    correct token for that specific widget. False/off clears it.
    Passing the literal on-state string also works.

  * Radio groups (sibling checkboxes sharing a stem c1_8[0],c1_8[1]...):
    setting one member to True will clear its siblings first, so the
    group behaves like a single-choice radio.

  * Multiline fields: newlines in the input are honored. Comb fields
    reject newlines.

  * Currency: integer and float values on text fields are formatted with
    thousands separators unless the field is comb / has a maxlen that
    wouldn't fit the commas, in which case we fall back to plain digits.
    Pass a string if you need exact control.

  * NeedAppearances: we set /NeedAppearances so viewers regenerate the
    glyphs on open, and we also call update() per widget so the
    appearance stream is written immediately (Preview.app respects the
    latter; Adobe respects the former).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import pymupdf as fitz


COMB_FLAG = 1 << 24
MULTILINE_FLAG = 1 << 12

TRUE_TOKENS = {"true", "yes", "y", "1", "on", "x", "checked"}
FALSE_TOKENS = {"false", "no", "n", "0", "off", "", "unchecked"}

# Q values from PDF /Q (quadding): 0=left, 1=center, 2=right. PyMuPDF's
# appearance-stream generator ignores this, so for right-aligned comb
# fields we simulate it ourselves by padding the written value with
# leading spaces — spaces consume comb cells without rendering a glyph.
Q_LEFT, Q_CENTER, Q_RIGHT = 0, 1, 2


class FillError(Exception):
    pass


def clean_comb_value(raw: str) -> str:
    """Strip separators so each remaining char occupies one comb cell."""
    if "\n" in raw:
        raise FillError("comb fields cannot contain newlines")
    # Keep digits + letters; drop spaces, dashes, slashes, parens, dots.
    return re.sub(r"[^0-9A-Za-z]", "", raw)


def format_currency_for_field(widget, value: Any) -> str:
    maxlen = getattr(widget, "text_maxlen", 0) or 0
    flags = widget.field_flags or 0
    is_comb = bool(flags & COMB_FLAG)
    if isinstance(value, float):
        body = f"{value:,.2f}"
    else:
        body = f"{int(value):,}"
    if is_comb:
        return body.replace(",", "")
    if maxlen and len(body) > maxlen:
        stripped = body.replace(",", "")
        if len(stripped) <= maxlen:
            return stripped
    return body


def resolve_checkbox_state(widget, raw: Any) -> str:
    states = widget.button_states() or {}
    on_values = [s for s in states.get("normal", []) if s != "Off"]
    on_value = on_values[0] if on_values else "Yes"

    if isinstance(raw, bool):
        return on_value if raw else "Off"
    if isinstance(raw, (int, float)) and raw in (0, 1):
        return on_value if raw == 1 else "Off"
    token = str(raw).strip().lower()
    if token in TRUE_TOKENS:
        return on_value
    if token in FALSE_TOKENS:
        return "Off"
    if str(raw) in on_values:
        return str(raw)
    raise FillError(
        f"checkbox {widget.field_name!r}: can't interpret {raw!r} "
        f"(on={on_values}, use true/false or one of those)"
    )


def read_field_metadata(doc, widget) -> tuple[int, str]:
    """Pull /Q (quadding) and /TU (tooltip) straight from the annotation dict.
    PyMuPDF's high-level widget attrs don't always expose these.
    Returns (q, tooltip) with safe defaults (0, '')."""
    try:
        xref = widget.xref
    except Exception:
        return (Q_LEFT, "")
    q = Q_LEFT
    tu = ""
    q_entry = doc.xref_get_key(xref, "Q")
    if q_entry and q_entry[0] == "int":
        q = int(q_entry[1])
    tu_entry = doc.xref_get_key(xref, "TU")
    if tu_entry and tu_entry[0] == "string":
        tu = tu_entry[1]
    return q, tu


def apply_text(doc, widget, value: Any) -> None:
    flags = widget.field_flags or 0
    maxlen = getattr(widget, "text_maxlen", 0) or 0
    is_comb = bool(flags & COMB_FLAG)
    is_multiline = bool(flags & MULTILINE_FLAG)
    q, tooltip = read_field_metadata(doc, widget)

    if isinstance(value, bool):
        raise FillError(f"text field {widget.field_name!r} got a bool; did you mean a checkbox?")
    numeric_input = isinstance(value, (int, float)) and not isinstance(value, bool)

    if is_comb:
        # Build the raw character stream for the comb. Float→int for
        # comb fields: the PDF has no decimal point inside the cells,
        # so cents would silently corrupt the number.
        if numeric_input:
            body = str(int(round(float(value))))
        else:
            raw = str(value)
            # Try the value as-is first. Some combs *expect* separators
            # as literal cell contents — Oregon date fields (maxlen=10)
            # want "04/10/2025", Oregon SSN (maxlen=11) wants
            # "555-12-3456". IRS SSN (maxlen=9) is tight so the same
            # "555-12-3456" input overflows and triggers the strip.
            if maxlen and len(raw) <= maxlen:
                body = raw
            else:
                body = clean_comb_value(raw)

        # Right-aligned comb with "whole dollars" tooltip: the last 2 cells
        # are form art for pre-printed ".00" cents — we must not write into
        # them. Target (maxlen - 2) cells for right-alignment; the unused
        # leading cells get padded with spaces.
        target_cells = maxlen
        if q == Q_RIGHT and "whole dollar" in tooltip.lower() and maxlen > 2:
            target_cells = maxlen - 2
        if q == Q_RIGHT and target_cells and len(body) < target_cells:
            body = body.rjust(target_cells)

        if maxlen and len(body) > maxlen:
            raise FillError(
                f"comb field {widget.field_name!r}: value {body!r} exceeds "
                f"maxlen={maxlen}. (q={q}, tooltip={tooltip!r})"
            )
        text = body
    else:
        if numeric_input:
            text = format_currency_for_field(widget, value)
        else:
            text = str(value)
        if not is_multiline and "\n" in text:
            raise FillError(f"single-line field {widget.field_name!r} got a newline")
        if maxlen and len(text) > maxlen:
            kind = "comb" if is_comb else "plain text"
            hint = (
                "try a denser format (no separators)"
                if not is_comb
                else "check for extra characters"
            )
            raise FillError(
                f"{kind} field {widget.field_name!r}: value {text!r} exceeds "
                f"maxlen={maxlen}; {hint}."
            )

    widget.field_value = text
    widget.update()


def apply_checkbox(widget, value: Any) -> None:
    """Mutate a single checkbox in place. Radio-sibling clearing is
    handled by the caller in its live-widget pass so widget objects
    stay bound to their page."""
    state = resolve_checkbox_state(widget, value)
    widget.field_value = state
    widget.update()


def build_name_catalog(doc) -> tuple[set[str], dict[str, set[str]]]:
    """Scan once to learn all field names and radio-group stems.

    Returns (all_names, radio_stems) where radio_stems maps
    stem -> {full_name, ...} for any CheckBox with indexed siblings.
    """
    all_names: set[str] = set()
    stem_members: dict[str, set[str]] = {}
    for page in doc:
        for w in page.widgets():
            name = w.field_name or ""
            all_names.add(name)
            if w.field_type_string == "CheckBox" and name.endswith("]"):
                stem = name.rsplit("[", 1)[0]
                stem_members.setdefault(stem, set()).add(name)
    # A "radio group" requires at least 2 indexed siblings sharing a stem.
    radio_stems = {k: v for k, v in stem_members.items() if len(v) > 1}
    return all_names, radio_stems


def resolve_target_names(key: str, all_names: set[str], allow_ambiguous: bool) -> set[str]:
    if key in all_names:
        return {key}
    matches = {n for n in all_names if key in n}
    if not matches:
        raise FillError(f"no field matches {key!r}")
    if len(matches) > 1 and not allow_ambiguous:
        sample = "\n  ".join(sorted(matches)[:8])
        raise FillError(
            f"{key!r} is ambiguous, matches {len(matches)} field names:\n  {sample}\n"
            f"  (use full name or --allow-ambiguous)"
        )
    return matches


def fill(doc, values: dict, allow_ambiguous: bool) -> list[str]:
    """Apply values in a single live pass over every widget on every page.

    We resolve target names upfront, then walk each page's widget generator
    and mutate any widget whose name is in the target set. This avoids
    caching widget objects, which lose their page binding in PyMuPDF.
    """
    all_names, radio_stems = build_name_catalog(doc)

    # Build name -> list of (key, raw_value) plans, preserving input order.
    plans: dict[str, list[Any]] = {}
    # Track which radio siblings must be cleared before writing a checked state.
    siblings_to_clear: set[str] = set()
    # Track, per target name, whether it is set to a truthy checkbox value.
    checkbox_on_targets: set[str] = set()

    for key, value in values.items():
        targets = resolve_target_names(key, all_names, allow_ambiguous)
        for name in targets:
            plans.setdefault(name, []).append(value)

    log: list[str] = []

    # First pass: mark radio siblings to clear. We need to know widget types
    # up front, which means a lightweight scan.
    types_by_name: dict[str, str] = {}
    for page in doc:
        for w in page.widgets():
            types_by_name[w.field_name or ""] = w.field_type_string

    for name, plan_values in plans.items():
        if types_by_name.get(name) != "CheckBox":
            continue
        if not name.endswith("]"):
            continue
        stem = name.rsplit("[", 1)[0]
        if stem not in radio_stems:
            continue
        # If the final plan value is truthy, mark all siblings for clearing.
        last = plan_values[-1]
        looks_on = (
            (isinstance(last, bool) and last)
            or (isinstance(last, (int, float)) and last == 1)
            or (isinstance(last, str) and last.strip().lower() in TRUE_TOKENS)
        )
        if looks_on:
            checkbox_on_targets.add(name)
            for sib in radio_stems[stem]:
                if sib != name:
                    siblings_to_clear.add(sib)

    # Live mutation pass: touch every widget exactly once, in place.
    for page in doc:
        for w in page.widgets():
            name = w.field_name or ""
            if name in siblings_to_clear and name not in plans:
                w.field_value = "Off"
                w.update()
                log.append(f"  [clear ] {name} (radio sibling)")
                continue
            if name not in plans:
                continue
            value = plans[name][-1]  # last-write-wins if the same key was given twice
            if w.field_type_string == "CheckBox":
                apply_checkbox(w, value)
                log.append(f"  [check ] {name} := {w.field_value}")
            elif w.field_type_string == "Text":
                apply_text(doc, w, value)
                log.append(f"  [text  ] {name} := {w.field_value!r}")
            else:
                raise FillError(f"unsupported widget type {w.field_type_string} for {name}")
    return log


def ensure_need_appearances(doc) -> None:
    """Tell viewers to rebuild appearance streams when they open the file."""
    try:
        root = doc.pdf_catalog()
        xref_acroform = doc.xref_get_key(root, "AcroForm")
        if xref_acroform and xref_acroform[0] == "xref":
            acro_xref = int(xref_acroform[1].split()[0])
            doc.xref_set_key(acro_xref, "NeedAppearances", "true")
        elif xref_acroform and xref_acroform[0] == "dict":
            # Inline dict - set directly via string replacement is fragile;
            # skip and rely on widget.update() having written appearances.
            pass
    except Exception:
        pass  # best-effort; widget.update() is the real mechanism


def parse_set(items: list[str]) -> dict:
    values: dict = {}
    for item in items:
        if "=" not in item:
            raise SystemExit(f"--set expects key=value, got {item!r}")
        k, v = item.split("=", 1)
        values[k.strip()] = v
    return values


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", type=Path)
    ap.add_argument("output", type=Path)
    ap.add_argument("--values", type=Path, help="JSON file: {fieldname: value, ...}")
    ap.add_argument("--set", action="append", default=[], help="key=value (repeatable)")
    ap.add_argument("--allow-ambiguous", action="store_true", help="apply to every substring match")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    if not args.input.exists():
        print(f"Input PDF not found: {args.input}", file=sys.stderr)
        sys.exit(2)

    values: dict = {}
    if args.values:
        values.update(json.loads(args.values.read_text()))
    values.update(parse_set(args.set))
    # Drop underscore-prefixed keys (conventional JSON-comment markers).
    values = {k: v for k, v in values.items() if not k.startswith("_")}
    if not values:
        print("No values supplied (use --values or --set)", file=sys.stderr)
        sys.exit(2)

    doc = fitz.open(args.input)
    try:
        log = fill(doc, values, args.allow_ambiguous)
    except FillError as e:
        print(f"fill error: {e}", file=sys.stderr)
        sys.exit(1)
    ensure_need_appearances(doc)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(args.output, incremental=False, deflate=True)
    doc.close()

    if not args.quiet:
        for line in log:
            print(line)
        print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
