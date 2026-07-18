const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    console.error(`[BROWSER EXCEPTION] ${err.stack || err.message}`);
  });

  try {
    const url = "http://localhost:3000/";
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Clicks "Explore Demo Mode"
    const demoBtn = page.locator("text=Explore Demo Mode");
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // Go to "Investments Portfolio"
    const invTab = page.locator("text=Investments Portfolio").first();
    if (await invTab.count() > 0) {
      console.log("Clicking Investments Portfolio tab...");
      await invTab.click();
      await page.waitForTimeout(1000);
      
      // Click Mutual Funds sub-tab
      const mfSubTab = page.locator("text=Mutual Funds").first();
      if (await mfSubTab.count() > 0) {
        console.log("Clicking Mutual Funds sub-tab...");
        await mfSubTab.click();
        await page.waitForTimeout(2000);

        // Click Insights tab
        const insightsPill = page.locator("text=Insights").first();
        if (await insightsPill.count() > 0) {
          console.log("Clicking Insights...");
          await insightsPill.click();
          await page.waitForTimeout(2500);
          await page.screenshot({ path: path.join(__dirname, "../artifacts/mf_insights.png") });
          console.log("Saved mf_insights.png");
        }
      }
    }

    // Let's navigate to "AI Advisor"
    const aiTab = page.locator("text=AI Advisor").first();
    if (await aiTab.count() > 0) {
      console.log("Clicking AI Advisor tab...");
      await aiTab.click();
      await page.waitForTimeout(2000);

      // Check if Gemini Advisor is rendered (meaning API key is preconfigured in local storage or db)
      const hasUnlock = await page.locator("text=Unlock AI Financial Advice").count() > 0;
      console.log("Has Unlock AI Advisor Card:", hasUnlock);
      await page.screenshot({ path: path.join(__dirname, "../artifacts/ai_advisor_tab.png") });
      console.log("Saved ai_advisor_tab.png");
    }

    // Check "Insurance" under "Life Planning"
    // Life Planning is a collapsible menu or dropdown. Let's find it.
    const lifePlanning = page.locator("text=Life Planning").first();
    if (await lifePlanning.count() > 0) {
      console.log("Clicking Life Planning group...");
      await lifePlanning.click();
      await page.waitForTimeout(1000);

      const insSubTab = page.locator("text=Insurance").first();
      if (await insSubTab.count() > 0) {
        console.log("Clicking Insurance sub-tab...");
        await insSubTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(__dirname, "../artifacts/insurance_tab.png") });
        console.log("Saved insurance_tab.png");
      }
    }

  } catch (err) {
    console.error("UI diagnosis error:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
