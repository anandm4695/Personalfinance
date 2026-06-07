const fs = require('fs');
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  console.log("Fetching targets from Chrome...");
  let targets;
  try {
    targets = await get('http://127.0.0.1:9222/json/list');
  } catch (e) {
    console.error("Failed to connect to Chrome remote debugging on port 9222.");
    process.exit(1);
  }

  const target = targets.find(t => t.type === 'page');
  if (!target) {
    console.error("No active page target found.");
    process.exit(1);
  }

  console.log(`Connecting to page: ${target.title} via WS...`);
  const wsUrl = target.webSocketDebuggerUrl;
  const socket = new WebSocket(wsUrl);

  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const payload = JSON.stringify({ id: msgId, method, params });
      pending.set(msgId, { resolve, reject });
      socket.send(payload);
    });
  }

  socket.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.id && pending.has(response.id)) {
      const { resolve, reject } = pending.get(response.id);
      pending.delete(response.id);
      if (response.error) {
        reject(response.error);
      } else {
        resolve(response.result);
      }
    }
  };

  socket.onopen = async () => {
    try {
      console.log("Enabling domains...");
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Network.enable');

      console.log("Navigating to production site...");
      await send('Page.navigate', { url: 'https://personal-finance-by-anand-mohta.vercel.app/' });

      console.log("Waiting for page load...");
      await new Promise(r => setTimeout(r, 6000));

      console.log("Clicking Explore Demo Mode button on production...");
      const demoResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const demoBtn = document.querySelector('button.af-demo-btn');
          if (demoBtn) {
            demoBtn.click();
            return 'clicked_explore_demo';
          }
          return 'no_demo_button';
        })()`,
        returnByValue: true
      });
      console.log("Demo click result:", demoResult.result.value);

      console.log("Waiting for database load and redirection...");
      await new Promise(r => setTimeout(r, 8000));

      console.log("Clicking Insurance tab in sidebar...");
      const navResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const navItems = Array.from(document.querySelectorAll('.nav-item'));
          const insItem = navItems.find(item => item.textContent && item.textContent.includes('Insurance'));
          if (insItem) {
            insItem.click();
            return 'clicked_nav_item_insurance';
          }
          return 'not_found';
        })()`,
        returnByValue: true
      });
      console.log("Navigation result:", navResult.result.value);

      console.log("Waiting for tab render...");
      await new Promise(r => setTimeout(r, 6000));

      console.log("Checking Kotak Card styles and children spacing...");
      const styleDetails = await send('Runtime.evaluate', {
        expression: `(() => {
          const cards = Array.from(document.querySelectorAll('.spotlight-wrapper'));
          const targetCard = cards.find(c => c.textContent && c.textContent.includes('Kotak Guaranteed Benefits Plan'));
          if (!targetCard) {
            // Let's dump all cards present to see if we logged in
            return 'card_not_found. All text contents: ' + cards.map(c => c.textContent.substring(0, 100)).join(' | ');
          }

          const contentDiv = targetCard.querySelector('.spotlight-content');
          if (!contentDiv) return 'content_div_not_found';

          const computedStyle = window.getComputedStyle(contentDiv);
          const outerComputedStyle = window.getComputedStyle(targetCard);

          // Get children layout
          const children = Array.from(contentDiv.children).map((child, i) => {
            const childStyle = window.getComputedStyle(child);
            const rect = child.getBoundingClientRect();
            return {
              index: i,
              tagName: child.tagName,
              className: child.className,
              display: childStyle.display,
              marginTop: childStyle.marginTop,
              marginBottom: childStyle.marginBottom,
              height: rect.height,
              top: rect.top,
              bottom: rect.bottom
            };
          });

          return {
            outerStyle: {
              display: outerComputedStyle.display,
              padding: outerComputedStyle.padding,
              borderTop: outerComputedStyle.borderTop
            },
            innerStyle: {
              display: computedStyle.display,
              flexDirection: computedStyle.flexDirection,
              gap: computedStyle.gap,
              height: computedStyle.height,
              width: computedStyle.width
            },
            children
          };
        })()`,
        returnByValue: true
      });

      console.log("STYLE DETAILS:\n", JSON.stringify(styleDetails.result.value, null, 2));

      console.log("Capturing live production screenshot...");
      const screenshotResult = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true
      });

      const buffer = Buffer.from(screenshotResult.data, 'base64');
      const outputPath = '/Users/anandmohta/.gemini/antigravity-ide/brain/e0d3663e-d7f1-4849-8183-c665c376848f/production_live_check.png';
      fs.writeFileSync(outputPath, buffer);
      console.log(`Screenshot saved successfully to ${outputPath}`);

    } catch (e) {
      console.error("Error:", e);
    } finally {
      socket.close();
      process.exit(0);
    }
  };
}

main();
