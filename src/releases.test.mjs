// node --test src/: the release notes as the site shows them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { notesText, parts } from "./releases.js";

const players = '<h3>Want to play? Download the <a href="https://playhorizon.dev">Horizon launcher</a>, not the files below</h3><p>It installs this version.</p>';

test("the block sending people to the launcher is left out, the notes stay", () => {
  assert.equal(notesText(`${players}\n\n### Fixed\n- A fix (#1)\n`), "### Fixed\n- A fix (#1)\n");
  assert.equal(notesText(`${players}\r\n\r\nRebuilt from the latest main.\r\n`), "Rebuilt from the latest main.\r\n");
  assert.equal(notesText("<p>Other HTML</p>\n\n### New\n- A thing (#2)\n"), "<p>Other HTML</p>\n\n### New\n- A thing (#2)\n");
  assert.equal(notesText(undefined), "");
});

test("a Nightly reads as its title and the first line of its notes", () => {
  const r = { tag_name: "nightly", name: "Nightly 2026-10-28 · 9b772b2", published_at: "2026-10-28T20:40:00Z", body: "### New\n- Sculk sensors hear jumps (#3001)\n" };
  const p = parts(r);
  assert.equal(p.version, "Nightly 2026-10-28 · 9b772b2");
  assert.equal(p.date, "2026-10-28");
  assert.ok(p.line.length > 0 && !p.line.includes("Nightly 2026"), p.line);
});
