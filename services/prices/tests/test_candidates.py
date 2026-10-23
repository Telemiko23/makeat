from decimal import Decimal

from makeat_prices.candidates import matches, stem, terms
from makeat_prices.feeds import Price


def item(code: str, name: str, price: str, unit_price: str | None = None) -> Price:
    return Price(code, name, None, Decimal(price), Decimal(unit_price) if unit_price else None, None, None, False, None)


def test_stem_drops_hebrew_endings_but_keeps_short_words():
    assert stem("עגבנייה") == "עגבני"
    assert stem("ביצים") == "ביצ"
    assert stem("בצל") == "בצל"


def test_terms_skip_noise_words():
    assert terms("שן שום") == ["שום"]
    assert terms("פטרוזיליה טרייה") == ["פטרוזיל"]


def test_matches_need_every_word_and_sort_by_unit_price():
    items = {
        "1": item("1", "שמן זית כתית 1 ליטר", "40", "40"),
        "2": item("2", "שמן זית 750 מל", "25", "33.3"),
        "3": item("3", "שמן קנולה", "10", "10"),
    }
    assert [p.item_code for p in matches(items, "שמן זית")] == ["2", "1"]


def test_matches_fall_back_to_the_main_word():
    items = {"1": item("1", "גרגרי חומוס יכין 550 גר", "6")}
    assert [p.item_code for p in matches(items, "גרגרי חומוס שימורים")] == ["1"]
