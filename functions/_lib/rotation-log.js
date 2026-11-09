// Facebook group rotation stamps, committed to GitHub (added 9 Nov 2026).
// Steve's rule: no D1 writes outside a committed change. Each entry here is
// applied to D1 table fb_group_rotation by GET /rotation/apply
// (functions/rotation/apply.js). Applying is idempotent: a row is only updated
// when its last_posted is empty or older than the entry's date, so re-running
// changes nothing. To log new posts, append entries and push to main.
export const ROTATION_LOG = [
  { id: 22, slug: "219224042443436", identity: "profile", date: "2026-11-09",
    campaign: "C-wholesaler-100-100",
    note: "9 Nov 2026: Campaign C wholesaler post (100/100 tier, 720+/10 flips) from Steve J Waller. LIVE immediately. Facebook attached a Deal Calculator link-preview card after posting; edit screen does not allow removing it." },
  { id: 19, slug: "2731757790200975", identity: "profile", date: "2026-11-09",
    campaign: "A-100-100-sample-deal",
    note: "9 Nov 2026: Campaign A sample-deal post (100/100 tier) from Steve J Waller. PENDING admin approval." },
];
