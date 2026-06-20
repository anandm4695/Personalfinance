const https = require("https");

const getUrl = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => resolve(data));
  }).on("error", reject);
});

(async () => {
  try {
    const html = await getUrl("https://personal-finance-by-anand-mohta.vercel.app/");
    console.log("HTML length:", html.length);
    
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!match) {
      console.log("No index script tag found in HTML.");
      return;
    }
    
    const jsUrl = "https://personal-finance-by-anand-mohta.vercel.app" + match[1];
    console.log(`Downloading JS bundle from: ${jsUrl}...`);
    
    const js = await getUrl(jsUrl);
    console.log(`JS bundle downloaded (length: ${js.length} bytes).`);
    
    const hasCalcXIRR = js.includes("calcXIRR");
    const hasUseMemo = js.includes("useMemo");
    
    console.log("-----------------------------------------");
    console.log("Deployment contains 'calcXIRR':", hasCalcXIRR);
    console.log("Deployment contains 'useMemo':", hasUseMemo);
    console.log("-----------------------------------------");
  } catch (err) {
    console.error("Failed to check live deployment:", err);
  }
})();
