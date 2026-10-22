// og.mjs — render the link-preview cards (WhatsApp, Facebook) from tools/og.html.
// usage: node tools/og.mjs [base=http://localhost:8137]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8137';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [v, out] of [['parents', 'assets/img/og-parents.jpg'], ['kid', 'assets/img/og-kid.jpg']]) {
  await page.goto(`${BASE}/tools/og.html?v=${v}`);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  console.log('wrote', out);
}
await browser.close();
