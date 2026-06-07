const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const mainPage = await fetchUrl('https://personal-finance-by-anand-mohta.vercel.app/');
    const html = mainPage.data;
    
    // Find any js links
    const matches = html.match(/\/assets\/[a-zA-Z0-9_-]+\.js/g);
    if (!matches) {
      // Maybe script tag is different? Let's check for any script src.
      const srcMatches = html.match(/src="([^"]+)"/g);
      console.log("All script srcs found in HTML:", srcMatches);
      process.exit(1);
    }
    
    console.log("Found JS asset URLs:", matches);
    
    for (const urlPath of matches) {
      const jsUrl = 'https://personal-finance-by-anand-mohta.vercel.app' + urlPath;
      console.log("Fetching JS bundle:", jsUrl);
      const jsResult = await fetchUrl(jsUrl);
      const jsCode = jsResult.data;
      
      const hasSpotlightContent = jsCode.includes('spotlight-content');
      console.log(`- file ${urlPath} contains 'spotlight-content':`, hasSpotlightContent);
      
      if (hasSpotlightContent) {
        const hasGridGap = jsCode.includes('gridGap');
        const hasFlexWrap = jsCode.includes('flexWrap');
        console.log(`- contains 'gridGap':`, hasGridGap);
        console.log(`- contains 'flexWrap':`, hasFlexWrap);
        
        const index = jsCode.indexOf('spotlight-content');
        const start = Math.max(0, index - 200);
        const end = Math.min(jsCode.length, index + 300);
        console.log("\nJS Snippet:\n", jsCode.substring(start, end));
        break;
      }
    }
    
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
