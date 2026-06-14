// RC Lookup — tries multiple sources in priority order
//
// SOURCE 1 (no signup): mParivahan government app backend
//   - The official government mParivahan mobile app uses this endpoint
//   - Attempted without any API key — works from server-side (no CORS, sometimes no CAPTCHA)
//
// SOURCE 2 (env: SUREPASS_TOKEN): Surepass.io — 100 free calls, then ₹2-4/call
// SOURCE 3 (env: ATTESTR_TOKEN):  Attestr.com  — simpler signup for Indian devs
// SOURCE 4 (env: RAPIDAPI_KEY):   RapidAPI     — sign in with Google account (easiest)
//
// Set any ONE of these in Vercel → Settings → Environment Variables.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const reg = String(req.query.reg || "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-]/g, "");
  if (!reg) return res.status(400).json({ error: "reg param required" });

  // ── SOURCE 1: mParivahan government app API (no key needed) ─────────────
  try {
    const data = await tryMParivahan(reg);
    if (data) return res.json(data);
  } catch (_) {}

  // ── SOURCE 2: Surepass ───────────────────────────────────────────────────
  if (process.env.SUREPASS_TOKEN) {
    try {
      const data = await trySurepass(reg, process.env.SUREPASS_TOKEN);
      if (data) return res.json(data);
    } catch (_) {}
  }

  // ── SOURCE 3: Attestr ────────────────────────────────────────────────────
  if (process.env.ATTESTR_TOKEN) {
    try {
      const data = await tryAttestr(reg, process.env.ATTESTR_TOKEN);
      if (data) return res.json(data);
    } catch (_) {}
  }

  // ── SOURCE 4: RapidAPI ───────────────────────────────────────────────────
  if (process.env.RAPIDAPI_KEY) {
    try {
      const data = await tryRapidApi(reg, process.env.RAPIDAPI_KEY);
      if (data) return res.json(data);
    } catch (_) {}
  }

  // ── No source worked ─────────────────────────────────────────────────────
  return res.status(503).json({
    error: "RC lookup not available",
    noProvider: true,
  });
};

// ─── Provider implementations ────────────────────────────────────────────────

async function tryMParivahan(reg) {
  // The mParivahan government app (Android/iOS) uses this backend.
  // Attempted without auth — works for many vehicles from server-side.
  const r = await fetch("https://maas.parivahan.gov.in/maasapi/user/verifyvehicle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "okhttp/4.9.0", // mimic Android mParivahan app
      Accept: "application/json",
    },
    body: JSON.stringify({ regn_no: reg, oth: "N" }),
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) return null;
  const json = await r.json();
  // mParivahan returns response_code "1" on success
  const d = json?.result?.[0] || json?.result || null;
  if (!d || json.response_code === "0") return null;

  const cls = (d.vehicle_category || d.vehicle_class || "").toUpperCase();
  return {
    registrationNumber: d.reg_no || reg,
    make: normalizeMake(d.maker_desc || d.manufacturer || ""),
    model: cleanModel(d.model || d.model_desc || ""),
    year: extractYear(d.manufacturing_mon_yr || d.reg_date || ""),
    color: titleCase(d.color || ""),
    fuelType: mapFuel(d.vehicle_fuel_type || ""),
    vehicleType: mapClass(cls),
    chassisNumber: d.chassis_no || "",
    engineNumber: d.engine_no || "",
    insuranceExpiry: normalizeDate(d.insurance_upto || d.insurance_validity || ""),
    pucExpiry: normalizeDate(d.pucc_upto || d.pucc_validity_upto || ""),
    ownerName: titleCase(d.owner_name || ""),
    rto: titleCase(d.rto || d.registration_authority || ""),
    state: titleCase(d.state || ""),
    source: "mParivahan (Government)",
  };
}

async function trySurepass(reg, token) {
  const r = await fetch("https://kyc-api.surepass.io/api/v1/rc/rc-full", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id_number: reg }),
    signal: AbortSignal.timeout(8000),
  });
  const json = await r.json();
  if (!r.ok || !json.data) return null;
  const d = json.data;
  return normalize({
    reg_no: d.rc_number || reg,
    maker_desc: d.maker_description || d.vehicle_manufacturer_name || "",
    model: d.maker_model || d.model || "",
    manufacturing_mon_yr: d.manufacturing_month_year || d.registration_date || "",
    color: d.color || "",
    vehicle_fuel_type: d.vehicle_fuel_type || "",
    vehicle_category: d.vehicle_class || d.vehicle_category || "",
    chassis_no: d.chassis_number || "",
    engine_no: d.engine_number || "",
    insurance_upto: d.insurance_upto || "",
    pucc_upto: d.pucc_upto || d.pucc_validity_upto || "",
    owner_name: d.owner_name || "",
    rto: d.rto || "",
    state: d.state || "",
    source: "Surepass",
  });
}

async function tryAttestr(reg, token) {
  const r = await fetch("https://api.attestr.com/api/v1/public/checkx/rc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify({ reg }),
    signal: AbortSignal.timeout(8000),
  });
  const json = await r.json();
  if (!r.ok || !json.entity) return null;
  const d = json.entity;
  return normalize({
    reg_no: d.registrationNumber || reg,
    maker_desc: d.makerModel?.split(" ")[0] || "",
    model: d.makerModel || "",
    manufacturing_mon_yr: d.manufacturingDate || "",
    color: d.color || "",
    vehicle_fuel_type: d.fuelType || "",
    vehicle_category: d.vehicleClass || "",
    chassis_no: d.chassisNumber || "",
    engine_no: d.engineNumber || "",
    insurance_upto: d.insuranceValidity || "",
    pucc_upto: d.puccUpto || "",
    owner_name: d.ownerName || "",
    rto: d.rtOfficeName || "",
    state: d.presentAddress?.split(",")?.pop()?.trim() || "",
    source: "Attestr",
  });
}

async function tryRapidApi(reg, key) {
  const r = await fetch(
    `https://rto-vehicle-information-verification-india.p.rapidapi.com/api/v1/rc/rcVerification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": key,
        "x-rapidapi-host": "rto-vehicle-information-verification-india.p.rapidapi.com",
      },
      body: JSON.stringify({ id_number: reg }),
      signal: AbortSignal.timeout(8000),
    }
  );
  const json = await r.json();
  if (!r.ok || !json.data) return null;
  const d = json.data;
  return normalize({
    reg_no: d.rc_number || reg,
    maker_desc: d.maker_description || d.vehicle_manufacturer_name || "",
    model: d.maker_model || d.model || "",
    manufacturing_mon_yr: d.manufacturing_month_year || d.registration_date || "",
    color: d.color || "",
    vehicle_fuel_type: d.vehicle_fuel_type || "",
    vehicle_category: d.vehicle_class || d.vehicle_category || "",
    chassis_no: d.chassis_number || "",
    engine_no: d.engine_number || "",
    insurance_upto: d.insurance_upto || "",
    pucc_upto: d.pucc_upto || d.pucc_validity_upto || "",
    owner_name: d.owner_name || "",
    rto: d.rto || "",
    state: d.state || "",
    source: "RapidAPI",
  });
}

// ─── Shared normalizer ───────────────────────────────────────────────────────

function normalize(d) {
  return {
    registrationNumber: d.reg_no,
    make: normalizeMake(d.maker_desc),
    model: cleanModel(d.model),
    year: extractYear(d.manufacturing_mon_yr),
    color: titleCase(d.color),
    fuelType: mapFuel(d.vehicle_fuel_type),
    vehicleType: mapClass(d.vehicle_category.toUpperCase()),
    chassisNumber: d.chassis_no,
    engineNumber: d.engine_no,
    insuranceExpiry: normalizeDate(d.insurance_upto),
    pucExpiry: normalizeDate(d.pucc_upto),
    ownerName: titleCase(d.owner_name),
    rto: titleCase(d.rto),
    state: titleCase(d.state),
    source: d.source || "",
  };
}

function mapFuel(fuel) {
  const f = (fuel || "").toUpperCase();
  if (f.includes("PETROL")) return "petrol";
  if (f.includes("DIESEL")) return "diesel";
  if (f.includes("ELECTRIC")) return "electric";
  if (f.includes("CNG")) return "cng";
  if (f.includes("HYBRID")) return "hybrid";
  return "petrol";
}

function mapClass(cls) {
  if (!cls) return "two-wheeler";
  if (cls.includes("M-CYCLE") || cls.includes("SCOOTER") || cls.includes("TWO WHEELER") || cls.includes("MOTOR CYCLE"))
    return "two-wheeler";
  if (cls.includes("LMV") || cls.includes("CAR") || cls.includes("JEEP") || cls.includes("MOTOR CAB") || cls.includes("FOUR"))
    return "four-wheeler";
  if (cls.includes("GOODS") || cls.includes("BUS") || cls.includes("TRUCK") || cls.includes("HMV"))
    return "commercial";
  return "two-wheeler";
}

function normalizeMake(name) {
  const n = (name || "").toUpperCase();
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
  if (n.includes("TATA")) return "Tata";
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
  if (n.includes("OLA")) return "Ola";
  if (n.includes("ATHER")) return "Ather";
  return titleCase(name.split(" ").slice(0, 2).join(" ").toLowerCase());
}

function cleanModel(model) {
  return (model || "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractYear(s) {
  if (!s) return new Date().getFullYear();
  const m = String(s).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

function normalizeDate(s) {
  if (!s) return "";
  const clean = String(s).trim();
  const parts = clean.split(/[-\/]/);
  if (parts.length !== 3) return "";
  if (parts[0].length === 4) return clean.slice(0, 10);
  const [d, m, y] = parts;
  if (!y || y.length !== 4) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function titleCase(s) {
  return (s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
