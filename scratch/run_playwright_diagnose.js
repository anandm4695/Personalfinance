const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    console.log(`[BROWSER CONSOLE] ${type}: ${text}`);
  });

  page.on("pageerror", (err) => {
    const errorText = err.stack || err.message;
    pageErrors.push(errorText);
    console.error(`[BROWSER ERROR] ${errorText}`);
  });

  try {
    const url = "http://localhost:3000/";
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const demoBtn = page.locator("text=Explore Demo Mode");
    if (await demoBtn.count() > 0) {
      console.log("Clicking 'Explore Demo Mode' button...");
      await demoBtn.click();
      await page.waitForTimeout(3000);
    } else {
      console.log("Explore Demo Mode button not found!");
      const bodyText = await page.innerText("body");
      console.log("Body text on start:", bodyText.substring(0, 500));
    }

    // Now, let's find all sidebar/navigation items.
    // Let's inspect the DOM elements that have text or class related to nav.
    console.log("Finding navigation elements...");
    const navItems = await page.evaluate(() => {
      // Find all elements that look like nav items/buttons in the sidebar
      // Usually they might be buttons, divs or anchors.
      const elements = Array.from(document.querySelectorAll("button, a, .nav-item, [role='tab']"));
      return elements.map(el => ({
        text: el.innerText ? el.innerText.trim() : "",
        tagName: el.tagName,
        className: el.className,
        id: el.id
      })).filter(el => el.text.length > 0 && el.text.length < 50);
    });

    console.log(`Found ${navItems.length} potential clickable elements:`);
    console.log(JSON.stringify(navItems, null, 2));

    // Let's filter to distinct sidebar/menu tabs.
    // Typically, sidebar links/buttons have text like "Dashboard", "Investments", "Demat", "Credit & Loans", "Tax", etc.
    const tabsToTest = [
      "Net Worth",
      "Investments",
      "Demat",
      "Credit & Loans",
      "Tax Planning",
      "Budget Control",
      "Financial Goals",
      "SIP Tracker",
      "Rental Details",
      "Calculators",
      "AI Advisor",
      "Fixed Income",
      "Insurance",
      "Real Estate",
      "Vehicles",
      "Cash Flow",
      "Financial Calendar",
      "Nominee Tracker",
      "Document Vault",
      "Settings"
    ];

    for (const tabName of tabsToTest) {
      console.log(`\n--- Testing Tab: ${tabName} ---`);
      // Try to find the tab by exact or prefix text and click it
      const tabLocator = page.locator(`text=${tabName}`).first();
      if (await tabLocator.count() > 0) {
        console.log(`Clicking tab '${tabName}'...`);
        try {
          await tabLocator.click({ timeout: 5000 });
          await page.waitForTimeout(1500);
          console.log(`Successfully clicked '${tabName}'`);
          
          // Take a screenshot of the tab
          const screenshotName = `tab_${tabName.replace(/\s+/g, "_").toLowerCase()}.png`;
          const screenshotPath = path.join(__dirname, `../artifacts/${screenshotName}`);
          // Ensure directory exists
          fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
          await page.screenshot({ path: screenshotPath });
          console.log(`Saved screenshot to ${screenshotPath}`);
        } catch (clickErr) {
          console.error(`Error clicking or waiting for '${tabName}': ${clickErr.message}`);
        }
      } else {
        console.log(`Tab '${tabName}' not found on the page.`);
      }
    }

  } catch (err) {
    console.error("Test process failed:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
    
    // Save summary of errors
    const results = {
      consoleLogsCount: consoleLogs.length,
      pageErrorsCount: pageErrors.length,
      pageErrors
    };
    fs.writeFileSync(
      path.join(__dirname, "diagnose_results.json"),
      JSON.stringify(results, null, 2)
    );
    console.log("Diagnostic results saved to diagnose_results.json");
  }
})();
