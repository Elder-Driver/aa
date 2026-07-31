import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the finished SplitPack product replaces the starter", async () => {
  const [page, layout, app, css, manifest] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/aa-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<AAApp \/>/);
  assert.match(layout, /分账搭子 SplitPack/);
  assert.match(app, /SplitPack/);
  assert.match(app, /const \[currency, setCurrency\] = useState\("USD"\)/);
  assert.match(app, /language: "English"/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(manifest, /分账搭子 SplitPack/);
  assert.doesNotMatch(`${page}${layout}${app}`, /codex-preview|react-loading-skeleton|Your site is taking shape|summary_large_image|og\.png/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
