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
  let targets;
  try {
    targets = await get('http://127.0.0.1:9222/json/list');
  } catch (e) {
    console.error("Failed to connect to Chrome.");
    process.exit(1);
  }

  const target = targets.find(t => t.type === 'page');
  if (!target) {
    process.exit(1);
  }

  const socket = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      socket.send(JSON.stringify({ id: msgId, method, params }));
      pending.set(msgId, { resolve, reject });
    });
  }

  socket.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.id && pending.has(response.id)) {
      const { resolve, reject } = pending.get(response.id);
      pending.delete(response.id);
      if (response.error) reject(response.error);
      else resolve(response.result);
    }
  };

  socket.onopen = async () => {
    try {
      await send('Runtime.enable');
      const evalResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const cards = Array.from(document.querySelectorAll('.spotlight-wrapper'));
          const targetCard = cards.find(c => c.textContent && c.textContent.includes('Max Life Smart Wealth Plan'));
          if (!targetCard) return 'card_not_found';
          
          const contentDiv = targetCard.querySelector('.spotlight-content');
          if (!contentDiv) return 'content_div_not_found';

          const contentStyle = window.getComputedStyle(contentDiv);
          const children = Array.from(contentDiv.children);
          
          return {
            contentComputed: {
              display: contentStyle.display,
              flexDirection: contentStyle.flexDirection,
              gap: contentStyle.gap,
              rowGap: contentStyle.rowGap,
              columnGap: contentStyle.columnGap,
              height: contentStyle.height,
              padding: contentStyle.padding
            },
            childrenComputed: children.map(c => {
              const s = window.getComputedStyle(c);
              return {
                tag: c.tagName,
                text: c.textContent.substring(0, 30),
                display: s.display,
                position: s.position,
                margin: s.margin,
                padding: s.padding,
                height: s.height
              };
            })
          };
        })()`,
        returnByValue: true
      });
      console.log("COMPUTED STYLES:", JSON.stringify(evalResult.result.value, null, 2));
    } catch (e) {
      console.error(e);
    } finally {
      socket.close();
      process.exit(0);
    }
  };
}

main();
