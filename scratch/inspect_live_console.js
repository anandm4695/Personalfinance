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

  console.log(`Connecting to page via WS...`);
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
    
    // Capture console API calls
    if (response.method === 'Runtime.consoleAPICalled') {
      const args = response.params.args.map(a => a.value || a.description).join(' ');
      console.log(`[Browser Console ${response.params.type}]:`, args);
    }
    
    // Capture exception thrown
    if (response.method === 'Runtime.exceptionThrown') {
      console.log(`[Browser Exception]:`, response.params.exceptionDetails.text, response.params.exceptionDetails.exception.description);
    }

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
      
      // Listen to console API calls
      // The Runtime domain must be enabled, which we just did
      
      console.log("Navigating to production site...");
      await send('Page.navigate', { url: 'https://personal-finance-by-anand-mohta.vercel.app/' });

      console.log("Waiting for page load...");
      await new Promise(r => setTimeout(r, 6000));

      console.log("Clicking Explore Demo Mode...");
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('button.af-demo-btn');
          if (btn) {
            btn.click();
            return 'clicked_demo';
          }
          return 'no_demo_btn';
        })()`,
        returnByValue: true
      });

      console.log("Waiting for network requests to execute...");
      await new Promise(r => setTimeout(r, 10000));

      console.log("Taking screenshot...");
      const screenshotResult = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true
      });

      const buffer = Buffer.from(screenshotResult.data, 'base64');
      fs.writeFileSync('/Users/anandmohta/.gemini/antigravity-ide/brain/e0d3663e-d7f1-4849-8183-c665c376848f/inspect_live_console.png', buffer);
      console.log("Finished.");

    } catch (e) {
      console.error("Error:", e);
    } finally {
      socket.close();
      process.exit(0);
    }
  };
}

main();
