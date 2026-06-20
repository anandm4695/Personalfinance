const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually
const envContent = fs.readFileSync('/Users/anandmohta/Anand Mac book/Personal/Personal Finance by Anand Mohta/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

// Simple calcXIRR translation from finance.ts for testing
const calcXIRR = (cashFlows) => {
  const flows = cashFlows
    .map((f) => {
      let d;
      if (f.date instanceof Date) {
        d = f.date;
      } else {
        const parts = String(f.date).split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          d = new Date(y, m, day);
        } else {
          d = new Date(f.date);
        }
      }
      return {
        date: d,
        amount: Number(f.amount),
      };
    })
    .filter((f) => !isNaN(f.date.getTime()) && f.amount !== 0);

  if (flows.length < 2) return null;

  flows.sort((a, b) => a.date.getTime() - b.date.getTime());

  let hasPos = false;
  let hasNeg = false;
  for (const f of flows) {
    if (f.amount > 0) hasPos = true;
    if (f.amount < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return null;

  const t0 = flows[0].date.getTime();
  const totalDays = (flows[flows.length - 1].date.getTime() - t0) / (24 * 3600 * 1000);
  if (totalDays <= 0) return null;

  const npv = (r) => {
    let sum = 0;
    for (const f of flows) {
      const t = (f.date.getTime() - t0) / (365 * 24 * 3600 * 1000);
      sum += f.amount / Math.pow(1 + r, t);
    }
    return sum;
  };

  const dNpv = (r) => {
    let sum = 0;
    for (const f of flows) {
      const t = (f.date.getTime() - t0) / (365 * 24 * 3600 * 1000);
      sum += -t * f.amount / Math.pow(1 + r, t + 1);
    }
    return sum;
  };

  let r = 0.1;
  const maxIter = 100;
  const tol = 1e-6;

  for (let i = 0; i < maxIter; i++) {
    const val = npv(r);
    const deriv = dNpv(r);
    if (Math.abs(deriv) < 1e-12) break;
    const nextR = r - val / deriv;
    if (Math.abs(nextR - r) < tol) {
      if (!isNaN(nextR) && isFinite(nextR) && nextR > -0.99) {
        return nextR * 100;
      }
    }
    r = nextR;
  }

  let low = -0.99;
  let high = 50.0;
  let mid = 0.0;
  let valLow = npv(low);
  let valHigh = npv(high);

  if (valLow * valHigh > 0) {
    for (let h = 50.0; h <= 1000.0; h *= 2) {
      const vh = npv(h);
      if (valLow * vh < 0) {
        high = h;
        valHigh = vh;
        break;
      }
    }
  }

  if (valLow * valHigh > 0) return null;

  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    const valMid = npv(mid);
    if (Math.abs(valMid) < tol || (high - low) / 2 < tol) {
      return mid * 100;
    }
    if (valLow * valMid > 0) {
      low = mid;
      valLow = valMid;
    } else {
      high = mid;
      valHigh = valMid;
    }
  }
  return mid * 100;
};

async function testDatabase(name, url, key) {
  console.log(`\n=================== Testing DB: ${name} ===================`);
  if (!url || !key) {
    console.log(`Skipping ${name} - missing credentials.`);
    return;
  }

  const supabase = createClient(url, key);

  console.log("Signing in with credentials...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: env.VITE_DEMO_USER_EMAIL,
    password: env.VITE_DEMO_USER_PASSWORD
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    console.log("Attempting queries anonymously / with existing session...");
  } else {
    console.log("Auth success! User ID:", authData.user.id);
  }

  console.log("Fetching mutual_funds...");
  const { data: mfs, error: mfError } = await supabase.from('mutual_funds').select('*');
  if (mfError) {
    console.error("Error fetching mutual_funds:", mfError);
    return;
  }
  console.log(`Found ${mfs.length} mutual fund records.`);
  if (mfs.length > 0) {
    console.log("RAW FIRST RECORD:", JSON.stringify(mfs[0], null, 2));
  }

  console.log("Fetching mf_sells...");
  const { data: sells, error: sellError } = await supabase.from('mf_sells').select('*');
  if (sellError) {
    console.error("Error fetching mf_sells:", sellError);
    return;
  }
  console.log(`Found ${sells.length} mf_sells records.`);
  if (sells.length > 0) {
    console.log("RAW FIRST SELL RECORD:", JSON.stringify(sells[0], null, 2));
  }

  // Let's run calculations like in MFSection
  console.log("\nRunning overall XIRR calculation...");
  const overallCashFlows = [];
  mfs.forEach((m) => {
    const units = Number(m.units) || 0;
    const currentNav = Number(m.current_nav) || 0;
    const invested = Number(m.invested) || (Number(m.buy_nav || 0) * units);
    if (units > 0 && m.buy_date) {
      overallCashFlows.push({ date: m.buy_date, amount: -invested });
      overallCashFlows.push({ date: today(), amount: units * currentNav });
    }
  });

  sells.forEach((s) => {
    const units = Number(s.units) || 0;
    const buyNav = Number(s.buy_nav) || 0;
    const sellNav = Number(s.sell_nav) || 0;
    const buyDate = s.buy_date;
    const sellDate = s.sell_date;
    if (units > 0 && sellDate) {
      if (buyDate) overallCashFlows.push({ date: buyDate, amount: -(units * buyNav) });
      overallCashFlows.push({ date: sellDate, amount: units * sellNav });
    }
  });

  console.log("Overall cash flows count:", overallCashFlows.length);
  try {
    const xirr = calcXIRR(overallCashFlows);
    console.log("Overall XIRR result:", xirr);
  } catch (e) {
    console.error("CRASH in overall XIRR calculation:", e);
  }

  // Scheme level calculations
  const folioGroups = {};
  mfs.forEach((m) => {
    const name = (m.name || m.scheme || "").trim();
    const folio = (m.folio_number || "").trim();
    const keyStr = `${name}|||${folio}`;
    if (!folioGroups[keyStr]) folioGroups[keyStr] = { fundName: name, folio, items: [] };
    folioGroups[keyStr].items.push(m);
  });

  console.log(`\nGrouped into ${Object.keys(folioGroups).length} scheme/folio groups.`);
  for (const [keyStr, grp] of Object.entries(folioGroups)) {
    console.log(`\nGroup: ${grp.fundName} (Folio: ${grp.folio})`);
    const groupItems = grp.items;
    const groupCashFlows = [];
    groupItems.forEach((m) => {
      const units = Number(m.units) || 0;
      const currentNavVal = Number(m.current_nav) || 0;
      const invested = Number(m.invested) || (Number(m.buy_nav || 0) * units);
      if (units > 0 && m.buy_date) {
        groupCashFlows.push({ date: m.buy_date, amount: -invested });
        groupCashFlows.push({ date: today(), amount: units * currentNavVal });
      }
    });

    const sellsForGroup = sells.filter((s) => (s.scheme || "").trim().toLowerCase() === grp.fundName.trim().toLowerCase());
    sellsForGroup.forEach((s) => {
      const units = Number(s.units) || 0;
      const buyNav = Number(s.buy_nav) || 0;
      const sellNav = Number(s.sell_nav) || 0;
      const buyDate = s.buy_date;
      const sellDate = s.sell_date;
      if (units > 0 && sellDate) {
        if (buyDate) groupCashFlows.push({ date: buyDate, amount: -(units * buyNav) });
        groupCashFlows.push({ date: sellDate, amount: units * sellNav });
      }
    });

    console.log(`Cash flows count for ${grp.fundName}:`, groupCashFlows.length);
    try {
      const xirr = calcXIRR(groupCashFlows);
      console.log(`XIRR result:`, xirr);
    } catch (e) {
      console.error(`CRASH in group XIRR calculation:`, e);
    }
  }
}

async function main() {
  await testDatabase("LIVE DB", env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  await testDatabase("DEMO DB", env.VITE_SUPABASE_DEMO_URL, env.VITE_SUPABASE_DEMO_ANON_KEY);
}

main();
