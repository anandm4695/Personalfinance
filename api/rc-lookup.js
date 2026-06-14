// Vercel serverless function — RC (Registration Certificate) lookup via Surepass.io
// Surepass has a free tier of 100 API calls. Get your token at https://surepass.io/
// Add it to Vercel: Settings → Environment Variables → SUREPASS_TOKEN

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const reg = String(req.query.reg || "").trim().toUpperCase().replace(/[\s\-]/g, "");
  if (!reg) return res.status(400).json({ error: "reg param required" });

  const token = process.env.SUREPASS_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: "RC lookup not configured",
      hint: "Add SUREPASS_TOKEN to Vercel environment variables. Get a free token at surepass.io",
    });
  }

  try {
    const r = await fetch("https://kyc-api.surepass.io/api/v1/rc/rc-full", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id_number: reg }),
    });

    const json = await r.json();

    if (!r.ok || !json.data) {
      return res.status(404).json({
        error: json.message || "Vehicle not found in VAHAN database",
      });
    }

    const d = json.data;

    // Normalise manufacturer name — Surepass returns full legal entity name
    const make = normalizeMake(d.maker_description || d.vehicle_manufacturer_name || "");
    const model = cleanModel(d.maker_model || d.model || "");

    // Map vehicle class to app's vehicleType enum
    const cls = (d.vehicle_class || d.vehicle_category || "").toUpperCase();
    const vehicleType =
      cls.includes("M-CYCLE") || cls.includes("SCOOTER") || cls.includes("TWO WHEELER") || cls.includes("MOTOR CYCLE")
        ? "two-wheeler"
        : cls.includes("LMV") || cls.includes("CAR") || cls.includes("JEEP") || cls.includes("MOTOR CAB") || cls.includes("FOUR")
        ? "four-wheeler"
        : cls.includes("GOODS") || cls.includes("BUS") || cls.includes("TRUCK") || cls.includes("HMV")
        ? "commercial"
        : "two-wheeler";

    // Fuel type
    const fuel = (d.vehicle_fuel_type || "").toUpperCase();
    const fuelType = fuel.includes("PETROL")
      ? "petrol"
      : fuel.includes("DIESEL")
      ? "diesel"
      : fuel.includes("ELECTRIC")
      ? "electric"
      : fuel.includes("CNG")
      ? "cng"
      : fuel.includes("HYBRID")
      ? "hybrid"
      : "petrol";

    return res.json({
      registrationNumber: d.rc_number || reg,
      make,
      model,
      year: extractYear(d.manufacturing_month_year || d.registration_date || ""),
      color: titleCase(d.color || ""),
      fuelType,
      vehicleType,
      chassisNumber: d.chassis_number || "",
      engineNumber: d.engine_number || "",
      insuranceExpiry: normalizeDate(d.insurance_upto || ""),
      pucExpiry: normalizeDate(d.pucc_upto || d.pucc_validity_upto || ""),
      ownerName: titleCase(d.owner_name || ""),
      rto: titleCase(d.rto || ""),
      state: titleCase(d.state || ""),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Lookup failed" });
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeMake(name) {
  const n = name.toUpperCase();
  if (n.includes("HONDA")) return "Honda";
  if (n.includes("HERO MOTOCORP") || n.includes("HERO HONDA") || (n.includes("HERO") && !n.includes("HONDA"))) return "Hero";
  if (n.includes("BAJAJ")) return "Bajaj";
  if (n.includes("TVS")) return "TVS";
  if (n.includes("YAMAHA")) return "Yamaha";
  if (n.includes("ROYAL ENFIELD") || n.includes("ROYALENFIELD") || n.includes("ENFIELD")) return "Royal Enfield";
  if (n.includes("KTM")) return "KTM";
  if (n.includes("KAWASAKI")) return "Kawasaki";
  if (n.includes("SUZUKI") && !n.includes("MARUTI")) return "Suzuki";
  if (n.includes("MARUTI") || n.includes("MSIL")) return "Maruti";
  if (n.includes("HYUNDAI")) return "Hyundai";
  if (n.includes("TATA MOTORS") || n.includes("TATA")) return "Tata";
  if (n.includes("TOYOTA")) return "Toyota";
  if (n.includes("MAHINDRA")) return "Mahindra";
  if (n.includes("FORD")) return "Ford";
  if (n.includes("KIA")) return "Kia";
  if (n.includes("VOLKSWAGEN") || n.includes("VW")) return "Volkswagen";
  if (n.includes("BMW")) return "BMW";
  if (n.includes("MERCEDES")) return "Mercedes";
  if (n.includes("AUDI")) return "Audi";
  if (n.includes("SKODA")) return "Skoda";
  if (n.includes("NISSAN")) return "Nissan";
  if (n.includes("RENAULT")) return "Renault";
  if (n.includes("JEEP")) return "Jeep";
  if (n.includes("OLA ELECTRIC") || n.includes("ETERGO") || n.includes("OLA")) return "Ola";
  if (n.includes("ATHER")) return "Ather";
  // Unknown — take first 2 words, title-cased
  return titleCase(name.split(" ").slice(0, 2).join(" ").toLowerCase());
}

function cleanModel(model) {
  return model
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractYear(s) {
  if (!s) return new Date().getFullYear();
  const m = s.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

// Handles DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY formats → YYYY-MM-DD
function normalizeDate(s) {
  if (!s) return "";
  const clean = s.trim();
  const parts = clean.split(/[-\/]/);
  if (parts.length !== 3) return "";
  if (parts[0].length === 4) return clean.slice(0, 10); // already YYYY-MM-DD
  const [d, m, y] = parts;
  if (!y || y.length !== 4) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function titleCase(s) {
  return (s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
