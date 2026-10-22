from datetime import datetime
from decimal import Decimal
from pathlib import Path

from makeat_prices.basket import DeliveryTerms, Line, quote
from makeat_prices.feeds import load_xml, parse_prices, parse_promotions

FIXTURES = Path(__file__).parent / "fixtures"
PRICES = parse_prices(load_xml((FIXTURES / "osherad_pricefull.xml").read_bytes()))
PROMOS = parse_promotions(load_xml((FIXTURES / "osherad_promofull.xml").read_bytes()))
NOW = datetime(2026, 10, 22, 12, 0)

PITA, MILK, WAFERS, TOMATO = "7290003222797", "7290004131074", "7290119386383", "230"


def line_totals(q):
    return {ln.item_code: ln.total for ln in q.lines}


def test_bundle_promo_needs_min_qty_and_leftovers_pay_shelf_price():
    one = quote(PRICES, PROMOS, [Line(PITA, Decimal(1))], at=NOW)
    three = quote(PRICES, PROMOS, [Line(PITA, Decimal(3))], at=NOW)
    assert line_totals(one)[PITA] == Decimal("12.90")
    assert line_totals(three)[PITA] == Decimal("32.90")  # 2 for 20 + 1 x 12.90
    assert three.lines[0].promotion_id == "0000143990"


def test_club_promo_only_for_members_and_card_promos_never():
    basket = [Line(MILK, Decimal(1))]
    assert line_totals(quote(PRICES, PROMOS, basket, at=NOW))[MILK] == Decimal("7.20")
    member = quote(PRICES, PROMOS, basket, at=NOW, club_member=True)
    assert line_totals(member)[MILK] == Decimal("5.90")  # not the 4.90 that needs the chain's card
    assert member.lines[0].promotion_id == "0000200001"


def test_coupon_and_min_spend_promos_are_skipped():
    q = quote(PRICES, PROMOS, [Line(WAFERS, Decimal(1))], at=NOW)
    assert q.lines[0].promotion_id == "0000200005"
    assert line_totals(q)[WAFERS] == Decimal("17.91")


def test_expired_promotion_is_ignored():
    q = quote(PRICES, PROMOS, [Line(MILK, Decimal(1))], at=datetime(2026, 11, 2), club_member=True)
    assert line_totals(q)[MILK] == Decimal("7.20")


def test_weighted_item_priced_per_kg():
    q = quote(PRICES, PROMOS, [Line(TOMATO, Decimal("1.5"))], at=NOW)
    assert line_totals(q)[TOMATO] == Decimal("10.35")


def test_missing_items_are_reported_not_priced():
    q = quote(PRICES, PROMOS, [Line("123", Decimal(1)), Line(MILK, Decimal(2))], at=NOW)
    assert q.missing == ["123"]
    assert q.items_total == Decimal("14.40")


def test_quote_carries_data_timestamp():
    assert quote(PRICES, PROMOS, [], at=NOW).data_as_of == datetime(2026, 10, 22, 6, 30)


def test_delivery_fee_minimum_and_free_threshold():
    basket = [Line(MILK, Decimal(2))]
    q = quote(PRICES, PROMOS, basket, at=NOW, delivery=DeliveryTerms(fee=Decimal("35.90"), min_order=Decimal("150")))
    assert (q.delivery_fee, q.total, q.below_min_order) == (Decimal("35.90"), Decimal("50.30"), True)
    free = quote(PRICES, PROMOS, basket, at=NOW, delivery=DeliveryTerms(fee=Decimal("35.90"), free_over=Decimal("10")))
    assert (free.delivery_fee, free.total) == (Decimal("0"), Decimal("14.40"))


def test_publication_time_wins_over_newest_price_change():
    prices = parse_prices(load_xml((FIXTURES / "osherad_pricefull.xml").read_bytes()))
    prices.published_at = datetime(2026, 10, 22, 8, 0, 14)
    assert quote(prices, [], [], at=NOW).data_as_of == datetime(2026, 10, 22, 8, 0, 14)
