const { chromium } = require("playwright");

(async () => {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  try {
    const url = "http://localhost:3000/";
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const demoBtn = page.locator("text=Explore Demo Mode");
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    const aiTab = page.locator(".nav-item:has-text('AI Advisor')").first();
    if (await aiTab.count() > 0) {
      await aiTab.click();
      await page.waitForTimeout(1500);

      // Check if unlock card is there
      const hasUnlock = await page.locator("text=Unlock AI Financial Advice").count() > 0;
      if (hasUnlock) {
        console.log("Clicking Unlock / entering dummy API key...");
        // Click Settings, enter key
        const settingsTab = page.locator(".nav-item:has-text('Settings')").first();
        if (await settingsTab.count() === 0) {
          console.log("Settings nav-item not found by class, trying general text...");
          await page.locator("text=Settings").first().click();
        } else {
          await settingsTab.click();
        }
        await page.waitForTimeout(1500);

        const aiSubTab = page.locator("button.demat-portfolio-pill:has-text('AI Advisor')").first();
        await aiSubTab.click();
        await page.waitForTimeout(1000);

        const apiKeyInput = page.locator("input[placeholder*='AIzaSy']").first();
        await apiKeyInput.fill("DUMMY_KEY_FOR_TESTING");
        await page.waitForTimeout(500);

        // Save
        const saveBtn = page.locator("text=Save");
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await page.waitForTimeout(1000);
        }

        // Return to AI Advisor
        await page.locator(".nav-item:has-text('AI Advisor')").first().click();
        await page.waitForTimeout(1500);
      }

      // Let's send a few long messages to populate the chat area
      const textarea = page.locator("textarea[placeholder*='Ask about']").first();
      if (await textarea.count() > 0) {
        console.log("Typing a message to check scroll...");
        await textarea.fill("Please tell me how to save more money. " + "Explain in detail. ".repeat(15));
        await page.waitForTimeout(500);
        const sendBtn = page.locator("textarea[placeholder*='Ask about'] ~ button").first();
        await sendBtn.click();
        await page.waitForTimeout(2000);
      }

      // Check scroll heights of document vs container
      const heights = await page.evaluate(() => {
        const docScrollHeight = document.documentElement.scrollHeight;
        const docClientHeight = document.documentElement.clientHeight;
        const main = document.querySelector("main");
        const card = document.querySelector(".spotlight-wrapper");
        const content = document.querySelector(".spotlight-content");
        
        return {
          windowHeight: window.innerHeight,
          docScrollHeight,
          docClientHeight,
          isBodyScrollable: docScrollHeight > docClientHeight,
          main: main ? {
            clientHeight: main.clientHeight,
            scrollHeight: main.scrollHeight,
          } : null,
          card: card ? {
            clientHeight: card.clientHeight,
            scrollHeight: card.scrollHeight,
          } : null,
          content: content ? {
            clientHeight: content.clientHeight,
            scrollHeight: content.scrollHeight,
          } : null,
        };
      });

      console.log("Scroll Heights:", JSON.stringify(heights, null, 2));
    }
  } catch (err) {
    console.error("Error testing scroll heights:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
