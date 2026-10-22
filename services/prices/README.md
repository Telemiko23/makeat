# services/prices

Price ingestion from the files Israeli chains publish under the Food Price
Transparency law (see [decision 0002](../../docs/decisions/0002-price-data-source.md)).
Owner: `price-data`.

## What is here

| Module | Job |
|---|---|
| `makeat_prices/feeds.py` | Parse Stores, PriceFull and PromoFull files (plain, gzip or zip; UTF-8 or UTF-16). |
| `makeat_prices/basket.py` | Quote a basket at one store: promotions, club rules, delivery fee, data timestamp. |
| `makeat_prices/fetch.py` | Download a chain's store list and the latest full files for chosen stores, with `il-supermarket-scraper`. |
| `makeat_prices/probe_report.py` | Print what the chains publish: freshness, publishing rhythm, sample basket, produce candidates. |

## Run

```sh
pip install -e ".[dev]"     # parser and basket only
pytest -q

pip install -e ".[fetch]"   # adds il-supermarket-scraper for live downloads
python -m makeat_prices.fetch --chain OSHER_AD --match אונו --out /tmp/raw
python -m makeat_prices.probe_report /tmp/raw
```

Live downloads need a host that can reach `url.retail.publishedprices.co.il`
(FTP over TLS). GitHub-hosted runners can; the Claude cloud sandbox cannot.
The `Prices` workflow runs the probe on every push that touches this folder.

## Quote rules

- A promotion counts only while it is active, is not a coupon, has no minimum
  spend, and every condition in its `ClubId` is met. Club-member promotions
  (code 1) apply only when the shopper said they are a member. Anything that
  also needs a payment card or other condition (codes 2, 3) is never assumed.
- `DiscountedPrice` is the price of `MinQty` units together. Only units of the
  same item count toward `MinQty`; mixed-item deals are not credited yet.
- Every quote carries `data_as_of`, the newest price change in the file.

Findings from the first live probe: [docs/specs/price-feeds-probe.md](../../docs/specs/price-feeds-probe.md).
