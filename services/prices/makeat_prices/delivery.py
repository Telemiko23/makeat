"""Online delivery terms per chain, kept by hand in data/delivery.json (they are not in the feeds)."""
from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from .basket import DeliveryTerms

DATA = Path(__file__).resolve().parent.parent / "data" / "delivery.json"


def _money(value: str | None) -> Decimal | None:
    return Decimal(value) if value is not None else None


def delivery_terms(chain: str, path: Path = DATA) -> DeliveryTerms | None:
    """Terms for the chain's online store, or None when it has no known delivery fee."""
    entry = json.loads(path.read_text(encoding="utf-8")).get(chain)
    if not entry or not entry.get("online") or entry.get("fee") is None:
        return None
    return DeliveryTerms(
        fee=Decimal(entry["fee"]),
        min_order=_money(entry.get("min_order")),
        free_over=_money(entry.get("free_over")),
        checked_on=entry.get("checked_on"),
    )


def online_store_id(chain: str, path: Path = DATA) -> str | None:
    entry = json.loads(path.read_text(encoding="utf-8")).get(chain) or {}
    return entry.get("online_store_id")
