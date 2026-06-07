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

const supabaseUrl = env.VITE_SUPABASE_DEMO_URL;
const supabaseKey = env.VITE_SUPABASE_DEMO_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase Demo credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // We need to sign in as the user test@personalfinance.com to query the data if RLS is enabled.
    console.log("Signing in to demo database...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: env.VITE_DEMO_USER_EMAIL,
      password: env.VITE_DEMO_USER_PASSWORD
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      console.log("Proceeding with anonymous client...");
    } else {
      console.log("Auth success! User ID:", authData.user.id);
    }

    console.log("Fetching investment plans from Supabase Demo...");
    const { data: investmentPlans, error: ipError } = await supabase
      .from('investment_plans')
      .select('*');
      
    if (ipError) {
      console.error("Error fetching investment plans:", ipError);
    } else {
      console.log("INVESTMENT PLANS:\n", JSON.stringify(investmentPlans, null, 2));
    }

    console.log("Fetching term plans from Supabase Demo...");
    const { data: termPlans, error: tpError } = await supabase
      .from('term_plans')
      .select('*');
      
    if (tpError) {
      console.error("Error fetching term plans:", tpError);
    } else {
      console.log("TERM PLANS:\n", JSON.stringify(termPlans, null, 2));
    }

    console.log("Fetching LIC policies from Supabase Demo...");
    const { data: licPolicies, error: licError } = await supabase
      .from('lic_policies')
      .select('*');
      
    if (licError) {
      console.error("Error fetching LIC policies:", licError);
    } else {
      console.log("LIC POLICIES:\n", JSON.stringify(licPolicies, null, 2));
    }

  } catch (e) {
    console.error("Error:", e);
  }
}

main();
