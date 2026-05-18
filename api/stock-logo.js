// Stock logo resolution — tries sources in priority order:
// 1. Local high-coverage curated STOCK_DOMAINS mapping for popular Indian stocks
// 2. Twelve Data (if TWELVE_DATA_KEY env var set)
// 3. EODHD public CDN (updated to eodhd.com with correct NSE/BSE paths)
// 4. Yahoo Finance website → Google favicon (sz=256 for crispness)

const { default: YahooFinance } = require("yahoo-finance2");
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// High-density domain mapping covering ~200 top NSE/BSE stocks
const STOCK_DOMAINS = {
  RELIANCE: "ril.com",
  TCS: "tcs.com",
  HDFCBANK: "hdfcbank.com",
  INFY: "infosys.com",
  ICICIBANK: "icicibank.com",
  HINDUNILVR: "hul.co.in",
  ITC: "itcportal.com",
  SBIN: "sbi.co.in",
  BHARTIARTL: "airtel.in",
  LTIM: "ltimindtree.com",
  LT: "larsentoubro.com",
  AXISBANK: "axisbank.com",
  KOTAKBANK: "kotak.com",
  ADANIENT: "adanienterprises.com",
  ADANIPORTS: "adaniports.com",
  ADANIPOWER: "adanipower.com",
  ADANIGREEN: "adanigreenenergy.com",
  ATGL: "adanigas.com",
  AWL: "adaniwilmar.in",
  ASIANPAINT: "asianpaints.com",
  BAJFINANCE: "bajajfinserv.in",
  BAJAJFINSV: "bajajfinserv.in",
  BAJAJAUTO: "bajajauto.com",
  "BAJAJ-AUTO": "bajajauto.com",
  BPCL: "bharatpetroleum.in",
  CIPLA: "cipla.com",
  COALINDIA: "coalindia.in",
  DIVISLAB: "divislabs.com",
  DRREDDY: "drreddys.com",
  EICHERMOT: "eichermotors.com",
  GRASIM: "grasim.com",
  HCLTECH: "hcltech.com",
  HEROMOTOCO: "heromotocorp.com",
  HINDALCO: "hindalco.com",
  INDUSINDBK: "indusind.com",
  JSWSTEEL: "jsw.in",
  "M&M": "mahindra.com",
  M_M: "mahindra.com",
  MARUTI: "marutisuzuki.com",
  NESTLEIND: "nestle.in",
  NTPC: "ntpc.co.in",
  ONGC: "ongcindia.com",
  POWERGRID: "powergrid.in",
  SUNPHARMA: "sunpharma.com",
  TATAMOTORS: "tatamotors.com",
  TATASTEEL: "tatasteel.com",
  TECHM: "techmahindra.com",
  TITAN: "titancompany.in",
  ULTRACEMCO: "ultratechcement.com",
  WIPRO: "wipro.com",
  ZOMATO: "zomato.com",
  PAYTM: "paytm.com",
  NYKAA: "nykaa.com",
  IRCTC: "irctc.co.in",
  HAL: "hal-india.co.in",
  BEL: "bel-india.in",
  BHEL: "bhel.com",
  SAIL: "sail.co.in",
  GAIL: "gailonline.com",
  IOC: "iocl.com",
  LIC: "licindia.in",
  SBI: "sbi.co.in",
  SBILIFE: "sbilife.co.in",
  HDFCLIFE: "hdfclife.com",
  ICICIPRULI: "iciciprulife.com",
  ICICIGI: "icicilombard.com",
  JIOFIN: "jiofinancialservices.com",
  CDSL: "cdslindia.com",
  MCX: "mcxindia.com",
  BSE: "bseindia.com",
  NSE: "nseindia.com",
  MUTHOOTFIN: "muthootfinance.com",
  MANAPPURAM: "manappuram.com",
  CHOLAFIN: "cholamandalam.com",
  RECLTD: "recindia.nic.in",
  PFC: "pfcindia.com",
  IREDA: "ireda.in",
  NHPC: "nhpcindia.com",
  SJVN: "sjvn.nic.in",
  RVNL: "rvnl.org",
  IRCON: "ircon.org",
  RITES: "rites.com",
  HUDCO: "hudco.org.in",
  PNB: "pnbindia.in",
  BOB: "bankofbaroda.in",
  CANBK: "canarabank.com",
  UNIONBANK: "unionbankofindia.co.in",
  INDIANB: "indianbank.in",
  MAHABANK: "mahabank.in",
  IOB: "iob.in",
  UCOBANK: "ucobank.com",
  CENTRALBK: "centralbankofindia.co.in",
  YESBANK: "yesbank.in",
  IDFCFIRSTB: "idfcfirstbank.com",
  BANDHANBNK: "bandhanbank.com",
  FEDERALBNK: "federalbank.co.in",
  AUBANK: "aubank.in",
  INDHOTEL: "tajhotels.com",
  DLF: "dlf.in",
  GODREJPROP: "godrejproperties.com",
  OBEROIRLTY: "oberoirealty.com",
  MACROTECH: "lodhagroup.in",
  SOBHA: "sobha.com",
  PRESTIGE: "prestigeconstructions.com",
  BRIGADE: "brigadegroup.com",
  LUPIN: "lupin.com",
  AUROPHARMA: "aurobindo.com",
  APOLLOHOSP: "apollohospitals.com",
  MAXHEALTH: "maxhealthcare.in",
  FORTIS: "fortishealthcare.com",
  NH: "narayanahealth.org",
  MEDANTA: "medanta.org",
  POLYCAB: "polycab.com",
  KEI: "kei-ind.com",
  HAVELLS: "havells.com",
  VOLTAS: "voltas.com",
  BLUESTARCO: "bluestarindia.com",
  AMBUJACEM: "ambujacement.com",
  ACC: "acclimited.com",
  SHREECEM: "shreecement.com",
  JKCEMENT: "jkcement.com",
  RAMCOCEM: "ramcocement.in",
  DALBHARAT: "dalmiabharat.com",
  PERSISTENT: "persistent.com",
  COFORGE: "coforge.com",
  MPHASIS: "mphasis.com",
  KPITTECH: "kpit.com",
  TATAELXSI: "tataelxsi.com",
  LTTS: "ltts.com",
  CYIENT: "cyient.com",
  SONACOMS: "sonacomstar.com",
  TUBEINVEST: "tiindia.com",
  BOSCHLTD: "bosch.in",
  MRF: "mrftyres.com",
  BALKRISIND: "balkrishna-industries.com",
  APOLLOTYRE: "apollotyres.com",
  CEATLTD: "ceat.com",
  JKTYRE: "jktyre.com",
  AMARAJABAT: "amararajabatteries.com",
  EXIDEIND: "exideindustries.com",
  TATACOMM: "tatacommunications.com",
  HFCL: "hfcl.com",
  ITI: "itiltd.in",
  IDEA: "myvi.in",
  TRENT: "trentlimited.com",
  ABFRL: "abfrl.com",
  DMART: "dmartindia.com",
  "V-MART": "vmart.co.in",
  JUBILANT: "jubilantfoodworks.com",
  DEVYANI: "devyanifood.com",
  WESTLIFE: "westlife.co.in",
  SAPPHIRE: "sapphirefoods.in",
  PAGEIND: "pageindustries.com",
  LUXIND: "luxinnerwear.com",
  RUPA: "rupa.co.in",
  VIPIND: "vipindustries.co.in",
  BATAINDIA: "bataindia.com",
  RELAXO: "relaxofootwear.com",
  PVRINOX: "pvrcinemas.com",
  SUNTV: "suntv.in",
  ZEEL: "zee.com",
  NETWORK18: "nw18.com",
  TV18BRDCST: "element18.in",
  DISHTV: "dishtv.in",
  TATAINVEST: "tatainvestment.com",
  GICRE: "gicre.in",
  NIACL: "newindia.co.in",
  IRB: "irb.co.in",
  GMRINFRA: "gmrinfra.com",
  ADANITRANS: "adanitransmission.com",
  CESC: "cesc.co.in",
  JSWENERGY: "jsw.in",
  TATACHEM: "tatachemicals.com",
  DEEPAKNTR: "deepaknitrite.com",
  SRF: "srf.com",
  AARTIIND: "aarti-industries.com",
  ATUL: "atul.co.in",
  COROMANDEL: "coromandel.gromor.com",
  UPL: "upl-ltd.com",
  PIIND: "piindustries.com",
  BAYERCROP: "bayer.in",
  GNFC: "gnfc.in",
  GSFC: "gsfclimited.com",
  FACT: "fact.co.in",
  RCFL: "rcfltd.com",
  NFL: "nationalfertilizers.com",
  KRBL: "krblrice.com",
  PATANJALI: "patanjaliayurved.org",
  BALRAMCHIN: "chini.com",
  TRIVENI: "trivenigroup.com",
  RENUKA: "renukasugars.com",
  EIDPARRY: "eidparry.com",
  MAHSCOOT: "mahascooters.com",
  TATACOFFEE: "tataconsumer.com",
  CCL: "cclproducts.com",
  JWL: "jupiterwagons.com",
  TEXRAIL: "texmaco.in",
  TITAGARH: "titagarh.in",
  BEML: "bemlindia.in",
  MAZDOCK: "mazagondock.in",
  GRSE: "grse.in",
  COCHINSHIP: "cochinshipyard.in",
  BDL: "bdl-india.in",
  MIDHANI: "midhani-india.in"
};

async function resolveWithTwelveData(base, exchange, apiKey) {
  const exch = /BO/i.test(exchange) ? "BSE" : "NSE";
  const url = `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(base)}&exchange=${exch}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.url || null;
}

async function resolveWithEODHD(base, isBSE) {
  const exch = isBSE ? "BSE" : "NSE";
  const url = `https://eodhd.com/img/logos/${exch}/${base}.png`;
  try {
    // HEAD request to verify the image is a real logo (not a blank placeholder).
    const check = await fetch(url, { method: "HEAD" });
    if (!check.ok) return null;
    const contentLength = parseInt(check.headers.get("content-length") || "0", 10);
    // Real company logos are at least 1 KB; blank placeholders are ~67–200 bytes.
    if (contentLength > 0 && contentLength < 1000) return null;
    return url;
  } catch (_) {
    return url;
  }
}

async function resolveWithYahoo(symbol) {
  try {
    const summary = await yf.quoteSummary(symbol, { modules: ["assetProfile"] }, { validateResult: false });
    const website = summary?.assetProfile?.website;
    if (website) {
      const domain = new URL(website).hostname.replace(/^www\./, "");
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    }
  } catch (err) {
    console.error(`[stock-logo] Yahoo lookup failed for ${symbol}:`, err?.message || err);
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const sym = String(symbol);
  const base = sym.replace(/\.(NS|BO)$/i, "");
  const isBSE = /\.BO$/i.test(sym);
  const exchange = isBSE ? "BSE" : "NSE";

  let logoUrl = null;
  let faviconUrl = null;

  // Priority 1: High-coverage local mapping (returns crisp 256px favicons)
  const baseUpper = base.toUpperCase();
  if (STOCK_DOMAINS[baseUpper]) {
    const domain = STOCK_DOMAINS[baseUpper];
    logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  }

  // Priority 2: Twelve Data (if API key configured)
  if (!logoUrl) {
    const tdKey = process.env.TWELVE_DATA_KEY;
    if (tdKey) {
      logoUrl = await resolveWithTwelveData(base, exchange, tdKey);
    }
  }

  // Priority 3: EODHD public CDN
  if (!logoUrl) {
    logoUrl = await resolveWithEODHD(base, isBSE);
  }

  // Priority 4: Yahoo Finance website domain favicon fallback
  if (!faviconUrl) {
    faviconUrl = await resolveWithYahoo(sym);
  }

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ logoUrl, faviconUrl });
};
