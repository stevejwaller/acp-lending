// Deals logged by hand (worked deals that did not come in through a website form).
// Merged into /deals/api/list alongside the D1 form submissions.
// This repo is public: no borrower contact details, owner names or other private data here.
// Unknown fields are "Pending".

export const LOGGED_DEALS = [
  {
    source: "Request for Information",
    id: "L1",
    created_at: "2026-10-31 18:45:00",
    status: "Active",
    borrower: "Pending",
    email: "Pending",
    phone: "Pending",
    entity: "Pending",
    property: "19034 Woodglen Dr, Houston, TX 77084",
    property_type: "Single-family",
    product: "Bridge / Fix & Flip",
    owned: "No",
    financing: "Pending",
    purchase: "Pending",
    repairs: "98500",
    arv: "365000",
    credit: "Pending",
    liquidity: "Pending",
    closing: "Pending",
    exit_strategy: "Pending",
    summary:
      "Barkers Ridge Sec 5; 1-story brick, 1996, 3BR/2BA, 2,631 SF, detached 2-car garage. Owner-occupied. " +
      "As-is RealAVM $342,500; ARV $365,000 (ACP memo 31 Oct 2026, 26 subdivision comps). " +
      "Repair estimate $98,500 (range $58,100-$162,500) from 39 photos via Happen Houston - animal contamination in primary suite/rear room, " +
      "flooring loss, heavy clean-out. Renovation lift only ~$20-25K over as-is; deal depends on purchase price.",
    signature: "",
  },
  {
    source: "Worked deal",
    id: "L2",
    created_at: "2026-11-03 18:05:00",
    status: "Active",
    borrower: "Pending",
    email: "Pending",
    phone: "Pending",
    entity: "Pending",
    property: "7606 Miller Glen Ln, Houston, TX 77072",
    property_type: "Single-family",
    product: "Bridge / Fix & Flip",
    owned: "No",
    financing: "Pending",
    purchase: "135000",
    repairs: "137500",
    arv: "250000",
    credit: "Pending",
    liquidity: "Pending",
    closing: "Pending",
    exit_strategy: "Flip",
    summary:
      "Braewood Glen Sec 4; 2-story, 1978, 3BR/2.5BA, 2,022 SF. Occupied. Asking $135,000. " +
      "ARV $250,000 (ACP memo 3 Nov 2026, 54 size-matched subdivision closed sales, HARMLS). " +
      "Repair estimate $137,500 (range $80,750-$209,500) from 36 photos - hoarder clear-out, collapsed upstairs ceiling / likely roof leak, popcorn ceilings, chimney chase. " +
      "ACP offer $50,000, walk-away $67,750 if roof/HVAC/plumbing verified; at asking the flip loses ~$68,000; rental DSCR 1.02.",
    signature: "",
  },
  {
    source: "Worked deal",
    id: "L3",
    created_at: "2026-11-03 18:15:00",
    status: "Active",
    borrower: "Pending",
    email: "Pending",
    phone: "Pending",
    entity: "Pending",
    property: "2102 Round Lake Dr, Houston, TX 77077",
    property_type: "Single-family",
    product: "Bridge / Fix & Flip",
    owned: "No",
    financing: "Pending",
    purchase: "235000",
    repairs: "59000",
    arv: "350000",
    credit: "Pending",
    liquidity: "Pending",
    closing: "Pending",
    exit_strategy: "Flip",
    summary:
      "Southlake (77077); 1-story brick, 1970, 4BR/2BA, 1,790 SF, detached garage. Occupied, livable. Submitted price $235,000 (borrower's prelim term sheet shows $229,000 at $375,000 ARV). " +
      "ACP ARV $350,000 (ACP memo 3 Nov 2026, 26 subdivision closed sales, HARMLS). Repairs $59,000 (range $33,500-$108,500), mainly kitchen. " +
      "ACP offer $203,500, walk-away $220,000; flip loses ~$6,400 at $235,000; rental DSCR 0.90.",
    signature: "",
  },
];
