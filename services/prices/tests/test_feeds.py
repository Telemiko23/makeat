from datetime import datetime
from decimal import Decimal
from pathlib import Path

from makeat_prices.feeds import file_timestamp, load_xml, parse_club_codes, parse_prices, parse_promotions, parse_stores

FIXTURES = Path(__file__).parent / "fixtures"


def load(name):
    return load_xml((FIXTURES / name).read_bytes())


def test_stores_file_is_utf16_with_city_codes():
    stores = parse_stores(load("osherad_stores.xml"))
    assert [(s.store_id, s.name, s.city, s.store_type) for s in stores] == [
        ("10", "פתח תקווה - סגולה", "7900", "1"),
        ("32", "קרית אונו", "2620", "1"),
    ]
    assert stores[0].chain_id == "7290103152017"


def test_price_file_plain_and_gzipped_match():
    plain = parse_prices(load("osherad_pricefull.xml"))
    gz = parse_prices(load("osherad_pricefull.gz"))
    assert plain.items == gz.items
    assert (plain.chain_id, plain.store_id) == ("7290103152017", "32")


def test_price_fields():
    prices = parse_prices(load("osherad_pricefull.xml"))
    milk = prices.items["7290004131074"]
    assert milk.price == Decimal("7.20")
    assert milk.updated_at == datetime(2026, 10, 20, 15, 56, 23)
    assert prices.items["230"].is_weighted
    assert not milk.is_weighted
    assert prices.latest_update == datetime(2026, 10, 22, 6, 30)


def test_promotion_terms_live_on_each_item():
    promos = {p.promotion_id: p for p in parse_promotions(load("osherad_promofull.xml"))}
    pita = promos["0000143990"]
    assert pita.starts_at == datetime(2019, 9, 1)
    assert pita.ends_at == datetime(2026, 12, 31, 23, 59)
    assert pita.club_codes == {"0"}
    assert pita.min_purchase_amount is None
    terms = pita.items["7290003222797"]
    assert (terms.min_qty, terms.discounted_price, terms.reward_type) == (Decimal("2"), Decimal("20.00"), "1")
    assert promos["0000200003"].is_coupon
    assert promos["0000200004"].min_purchase_amount == Decimal("200.00")


def test_rami_levy_club_expressions():
    assert parse_club_codes(["0"]) == {"0"}
    assert parse_club_codes(["(1=מועדון חברתי|1=לקוחות ארנק)"]) == {"1"}
    assert parse_club_codes(["((2=מועדון לקוחות אשראי))&(3=עיגול אגורות)"]) == {"2", "3"}
    assert parse_club_codes([]) == {"0"}


def test_file_timestamp_from_name():
    assert file_timestamp("PriceFull7290103152017-001-032-20261022-080014.gz") == datetime(2026, 10, 22, 8, 0, 14)
    assert file_timestamp("pricefull7290058140886-039-202607150513.xml") == datetime(2026, 7, 15, 5, 13)
    assert file_timestamp("Stores7290058140886-000-20261020-050500.xml") == datetime(2026, 10, 20, 5, 5)
    assert file_timestamp("prices.xml") is None
