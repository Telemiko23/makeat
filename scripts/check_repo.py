#!/usr/bin/env python3
"""Repository consistency checks that run on every PR."""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = []

# Every role definition's name matches its file name.
for f in sorted((root / ".claude/agents").glob("*.md")):
    m = re.search(r"^name:\s*(\S+)", f.read_text(), re.M)
    if not m or m.group(1) != f.stem:
        errors.append(f"{f.relative_to(root)}: frontmatter name must be '{f.stem}'")

# Every decision record is listed in the index with its current status.
decisions = root / "docs/decisions"
index = (decisions / "README.md").read_text()
for f in sorted(decisions.glob("[0-9][0-9][0-9][0-9]-*.md")):
    status = re.search(r"^- Status:\s*(.+)$", f.read_text(), re.M)
    row = re.search(rf"^\|.*\({re.escape(f.name)}\).*\|\s*([^|]+?)\s*\|\s*$", index, re.M)
    if not status:
        errors.append(f"{f.relative_to(root)}: missing '- Status:' line")
    elif not row:
        errors.append(f"docs/decisions/README.md: missing row for {f.name}")
    elif row.group(1) != status.group(1).strip():
        errors.append(f"docs/decisions/README.md: {f.name} status is '{status.group(1).strip()}', index says '{row.group(1)}'")

for e in errors:
    print(f"error: {e}")
sys.exit(1 if errors else 0)
