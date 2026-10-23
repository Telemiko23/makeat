// Static imports so bundlers (Metro) can include the content; content.test.ts checks
// that every file in content/recipes is listed here.
import type { ProductMap } from './prices/quote';
import ingredientsJson from '../../../content/ingredients.json';
import productsJson from '../../../content/products.json';
import bakedSalmon from '../../../content/recipes/baked-salmon.json';
import chickenRiceOnePot from '../../../content/recipes/chicken-rice-one-pot.json';
import chickpeaStew from '../../../content/recipes/chickpea-stew.json';
import israeliSalad from '../../../content/recipes/israeli-salad.json';
import majadra from '../../../content/recipes/majadra.json';
import meatballsTomatoSauce from '../../../content/recipes/meatballs-tomato-sauce.json';
import mushroomCreamPasta from '../../../content/recipes/mushroom-cream-pasta.json';
import oatmealAppleCinnamon from '../../../content/recipes/oatmeal-apple-cinnamon.json';
import ovenChickenSchnitzel from '../../../content/recipes/oven-chicken-schnitzel.json';
import pastaTomatoBasil from '../../../content/recipes/pasta-tomato-basil.json';
import ptitimVegetables from '../../../content/recipes/ptitim-vegetables.json';
import redLentilSoup from '../../../content/recipes/red-lentil-soup.json';
import riceWithVermicelli from '../../../content/recipes/rice-with-vermicelli.json';
import roastChickenPotatoes from '../../../content/recipes/roast-chicken-potatoes.json';
import shakshuka from '../../../content/recipes/shakshuka.json';
import tunaPastaSalad from '../../../content/recipes/tuna-pasta-salad.json';
import vegetableCouscous from '../../../content/recipes/vegetable-couscous.json';
import vegetableOmelette from '../../../content/recipes/vegetable-omelette.json';
import vegetablePashtida from '../../../content/recipes/vegetable-pashtida.json';
import zucchiniFritters from '../../../content/recipes/zucchini-fritters.json';
import { catalogOf } from './recipes/derive';
import type { Ingredient, Recipe } from './recipes/types';

export const INGREDIENTS = ingredientsJson as Ingredient[];
export const RECIPES = [
  bakedSalmon,
  chickenRiceOnePot,
  chickpeaStew,
  israeliSalad,
  majadra,
  meatballsTomatoSauce,
  mushroomCreamPasta,
  oatmealAppleCinnamon,
  ovenChickenSchnitzel,
  pastaTomatoBasil,
  ptitimVegetables,
  redLentilSoup,
  riceWithVermicelli,
  roastChickenPotatoes,
  shakshuka,
  tunaPastaSalad,
  vegetableCouscous,
  vegetableOmelette,
  vegetablePashtida,
  zucchiniFritters,
] as Recipe[];
export const CATALOG = catalogOf(INGREDIENTS);
/** Shelf products for each ingredient, by barcode (decision 0012). */
export const PRODUCTS = productsJson.products as unknown as ProductMap;
export const RECIPES_BY_ID: ReadonlyMap<string, Recipe> = new Map(RECIPES.map((r) => [r.id, r]));
