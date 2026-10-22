"""Build one store's current prices and promotions from a folder of feed files:
the newest full file, then every hourly update published after it, in order."""
from __future__ import annotations

from pathlib import Path

from .feeds import PriceFile, Promotion, file_timestamp, load_xml, parse_prices, parse_promotions
from .fetch import file_kind, file_store, newest, updates_after


def _current(folder: Path, full: str, delta: str, store_id: str) -> list[Path]:
    """The newest `full` file for the store followed by the `delta` files after it."""
    names = [p.name for p in folder.iterdir()]
    base = newest(names, full, store_id)
    if base is None:
        return []
    return [folder / base] + [folder / n for n in updates_after(names, delta, store_id, file_timestamp(base))]


def store_prices(folder: Path, store_id: str) -> PriceFile | None:
    files = _current(folder, "pricefull", "price", store_id)
    if not files:
        return None
    result = parse_prices(load_xml(files[0].read_bytes()))
    for update in files[1:]:
        result.items.update(parse_prices(load_xml(update.read_bytes())).items)
    result.published_at = file_timestamp(files[-1].name)
    return result


def store_promotions(folder: Path, store_id: str) -> list[Promotion]:
    by_id: dict[str, Promotion] = {}
    for f in _current(folder, "promofull", "promo", store_id):
        by_id.update({p.promotion_id: p for p in parse_promotions(load_xml(f.read_bytes()))})
    return list(by_id.values())


def store_ids(folder: Path) -> list[str]:
    ids = {file_store(p.name) for p in folder.iterdir() if file_kind(p.name) == "pricefull"}
    return sorted((i for i in ids if i), key=int)
