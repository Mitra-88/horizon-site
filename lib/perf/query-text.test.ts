import assert from "node:assert/strict";
import { test } from "node:test";
import { cliLine, queryLabel, requestJson } from "./query-text.ts";

test("the command line asks what the request asks", () => {
  const line = cliLine(
    {
      op: "tree",
      args: ["f:abc"],
      filters: { select: "waiting", slow: true, thread: "Render thread", from: 5, to: "mark:spike", where: { entity: ["e:zombie", "e:husk"] }, depth: 3 },
    },
    "run.hzperf",
  );
  assert.equal(
    line,
    "horizon-perf query tree f:abc run.hzperf --thread 'Render thread' --select waiting --from 5 --to mark:spike --depth 3 --where entity=e:zombie,entity=e:husk --slow",
  );
});

test("names join with commas and a bare request has just the op and the file", () => {
  assert.equal(cliLine({ op: "spans", filters: { names: ["tick", "save"], min_mb: 2 } }), "horizon-perf query spans CAPTURE.hzperf --min-mb 2 --names tick,save");
  assert.equal(cliLine({ op: "meta" }), "horizon-perf query meta CAPTURE.hzperf");
});

test("the JSON is the request as it was sent", () => {
  const request = { op: "hot", file: "capture", filters: { limit: 25 } } as const;
  assert.deepEqual(JSON.parse(requestJson(request)), request);
});

test("a request is named by its op and ids", () => {
  assert.equal(queryLabel({ op: "series", args: ["h:tps", "span:tick"] }), "series h:tps span:tick");
});
