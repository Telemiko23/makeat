"""Build one store's current prices and promotions from a folder of feed files:
the newest full file, then every hourly update published after it, in order."""
from __future__ import annotations

from pathlib import Path

from .feeds import PriceFile, Promotion, file_timestamp, load_xml, parse_prices, parse_promotions
from .fetch import file_kind, file_store


def _files(folder: Path, kind: str, store_id: str) -> list[Path]:
    found = [p for p in folder.iterdir() if file_kind(p.name) == kind and file_store(p.name) == store_id]
    return sorted((p for p in found if file_timestamp(p.name)), key=lambda p: file_timestamp(p.name))


def store_prices(folder: Path, store_id: str) -> PriceFile | None:
    fulls = _files(folder, "pricefull", store_id)
    if not fulls:
        return None
    result = parse_prices(load_xml(fulls[-1].read_bytes()))
    result.published_at = file_timestamp(fulls[-1].name)
    for update in _files(folder, "price", store_id):
        stamp = file_timestamp(update.name)
        if stamp > result.published_at:
            result.items.update(parse_prices(load_xml(update.read_bytes())).items)
            result.published_at = stamp
    return result


def store_promotions(folder: Path, store_id: str) -> list[Promotion]:
    fulls = _files(folder, "promofull", store_id)
    if not fulls:
        return []
    since = file_timestamp(fulls[-1].name)
    by_id = {p.promotion_id: p for p in parse_promotions(load_xml(fulls[-1].read_bytes()))}
    for update in _files(folder, "promo", store_id):
        if file_timestamp(update.name) > since:
            by_id.update({p.promotion_id: p for p in parse_promotions(load_xml(update.read_bytes()))})
    return list(by_id.values())


def store_ids(folder: Path) -> list[str]:
    return sorted({file_store(p.name) for p in folder.iterdir() if file_kind(p.name) == "pricefull"}, key=int)
