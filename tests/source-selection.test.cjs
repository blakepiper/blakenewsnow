const assert = require('node:assert/strict');
const test = require('node:test');
const { selectDiverseItems } = require('../server/data-feeds.cjs');

function item(source, id) {
  return { source, id };
}

test('caps a prolific source when enough alternatives exist', () => {
  const input = [
    item('A', 1),
    item('A', 2),
    item('A', 3),
    item('A', 4),
    item('B', 5),
    item('B', 6),
    item('C', 7),
    item('C', 8),
  ];

  const result = selectDiverseItems(input, 6, 2);
  const counts = result.reduce((map, entry) => {
    map.set(entry.source, (map.get(entry.source) || 0) + 1);
    return map;
  }, new Map());

  assert.equal(result.length, 6);
  assert.deepEqual(Object.fromEntries(counts), { A: 2, B: 2, C: 2 });
});

test('fills unused slots when the source pool is too small for the cap', () => {
  const input = [
    item('A', 1),
    item('A', 2),
    item('A', 3),
    item('A', 4),
    item('B', 5),
  ];

  const result = selectDiverseItems(input, 5, 2);

  assert.equal(result.length, 5);
  assert.deepEqual(result.map(entry => entry.id), [1, 2, 5, 3, 4]);
});
