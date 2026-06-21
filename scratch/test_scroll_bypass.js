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
    const url = "http://localhost:3001/";
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const demoBtn = page.locator("text=Explore Demo Mode →");
    if (await demoBtn.count() > 0) {
      console.log("Clicking Explore Demo Mode...");
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log("Locating and clicking AI Advisor tab...");
    const aiTab = page.locator("text=AI Advisor").first();
    await aiTab.click();
    await page.waitForTimeout(2000);

    // Verify if chat is rendered.
    const isChatRendered = await page.locator("text=Gemini Advisor").count() > 0;
    console.log("Is Chat Rendered:", isChatRendered);

    console.log("Typing a very long message in input area...");
    const textarea = page.locator("textarea[placeholder*='Ask about']").first();
    await textarea.fill("This is a very long text to test the layout. ".repeat(30));
    await page.waitForTimeout(1000);

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

      return {
        viewportHeight: window.innerHeight,
        body: {
          clientHeight: document.documentElement.clientHeight,
          scrollHeight: document.documentElement.scrollHeight,
        },
        main: getDetails("main"),
        tabContainer: getDetails(".tab-content-enter"),
        card: getDetails(".spotlight-wrapper"),
        cardContent: getDetails(".spotlight-content"),
        chatInner: getDetails(".spotlight-content > div"),
        messages: getDetails(".spotlight-content > div > div:nth-child(2)"),
        inputArea: getDetails(".spotlight-content > div > div:nth-child(3)")
      };
    });

    console.log("Layout details:", JSON.stringify(layout, null, 2));

    const screenshotPath = path.join(__dirname, "../artifacts/ai_scrolling_fixed.png");
    console.log(`Saving screenshot to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

  } catch (err) {
    console.error("Execution failed:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
