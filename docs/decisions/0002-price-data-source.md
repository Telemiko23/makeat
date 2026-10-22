# 0002. Price data source and freshness

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran

## Context
Quotes must be the freshest in the market and cover the full basket for online delivery.

## Decision
- Source: the per-store price, promo and store files that chains must publish under the Food Price Transparency law. No scraping of chain websites.
- Ingestion: a Python service in `services/prices`, hourly, idempotent, monitored for stale feeds and price jumps. Evaluate the MIT-licensed `il-supermarket-scraper` before writing our own.
- Delivery fees and minimum order: not in the files; collected per chain and area and stored separately.
- Every quote stores its data timestamp; the basket is re-priced right before checkout.
- Loyalty-club promos apply only for users who said they are members.

## Alternatives rejected
- Scraping chain websites: fragile and legally weaker.
- Third-party price APIs: cost and dependency; may revisit for coverage gaps.

## Consequences
- Butchers and fish shops are not covered; they come later via partners.
- Product matching (recipe ingredient to shelf product) is the main engineering risk.
