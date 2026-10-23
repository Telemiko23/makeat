# 0011. Recipe content model and the safety gate

- Status: accepted
- Date: 2026-10-23
- Owner: tech-lead
- Approved by: not required; it implements existing product rules (CLAUDE.md) and changes no cost, vendor or direction.

## Context
CLAUDE.md requires allergen and kashrut filtering to be deterministic code, with every suggestion (human or model) passing hard rules before a user sees it. Recipes must be our own words. Phase 0 needs a schema and the first 20 recipes.

## Decision
- Content lives in the repo as JSON: `content/ingredients.json` (the catalog) and `content/recipes/<id>.json`. Types, derivations, validation and the filter live in `packages/shared` (0001).
- The **catalog holds the facts**: kashrut class (meat, dairy, fish, parve), animal sources, allergens, kosher species, allowed units, grams per piece and substitutes. Validation checks those facts against each other, for example that dairy carries the milk allergen and that a class matches its animal source.
- A **recipe holds no safety facts**. Its allergens, kashrut class and vegetarian or vegan status are derived from its ingredients, never typed by hand. Optional ingredients count toward allergens.
- Validation rejects a recipe that mixes meat with dairy or meat with fish, uses an unknown ingredient or unit, or lacks Hebrew text.
- `exclusions(recipe, catalog, constraints)` is the single gate. It covers allergens, kosher species (for any kashrut level but none), diet, appliances, skill against difficulty, and dislikes. Anything shown to a user, including model output, passes it first. Product certification (hechsher, mehadrin) is a property of products and belongs to the basket, not to recipes.
- Text is `{ he, ar?, ru?, en? }`; Hebrew is required.
- Recipes start as `draft`. Only the nutrition role sets `reviewed`, after checking content and adding nutrition values; only reviewed recipes ship to users.
- The app's profile vocabularies (allergens, appliances, meals, diets, kashrut, skills) must equal the shared ones; a unit test enforces it until the app imports them directly.

## Alternatives rejected
- Allergen and kashrut tags written per recipe: one forgotten tag is a safety bug; deriving them removes that class of error.
- A database from day one: content needs review in pull requests, and it can be loaded into Supabase later from the same files.
- YAML: friendlier to write, but needs a parser in every consumer; JSON is native to both TypeScript and Python.

## Consequences
- Adding an ingredient means stating its facts once in the catalog, and every recipe that uses it inherits them.
- Allergen coverage is only as good as the catalog. Composite products (mayonnaise, breadcrumbs) carry their common allergens, and the basket must still check real product labels.
- Nutrition values are not in the schema yet; the nutrition role adds them with the data source (MoH Tzameret) in its own record.
