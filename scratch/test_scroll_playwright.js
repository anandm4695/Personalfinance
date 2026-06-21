const { chromium } = require("playwright");
const path = require("path");

(async () => {
  console.log("Launching Chromium headless...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[BROWSER ERROR] ${err.stack || err.message}`));

  try {
    const url = "https://personalfinancedemo.vercel.app";
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const demoBtn = page.locator("text=Explore Demo Mode →");
    if (await demoBtn.count() > 0) {
      console.log("Clicking Explore Demo Mode...");
      await demoBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log("Locating and clicking AI Advisor tab...");
    const aiTab = page.locator("text=AI Advisor").first();
    await aiTab.click();
    await page.waitForTimeout(2000);

    // Wait for the AI Advisor container to render.
    // If API key is not present, we will see "Unlock AI Financial Advice" card.
    // Let's check if the API key screen is shown.
    const hasUnlockCard = await page.locator("text=Unlock AI Financial Advice").count() > 0;
    if (hasUnlockCard) {
      console.log("API Key screen is shown. We need to set the Gemini API key first.");
      // Let's go to Settings to set the API Key!
      console.log("Clicking Settings tab...");
      const settingsTab = page.locator("text=Settings").first();
      await settingsTab.click();
      await page.waitForTimeout(1500);

      console.log("Clicking AI Advisor sub-tab in Settings...");
      const aiSubTab = page.locator("button:has-text('AI Advisor')").first();
      await aiSubTab.click();
      await page.waitForTimeout(1500);

      console.log("Entering Gemini API Key...");
      const apiKeyInput = page.locator("input[placeholder*='AIzaSy']").first();
      await apiKeyInput.fill("TEST_DUMMY_KEY");
      await page.waitForTimeout(1000);

      // Save if needed, or if it auto-saves. Let's see if there is a save button.
      const saveBtn = page.locator("text=Save");
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }

      console.log("Re-clicking AI Advisor tab...");
      await aiTab.click();
      await page.waitForTimeout(2000);
    }

    // Now check if we are in chat interface.
    const isChatRendered = await page.locator("text=Gemini Advisor").count() > 0;
    console.log("Is Chat Rendered:", isChatRendered);

    // Let's simulate typing a long message or clicking a suggestion.
    // Let's click the first suggestion "How can I improve my savings rate?"
    const suggestion = page.locator("text=How can I improve my savings rate?").first();
    if (await suggestion.count() > 0) {
      console.log("Clicking suggestion...");
      await suggestion.click();
      // Since it's a dummy key, it might show API key error, but we want to see the layout when error or messages are rendered.
      await page.waitForTimeout(5000);
    } else {
      console.log("Suggestion not found. Let's type a message.");
      const textarea = page.locator("textarea[placeholder*='Ask about']").first();
      await textarea.fill("This is a very long text to test the layout. ".repeat(20));
      const sendBtn = page.locator("button:has(svg)").last();
      await sendBtn.click();
      await page.waitForTimeout(5000);
    }

    // Let's capture layout details of elements
    const layout = await page.evaluate(() => {
      const getDetails = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          selector,
          className: el.className,
          style: el.getAttribute("style"),
          rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          offsetHeight: el.offsetHeight,
          overflowY: window.getComputedStyle(el).overflowY
        };
      };

      // Let's check: main tag, AIAssistantTab container, Card container, messages div, document body.
      return {
        body: {
          clientHeight: document.documentElement.clientHeight,
          scrollHeight: document.documentElement.scrollHeight,
        },
        main: getDetails("main"),
        tabContainer: getDetails(".tab-content-enter"),
        card: getDetails(".spotlight-wrapper"),
        cardContent: getDetails(".spotlight-content"),
        chatInner: getDetails(".spotlight-content > div"),
        messages: getDetails(".spotlight-content > div > div:nth-child(2)") // Let's check messages selector
      };
    });

    console.log("Layout details:", JSON.stringify(layout, null, 2));

    const screenshotPath = path.join(__dirname, "../artifacts/ai_scrolling_issue.png");
    console.log(`Saving screenshot to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
