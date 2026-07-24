const test = require('node:test')
const assert = require('node:assert/strict')
const {
  rankFeaturesByMainRoadShare,
  rankFeaturesByPreferences,
} = require('../lib/routeRanking')
const {
  profilesToTry,
  resolveOrsProfile,
  steepnessDifficulty,
} = require('../lib/routePreferences')

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

test('ranks features with higher asphalt share first when preferAsphalt', () => {
  const gravelHeavy = {
    properties: {
      extras: {
        surface: {
          summary: [
            { value: 3, amount: 20 },
            { value: 12, amount: 80 },
          ],
        },
      },
    },
  }
  const asphaltHeavy = {
    properties: {
      extras: {
        surface: {
          summary: [
            { value: 3, amount: 90 },
            { value: 12, amount: 10 },
          ],
        },
      },
    },
  }

  const ranked = rankFeaturesByPreferences([gravelHeavy, asphaltHeavy], {
    preferAsphalt: true,
  })
  assert.equal(ranked[0], asphaltHeavy)
  assert.equal(ranked[1], gravelHeavy)
})

test('maps ride style and climb preference to ORS settings', () => {
  assert.equal(resolveOrsProfile('road'), 'cycling-road')
  assert.equal(resolveOrsProfile('gravel'), 'cycling-regular')
  assert.equal(resolveOrsProfile('mtb'), 'cycling-mountain')
  assert.deepEqual(profilesToTry('road')[0], 'cycling-road')
  assert.equal(steepnessDifficulty('easy'), 0)
  assert.equal(steepnessDifficulty('hard'), 3)
})
