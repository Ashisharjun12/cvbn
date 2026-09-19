import assert from 'node:assert/strict';
import { expandLineItemsArrayRows } from './workshop-bill.shared.js';

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

console.log('workshop-bill.shared.check: ok');
