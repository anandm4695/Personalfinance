const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const liveUrl = 'https://personal-finance-by-anand-mohta.vercel.app/';
    console.log(`Fetching index.html from ${liveUrl}...`);
    const html = await fetchUrl(liveUrl);
    
    // Find JS script assets (Vite compiled builds are usually in /assets/index-*.js)
    const matches = html.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/g) || [];
    console.log("Found JS bundle paths:", matches);
    
    if (matches.length === 0) {
      console.log("No compiled assets found. Trying to parse scripts in HTML...");
      const inlineScripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
      console.log(`Found ${inlineScripts.length} inline scripts.`);
      return;
    }
    
    const jsUrl = liveUrl + matches[0].substring(1);
    console.log(`Fetching JS bundle from ${jsUrl}...`);
    const jsContent = await fetchUrl(jsUrl);
    
    // Check if the bugfix string is present in the JS bundle
    const hasAddMonthsClamped = jsContent.includes('addMonthsClamped');
    console.log("\n--- AUDIT RESULTS ---");
    console.log("Contains 'addMonthsClamped' (XIRR/RD fix):", hasAddMonthsClamped);
    console.log("Contains 'rentedProperties' (AI Advisor fix):", jsContent.includes('rentedProperties'));
    console.log("Contains 'unrecognized \"index\" funds' (Portfolio Overlap fix):", jsContent.includes('unrecognized "index" funds'));
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
