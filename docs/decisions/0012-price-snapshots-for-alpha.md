# 0012. Price snapshots for the alpha: an hourly file, not a database

- Status: accepted
- Date: 2026-10-23
- Owner: tech-lead
- Approved by: not required. It adds no cost, vendor or account, and changes no product direction. It postpones the Supabase price tables of 0001 and stays within 0002's source and freshness rules.

## Context
The v0.1 journey (questionnaire, plan, shopping list, cooking) runs on the phone. What it lacks is prices. 0002 says ingestion is hourly from the law feeds, and the probe (`docs/specs/price-feeds-probe.md`) showed that GitHub-hosted runners can read Liran's chains (Rami Levy and Osher Ad), while the Claude sandbox cannot.

0001 puts the backend on Supabase. Using it for prices now would need:
- a Supabase project, which Liran must create;
- service keys kept as secrets;
- an API the app queries with the user's basket.

That last point would send what the household cooks to a server, while every other piece of household data stays on the device (0007). The alpha has one household and a few branches, so the data is small.

The repository is public, so GitHub Actions minutes cost nothing.

## Decision
- **Collect:** a scheduled `Prices` workflow job runs every hour. For each configured branch it rebuilds the current shelf prices: the newest full file plus every hourly update after it (0002). The configured branches are Liran's stores from the probe: Rami Levy 34, 712, 724, 725 and 726, and Osher Ad 32 and 10.
- **Keep only what we can price:** `content/products.json` maps each recipe ingredient to the shelf products that can stand in for it, by chain, barcode, pack size and unit. Weighed produce is priced per kilogram. The map is curated by hand from the product-candidates report (`services/prices/makeat_prices/candidates.py`), and the `price-data` role owns it.
- **Publish:** the job writes one `prices.json`, holding for each branch:
  - the publication time of its newest feed file;
  - the price of every mapped product found there.

  It force-pushes that file as the only commit on an orphan branch, `prices-data`. The app downloads it from `raw.githubusercontent.com` (which allows cross-origin reads, so the web build used by the tests works too) and keeps the last copy on the device.
- **Quote on the device:** the app prices the shopping list itself, at every branch of the household's chains. It skips items marked "have it", rounds up to whole packs, and leaves weighed items as weights. It shows the total, the number of items priced, what is missing, and the data time. In-store quotes use shelf prices with no fee (0008). Promotions come in a later change, with the club rules from 0002.
- **Re-price before checkout:** there is no checkout in the alpha. When there is one, the app fetches the file again first.
- **Health:** the job fails if a configured branch has no data or its newest file is more than 12 hours old, so a stale feed shows as a red run.

## Alternatives rejected
- **Supabase tables now:** these need an account and keys from Liran, and send the basket to a server. That is more moving parts than one household needs. We revisit at the closed beta, when more chains, areas and server-side checks make a database worth it.
- **A GitHub Release asset:** release downloads redirect to a host without cross-origin headers, so the web build cannot read them in tests.
- **Committing prices to `main` every hour:** this floods the history and CI. The orphan branch keeps exactly one commit.
- **Pricing on a server per request:** this sends the household's basket off the device for no gain at this size.

## Consequences
- Every user downloads the same small file, and no household data leaves the device.
- The data is about an hour old at worst, plus raw-file caching (minutes). Every quote shows its time, as CLAUDE.md requires.
- Prices of mapped products become public in the repository. They are already public by law. The `legal` role should confirm there is no attribution or terms issue before the closed beta.
- Branch choice is simple for now: every configured branch of the household's chains, cheapest first. Asking the household's area is left for the beta record that 0008 calls for.
- Product matching stays the main risk (0002). A wrong mapping gives a wrong price, so the map is reviewed like code, and a product missing at a branch is shown as missing, never guessed.
