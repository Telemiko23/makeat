"""List shelf products that could stand for each recipe ingredient, so the
product map (content/products.json) can be curated from real feed data.

    python -m makeat_prices.candidates /tmp/raw ../../content/ingredients.json [CHAIN/STORE ...]

For every ingredient and every downloaded store, prints the cheapest items
whose name contains all words of the ingredient's Hebrew name (lightly
stemmed), with barcode, price, pack size and unit. Optional CHAIN/STORE
arguments (e.g. RAMI_LEVY/34) limit the stores, to keep the log readable.
Read the output in the workflow log; nothing is written.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from .feeds import Price
from .snapshot import store_ids, store_prices

PER_STORE = 8
# Words in ingredient names that shelf names rarely repeat.
NOISE = {"טרי", "טרייה", "טריים", "שן", "לבן", "מתוקה", "מתוק", "קצוץ", "קצוצה"}


def normalize(text: str) -> str:
    text = re.sub(r"[\"'׳״`.,()\-/]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def stem(word: str) -> str:
    """Drops a Hebrew plural or feminine ending, so "עגבנייה" also finds "עגבניות"."""
    for end in ("יות", "ים", "ות", "יה", "ה"):
        if len(word) - len(end) >= 3 and word.endswith(end):
            return word[: -len(end)]
    return word


def terms(name_he: str) -> list[str]:
    words = [w for w in normalize(name_he).split() if w not in NOISE]
    return [stem(w) for w in words] or [stem(normalize(name_he))]


def matches(items: dict[str, Price], name_he: str) -> list[Price]:
    """Items named like the ingredient: the name starts with its first word and
    contains the others. Shelf names put the product first ("בצל יבש",
    "שמן זית כתית"), which keeps out "פתיתים עם בצל". Falls back to any item
    containing every word when nothing starts that way."""
    want = terms(name_he)
    names = {code: normalize(p.name) for code, p in items.items()}
    found = [p for code, p in items.items() if names[code].startswith(want[0]) and all(t in names[code] for t in want[1:])]
    if not found:
        found = [p for code, p in items.items() if all(t in names[code] for t in want)]
    if not found and len(want) > 1:
        # Shelf names often drop the qualifiers ("canned", "for cooking"); fall back to the main word.
        found = [p for code, p in items.items() if names[code].startswith(want[0])]

    def per_unit(p: Price):
        return p.price / p.quantity if p.quantity else p.price

    # Weighed produce first, then the cheapest per unit of size.
    return sorted(found, key=lambda p: (not p.is_weighted, per_unit(p), p.price))


def describe(p: Price) -> str:
    size = f"{p.quantity} {p.unit_of_measure or ''}".strip() if p.quantity is not None else "-"
    unit = f" | {p.unit_price}/unit" if p.unit_price is not None else ""
    weighed = " | weighed" if p.is_weighted else ""
    return f"{p.item_code} | {p.name} | {p.manufacturer or '-'} | {p.price} | {size}{unit}{weighed}"


def main(raw: Path, ingredients_file: Path, only: list[str] | None = None) -> int:
    ingredients = json.loads(ingredients_file.read_text(encoding="utf-8"))
    stores: dict[str, dict[str, Price]] = {}
    for chain_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        for store_id in store_ids(chain_dir):
            key = f"{chain_dir.name}/{store_id}"
            if only and key not in only:
                continue
            prices = store_prices(chain_dir, store_id)
            if prices:
                stores[key] = prices.items
    for ing in ingredients:
        name = ing["name"]["he"]
        print(f"\n### {ing['id']} ({name}) terms={terms(name)}")
        for store, items in stores.items():
            found = matches(items, name)
            print(f"  [{store}] {len(found)} matches")
            for p in found[:PER_STORE]:
                print(f"    {describe(p)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:]))
