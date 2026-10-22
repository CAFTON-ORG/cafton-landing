import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ttlCache } from "./ttl-cache";

describe("ttlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reads once within the time, and again after it", async () => {
    const load = vi.fn(async (id: string) => `value-${id}`);
    const read = ttlCache(1000, load);
    await read("a");
    await read("a");
    expect(load).toHaveBeenCalledTimes(1);
    await read("b");
    expect(load).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1001);
    await read("a");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("shares one read between callers that arrive together", async () => {
    let calls = 0;
    const read = ttlCache(1000, async () => {
      calls++;
      return calls;
    });
    const [a, b] = await Promise.all([read(), read()]);
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it("does not keep a failure", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("ok");
    const read = ttlCache(1000, load);
    await expect(read()).rejects.toThrow("down");
    await expect(read()).resolves.toBe("ok");
  });

  it("can be cleared so the next read sees a change", async () => {
    const load = vi.fn(async () => "x");
    const read = ttlCache(1000, load);
    await read();
    read.clear();
    await read();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
