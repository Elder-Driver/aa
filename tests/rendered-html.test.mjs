import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the finished AA product replaces the starter", async () => {
  const [page, bookPage, adminPage, adminApp, layout, app, css, manifest, viteConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/b/[invite]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/aa-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<AAApp \/>/);
  assert.match(bookPage, /<AAApp \/>/);
  assert.match(adminPage, /<AdminApp \/>/);
  assert.match(adminApp, /\/api\/admin\/books/);
  assert.match(layout, /title: "AA"/);
  assert.match(app, /appName: "AA"/);
  assert.match(app, /brandText: "\.aaa\.codes"/);
  assert.match(app, /BrandMark/);
  assert.match(app, /\/b\/\$\{encodeURIComponent\(invite\)\}/);
  assert.match(app, /const \[currency, setCurrency\] = useState\("USD"\)/);
  assert.match(app, /language: "English"/);
  assert.match(viteConfig, /ADMIN_KEY/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(manifest, /"name": "AA"/);
  assert.doesNotMatch(`${page}${layout}${app}`, /codex-preview|react-loading-skeleton|Your site is taking shape|summary_large_image|og\.png/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
