const { chromium } = require("playwright");

(async () => {
  console.log("Launching browser with desktop viewport...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Listen to console messages
  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Listen to page errors
  page.on("pageerror", (err) => {
    console.error(`[BROWSER EXCEPTION] ${err.stack || err.message}`);
  });

  try {
    const url = "http://localhost:3001/";
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    
    const demoBtn = page.locator("text=Explore Demo Mode →");
    if (await demoBtn.count() > 0) {
      console.log("Clicking 'Explore Demo Mode →' button...");
      await demoBtn.click();
      await page.waitForTimeout(2000); // Wait for dashboard to load
    } else {
      console.log("Explore Demo Mode button not found!");
    }

    // Locate the "Fixed Income" tab in sidebar
    const fixedIncomeTab = page.locator("text=Fixed Income");
    if (await fixedIncomeTab.count() > 0) {
      console.log("Clicking 'Fixed Income' tab...");
      await fixedIncomeTab.click();
      await page.waitForTimeout(2000);

      // Now click on "Mutual Funds" subtab
      const mfSubTab = page.locator("text=Mutual Funds").first();
      if (await mfSubTab.count() > 0) {
        console.log("Clicking 'Mutual Funds' sub-tab...");
        await mfSubTab.click();
        await page.waitForTimeout(4000);
        
        console.log("Checking page contents...");
        const finalBodyText = await page.innerText("body");
        console.log("--- Page text after Mutual Funds click ---");
        console.log(finalBodyText.slice(0, 1000));
        console.log("------------------------------------------");
      } else {
        console.log("Mutual Funds sub-tab not found!");
      }
    } else {
      console.log("Fixed Income tab not found in sidebar!");
    }
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
