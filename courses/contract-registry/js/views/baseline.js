/* The baseline case study. Sealed: the page itself travels inside the
   encrypted course file and is loaded by ./sealed.js once the file is open.
   Its source is kept privately, outside this repository. */

import { sealedView } from './sealed.js';

export default sealedView('baseline');
