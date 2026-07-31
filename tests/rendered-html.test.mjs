import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the finished 一起AA product replaces the starter", async () => {
  const [page, layout, app, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/aa-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<AAApp \/>/);
  assert.match(layout, /一起AA｜旅行分账，轻松算清/);
  assert.match(app, /旅途尽兴/);
  assert.match(app, /创建旅行账本/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.doesNotMatch(`${page}${layout}${app}`, /codex-preview|react-loading-skeleton|Your site is taking shape/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
