from decimal import Decimal

from makeat_prices.delivery import delivery_terms, online_store_id


def test_rami_levy_online_delivery_terms():
    terms = delivery_terms("RAMI_LEVY")
    assert terms.fee == Decimal("35.90") and terms.min_order is None and terms.free_over is None
    assert online_store_id("RAMI_LEVY") == "39"


def test_chain_without_known_delivery_has_no_terms():
    assert delivery_terms("OSHER_AD") is None
    assert delivery_terms("UNKNOWN") is None
