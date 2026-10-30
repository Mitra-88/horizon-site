import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./staff-stats.js";

test("CSV: a header row, quoted cells where needed, CRLF lines", () => {
  assert.equal(toCsv([{ a: "x", b: 'say "hi", twice' }, { a: "line\nbreak", b: null }]), 'a,b\r\nx,"say ""hi"", twice"\r\n"line\nbreak",\r\n');
  assert.equal(toCsv([]), "");
});

test("CSV: text a spreadsheet would run as a formula gets a leading quote", () => {
  assert.equal(toCsv([{ t: "=HYPERLINK(1)" }, { t: "+1" }, { t: "-2" }, { t: "@cmd" }, { t: "fine" }]), "t\r\n'=HYPERLINK(1)\r\n'+1\r\n'-2\r\n'@cmd\r\nfine\r\n");
});
