#!/usr/bin/env python3
"""Compatibility projection for the strictly additive first Genesis 0613 delta."""
from pathlib import Path

source = (Path(__file__).resolve().parents[2] / "hostgator-setup-kit/recovery-catalog.sql").read_text(encoding="utf-8")
needle = "where n.nspname = 'public' and p.prokind in ('f','p')"
if source.count(needle) != 1:
    raise ValueError("Catalog contract changed; compatibility proof must be reviewed")
print(source.replace(needle, needle + " and p.proname not in ('fn_genesis_supervisao','fn_genesis_nomes_do_roster','fn_genesis_operator_counts')"))
