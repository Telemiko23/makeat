# 0011. Recipe content model and the safety gate

- Status: accepted
- Date: 2026-10-23
- Owner: tech-lead
- Approved by: not required; it implements existing product rules (CLAUDE.md) and changes no cost, vendor or direction.

## Context
CLAUDE.md requires allergen and kashrut filtering to be deterministic code, with every suggestion (human or model) passing hard rules before a user sees it. Recipes must be our own words. Phase 0 needs a schema and the first 20 recipes.

## Decision
- Content lives in the repo as JSON: `content/ingredients.json` (the catalog) and `content/recipes/<id>.json`. Types, derivations, validation and the filter live in `packages/shared` (0001).
- The **catalog holds the facts**: kashrut class (meat, dairy, fish, parve), animal sources (shellfish included), allergens, kosher species, allowed units, grams per piece and substitutes. Validation checks those facts against each other.
  - Dairy carries the milk allergen, and a class matches its animal source.
  - Shellfish carries its allergen and is never a kosher species.
  - A substitute really is dairy-free, gluten-free, egg-free, vegan or parve when it is offered as one.
- A **recipe holds no safety facts**. Its allergens, kashrut class and vegetarian or vegan status are derived from its ingredients, never typed by hand. Optional ingredients count toward allergens.
- Validation rejects a recipe that mixes meat with dairy or meat with fish, uses an unknown ingredient or unit, or lacks Hebrew text.
- `exclusions(recipe, catalog, constraints)` is the single gate. Anything shown to a user, model output included, passes it first, so it re-checks everything itself and never assumes content was validated.
  - It fails closed on unknown ingredients.
  - It hides drafts unless an internal build opts in.
  - It covers allergens, kashrut for any level but none (species, and meat with dairy or fish), diet, appliances, skill against difficulty, and dislikes. Product certification (hechsher, mehadrin) is a property of products and belongs to the basket, not to recipes.
- Text is `{ he, ar?, ru?, en? }`; Hebrew is required.
- Recipes start as `draft`. Only the nutrition role sets `reviewed`, after checking content and adding nutrition values; only reviewed recipes ship to users.
- The app imports the profile vocabularies (allergens, appliances, meals, diets, kashrut, skills) from `packages/shared`, so profile ids and recipe rules cannot drift. Metro watches `packages/shared` for this.

## Alternatives rejected
- Allergen and kashrut tags written per recipe: one forgotten tag is a safety bug; deriving them removes that class of error.
- A database from day one: content needs review in pull requests, and it can be loaded into Supabase later from the same files.
- YAML: friendlier to write, but needs a parser in every consumer; JSON is native to both TypeScript and Python.

## Consequences
- Adding an ingredient means stating its facts once in the catalog, and every recipe that uses it inherits them.
- Allergen coverage is only as good as the catalog. Composite products (mayonnaise, breadcrumbs) carry their common allergens, and the basket must still check real product labels.
- Nutrition values are not in the schema yet; the nutrition role adds them with the data source (MoH Tzameret) in its own record.
