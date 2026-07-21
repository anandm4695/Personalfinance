import { chromium } from "playwright";
const DIR = "./scratch/gallery";
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function capture(baseUrl, prefix) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1800);
  const demoBtn = page.getByText("Explore Demo Mode");
  if (await demoBtn.count()) {
    await demoBtn.click();
    await page.waitForTimeout(2200);
  }
  await page.screenshot({ path: `${DIR}/${prefix}-01-dashboard.png` });

  // Settings > Appearance
  await page.locator('text="Settings" >> visible=true').last().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DIR}/${prefix}-02-settings.png` });

  // Banks & Transactions
  await page.locator('text="Banks & Transactions" >> visible=true').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DIR}/${prefix}-03-banks.png` });

  console.log(prefix, "errors:", JSON.stringify(errors));
  await page.close();
}

await capture("http://localhost:3001", "before");
await capture("http://localhost:3000", "after");
await browser.close();
