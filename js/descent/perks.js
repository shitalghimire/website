/* ═══════════════════════════════════════════════════════════════
   PERKS — offered by the surveyor at the end of every zone.

   Each entry carries how many times it can be taken, so the pool
   thins out as a run gets deep and late choices stay meaningful
   instead of offering the same three cards forever.

   Icons are file stems under assets/icons/ (CC0, see the README
   there). They are inlined as <img> by the HUD so `currentColor`
   theming is handled by CSS rather than here.
   ═══════════════════════════════════════════════════════════════ */

export const PERKS = [
  {
    id: 'mag', icon: 'magazine', name: 'Deep Magazine', max: 3,
    blurb: '+3 rounds in the boots. More ammo is more airtime.',
    apply: (p) => { p.stats.maxAmmo += 3; p.ammo = p.stats.maxAmmo; },
  },
  {
    id: 'heart', icon: 'heart', name: 'Rebar Heart', max: 3,
    blurb: '+1 maximum health, and patch one up right now.',
    apply: (p) => { p.stats.maxHp += 1; p.heal(1); },
  },
  {
    id: 'pierce', icon: 'pierce', name: 'Punch Through', max: 2,
    blurb: 'Rounds carry on through one more body before stopping.',
    apply: (p) => { p.stats.pierce += 1; },
  },
  {
    id: 'spread', icon: 'spread', name: 'Triple Tap', max: 2,
    blurb: 'Fire a wider fan. Covers the ground you are about to hit.',
    apply: (p) => { p.stats.spread += 2; },
  },
  {
    id: 'magnet', icon: 'magnet', name: 'Gem Magnet', max: 2,
    blurb: 'Gems come to you. Stop chasing, keep falling.',
    apply: (p) => { p.stats.magnet += 46; },
  },
  {
    id: 'shield', icon: 'shield', name: 'Hard Hat', max: 4,
    blurb: 'Absorbs the next two hits outright.',
    apply: (p) => { p.stats.shield += 2; },
  },
  {
    id: 'wave', icon: 'bomb', name: 'Stomp Wave', max: 2,
    blurb: 'Landing on something rattles everything around it.',
    apply: (p) => { p.stats.stompRadius += 34; },
  },
  {
    id: 'rate', icon: 'stamina', name: 'Light Boots', max: 3,
    blurb: 'Faster trigger. Hover longer on the same ammo.',
    apply: (p) => { p.stats.fireGap = Math.max(0.055, p.stats.fireGap - 0.018); },
  },
  {
    id: 'recoil', icon: 'laser', name: 'Heavy Charge', max: 2,
    blurb: 'Each shot kicks harder. Climb, do not just hover.',
    apply: (p) => { p.stats.recoil += 26; },
  },
  {
    id: 'rich', icon: 'gem', name: 'Rich Seam', max: 2,
    blurb: 'Every gem is worth double.',
    apply: (p) => { p.stats.gemBonus *= 2; },
  },
  {
    id: 'kit', icon: 'medkit', name: 'Field Kit', max: 99,
    blurb: 'Patch up two health, here and now.',
    apply: (p) => { p.heal(2); },
  },
  {
    id: 'bounce', icon: 'missile', name: 'Wall Run', max: 1,
    blurb: 'Ricochet off the shaft walls instead of dying on them.',
    apply: (p) => { p.stats.bounceWalls = true; },
  },
];

export class PerkState {
  constructor() {
    this.taken = {};      /* id -> count */
  }

  reset() { this.taken = {}; }

  countOf(id) { return this.taken[id] || 0; }

  available() {
    return PERKS.filter((p) => this.countOf(p.id) < p.max);
  }

  /* three distinct cards, or fewer if the pool has run dry */
  offer(rand, n = 3) {
    const pool = this.available().slice();
    const out = [];
    while (out.length < n && pool.length) {
      const i = rand.int(pool.length);
      out.push(pool[i]);
      pool.splice(i, 1);
    }
    return out;
  }

  take(perk, player) {
    this.taken[perk.id] = this.countOf(perk.id) + 1;
    perk.apply(player);
  }

  /* for the run summary */
  list() {
    return PERKS
      .filter((p) => this.countOf(p.id) > 0)
      .map((p) => ({ ...p, count: this.countOf(p.id) }));
  }
}
