# services/prices

Price ingestion from the files Israeli chains publish under the Food Price
Transparency law (see [decision 0002](../../docs/decisions/0002-price-data-source.md)).
Owner: `price-data`.

## What is here

| Module | Job |
|---|---|
| `makeat_prices/feeds.py` | Parse Stores, PriceFull and PromoFull files (plain, gzip or zip; UTF-8 or UTF-16). |
| `makeat_prices/basket.py` | Quote a basket at one store: promotions, club rules, delivery fee, data timestamp. |
| `makeat_prices/fetch.py` | Download a chain's store list, the newest full files for chosen stores, and the hourly updates after them (FTP-TLS). |
| `makeat_prices/snapshot.py` | Rebuild a store's current prices and promotions: newest full file plus later updates. |
| `makeat_prices/delivery.py` | Online delivery fee and minimum order per chain, from `data/delivery.json` (kept by hand). |
| `makeat_prices/probe_report.py` | Print what the chains publish: freshness, publishing rhythm, sample basket, produce candidates. |

## Run

```sh
pip install -e ".[dev]"     # parser and basket only
pytest -q

pip install -e ".[fetch]"   # il-supermarket-scraper, used by the report for the gov.il chain list
python -m makeat_prices.fetch --chain OSHER_AD --match אונו --out /tmp/raw
python -m makeat_prices.probe_report /tmp/raw
```

Live downloads need a host that can reach `url.retail.publishedprices.co.il`
(FTP over TLS). GitHub-hosted runners can; the Claude cloud sandbox cannot.
The `Prices` workflow runs the probe daily at 09:00 Israel time, on pushes to
`main` that touch this folder, and on demand; it never runs on PRs.

## Quote rules

- A promotion counts only while it is active, is not a coupon, has no minimum
  spend, and every condition in its `ClubId` is met. Club-member promotions
  (code 1) apply only when the shopper said they are a member. Anything that
  also needs a payment card or other condition (codes 2, 3) is never assumed.
- `DiscountedPrice` is the price of `MinQty` units together. Only units of the
  same item count toward `MinQty`; mixed-item deals are not credited yet.
  Units beyond `MaxQty` pay shelf price. Only `RewardType` 1 and 3 (checked
  against real shelf prices) are credited.
- A `ClubId` value we cannot read is treated as "other", never as open to all.
- Every quote carries `data_as_of`, the newest price change in the file.

Findings from the first live probe: [docs/specs/price-feeds-probe.md](../../docs/specs/price-feeds-probe.md).
