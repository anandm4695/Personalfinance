// Stock logo resolution — tries sources in priority order:
// 1. Local high-coverage curated STOCK_DOMAINS mapping for popular Indian stocks
// 2. Twelve Data (if TWELVE_DATA_KEY env var set)
// 3. EODHD public CDN (direct URL — client handles 404 via onError)
// 4. Yahoo Finance website → Google favicon (sz=256 for crispness)

const { default: YahooFinance } = require("yahoo-finance2");
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// High-density domain mapping covering ~450+ top NSE/BSE stocks
const STOCK_DOMAINS = {
  // ── Nifty 50 / Large Caps ──────────────────────────────────────────────────
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
  BAJFINANCE: "bajajfinserv.in",
  BAJAJFINSV: "bajajfinserv.in",
  BAJAJAUTO: "bajajauto.com",
  "BAJAJ-AUTO": "bajajauto.com",
  ASIANPAINT: "asianpaints.com",
  HCLTECH: "hcltech.com",
  WIPRO: "wipro.com",
  TECHM: "techmahindra.com",
  MARUTI: "marutisuzuki.com",
  TATAMOTORS: "tatamotors.com",
  TATASTEEL: "tatasteel.com",
  TATAPOWER: "tatapower.com",
  TATACONSUMER: "tataconsumer.com",
  TATATECH: "tatatech.com",
  TATACHEM: "tatachemicals.com",
  TATACOMM: "tatacommunications.com",
  TATAELXSI: "tataelxsi.com",
  TATAINVEST: "tatainvestment.com",
  TITAN: "titancompany.in",
  ULTRACEMCO: "ultratechcement.com",
  NTPC: "ntpc.co.in",
  POWERGRID: "powergrid.in",
  ONGC: "ongcindia.com",
  COALINDIA: "coalindia.in",
  GRASIM: "grasim.com",
  ADANIENT: "adanienterprises.com",
  ADANIPORTS: "adaniports.com",
  ADANIPOWER: "adanipower.com",
  ADANIGREEN: "adanigreenenergy.com",
  ADANITRANS: "adanitransmission.com",
  ADANIENSOL: "adanigreenenergy.com",
  ATGL: "adanigas.com",
  AWL: "adaniwilmar.in",
  SUNPHARMA: "sunpharma.com",
  DRREDDY: "drreddys.com",
  CIPLA: "cipla.com",
  DIVISLAB: "divislabs.com",
  EICHERMOT: "eichermotors.com",
  HEROMOTOCO: "heromotocorp.com",
  JSWSTEEL: "jsw.in",
  HINDALCO: "hindalco.com",
  INDUSINDBK: "indusind.com",
  "M&M": "mahindra.com",
  M_M: "mahindra.com",
  MAHINDRA: "mahindra.com",
  NESTLEIND: "nestle.in",
  BPCL: "bharatpetroleum.in",
  CASTROLIND: "castrol.com",

  // ── FMCG / Consumer ────────────────────────────────────────────────────────
  DABUR: "dabur.com",
  MARICO: "marico.com",
  BRITANNIA: "britannia.co.in",
  GODREJCP: "godrejcp.com",
  COLPAL: "colgate.co.in",
  EMAMILTD: "emami.com",
  JYOTHYLAB: "jyothy.com",
  BAJAJCON: "bajajconsumer.com",
  GILLETTE: "gilletteindia.com",
  PGHH: "in.pg.com",
  HENKEL: "henkel.com",
  ZYDUSLIFE: "zyduslife.com",
  VBL: "varunbeverages.com",
  UNITDSPR: "unitedspirits.com",
  UBL: "unitedbreweries.com",
  RADICO: "radicokhaitan.com",
  GLOBUSSP: "globusspirits.com",
  SH: "sostofinance.com",
  PATANJALI: "patanjaliayurved.org",
  ZOMATO: "zomato.com", // brand domain still zomato.com; NSE symbol is now ETERNAL (handled in StockLogo)
  ETERNAL: "zomato.com",
  SWIGGY: "swiggy.com",
  PAYTM: "paytm.com",
  NYKAA: "nykaa.com",
  IRCTC: "irctc.co.in",
  DMART: "dmartindia.com",
  "V-MART": "vmart.co.in",
  TRENT: "trentlimited.com",
  ABFRL: "abfrl.com",
  JUBLFOOD: "jubilantfoodworks.com",
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
  PIDILITIND: "pidilite.com",
  BERGER: "bergerindia.com",
  KANSAINER: "kansaipaintindia.com",
  INDIGO: "goindigo.in",

  // ── Banking ────────────────────────────────────────────────────────────────
  SBI: "sbi.co.in",
  PNB: "pnbindia.in",
  BOB: "bankofbaroda.in",
  BANKBARODA: "bankofbaroda.in",
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
  DCBBANK: "dcbbank.com",
  KARURVYSYA: "kvb.co.in",
  SOUTHBANK: "southindianbank.com",
  KTKBANK: "ktkbank.com",
  KARNATAKA: "ktkbank.com",
  RBLBANK: "rblbank.com",
  UJJIVANSFB: "ujjivansfb.in",
  ESAFSFB: "esafbank.com",
  EQUITASBNK: "equitasbank.com",
  SURYODAY: "suryodayfin.com",
  UTKARSHBANK: "utkarsh.bank",
  NAINITAL: "nainitalbank.com",
  CSBBANK: "csb.co.in",
  JKBANK: "jkbank.com",
  LAXMIBK: "laxmibank.com",
  TMKFINANCE: "tamilnadbank.com",
  TAMILNADU: "tamilnadbank.com",

  // ── Insurance ──────────────────────────────────────────────────────────────
  SBILIFE: "sbilife.co.in",
  HDFCLIFE: "hdfclife.com",
  ICICIPRULI: "iciciprulife.com",
  ICICIGI: "icicilombard.com",
  GICRE: "gicre.in",
  NIACL: "newindia.co.in",
  MAXFINANCIAL: "maxfinancialservices.com",
  GODIGIT: "godigit.com",
  STARHEALTH: "starhealth.in",
  POLICYBZR: "policybazaar.com",
  LIC: "licindia.in",

  // ── NBFCs / Capital Markets ────────────────────────────────────────────────
  BAJAJHLDNG: "bajajfinserv.in",
  MUTHOOTFIN: "muthootfinance.com",
  MANAPPURAM: "manappuram.com",
  CHOLAFIN: "cholamandalam.com",
  RECLTD: "recindia.nic.in",
  PFC: "pfcindia.com",
  IREDA: "ireda.in",
  NHPC: "nhpcindia.com",
  SJVN: "sjvn.nic.in",
  HUDCO: "hudco.org.in",
  ANGELONE: "angelbroking.com",
  MOTILALOFS: "motilaloswal.com",
  JIOFIN: "jiofinancialservices.com",
  CDSL: "cdslindia.com",
  MCX: "mcxindia.com",
  BSE: "bseindia.com",
  NSE: "nseindia.com",
  CAMS: "camsonline.com",
  KFINTECH: "kfintech.com",
  NSDL: "nsdl.co.in",
  GEOJITFSL: "geojit.com",
  ICICISEC: "icicisecurities.com",
  HDFCSEC: "hdfcsec.com",
  SHAREINDIA: "shareindia.com",

  // ── IT / Technology ────────────────────────────────────────────────────────
  PERSISTENT: "persistent.com",
  COFORGE: "coforge.com",
  MPHASIS: "mphasis.com",
  KPITTECH: "kpit.com",
  LTTS: "ltts.com",
  CYIENT: "cyient.com",
  HEXAWARE: "hexaware.com",
  MASTEK: "mastek.com",
  ECLERX: "eclerx.com",
  HAPPYMIND: "happyminds.net",
  HAPPYMINDS: "happyminds.net",
  ROUTE: "routemobile.com",
  RATEGAIN: "rategain.com",
  INTELLECT: "intellectdesign.com",
  ZENSAR: "zensar.com",
  BIRLASOFT: "birlasoft.com",
  NIITTECH: "niit.com",
  NEWGEN: "newgensoft.com",
  TANLA: "tanla.com",
  XCHANGING: "xchanging.com",
  INFIBEAM: "infibeam.com",
  LATENTVIEW: "latentview.com",
  SONACOMS: "sonacomstar.com",

  // ── Pharma / Healthcare ────────────────────────────────────────────────────
  LUPIN: "lupin.com",
  AUROPHARMA: "aurobindo.com",
  ALKEM: "alkemlab.com",
  GLENMARK: "glenmarkpharma.com",
  TORNTPHARM: "torntpharma.com",
  ABBOTINDIA: "abbott.co.in",
  PFIZER: "pfizerindia.com",
  GLAXO: "in.gsk.com",
  SANOFI: "sanofi.in",
  IPCA: "ipcalabs.com",
  BIOCON: "biocon.com",
  METROPOLIS: "metropolis.co.in",
  THYROCARE: "thyrocare.com",
  LALPATHLAB: "lalpathlabs.com",
  DRLABL: "lalpathlabs.com",
  APOLLOHOSP: "apollohospitals.com",
  MAXHEALTH: "maxhealthcare.in",
  FORTIS: "fortishealthcare.com",
  NH: "narayanahealth.org",
  MEDANTA: "medanta.org",
  AJANTAPHARM: "ajantapharma.com",
  NATCOPHARM: "natcopharma.com",
  GRANULES: "granulesindia.com",
  LAURUSLABS: "lauruslabs.com",
  SOLARA: "solara.co.in",
  SUVEN: "suven.com",
  SEQUENT: "sequentscientific.com",
  ZYDUS: "zyduslife.com",
  CADILAHC: "zyduslife.com",
  ERIS: "erislifesciences.com",
  JBCHEPHARM: "jbcpharma.com",

  // ── Automobile ────────────────────────────────────────────────────────────
  MAHINDCIE: "mahindra.com",
  MOTHERSON: "mothersongroup.com",
  SAMVARDHANA: "mothersongroup.com",
  BHARATFORG: "bharatforge.com",
  ENDURANCE: "endurancetech.com",
  SUPRAJIT: "suprajit.com",
  BORORENEW: "borosilrenewables.com",
  SCHAEFFLER: "schaeffler.in",
  BOSCHLTD: "bosch.in",
  MRF: "mrftyres.com",
  BALKRISIND: "balkrishna-industries.com",
  APOLLOTYRE: "apollotyres.com",
  CEATLTD: "ceat.com",
  JKTYRE: "jktyre.com",
  AMARAJABAT: "amararajabatteries.com",
  EXIDEIND: "exideindustries.com",
  MINDAIND: "unominda.com",
  UNOMINDA: "unominda.com",
  SUNDRMFAST: "sundaramfasteners.com",
  GABRIEL: "gabrielindia.com",
  TIMKEN: "timken.com",
  WABCOINDIA: "wabco-auto.com",
  CRAFTSMAN: "craftsmanautomation.in",

  // ── Capital Goods / Engineering ───────────────────────────────────────────
  ABB: "abb.com",
  SIEMENS: "siemens.co.in",
  THERMAX: "thermaxglobal.com",
  CUMMINSIND: "cummins.in",
  KSB: "ksb.com",
  GRINDWELL: "grindwellnorton.com",
  AIAENG: "aiaengineering.com",
  BHEL: "bhel.com",
  HAL: "hal-india.co.in",
  BEL: "bel-india.in",
  BDL: "bdl-india.in",
  MIDHANI: "midhani-india.in",
  MAZDOCK: "mazagondock.in",
  GRSE: "grse.in",
  COCHINSHIP: "cochinshipyard.in",
  BEML: "bemlindia.in",
  TITAGARH: "titagarh.in",
  TEXRAIL: "texmaco.in",
  JWL: "jupiterwagons.com",
  RVNL: "rvnl.org",
  IRCON: "ircon.org",
  RITES: "rites.com",
  // IRFC intentionally omitted — irfc.nic.in is government-hosted and not indexed by Clearbit; EODHD CDN handles it client-side
  RAILVIKAS: "rvnl.org",
  NCC: "ncclimited.com",
  PNCINFRA: "pncinfratech.com",
  HG: "hginfra.com",
  GMRINFRA: "gmrinfra.com",
  IRB: "irb.co.in",
  ASHOKA: "ashoka.buildcon.in",
  SADBHAV: "sadbhavengineering.com",
  CAPACITE: "capacite.co.in",

  // ── Energy / Power ────────────────────────────────────────────────────────
  GAIL: "gailonline.com",
  IOC: "iocl.com",
  SAIL: "sail.co.in",
  NMDC: "nmdc.co.in",
  JSWENERGY: "jsw.in",
  TORNTPOWER: "torntpower.com",
  CESC: "cesc.co.in",
  RPOWER: "rpower.in",
  INOXWIND: "inoxwind.com",
  SUZLON: "suzlon.com",
  ORIENTGREEN: "ogfl.in",

  // ── Cement ───────────────────────────────────────────────────────────────
  AMBUJACEM: "ambujacement.com",
  ACC: "acclimited.com",
  SHREECEM: "shreecement.com",
  JKCEMENT: "jkcement.com",
  RAMCOCEM: "ramcocement.in",
  DALBHARAT: "dalmiabharat.com",
  NUVOCO: "nuvoco.com",
  HEIDELBERG: "heidelbergcement.in",
  BIRLACORPN: "birlacorporation.com",
  INDIACEM: "indiacements.com",
  PRISMCEM: "prismcement.com",
  ORIENTCEM: "orientcement.com",

  // ── Real Estate ──────────────────────────────────────────────────────────
  DLF: "dlf.in",
  GODREJPROP: "godrejproperties.com",
  OBEROIRLTY: "oberoirealty.com",
  MACROTECH: "lodhagroup.in",
  LODHA: "lodhagroup.in",
  SOBHA: "sobha.com",
  PRESTIGE: "prestigeconstructions.com",
  BRIGADE: "brigadegroup.com",
  PHOENIX: "phoenixmalls.com",
  ANANTRAJ: "anantraj.com",
  KOLTEPATIL: "koltepatil.com",
  MAHLIFE: "mahindralifespaces.com",
  SUNTECK: "sunteckrealty.com",
  GODREJ: "godrejproperties.com",
  RAYMOND: "raymond.in",

  // ── Chemicals ────────────────────────────────────────────────────────────
  DEEPAKNTR: "deepaknitrite.com",
  SRF: "srf.com",
  AARTIIND: "aarti-industries.com",
  ATUL: "atul.co.in",
  COROMANDEL: "coromandel.in",
  UPL: "upl-ltd.com",
  PIIND: "piindustries.com",
  BAYERCROP: "bayer.in",
  GNFC: "gnfc.in",
  GSFC: "gsfclimited.com",
  NAVINFLOUR: "navinfluorine.com",
  CLEAN: "cleanscience.co.in",
  VINATIORG: "vinatiorganics.com",
  ROSSARI: "rossari.com",
  SUDARSCHEM: "sudarshanchemical.com",
  ALKYLAMINE: "alkylamines.com",
  BALCHEMLTE: "balajichem.com",
  FINEORG: "fineorganics.com",
  NOCIL: "nocil.com",
  APCOTEX: "apcotex.com",
  GALAXY: "galaxysurfactants.com",
  IOLCP: "iolcp.com",
  TATML: "tatachemi.com",
  CHEMPLAST: "chemplastcorp.com",
  DCAL: "dcal.in",

  // ── Agriculture / Fertilisers ────────────────────────────────────────────
  KRBL: "krblrice.com",
  BALRAMCHIN: "chini.com",
  TRIVENI: "trivenigroup.com",
  RENUKA: "renukasugars.com",
  EIDPARRY: "eidparry.com",
  FACT: "fact.co.in",
  RCFL: "rcfltd.com",
  NFL: "nationalfertilizers.com",
  CHAMBAL: "chambalfertilisers.com",
  DEEPAKFERT: "deepakfertilisers.com",
  KSCL: "kaveriseeds.com",

  // ── Electricals / Cables / Wires ─────────────────────────────────────────
  POLYCAB: "polycab.com",
  KEI: "kei-ind.com",
  HAVELLS: "havells.com",
  VOLTAS: "voltas.com",
  BLUESTARCO: "bluestarindia.com",
  SYMPHONY: "symphonylimited.com",
  CROMPTON: "cromptonindia.com",
  WHIRLPOOL: "whirlpoolindia.com",
  ASTRAL: "astralpipes.com",
  SUPREMEIND: "supremeindustries.com",
  FINOLEX: "finolexpipes.com",
  FINOLEXCAB: "finolexcables.com",
  APAR: "aparindustries.com",
  STERLITE: "sterlitepower.com",
  BSECAL: "bse-cal.com",

  // ── Metals & Mining ──────────────────────────────────────────────────────
  VEDL: "vedantalimited.com",
  HINDZINC: "hindustanzinc.com",
  NATIONALUM: "nalcoindia.com",
  NALCO: "nalcoindia.com",
  MOIL: "moil.nic.in",
  HINDCOPPER: "hindustancopper.com",
  APARINDS: "aparindustries.com",
  RATNAMANI: "ratnamanimetals.com",
  WELSPUNIND: "welspun.com",
  WELCORP: "welspuncorp.com",
  GALLANTT: "gallanttmetal.com",
  NSLNISP: "nslsteels.com",
  JSPSTEEL: "jsw.in",

  // ── Telecom / Media ──────────────────────────────────────────────────────
  HFCL: "hfcl.com",
  ITI: "itiltd.in",
  IDEA: "myvi.in",
  PVRINOX: "pvrcinemas.com",
  SUNTV: "suntv.in",
  ZEEL: "zee.com",
  NETWORK18: "nw18.com",
  TV18BRDCST: "tv18.com",
  DISHTV: "dishtv.in",
  SAREGAMA: "saregama.com",
  INOX: "inoxmovies.com",

  // ── Defence ──────────────────────────────────────────────────────────────
  PARAS: "parasdefence.com",
  IDEAFORGE: "ideaforgetech.com",
  SOLARIND: "solarindustries.com",
  ASTRAZEN: "astrazeneca.com",

  // ── Hotels / Hospitality ─────────────────────────────────────────────────
  INDHOTEL: "tajhotels.com",
  EIHOTEL: "eih.in",
  LEMON: "lemontreehotels.com",
  CHALET: "chalethotels.com",
  MAHINDRAHOLI: "clubmahindra.com",
  THOMASCOOK: "thomascook.in",
  SOTL: "ksolaris.com",

  // ── Textiles ─────────────────────────────────────────────────────────────
  VARDHMAN: "vardhman.com",
  ALOKIND: "alokind.com",
  TRIDENT: "tridentgroup.com",
  KPR: "kprmill.com",
  MAFANG: "miraeassetmf.com",
  HIMATSEIDE: "himatsingka.com",

  // ── Logistics ────────────────────────────────────────────────────────────
  VRL: "vrlgroup.in",
  GATI: "gati.com",
  BLUEDART: "bluedart.com",
  DELHIVERY: "delhivery.com",
  MAHLOG: "mahindralogistics.com",
  TCI: "tcil.com",
  ALLCARGO: "allcargologistics.com",
  CONTAINERC: "concorindia.com",
  CONCOR: "concorindia.com",

  // ── ETFs / Index Funds ────────────────────────────────────────────────────
  NIFTYBEES: "nipponindiaim.com",
  JUNIORBEES: "nipponindiaim.com",
  GOLDBEES: "nipponindiaim.com",
  LIQUIDBEES: "nipponindiaim.com",
  BANKBEES: "nipponindiaim.com",
  PSUBNKBEES: "nipponindiaim.com",
  INFRABEES: "nipponindiaim.com",
  CPSE: "nipponindiaim.com",
  NETF: "nipponindiaim.com",
  ICICINXT50: "icicimf.com",
  ICICIB22: "icicimf.com",
  ICICISENSX: "icicimf.com",
  SETFNIF50: "sbimf.com",
  SETFNN50: "sbimf.com",
  SETFGOLD: "sbimf.com",
  HDFCNIFTY: "hdfcmf.com",
  HDFCSENSEX: "hdfcmf.com",
  AXISBPSETF: "axismf.com",
  MOM100: "motilaloswalmf.com",
  MOM50: "motilaloswalmf.com",
  MOM30: "motilaloswalmf.com",
  MIDCAPETF: "nipponindiaim.com",
  QNIFTY: "quantummf.com",
  ITBEES: "nipponindiaim.com",
  PHARMABEES: "nipponindiaim.com",
  AUTOBEES: "nipponindiaim.com",
  SHARIABEES: "nipponindiaim.com",
  UTINIFTETF: "utimf.com",
  UTISENSETF: "utimf.com",
  LICNFNHGP: "licindia.in",
  KOTAKGOLD: "kotak.com",
  KOTAKNIFTY: "kotak.com",
  KOTAKBKETF: "kotak.com",
  ABSLBANETF: "adityabirlamf.com",
  ABSLNN50ET: "adityabirlamf.com",
  MIRAERASETF: "miraeassetmf.com",
  MIRAE_ASSET: "miraeassetmf.com",
  CPSEETF: "sbimf.com",
  NV20: "nipponindiaim.com",
  ALPHA: "nipponindiaim.com",
  LOWVOL: "nipponindiaim.com",
  QUAL30: "nipponindiaim.com",
  MOVALUE: "motilaloswalmf.com",
  MOQUALITY: "motilaloswalmf.com",
  MONIFTY500: "motilaloswalmf.com",
  ITETF: "sbimf.com",
  CONSUMIETF: "sbimf.com",

  // ── New-age Tech / Startup Listings ──────────────────────────────────────
  AFFLE: "affle.com",
  NAZARA: "nazara.com",
  EASEMYTRIP: "easemytrip.com",
  CARTRADE: "cartrade.com",
  DROOM: "droom.in",
  CMSINFO: "cmsinfotech.com",
  MAPMYINDIA: "mappls.com",
  CAMPUS: "campusshoes.com",
  VEDANT: "manyavar.com",
  MANYAVAR: "manyavar.com",
  DOMS: "domsindia.com",
  SENCO: "sencogold.com",
  KAYNES: "kaynes.in",
  SANSERA: "sanseragroup.com",
  ROLEX: "rolexrings.com",
  BIKAJI: "bikaji.com",
  DRONEACHARYA: "droneacharya.com",
  YATHARTH: "yatharthhospital.com",

  // ── MFI / Small Finance ───────────────────────────────────────────────────
  CREDITACC: "creditaccess.in",
  SPANDANA: "spandanasphoorty.in",
  ARMANFIN: "armanfin.com",
  PGEL: "pgeindia.com",
  FUSION: "fusionmicrofinance.com",
  IIFL: "iiflfinance.com",
  IIFLFIN: "iiflfinance.com",
  UGROCAP: "ugrocapital.com",
  FIVESTAR: "fivestargroup.in",
  SBFC: "sbfc.in",

  // ── Infrastructure / Utilities ────────────────────────────────────────────
  MGL: "mahanagargas.com",
  IGL: "iglonline.net",
  GSPL: "gspetronet.com",
  PETRONET: "petronetlng.com",
  AEGISCHEM: "aegislogistics.com",
  GUJGASLTD: "gujaratgas.com",
  GULFOILLUB: "gulfoil.in",
};

async function resolveWithTwelveData(base, exchange, apiKey) {
  const exch = /BO/i.test(exchange) ? "BSE" : "NSE";
  const url = `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(base)}&exchange=${exch}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.url || null;
}

function resolveWithEODHD(base, isBSE) {
  // Return the CDN URL directly — the client-side <img onError> handles missing logos.
  // Skipping the HEAD check removes a server-side round-trip and avoids false negatives
  // caused by content-length thresholds rejecting legitimate small logos.
  const exch = isBSE ? "BSE" : "NSE";
  return `https://eodhd.com/img/logos/${exch}/${base}.png`;
}

async function resolveWithYahoo(symbol) {
  try {
    const summary = await yf.quoteSummary(
      symbol,
      { modules: ["assetProfile"] },
      { validateResult: false }
    );
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
  if (!/^[A-Z0-9.\-&]+$/i.test(String(symbol)))
    return res.status(400).json({ error: "invalid symbol" });

  const sym = String(symbol);
  const base = sym.replace(/\.(NS|BO)$/i, "");
  const isBSE = /\.BO$/i.test(sym);
  const exchange = isBSE ? "BSE" : "NSE";

  let logoUrl = null;
  let faviconUrl = null;

  // Priority 1: High-coverage local mapping
  // logoUrl  = Hunter.io logos — good coverage, returns clean 404 so client fallback chain works
  // faviconUrl = Google Favicon — always returns something, used as secondary fallback
  const baseUpper = base.toUpperCase();
  if (STOCK_DOMAINS[baseUpper]) {
    const domain = STOCK_DOMAINS[baseUpper];
    logoUrl = `https://logos.hunter.io/${domain}`;
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  }

  // Priority 2: Twelve Data (if API key configured)
  if (!logoUrl) {
    const tdKey = process.env.TWELVE_DATA_KEY;
    if (tdKey) {
      logoUrl = await resolveWithTwelveData(base, exchange, tdKey);
    }
  }

  // Priority 3: EODHD public CDN (direct URL, no HEAD check)
  if (!logoUrl) {
    logoUrl = resolveWithEODHD(base, isBSE);
  }

  // Priority 4: Yahoo Finance website domain favicon fallback
  if (!faviconUrl) {
    faviconUrl = await resolveWithYahoo(sym);
  }

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ logoUrl, faviconUrl });
};
