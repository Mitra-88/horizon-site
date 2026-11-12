import assert from "node:assert/strict";
import { test } from "node:test";
import { LOCAL_NAME, LocalCaptureError, fetchLocalCapture, loadLocalCapture, localCaptureUrl, localParam } from "./local-capture.ts";

const TOKEN = "0123456789abcdef0123456789abcdef";
const GAME = `http://127.0.0.1:43211/${TOKEN}`;

test("the address the game prints is accepted from its fragment", () => {
  assert.equal(localCaptureUrl(localParam(`#local=${GAME}`)), GAME);
  assert.equal(localCaptureUrl(`http://localhost:3000/${TOKEN}`), `http://localhost:3000/${TOKEN}`);
  assert.equal(localCaptureUrl(`http://[::1]:8080/${TOKEN}`), `http://[::1]:8080/${TOKEN}`);
});

test("no local parameter means no address", () => {
  assert.equal(localParam(""), null);
  assert.equal(localParam("#other=1"), null);
  assert.equal(localCaptureUrl(null), null);
});

test("another host, scheme or port-less address is refused", () => {
  assert.equal(localCaptureUrl(`http://example.com:80/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://192.168.1.5:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.2:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1.evil.example:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`https://127.0.0.1:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`ftp://127.0.0.1:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:80/${TOKEN}`), null);
});

test("credentials, queries and fragments are refused", () => {
  assert.equal(localCaptureUrl(`http://user:pw@127.0.0.1:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://evil.example@127.0.0.1:4000/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`${GAME}?x=1`), null);
  assert.equal(localCaptureUrl(`${GAME}?`), null);
  assert.equal(localCaptureUrl(`${GAME}#x`), null);
});

test("only a single 32-hex-character path segment is accepted", () => {
  assert.equal(localCaptureUrl("http://127.0.0.1:4000/"), null);
  assert.equal(localCaptureUrl("http://127.0.0.1:4000"), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/${TOKEN.slice(1)}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/${TOKEN}0`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/${TOKEN.toUpperCase()}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/${"g".repeat(32)}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/${TOKEN}/`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/a/${TOKEN}`), null);
  assert.equal(localCaptureUrl(`http://127.0.0.1:4000/../${TOKEN}`), null);
});

test("the capture is fetched once, without cookies or cache, and its bytes returned", async () => {
  const calls: Array<{ url: string; init: RequestInit & { targetAddressSpace?: string } }> = [];
  const body = new Uint8Array([0x1f, 0x8b, 1, 2, 3]);
  const bytes = await fetchLocalCapture(GAME, async (url, init) => {
    calls.push({ url, init });
    return new Response(body);
  });
  assert.deepEqual([...new Uint8Array(bytes)], [...body]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, GAME);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.mode, "cors");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.targetAddressSpace, "loopback");
});

test("a browser that rejects the address-space hint is asked again without it", async () => {
  const hints: Array<string | undefined> = [];
  const bytes = await fetchLocalCapture(GAME, async (_url, init) => {
    const hint = (init as { targetAddressSpace?: string }).targetAddressSpace;
    hints.push(hint);
    if (hint) throw new TypeError("not a valid enum value");
    return new Response(new Uint8Array([1, 2]));
  });
  assert.deepEqual(hints, ["loopback", undefined]);
  assert.equal(bytes.byteLength, 2);
});

test("a refused or failed fetch is reported as an expired link", async () => {
  await assert.rejects(
    fetchLocalCapture(GAME, async () => new Response(null, { status: 404 })),
    (error: unknown) => error instanceof LocalCaptureError && error.failure === "expired",
  );
  await assert.rejects(
    fetchLocalCapture(GAME, async () => {
      throw new TypeError("Failed to fetch");
    }),
    (error: unknown) => error instanceof LocalCaptureError && error.failure === "expired",
  );
});

test("a fetch failure with local network access denied says so", async () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { permissions: { query: async () => ({ state: "denied" }) } }, configurable: true });
  try {
    await assert.rejects(
      fetchLocalCapture(GAME, async () => {
        throw new TypeError("Failed to fetch");
      }),
      (error: unknown) => error instanceof LocalCaptureError && error.failure === "denied",
    );
  } finally {
    if (real) Object.defineProperty(globalThis, "navigator", real);
    else delete (globalThis as { navigator?: unknown }).navigator;
  }
});

test("the loader gets the fetched bytes as a file", async () => {
  const body = new Uint8Array([0x1f, 0x8b, 9, 8, 7]);
  const opened: Array<{ bytes: number[]; name: string }> = [];
  await loadLocalCapture(
    GAME,
    async (file, name) => {
      opened.push({ bytes: [...new Uint8Array(await file.arrayBuffer())], name });
    },
    async () => new Response(body),
  );
  assert.deepEqual(opened, [{ bytes: [...body], name: LOCAL_NAME }]);
});

test("the loader is not called when the fetch fails", async () => {
  let called = false;
  await assert.rejects(
    loadLocalCapture(GAME, async () => { called = true; }, async () => new Response(null, { status: 404 })),
    LocalCaptureError,
  );
  assert.equal(called, false);
});
