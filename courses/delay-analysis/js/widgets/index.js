/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — widget registry

   A lesson names an instrument; this maps the name to a function
   that returns a DOM node. Every lesson in the course carries at
   least one. No exceptions — if a point cannot be drawn, it usually
   means it has not been understood well enough to teach.
   ═══════════════════════════════════════════════════════════════ */

import { network } from './network.js';
import { gantt, ganttFromNetwork } from './gantt.js';
import { relationships, outOfSequence, constraints } from './logic.js';
import { impactedAsPlanned, timeImpact, collapsedAsBuilt, activityVariance, methodChooser } from './methods.js';
import { floatAnatomy, floatOwnership, floatDeterioration, floatMap, criticalityProfile } from './floatw.js';
import { measuredMile, earnedValue, disruptionCalc, accelerationChart } from './charts.js';
import {
  staticTable, delayMatrix, concurrency, steps, checklist,
  recordsHierarchy, compare, taxonomy, pacingTest, sclPrinciples
} from './panels.js';

export const WIDGETS = {
  // programme fundamentals
  'network': network,
  'gantt': gantt,
  'relationships': relationships,
  'out-of-sequence': outOfSequence,
  'constraints': constraints,

  // float
  'float-anatomy': floatAnatomy,
  'float-ownership': floatOwnership,
  'float-deterioration': floatDeterioration,
  'float-map': floatMap,
  'criticality': criticalityProfile,

  // the methods
  'impacted-as-planned': impactedAsPlanned,
  'time-impact': timeImpact,
  'collapsed-as-built': collapsedAsBuilt,
  'activity-variance': activityVariance,
  'method-chooser': methodChooser,
  'taxonomy': taxonomy,

  // disruption and money
  'measured-mile': measuredMile,
  'earned-value': earnedValue,
  'disruption-calc': disruptionCalc,
  'acceleration': accelerationChart,

  // supporting cast
  'table': staticTable,
  'delay-matrix': delayMatrix,
  'concurrency': concurrency,
  'steps': steps,
  'checklist': checklist,
  'records': recordsHierarchy,
  'compare': compare,
  'pacing-test': pacingTest,
  'scl-principles': sclPrinciples
};

export { ganttFromNetwork };
