import assert from 'node:assert/strict';
import {
  expandLineItemsArrayRows,
  hasMarutiServiceEstimateDescriptionSlip,
  repairMarutiServiceEstimateDescriptionSlip,
} from './workshop-bill.shared.js';

function marutiPartRow(
  srNo: number,
  itemCode: string,
  description: string,
  rate: number,
): Record<string, unknown> {
  return {
    rowType: 'PART',
    srNo,
    itemCode,
    description,
    quantity: 1,
    rate,
    taxableAmount: rate,
    totalAmount: rate,
    partsCost: rate,
  };
}

function buildShortSlipShifted(): Record<string, unknown>[] {
  return [
    marutiPartRow(1, '17700M68P00', 'RADIATOR ASSY', 2850),
    marutiPartRow(2, '35300M55T42', 'HEADLAMP ASSY,LH', 14085),
    marutiPartRow(3, '35500M85S01', 'LAMP ASSY FOG', 4500),
    marutiPartRow(4, '36691M55T00', 'WIRE,A/B', 600),
    marutiPartRow(5, '37410M55TA0', 'SET,CONTACT COIL', 4890),
    marutiPartRow(6, '3F900M55TA0', 'CONTROLLER ASSY,A/B', 4835),
    marutiPartRow(7, '3F920M81R00', 'SENSOR ASSY', 680),
    marutiPartRow(8, '41602M55T01', 'STRUT ASSY', 3165),
    marutiPartRow(9, '42311M55R00', 'BAR, FRONT STABILIZER', 1600),
    marutiPartRow(10, '42420M55T00', 'JOINT ,STABILIZER BAR', 565),
    marutiPartRow(11, '43110M75T50', 'WHEEL COMP,AL(16X6J)', 7278),
    marutiPartRow(12, '43210M55T50-27N', 'SHAFT ASSY, FRONT DRIVE, L', 8379.5),
    marutiPartRow(13, '44102M55RA0', 'KNUCKLE,STEERING,LH', 7495),
    marutiPartRow(14, '71732M55T00', 'TYRE(185/65 R15) (CEAT)', 59),
  ];
}

// [0:s, 1:pl, 2:code, 3:hsn, 4:desc, 5:uom, 6:qty, 7:rate, 8:dis, 9:ta, 10:tx, 11:total, 12:header]
const partArray = ['1', 'PART', '1420608250B', '', 'CLIP', '', '20', '25.42', '', '508.4', '91.51', '599.91', ''];
const labourArray = ['1', 'LABOUR', '', '', 'FRONT FENDER PANEL (RH, REFINISH)', '', '1', '2055', '', '2055', '369.9', '2424.9', ''];

const fromArrays = expandLineItemsArrayRows({ lineItemsTable: [partArray, labourArray] });
const [part, labour] = fromArrays.lineItemsTable as Record<string, unknown>[];

assert.equal(part.rowType, 'PART');
assert.equal(part.rate, 25.42);
assert.equal(part.partsCost, 599.91);
assert.equal(part.labourCost, null);

assert.equal(labour.rowType, 'LABOUR');
assert.equal(labour.rate, null);
assert.equal(labour.labourCost, 2424.9);
assert.equal(labour.partsCost, null);
assert.equal(labour.taxableAmount, 2055);
assert.equal(labour.totalAmount, 2424.9);

const fromObjects = expandLineItemsArrayRows({
  lineItemsTable: [{
    rowType: 'LABOUR',
    description: 'Denting Charges',
    rate: 5000,
    partsCost: 5900,
    labourCost: 5900,
    taxableAmount: 5000,
    taxAmount: 900,
    totalAmount: 5900,
  }],
});
const [objLabour] = fromObjects.lineItemsTable as Record<string, unknown>[];
assert.equal(objLabour.rate, null);
assert.equal(objLabour.labourCost, 5900);
assert.equal(objLabour.partsCost, null);
assert.equal(objLabour.totalAmount, 5900);

// Maruti estimate: labour line mis-tagged PART (Labor Amount only, PE03R0 code)
const marutiMisPart = expandLineItemsArrayRows({
  lineItemsTable: [{
    rowType: 'PART',
    itemCode: 'PE03R0',
    description: 'BACK DOOR TRIM',
    partsCost: 400,
    taxableAmount: 400,
    totalAmount: 400,
  }],
});
const [marutiLabour] = marutiMisPart.lineItemsTable as Record<string, unknown>[];
assert.equal(marutiLabour.rowType, 'LABOUR');
assert.equal(marutiLabour.labourCost, 400);
assert.equal(marutiLabour.partsCost, null);

// Suzuki spare part row must stay PART with qty/rate
const sparePart = expandLineItemsArrayRows({
  lineItemsTable: [{
    rowType: 'PART',
    sectionHeader: 'Parts',
    itemCode: '17100M68P00',
    description: 'FAN ASSY, ENG CLG',
    quantity: 1,
    rate: 4220,
    taxableAmount: 4220,
    totalAmount: 4220,
  }],
});
const [fanPart] = sparePart.lineItemsTable as Record<string, unknown>[];
assert.equal(fanPart.rowType, 'PART');
assert.equal(fanPart.partsCost, 4220);
assert.equal(fanPart.labourCost, null);

// Maruti insurance estimate: mis-mapped MRP/R&R into tax fields — guard clears ta/tx
const marutiEstimate = expandLineItemsArrayRows({
  lineItemsTable: [{
    rowType: 'PART',
    itemCode: '11170M81R10',
    description: 'COVER ASSY,CYLINDER HEAD',
    quantity: 1,
    rate: 1200,
    partsCost: 1842,
    taxableAmount: 1200,
    taxAmount: 642,
    totalAmount: 1842,
    extraColumns: [
      { key: 'MRP', value: '1200' },
      { key: 'Demand Type', value: 'REPLACE' },
      { key: 'R&R Hrs', value: '1.2' },
      { key: 'R&R Cost (Rs.)', value: '642' },
      { key: 'Denting Cost (Rs.)', value: '0' },
      { key: 'Painting Cost (Rs.)', value: '0' },
    ],
  }],
});
const [marutiRow] = marutiEstimate.lineItemsTable as Record<string, unknown>[];
assert.equal(marutiRow.taxableAmount, null);
assert.equal(marutiRow.taxAmount, null);
assert.equal(marutiRow.totalAmount, 1842);
assert.equal(marutiRow.partsCost, 1842);
const rrExtra = (marutiRow.extraColumns as { key: string; value: string }[]).find(
  (c) => c.key === 'R&R Cost (Rs.)',
);
assert.equal(rrExtra?.value, '642');

// Maruti EC-8: short TYRE description slip
const slipRows = buildShortSlipShifted();
const slipExpanded = expandLineItemsArrayRows({ lineItemsTable: slipRows });
const slipItems = slipExpanded.lineItemsTable as Record<string, unknown>[];
const sr11 = slipItems.find((r) => r.srNo === 11);
const sr14 = slipItems.find((r) => r.srNo === 14);
assert.match(String(sr11?.description ?? ''), /\bTYRE\b/i);
assert.doesNotMatch(String(sr14?.description ?? ''), /\bTYRE\b/i);
assert.equal(hasMarutiServiceEstimateDescriptionSlip(slipItems), false);

// Long slip: aligned filler + shifted tail with cheap parts inside block (UK07-style)
const longSlipRows: Record<string, unknown>[] = [];
for (let s = 1; s <= 18; s++) {
  longSlipRows.push(marutiPartRow(s, `17100M68P0${s}`, `FILLER PART ${s}`, 4100));
}
for (const row of buildShortSlipShifted()) {
  longSlipRows.push({
    ...row,
    srNo: Number(row.srNo) + 18,
  });
}
const longExpanded = expandLineItemsArrayRows({ lineItemsTable: longSlipRows });
const longItems = longExpanded.lineItemsTable as Record<string, unknown>[];
const longTyreRow = longItems.find((r) => r.srNo === 29);
const longOrphanRow = longItems.find((r) => r.srNo === 32);
assert.match(String(longTyreRow?.description ?? ''), /\bTYRE\b/i);
assert.doesNotMatch(String(longOrphanRow?.description ?? ''), /\bTYRE\b/i);
assert.equal(hasMarutiServiceEstimateDescriptionSlip(longItems), false);

// Negative: legitimate TYRE at full price — no repair
const legitTyreRows: Record<string, unknown>[] = [
  ...buildShortSlipShifted().slice(0, 10),
  marutiPartRow(11, '43110M75T50', 'TYRE(185/65 R15) (CEAT)', 7278),
  marutiPartRow(12, '43210M55T50-27N', 'WHEEL COMP,AL(16X6J)', 8379.5),
  marutiPartRow(13, '44102M55RA0', 'SHAFT ASSY, FRONT DRIVE, L', 7495),
  marutiPartRow(14, '71732M55T00', 'HOLDER,FR BUMPR SIDE,LH', 59),
];
const legitCopy = legitTyreRows.map((r) => ({ ...r }));
assert.equal(repairMarutiServiceEstimateDescriptionSlip(legitCopy), false);
assert.match(String(legitCopy.find((r) => r.srNo === 11)?.description ?? ''), /\bTYRE\b/i);

// EC-9 insurance table — slip pattern must not repair
const insuranceSlip = expandLineItemsArrayRows({
  lineItemsTable: [{
    rowType: 'PART',
    itemCode: '11170M81R10',
    description: 'TYRE(185/65 R15) (CEAT)',
    quantity: 1,
    rate: 59,
    partsCost: 59,
    totalAmount: 59,
    extraColumns: [
      { key: 'MRP', value: '1200' },
      { key: 'R&R Cost (Rs.)', value: '0' },
    ],
  }],
});
const insItems = insuranceSlip.lineItemsTable as Record<string, unknown>[];
assert.match(String(insItems[0]?.description ?? ''), /\bTYRE\b/i);

// No taxable column on PDF: inferred rate×qty in col[9] → cleared
const inferredTaxable = expandLineItemsArrayRows({
  lineItemsTable: [{
    rowType: 'PART',
    description: 'BOLT',
    quantity: 2,
    rate: 100,
    taxableAmount: 200,
    totalAmount: 200,
  }],
});
const [inferredRow] = inferredTaxable.lineItemsTable as Record<string, unknown>[];
assert.equal(inferredRow.taxableAmount, null);
assert.equal(inferredRow.totalAmount, 200);

// Explicit flag: keep taxable when header exists on PDF
const explicitTaxable = expandLineItemsArrayRows({
  lineItemsTableHasTaxableColumn: true,
  lineItemsTable: [{
    rowType: 'PART',
    description: 'BOLT',
    quantity: 2,
    rate: 100,
    taxableAmount: 200,
    totalAmount: 236,
    taxAmount: 36,
  }],
});
const [explicitRow] = explicitTaxable.lineItemsTable as Record<string, unknown>[];
assert.equal(explicitRow.taxableAmount, 200);

// Rate-only Maruti-style row (no line tax): taxable cleared
assert.equal(fanPart.taxableAmount, null);

console.log('workshop-bill.shared.check: ok');
