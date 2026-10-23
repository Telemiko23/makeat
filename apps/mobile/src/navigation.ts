import { router, type Href } from 'expo-router';

/** Goes back when there is somewhere to go back to, otherwise to `fallback` (e.g. after a deep link or reload). */
export const goBackOr = (fallback: Href) => (router.canGoBack() ? router.back() : router.replace(fallback));
