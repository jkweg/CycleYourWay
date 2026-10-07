const test = require("node:test");
const assert = require("node:assert/strict");
const { ProviderBudget } = require("./providerBudget");

test("rolling minute/day quotas count failed attempts and expire independently", async () => {
  let clock = 0;
  const budget = new ProviderBudget({ perMinute: 2, perDay: 3, concurrency: 2, now: () => clock });
  let sent = 0;
  const call = () => budget.run(async () => { sent++; return "ok"; });
  await call();
  await assert.rejects(budget.run(async () => { sent++; throw new Error("upstream"); }), /upstream/);
  await assert.rejects(call(), error => error.retryAfter === 60 && error.response.status === 429);
  assert.equal(sent, 2);
  clock = 60000;
  await call();
  await assert.rejects(call(), error => error.retryAfter === 86340);
  clock = 86400000;
  await call();
  assert.equal(sent, 4);
});

test("concurrent callers cannot exceed slots; rejected work is not queued or charged", async () => {
  const budget = new ProviderBudget({ perMinute: 2, perDay: 2, concurrency: 1 });
  let finish;
  const pending = budget.run(() => new Promise(resolve => { finish = resolve; }));
  await assert.rejects(budget.run(() => assert.fail("must not run")), { code: "PROVIDER_BUDGET_EXCEEDED" });
  finish();
  await pending;
  assert.equal(await budget.run(() => "second"), "second");
  await assert.rejects(budget.run(() => assert.fail("must not run")), { code: "PROVIDER_BUDGET_EXCEEDED" });
});

test("a synchronous provider error releases its concurrency slot", async () => {
  const budget = new ProviderBudget({ perMinute: 2, perDay: 2, concurrency: 1 });
  await assert.rejects(budget.run(() => { throw new Error("sync"); }), /sync/);
  assert.equal(await budget.run(() => "recovered"), "recovered");
});
