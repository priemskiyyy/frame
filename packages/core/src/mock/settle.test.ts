import { expect, test } from "vitest";
import { settle } from "src/mock/settle";

const startChain = (hops: number) => {
  const chain = { finished: false };
  let promise = Promise.resolve();

  for (let hop = 0; hop < hops; hop += 1) {
    promise = promise.then(() => {});
  }

  promise.then(() => {
    chain.finished = true;
  });

  return chain;
};

test("settle lets a chain of ready promises run to its end", async () => {
  const chain = startChain(10);

  expect(chain.finished).toBe(false);

  await settle();

  expect(chain.finished).toBe(true);
});

test("settle waits a fixed number of turns, so a much longer chain is not finished", async () => {
  const chain = startChain(100);

  await settle();

  expect(chain.finished).toBe(false);
});
