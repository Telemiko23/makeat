"""List shelf products that could stand for each recipe ingredient, so the
product map (content/products.json) can be curated from real feed data.

    python -m makeat_prices.candidates /tmp/raw ../../content/ingredients.json

For every ingredient and every downloaded store, prints the cheapest items
whose name contains all words of the ingredient's Hebrew name (lightly
stemmed), with barcode, price, pack size and unit. Read the output in the
workflow log; nothing is written.
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
    want = terms(name_he)
    found = [p for p in items.values() if all(t in normalize(p.name) for t in want)]
    if not found and len(want) > 1:
        # Shelf names often drop the qualifiers ("canned", "for cooking"); fall back to the main word.
        found = [p for p in items.values() if want[0] in normalize(p.name)]
    return sorted(found, key=lambda p: (p.unit_price if p.unit_price is not None else p.price, p.price))


def describe(p: Price) -> str:
    size = f"{p.quantity} {p.unit_of_measure or ''}".strip() if p.quantity is not None else "-"
    unit = f" | {p.unit_price}/unit" if p.unit_price is not None else ""
    weighed = " | weighed" if p.is_weighted else ""
    return f"{p.item_code} | {p.name} | {p.manufacturer or '-'} | {p.price} | {size}{unit}{weighed}"


def main(raw: Path, ingredients_file: Path) -> int:
    ingredients = json.loads(ingredients_file.read_text(encoding="utf-8"))
    stores: dict[str, dict[str, Price]] = {}
    for chain_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        for store_id in store_ids(chain_dir):
            prices = store_prices(chain_dir, store_id)
            if prices:
                stores[f"{chain_dir.name}/{store_id}"] = prices.items
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
    sys.exit(main(Path(sys.argv[1]), Path(sys.argv[2])))
