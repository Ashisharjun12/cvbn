import assert from 'node:assert/strict';
import { hasSerialGapsForTable } from './workshop-bill.utils.js';

function rowsFromSerials(nums: number[]): Record<string, unknown>[] {
  return nums.map((srNo) => ({ srNo }));
}

function rangeInclusive(from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

// ES00911499 chunk p1–2: Sr. 54 missing at page break (53 → 55).
const tolerated = rowsFromSerials([...rangeInclusive(1, 53), ...rangeInclusive(55, 113)]);
assert.equal(hasSerialGapsForTable(tolerated), false);

const truncated = rowsFromSerials([...rangeInclusive(1, 53), ...rangeInclusive(57, 113)]);
assert.equal(hasSerialGapsForTable(truncated), true);

console.log('workshop-bill.serial-gap.check: ok');
