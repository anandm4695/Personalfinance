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
    console.log("Signing in as demo user...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: env.VITE_DEMO_USER_EMAIL,
      password: env.VITE_DEMO_USER_PASSWORD
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      process.exit(1);
    }
    const userId = authData.user.id;
    console.log("Auth success! User ID:", userId);

    const tables = [
      "bank_accounts",
      "transactions",
      "mutual_funds",
      "stocks",
      "fixed_deposits",
      "recurring_deposits",
      "bonds",
      "ppf_nps",
      "credit_cards",
      "loans",
      "goals",
      "budgets",
      "subscriptions",
      "reminders",
      "rental_properties",
      "income_entries",
      "lic_policies",
      "investment_plans",
      "prepaid_cards",
      "informal_loans",
      "real_estate_properties",
      "real_estate_demands",
      "real_estate_payments",
      "vehicles",
      "gold_holdings",
      "govt_schemes"
    ];

    const dump = {};
    for (const table of tables) {
      console.log(`Fetching table: ${table}...`);
      const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
      } else {
        dump[table] = data;
      }
    }

    fs.writeFileSync('/Users/anandmohta/Anand Mac book/Personal/Personal Finance by Anand Mohta/scratch/demo_data_dump.json', JSON.stringify(dump, null, 2));
    console.log("Successfully wrote dump to scratch/demo_data_dump.json");

  } catch (e) {
    console.error("Fatal error:", e);
  }
}

main();
