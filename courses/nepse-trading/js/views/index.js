/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — view registry
   Every view returns a Node, a DocumentFragment, or
   { node, teardown } when it owns listeners or timers.
   ═══════════════════════════════════════════════════════════════ */

export { dashboard } from './dashboard.js';
export { module } from './module.js';
export { glossary, resources, settings } from './misc.js';
export { lesson } from './lesson.js';
export { quiz } from './quizview.js';
export { games, game } from './gamesview.js';
export { certificate } from './certificate.js';
