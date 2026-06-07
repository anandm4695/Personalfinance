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

      console.log("Navigating to local site...");
      await send('Page.navigate', { url: 'http://localhost:3000/' });

      console.log("Waiting for page load...");
      await new Promise(r => setTimeout(r, 6000));

      console.log("Logging in via Explore Demo Mode button...");
      const loginResult = await send('Runtime.evaluate', {
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
      console.log("Login action result:", loginResult.result.value);

      console.log("Waiting for dashboard to load...");
      await new Promise(r => setTimeout(r, 7000));

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

      console.log("Inspecting Insurance layout details...");
      const details = await send('Runtime.evaluate', {
        expression: `(() => {
          const planTitle = document.querySelector('div'); // dummy
          const cardCount = document.querySelectorAll('.spotlight-wrapper').length;
          const cardsText = Array.from(document.querySelectorAll('.spotlight-wrapper')).map(c => c.textContent.substring(0, 80));
          return { cardCount, cardsText };
        })()`,
        returnByValue: true
      });
      console.log("Inspected details:", JSON.stringify(details.result.value, null, 2));

      console.log("Capturing local screenshot...");
      const screenshotResult = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true
      });

      const buffer = Buffer.from(screenshotResult.data, 'base64');
      const outputPath = '/Users/anandmohta/.gemini/antigravity-ide/brain/e0d3663e-d7f1-4849-8183-c665c376848f/local_demo_dashboard_check.png';
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
