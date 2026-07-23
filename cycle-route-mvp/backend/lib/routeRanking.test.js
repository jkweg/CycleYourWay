const test = require('node:test')
const assert = require('node:assert/strict')
const { rankFeaturesByMainRoadShare } = require('../lib/routeRanking')

test('ranks features with lower main-road share first', () => {
  const noisy = {
    properties: {
      extras: { waytype: { summary: [{ value: 1, amount: 80 }] } },
    },
  }
  const quiet = {
    properties: {
      extras: { waytype: { summary: [{ value: 1, amount: 10 }] } },
    },
  }

  const ranked = rankFeaturesByMainRoadShare([noisy, quiet])
  assert.equal(ranked[0], quiet)
  assert.equal(ranked[1], noisy)
})
