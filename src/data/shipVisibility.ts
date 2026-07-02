/**
 * Ships hidden site-wide until they launch (EXPLORA V & VI are not ready yet).
 *
 * Single source of truth for the fleet hide: the grid, mega-menu, footer, mobile nav,
 * ship filter dropdown, and the ship-detail route guard all consult these. The journeys
 * API filters the matching `ship_cd`s in SQL so their packages never surface either.
 *
 * To reveal a ship when it launches: remove its codes from both arrays below (and restore
 * its two nav links in `megaMenu.ts`), then redeploy.
 */

/** Route/kebab ship codes (e.g. `/ships/explora-v`). */
export const HIDDEN_SHIP_CODES = ['explora-v', 'explora-vi'];

/** Database `ship_cd` codes used by journeys/fares. */
export const HIDDEN_SHIP_CDS = ['EP05', 'EP06'];

/** True for either a kebab code (`explora-v`) or a DB code (`EP05`). */
export const isShipHidden = (code?: string | null): boolean =>
  !!code && (HIDDEN_SHIP_CODES.includes(code) || HIDDEN_SHIP_CDS.includes(code));
