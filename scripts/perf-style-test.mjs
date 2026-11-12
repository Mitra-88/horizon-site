import assert from "node:assert/strict";

export async function checkPerfStyles(base) {
  const page = await fetch(new URL("/perf", base));
  assert.equal(page.status, 200);
  const html = await page.text();
  const main = /<main\b[^>]*\bclass="([^"]+)"/.exec(html);
  assert.ok(main, "The profiler must render its CSS module class on main");
  const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
  assert.ok(links.length > 0, "The profiler must link a stylesheet");
  const sheets = await Promise.all(links.map(async ([, href]) => {
    const response = await fetch(new URL(href.replaceAll("&amp;", "&"), base));
    assert.equal(response.status, 200, href);
    assert.match(response.headers.get("content-type") ?? "", /text\/css/);
    return response.text();
  }));
  const css = sheets.join("\n");
  assert.ok(main[1].split(/\s+/).some((name) => css.includes(`.${name}`)), "The delivered CSS must style the class main actually uses");
  console.log("PASS: profiler CSS module classes match the delivered production stylesheet.");
}

if (process.argv[1]?.endsWith("perf-style-test.mjs")) {
  await checkPerfStyles(process.argv[2] ?? "http://localhost:3000");
}
