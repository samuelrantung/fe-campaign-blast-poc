// Domain constants shared across the app.
// These mirror the rule engine and promo mapping described in FLOW.md.

/** At-risk rule definitions (rule engine R01–R04). */
export const RULE_DEFS = {
  R01: 'Long Inactivity',
  R02: 'Frequency Drop',
  R03: 'High-Value Lapse',
  R04: 'Single Purchase',
};

/** Promo templates and the risk/rule conditions that map to them. */
export const PROMO_DEFS = {
  BACK30:   { value: '30% off your next purchase', type: 'discount_30', note: 'HIGH risk + high spend' },
  BACK20:   { value: '20% off your next purchase', type: 'discount_20', note: 'HIGH risk' },
  SHIP15:   { value: 'Free shipping + 15% off',    type: 'ship_15',     note: 'MEDIUM risk + R02' },
  BOGO1:    { value: 'Buy 1 Get 1 on any item',    type: 'bogo',        note: 'MEDIUM risk + R04' },
  POINTS2X: { value: '2x loyalty points',          type: 'points_2x',   note: 'LOW risk default' },
};

export const CITIES = ['jakarta', 'surabaya', 'bandung', 'medan', 'manado', 'yogyakarta', 'semarang', 'makassar', 'denpasar', 'palembang'];

export const CATEGORIES = ['electronics', 'fashion', 'grocery', 'beauty', 'home', 'books', 'sports', 'toys'];

/** WhatsApp template name used for the re-engagement campaign. */
export const TEMPLATE_NAME = 'reengagement_promo';
