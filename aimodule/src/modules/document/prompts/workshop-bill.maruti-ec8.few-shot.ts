/** Few-shot examples for Maruti/Suzuki Service Estimate (EC-8) sequential array extraction. */
export const MARUTI_EC8_FEW_SHOTS = `
=== MARUTI/SUZUKI SERVICE ESTIMATE (EC-8) — FEW-SHOT ROWS ===
One printed table row → one lineItemsTable array row. Part Number → col[2], Description → col[4] only.
Parentheses, slashes, and sizes (e.g. 185/65 R15) stay entirely in col[4] — never skip or merge with the next row.

CORRECT (rows 10–12 on a typical estimate — col[9]=TaxableAmt, col[11]=TotalAmt for parts):
["10","PART","42420M55T00","","JOINT ,STABILIZER BAR","","1","565","","565","0","565",""]
["11","PART","43110M75T50","","TYRE(185/65 R15) (CEAT)","","1","7278","","7278","0","7278",""]
["12","PART","43210M55T50-27N","","WHEEL COMP,AL(16X6J)","","1","8379.5","","8379.5","0","8379.5",""]

WRONG: sr 11 col[4] = "WHEEL COMP,AL(16X6J)" while col[2] = "43110M75T50" and col[7] = "7278".
RIGHT: sr 11 col[4] must be "TYRE(185/65 R15) (CEAT)" on the same row as part 43110M75T50 and rate 7278.
`;
