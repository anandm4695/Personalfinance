import React, { useState, useEffect } from "react";
import { THEME } from "../../utils/constants";
import { normalizeStockBase, resolveStockDomain, resolveGrowwSymbol } from "../../utils/stockDomains";

export interface BrandInfo {
  domain: string;
  name: string;
  color?: string;
  localSvg?: string;
  growwSym?: string; // High-resolution 256×256 WebP vector asset on Groww CDN
  isPrimaryInstitution?: boolean;
}

// Comprehensive registry of Indian and Global financial brands,
// ensuring the EXACT same crystal-clear, authentic logo appears across
// Banks, Transactions, Credit Cards, Demat Brokers, Investments, and Insurance.
export const CANONICAL_BRANDS: Record<string, BrandInfo> = {
  // ── Public & Private Sector Banks (Priority 1) ────────────────────────────
  "state bank of india": { domain: "sbi.co.in", growwSym: "SBIN", name: "State Bank of India", color: "#1a3b8b", isPrimaryInstitution: true },
  "punjab national bank": { domain: "pnbindia.in", growwSym: "PNB", name: "Punjab National Bank", color: "#a20f26", isPrimaryInstitution: true },
  "bank of baroda": { domain: "bankofbaroda.in", growwSym: "BANKBARODA", name: "Bank of Baroda", color: "#f26522", isPrimaryInstitution: true },
  "bank of india": { domain: "bankofindia.co.in", growwSym: "BANKINDIA", name: "Bank of India", color: "#00529b", isPrimaryInstitution: true },
  "central bank of india": { domain: "centralbankofindia.co.in", growwSym: "CENTRALBK", name: "Central Bank of India", color: "#1e3a8a", isPrimaryInstitution: true },
  "indian overseas bank": { domain: "iob.in", growwSym: "IOB", name: "Indian Overseas Bank", color: "#003b70", isPrimaryInstitution: true },
  "punjab & sind": { domain: "punjabandsindbank.co.in", growwSym: "PSB", name: "Punjab & Sind Bank", color: "#d97706", isPrimaryInstitution: true },
  "punjab and sind": { domain: "punjabandsindbank.co.in", growwSym: "PSB", name: "Punjab & Sind Bank", color: "#d97706", isPrimaryInstitution: true },
  "south indian bank": { domain: "southindianbank.com", growwSym: "SOUTHBANK", name: "South Indian Bank", color: "#b91c1c", isPrimaryInstitution: true },
  "city union bank": { domain: "cityunionbank.com", growwSym: "CUB", name: "City Union Bank", color: "#0284c7", isPrimaryInstitution: true },
  "jammu & kashmir": { domain: "jkbank.com", growwSym: "JKLAKSHMI", name: "J&K Bank", color: "#0f766e", isPrimaryInstitution: true },
  "karnataka bank": { domain: "karnatakabank.com", growwSym: "KTKBANK", name: "Karnataka Bank", color: "#9a3412", isPrimaryInstitution: true },
  "dhanlaxmi bank": { domain: "dhanbank.com", growwSym: "DHANBANK", name: "Dhanlaxmi Bank", color: "#7c2d12", isPrimaryInstitution: true },
  "saraswat bank": { domain: "saraswatbank.com", name: "Saraswat Bank", color: "#b45309", isPrimaryInstitution: true },
  "cosmos bank": { domain: "cosmosbank.com", name: "Cosmos Bank", color: "#1d4ed8", isPrimaryInstitution: true },
  "idfc first bank": { domain: "idfcfirstbank.com", growwSym: "IDFCFIRSTB", name: "IDFC FIRST Bank", color: "#9e1b32", isPrimaryInstitution: true },
  "idfc first": { domain: "idfcfirstbank.com", growwSym: "IDFCFIRSTB", name: "IDFC FIRST Bank", color: "#9e1b32", isPrimaryInstitution: true },
  "idfc bank": { domain: "idfcfirstbank.com", growwSym: "IDFCFIRSTB", name: "IDFC FIRST Bank", color: "#9e1b32", isPrimaryInstitution: true },
  "au small finance": { domain: "aubank.in", growwSym: "AUBANK", name: "AU Small Finance Bank", color: "#4b286d", isPrimaryInstitution: true },
  "equitas small finance": { domain: "equitasbank.com", growwSym: "EQUITASBNK", name: "Equitas Small Finance Bank", color: "#006699", isPrimaryInstitution: true },
  "state bank": { domain: "sbi.co.in", growwSym: "SBIN", name: "State Bank of India", color: "#1a3b8b", isPrimaryInstitution: true },
  "sbi bank": { domain: "sbi.co.in", growwSym: "SBIN", name: "State Bank of India", color: "#1a3b8b", isPrimaryInstitution: true },
  "punjab national": { domain: "pnbindia.in", growwSym: "PNB", name: "Punjab National Bank", color: "#a20f26", isPrimaryInstitution: true },
  "union bank": { domain: "unionbankofindia.co.in", growwSym: "UNIONBANK", name: "Union Bank of India", color: "#e31e24", isPrimaryInstitution: true },
  "central bank": { domain: "centralbankofindia.co.in", growwSym: "CENTRALBK", name: "Central Bank of India", color: "#1e3a8a", isPrimaryInstitution: true },
  "indian bank": { domain: "indianbank.in", growwSym: "INDIANB", name: "Indian Bank", color: "#00529b", isPrimaryInstitution: true },
  "karur vysya": { domain: "kvb.co.in", growwSym: "KARURVYSYA", name: "Karur Vysya Bank", color: "#0284c7", isPrimaryInstitution: true },
  "canara bank": { domain: "canarabank.com", growwSym: "CANBK", name: "Canara Bank", color: "#0090d0", isPrimaryInstitution: true },
  "federal bank": { domain: "federalbank.co.in", growwSym: "FEDERALBNK", name: "Federal Bank", color: "#004182", isPrimaryInstitution: true },
  "bandhan bank": { domain: "bandhanbank.com", growwSym: "BANDHANBNK", name: "Bandhan Bank", color: "#004b87", isPrimaryInstitution: true },
  "rbl bank": { domain: "rblbank.com", growwSym: "RBLBANK", name: "RBL Bank", color: "#0c2340", isPrimaryInstitution: true },
  "kotak mahindra": { domain: "kotak.com", growwSym: "KOTAKBANK", name: "Kotak Mahindra Bank", color: "#ed1c24", isPrimaryInstitution: true },
  "kotak bank": { domain: "kotak.com", growwSym: "KOTAKBANK", name: "Kotak Mahindra Bank", color: "#ed1c24", isPrimaryInstitution: true },
  "indusind bank": { domain: "indusind.com", growwSym: "INDUSINDBK", name: "IndusInd Bank", color: "#84191d", isPrimaryInstitution: true },
  "standard chartered": { domain: "sc.com", name: "Standard Chartered", color: "#007934", isPrimaryInstitution: true },
  "yes bank": { domain: "yesbank.in", growwSym: "YESBANK", name: "YES Bank", color: "#003a70", isPrimaryInstitution: true },
  "post office": { domain: "ippbonline.com", name: "India Post", color: "#d8232a", isPrimaryInstitution: true },
  "india post": { domain: "ippbonline.com", name: "India Post", color: "#d8232a", isPrimaryInstitution: true },
  "paytm payments": { domain: "paytm.com", growwSym: "PAYTM", name: "Paytm Payments Bank", color: "#00baf2", isPrimaryInstitution: true },
  "airtel payments": { domain: "airtel.in", growwSym: "BHARTIARTL", name: "Airtel Payments Bank", color: "#e40000", isPrimaryInstitution: true },
  indusind: { domain: "indusind.com", growwSym: "INDUSINDBK", name: "IndusInd Bank", color: "#84191d", isPrimaryInstitution: true },
  indusland: { domain: "indusind.com", growwSym: "INDUSINDBK", name: "IndusInd Bank", color: "#84191d", isPrimaryInstitution: true },
  canara: { domain: "canarabank.com", growwSym: "CANBK", name: "Canara Bank", color: "#0090d0", isPrimaryInstitution: true },
  federal: { domain: "federalbank.co.in", growwSym: "FEDERALBNK", name: "Federal Bank", color: "#004182", isPrimaryInstitution: true },
  equitas: { domain: "equitasbank.com", growwSym: "EQUITASBNK", name: "Equitas Small Finance Bank", color: "#006699", isPrimaryInstitution: true },
  bandhan: { domain: "bandhanbank.com", growwSym: "BANDHANBNK", name: "Bandhan Bank", color: "#004b87", isPrimaryInstitution: true },
  hdfc: { domain: "hdfcbank.com", growwSym: "HDFCBANK", name: "HDFC Bank", color: "#004c8f", isPrimaryInstitution: true },
  icici: { domain: "icicibank.com", growwSym: "ICICIBANK", name: "ICICI Bank", color: "#b02a30", isPrimaryInstitution: true },
  axis: { domain: "axisbank.com", growwSym: "AXISBANK", name: "Axis Bank", color: "#97144d", isPrimaryInstitution: true },
  kotak: { domain: "kotak.com", growwSym: "KOTAKBANK", name: "Kotak Mahindra", color: "#ed1c24", isPrimaryInstitution: true },
  idbi: { domain: "idbibank.in", growwSym: "IDBI", name: "IDBI Bank", color: "#005a3c", isPrimaryInstitution: true },
  idfc: { domain: "idfcfirstbank.com", growwSym: "IDFCFIRSTB", name: "IDFC FIRST", color: "#9e1b32", isPrimaryInstitution: true },
  rbl: { domain: "rblbank.com", growwSym: "RBLBANK", name: "RBL Bank", color: "#0c2340", isPrimaryInstitution: true },
  citi: { domain: "citi.com", name: "Citi", color: "#003b70", isPrimaryInstitution: true },
  hsbc: { domain: "hsbc.com", name: "HSBC", color: "#db0011", isPrimaryInstitution: true },
  dbs: { domain: "dbs.com", name: "DBS Bank", color: "#e61e28", isPrimaryInstitution: true },
  pnb: { domain: "pnbindia.in", growwSym: "PNB", name: "PNB", color: "#a20f26", isPrimaryInstitution: true },
  bob: { domain: "bankofbaroda.in", growwSym: "BANKBARODA", name: "Bank of Baroda", color: "#f26522", isPrimaryInstitution: true },
  boi: { domain: "bankofindia.co.in", growwSym: "BANKINDIA", name: "Bank of India", color: "#00529b", isPrimaryInstitution: true },
  iob: { domain: "iob.in", growwSym: "IOB", name: "Indian Overseas Bank", color: "#003b70", isPrimaryInstitution: true },
  uco: { domain: "ucobank.com", growwSym: "UCOBANK", name: "UCO Bank", color: "#00529b", isPrimaryInstitution: true },
  kvb: { domain: "kvb.co.in", growwSym: "KARURVYSYA", name: "Karur Vysya Bank", color: "#0284c7", isPrimaryInstitution: true },
  sib: { domain: "southindianbank.com", growwSym: "SOUTHBANK", name: "South Indian Bank", color: "#b91c1c", isPrimaryInstitution: true },
  cub: { domain: "cityunionbank.com", growwSym: "CUB", name: "City Union Bank", color: "#0284c7", isPrimaryInstitution: true },
  jkb: { domain: "jkbank.com", growwSym: "JKLAKSHMI", name: "J&K Bank", color: "#0f766e", isPrimaryInstitution: true },
  ippb: { domain: "ippbonline.com", name: "India Post Payments Bank", color: "#d8232a", isPrimaryInstitution: true },
  epfo: { domain: "epfindia.gov.in", name: "EPFO", color: "#005b94", isPrimaryInstitution: true },
  sbi: { domain: "sbi.co.in", growwSym: "SBIN", name: "State Bank of India", color: "#1a3b8b", isPrimaryInstitution: true },
  au: { domain: "aubank.in", growwSym: "AUBANK", name: "AU Bank", color: "#4b286d", isPrimaryInstitution: true },
  fi: { domain: "fi.money", name: "Fi Money", color: "#00d09c", isPrimaryInstitution: true },
  sc: { domain: "sc.com", name: "Standard Chartered", color: "#007934", isPrimaryInstitution: true },

  // ── Insurance Companies ───────────────────────────────────────────────────
  lic: { domain: "licindia.in", localSvg: "/lic-logo.svg", name: "Life Insurance Corporation of India (LIC)", color: "#1d4e9e", isPrimaryInstitution: true },
  "life insurance corporation": { domain: "licindia.in", localSvg: "/lic-logo.svg", name: "Life Insurance Corporation of India (LIC)", color: "#1d4e9e", isPrimaryInstitution: true },
  "lic of india": { domain: "licindia.in", localSvg: "/lic-logo.svg", name: "Life Insurance Corporation of India (LIC)", color: "#1d4e9e", isPrimaryInstitution: true },
  "lic india": { domain: "licindia.in", localSvg: "/lic-logo.svg", name: "Life Insurance Corporation of India (LIC)", color: "#1d4e9e", isPrimaryInstitution: true },
  "aditya birla sun life": { domain: "adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Sun Life", color: "#a51c24", isPrimaryInstitution: true },
  "aditya birla capital": { domain: "adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Capital", color: "#a51c24", isPrimaryInstitution: true },
  "aditya birla health": { domain: "adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Health Insurance", color: "#a51c24", isPrimaryInstitution: true },
  "aditya birla": { domain: "adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Sun Life", color: "#a51c24", isPrimaryInstitution: true },
  absli: { domain: "adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Sun Life", color: "#a51c24", isPrimaryInstitution: true },
  birla: { domain: "adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Sun Life", color: "#a51c24", isPrimaryInstitution: true },
  "star health": { domain: "starhealth.in", growwSym: "STARHEALTH", name: "Star Health Insurance", color: "#183884", isPrimaryInstitution: true },
  "care health": { domain: "careinsurance.com", name: "Care Health Insurance", color: "#00838f", isPrimaryInstitution: true },
  "care insurance": { domain: "careinsurance.com", name: "Care Health Insurance", color: "#00838f", isPrimaryInstitution: true },
  "niva bupa": { domain: "nivabupa.com", name: "Niva Bupa Health Insurance", color: "#ea5d0b", isPrimaryInstitution: true },
  "max bupa": { domain: "nivabupa.com", name: "Niva Bupa Health Insurance", color: "#ea5d0b", isPrimaryInstitution: true },
  "hdfc ergo": { domain: "hdfcergo.com", growwSym: "HDFCBANK", name: "HDFC ERGO", color: "#004c8f", isPrimaryInstitution: true },
  "hdfc life": { domain: "hdfclife.com", growwSym: "HDFCLIFE", name: "HDFC Life Insurance", color: "#004c8f", isPrimaryInstitution: true },
  "icici lombard": { domain: "icicilombard.com", growwSym: "ICICIGI", name: "ICICI Lombard", color: "#b02a30", isPrimaryInstitution: true },
  "icici prudential": { domain: "iciciprulife.com", growwSym: "ICICIPRULI", name: "ICICI Prudential Life", color: "#b02a30", isPrimaryInstitution: true },
  "icici pru": { domain: "iciciprulife.com", growwSym: "ICICIPRULI", name: "ICICI Prudential", color: "#b02a30", isPrimaryInstitution: true },
  "sbi life": { domain: "sbilife.co.in", growwSym: "SBILIFE", name: "SBI Life Insurance", color: "#1a3b8b", isPrimaryInstitution: true },
  "sbi general": { domain: "sbigeneral.in", growwSym: "SBIN", name: "SBI General Insurance", color: "#1a3b8b", isPrimaryInstitution: true },
  "tata aig": { domain: "tataaig.com", name: "Tata AIG General Insurance", color: "#1d4ed8", isPrimaryInstitution: true },
  "tata aia": { domain: "tataaia.com", name: "Tata AIA Life Insurance", color: "#1d4ed8", isPrimaryInstitution: true },
  "bajaj allianz life": { domain: "bajajallianzlife.com", growwSym: "BAJAJFINSV", name: "Bajaj Allianz Life", color: "#005a9c", isPrimaryInstitution: true },
  "bajaj allianz": { domain: "bajajallianz.com", growwSym: "BAJAJFINSV", name: "Bajaj Allianz", color: "#005a9c", isPrimaryInstitution: true },
  "new india assurance": { domain: "newindia.co.in", growwSym: "NIACL", name: "New India Assurance", color: "#1e3a8a", isPrimaryInstitution: true },
  "oriental insurance": { domain: "orientalinsurance.org.in", name: "Oriental Insurance", color: "#006699", isPrimaryInstitution: true },
  "united india": { domain: "uiic.co.in", name: "United India Insurance", color: "#b45309", isPrimaryInstitution: true },
  "national insurance": { domain: "nationalinsurance.nic.co.in", name: "National Insurance", color: "#0f766e", isPrimaryInstitution: true },
  manipalcigna: { domain: "manipalcigna.com", name: "ManipalCigna Health Insurance", color: "#007fa8", isPrimaryInstitution: true },
  "max life": { domain: "maxlifeinsurance.com", growwSym: "MAXHEALTH", name: "Max Life Insurance", color: "#003b70", isPrimaryInstitution: true },
  "pnb metlife": { domain: "pnbmetlife.com", growwSym: "PNB", name: "PNB MetLife", color: "#a20f26", isPrimaryInstitution: true },
  acko: { domain: "acko.com", name: "Acko General Insurance", color: "#6c5ce7", isPrimaryInstitution: true },
  navi: { domain: "navi.com", name: "Navi Insurance", color: "#00d09c", isPrimaryInstitution: true },
  digit: { domain: "godigit.com", growwSym: "GODIGIT", name: "Go Digit Insurance", color: "#ffb703", isPrimaryInstitution: true },

  // ── Demat Brokers & Fintechs ─────────────────────────────────────────────
  zerodha: { domain: "zerodha.com", name: "Zerodha", color: "#387ed1", isPrimaryInstitution: true },
  kite: { domain: "zerodha.com", name: "Zerodha Kite", color: "#387ed1", isPrimaryInstitution: true },
  groww: { domain: "groww.in", name: "Groww", color: "#00b899", isPrimaryInstitution: true },
  upstox: { domain: "upstox.com", name: "Upstox", color: "#53297a", isPrimaryInstitution: true },
  "angel one": { domain: "angelone.in", growwSym: "ANGELONE", name: "Angel One", color: "#ff5722", isPrimaryInstitution: true },
  angel: { domain: "angelone.in", growwSym: "ANGELONE", name: "Angel One", color: "#ff5722", isPrimaryInstitution: true },
  "motilal oswal": { domain: "motilaloswal.com", growwSym: "MOTILALOFS", name: "Motilal Oswal", color: "#d97706", isPrimaryInstitution: true },
  motilal: { domain: "motilaloswal.com", growwSym: "MOTILALOFS", name: "Motilal Oswal", color: "#d97706", isPrimaryInstitution: true },
  "5paisa": { domain: "5paisa.com", growwSym: "5PAISA", name: "5paisa", color: "#0891b2", isPrimaryInstitution: true },
  sharekhan: { domain: "sharekhan.com", name: "Sharekhan", color: "#059669", isPrimaryInstitution: true },
  fyers: { domain: "fyers.in", name: "FYERS", color: "#0f172a", isPrimaryInstitution: true },
  dhan: { domain: "dhan.co", name: "Dhan", color: "#7c3aed", isPrimaryInstitution: true },
  iifl: { domain: "iiflsecurities.com", growwSym: "IIFL", name: "IIFL Securities", color: "#b45309", isPrimaryInstitution: true },
  ninestar: { domain: "9star.in", name: "Nine Star Broking", color: "#0284c7", isPrimaryInstitution: true },
  "9star": { domain: "9star.in", name: "Nine Star Broking", color: "#0284c7", isPrimaryInstitution: true },
  "nine star": { domain: "9star.in", name: "Nine Star Broking", color: "#0284c7", isPrimaryInstitution: true },

  // ── Mutual Fund AMCs ──────────────────────────────────────────────────────
  nippon: { domain: "nipponindiaim.com", growwSym: "NAM-INDIA", name: "Nippon India Mutual Fund", color: "#d90429", isPrimaryInstitution: true },
  parag: { domain: "ppfas.com", name: "Parag Parikh Mutual Fund", color: "#2b2d42", isPrimaryInstitution: true },
  ppfas: { domain: "ppfas.com", name: "PPFAS Mutual Fund", color: "#2b2d42", isPrimaryInstitution: true },
  mirae: { domain: "miraeassetmf.co.in", name: "Mirae Asset Mutual Fund", color: "#003b70", isPrimaryInstitution: true },
  quant: { domain: "quantmutual.com", name: "Quant Mutual Fund", color: "#00a896", isPrimaryInstitution: true },
  uti: { domain: "utimf.com", growwSym: "UTIAMC", name: "UTI Mutual Fund", color: "#005b94", isPrimaryInstitution: true },
  dsp: { domain: "dspim.com", name: "DSP Mutual Fund", color: "#002d62", isPrimaryInstitution: true },
  edelweiss: { domain: "edelweissmf.com", growwSym: "EDELWEISS", name: "Edelweiss Mutual Fund", color: "#1d4ed8", isPrimaryInstitution: true },
  franklin: { domain: "franklintempletonindia.com", name: "Franklin Templeton", color: "#004b87", isPrimaryInstitution: true },
  invesco: { domain: "invescomutualfund.com", name: "Invesco Mutual Fund", color: "#00386b", isPrimaryInstitution: true },
  sundaram: { domain: "sundarammutual.com", name: "Sundaram Mutual Fund", color: "#b45309", isPrimaryInstitution: true },
  whiteoak: { domain: "whiteoakamc.com", name: "WhiteOak Capital", color: "#1c1c1c", isPrimaryInstitution: true },
  absl: { domain: "mutualfund.adityabirlacapital.com", growwSym: "ABCAPITAL", name: "Aditya Birla Sun Life AMC", color: "#a51c24", isPrimaryInstitution: true },

  // ── Cards, Wallets, Fintechs & Co-Brand Partners (Priority 2) ─────────────
  jupiter: { domain: "jupiter.money", name: "Jupiter Money", color: "#ff5247" },
  onecard: { domain: "getonecard.com", name: "OneCard", color: "#1c1c1c" },
  slice: { domain: "sliceit.com", name: "Slice", color: "#8338ec" },
  airtel: { domain: "airtel.in", growwSym: "BHARTIARTL", name: "Airtel", color: "#e40000" },
  paytm: { domain: "paytm.com", growwSym: "PAYTM", name: "Paytm", color: "#00baf2" },
  sodexo: { domain: "sodexo.com", name: "Sodexo", color: "#ed1c24" },
  niyo: { domain: "goniyo.com", name: "Niyo", color: "#00d09c" },
  omnicard: { domain: "omnicard.in", name: "OmniCard", color: "#0f172a" },
  phonepe: { domain: "phonepe.com", name: "PhonePe", color: "#5f259f" },
  mobikwik: { domain: "mobikwik.com", name: "MobiKwik", color: "#0070ba" },
  cred: { domain: "cred.club", name: "CRED", color: "#1c1c1c" },
  swiggy: { domain: "swiggy.com", growwSym: "SWIGGY", name: "Swiggy", color: "#fc8019" },
  zomato: { domain: "zomato.com", growwSym: "ETERNAL", name: "Zomato", color: "#cb202d" },
  amazon: { domain: "amazon.in", name: "Amazon", color: "#ff9900" },
  flipkart: { domain: "flipkart.com", name: "Flipkart", color: "#2874f0" },
  myntra: { domain: "myntra.com", name: "Myntra", color: "#ff3f6c" },
  tataneu: { domain: "tatadigital.com", growwSym: "TATACONSUM", name: "Tata Neu", color: "#8338ec" },

  // ── Automotive Manufacturers & Electric Mobility (Priority 1) ─────────────
  "tata motors": { domain: "tatamotors.com", growwSym: "TATAMOTORS", name: "Tata Motors", color: "#1d2671", isPrimaryInstitution: true },
  "maruti suzuki": { domain: "marutisuzuki.com", growwSym: "MARUTI", name: "Maruti Suzuki", color: "#003087", isPrimaryInstitution: true },
  maruti: { domain: "marutisuzuki.com", growwSym: "MARUTI", name: "Maruti Suzuki", color: "#003087", isPrimaryInstitution: true },
  "mahindra & mahindra": { domain: "mahindra.com", growwSym: "M&M", name: "Mahindra", color: "#e31837", isPrimaryInstitution: true },
  "mahindra and mahindra": { domain: "mahindra.com", growwSym: "M&M", name: "Mahindra", color: "#e31837", isPrimaryInstitution: true },
  mahindra: { domain: "mahindra.com", growwSym: "M&M", name: "Mahindra", color: "#e31837", isPrimaryInstitution: true },
  "m&m": { domain: "mahindra.com", growwSym: "M&M", name: "Mahindra", color: "#e31837", isPrimaryInstitution: true },
  hyundai: { domain: "hyundai.com", growwSym: "HYUNDAI", name: "Hyundai Motor", color: "#002c5f", isPrimaryInstitution: true },
  "hyundai motor": { domain: "hyundai.com", growwSym: "HYUNDAI", name: "Hyundai Motor", color: "#002c5f", isPrimaryInstitution: true },
  toyota: { domain: "toyota.com", name: "Toyota", color: "#eb0a1e", isPrimaryInstitution: true },
  "toyota kirloskar": { domain: "toyotabharat.com", name: "Toyota", color: "#eb0a1e", isPrimaryInstitution: true },
  honda: { domain: "honda.com", name: "Honda", color: "#cc0000", isPrimaryInstitution: true },
  "honda cars": { domain: "hondacarindia.com", name: "Honda Cars", color: "#cc0000", isPrimaryInstitution: true },
  "honda 2wheelers": { domain: "honda2wheelersindia.com", name: "Honda 2Wheelers", color: "#cc0000", isPrimaryInstitution: true },
  "hero motocorp": { domain: "heromotocorp.com", growwSym: "HEROMOTOCO", name: "Hero MotoCorp", color: "#002868", isPrimaryInstitution: true },
  hero: { domain: "heromotocorp.com", growwSym: "HEROMOTOCO", name: "Hero MotoCorp", color: "#002868", isPrimaryInstitution: true },
  "bajaj auto": { domain: "bajajauto.com", growwSym: "BAJAJ-AUTO", name: "Bajaj Auto", color: "#1a2b6b", isPrimaryInstitution: true },
  bajaj: { domain: "bajajauto.com", growwSym: "BAJAJ-AUTO", name: "Bajaj Auto", color: "#1a2b6b", isPrimaryInstitution: true },
  "tvs motor": { domain: "tvsmotor.com", growwSym: "TVSMOTOR", name: "TVS Motor", color: "#e31e26", isPrimaryInstitution: true },
  tvs: { domain: "tvsmotor.com", growwSym: "TVSMOTOR", name: "TVS Motor", color: "#e31e26", isPrimaryInstitution: true },
  "royal enfield": { domain: "royalenfield.com", growwSym: "EICHERMOT", name: "Royal Enfield", color: "#5a3e28", isPrimaryInstitution: true },
  royalenfield: { domain: "royalenfield.com", growwSym: "EICHERMOT", name: "Royal Enfield", color: "#5a3e28", isPrimaryInstitution: true },
  kia: { domain: "kia.com", name: "Kia", color: "#ea0029", isPrimaryInstitution: true },
  "mg motor": { domain: "mgmotor.co.in", name: "MG Motor", color: "#c41230", isPrimaryInstitution: true },
  mg: { domain: "mgmotor.co.in", name: "MG Motor", color: "#c41230", isPrimaryInstitution: true },
  bmw: { domain: "bmw.com", name: "BMW", color: "#1c69d4", isPrimaryInstitution: true },
  "bmw motorrad": { domain: "bmw-motorrad.in", name: "BMW Motorrad", color: "#1c69d4", isPrimaryInstitution: true },
  "mercedes-benz": { domain: "mercedes-benz.com", name: "Mercedes-Benz", color: "#333333", isPrimaryInstitution: true },
  "mercedes benz": { domain: "mercedes-benz.com", name: "Mercedes-Benz", color: "#333333", isPrimaryInstitution: true },
  mercedes: { domain: "mercedes-benz.com", name: "Mercedes-Benz", color: "#333333", isPrimaryInstitution: true },
  audi: { domain: "audi.com", name: "Audi", color: "#bb0a30", isPrimaryInstitution: true },
  volkswagen: { domain: "volkswagen.com", name: "Volkswagen", color: "#001e50", isPrimaryInstitution: true },
  vw: { domain: "volkswagen.com", name: "Volkswagen", color: "#001e50", isPrimaryInstitution: true },
  skoda: { domain: "skoda-auto.com", name: "Škoda", color: "#4ba82e", isPrimaryInstitution: true },
  "skoda auto": { domain: "skoda-auto.com", name: "Škoda", color: "#4ba82e", isPrimaryInstitution: true },
  "ola electric": { domain: "olaelectric.com", growwSym: "OLAELEC", name: "Ola Electric", color: "#4c00c8", isPrimaryInstitution: true },
  ola: { domain: "olaelectric.com", growwSym: "OLAELEC", name: "Ola Electric", color: "#4c00c8", isPrimaryInstitution: true },
  "ather energy": { domain: "atherenergy.com", name: "Ather Energy", color: "#00b4aa", isPrimaryInstitution: true },
  ather: { domain: "atherenergy.com", name: "Ather Energy", color: "#00b4aa", isPrimaryInstitution: true },
  "revolt motors": { domain: "revoltmotors.in", name: "Revolt Motors", color: "#e11d48", isPrimaryInstitution: true },
  revolt: { domain: "revoltmotors.in", name: "Revolt Motors", color: "#e11d48", isPrimaryInstitution: true },
  "simple energy": { domain: "simpleenergy.in", name: "Simple Energy", color: "#0284c7", isPrimaryInstitution: true },
  ultraviolette: { domain: "ultraviolette.com", name: "Ultraviolette Automotive", color: "#ef4444", isPrimaryInstitution: true },
  yamaha: { domain: "yamaha-motor.com", name: "Yamaha Motor", color: "#0049cc", isPrimaryInstitution: true },
  "yamaha motor": { domain: "yamaha-motor.com", name: "Yamaha Motor", color: "#0049cc", isPrimaryInstitution: true },
  suzuki: { domain: "suzuki.com", name: "Suzuki", color: "#1a1a7c", isPrimaryInstitution: true },
  ktm: { domain: "ktm.com", name: "KTM", color: "#ff6600", isPrimaryInstitution: true },
  kawasaki: { domain: "kawasaki.com", name: "Kawasaki", color: "#00a651", isPrimaryInstitution: true },
  "harley-davidson": { domain: "harley-davidson.com", name: "Harley-Davidson", color: "#cc4400", isPrimaryInstitution: true },
  "harley davidson": { domain: "harley-davidson.com", name: "Harley-Davidson", color: "#cc4400", isPrimaryInstitution: true },
  harley: { domain: "harley-davidson.com", name: "Harley-Davidson", color: "#cc4400", isPrimaryInstitution: true },
  ducati: { domain: "ducati.com", name: "Ducati", color: "#cc0000", isPrimaryInstitution: true },
  triumph: { domain: "triumphmotorcycles.co.uk", name: "Triumph", color: "#1e293b", isPrimaryInstitution: true },
  nissan: { domain: "nissan.com", name: "Nissan", color: "#c3002f", isPrimaryInstitution: true },
  renault: { domain: "renault.com", name: "Renault", color: "#c8b700", isPrimaryInstitution: true },
  jeep: { domain: "jeep.com", name: "Jeep", color: "#1f4e2b", isPrimaryInstitution: true },
  volvo: { domain: "volvocars.com", name: "Volvo", color: "#003057", isPrimaryInstitution: true },
  jaguar: { domain: "jaguar.com", name: "Jaguar", color: "#0b3c26", isPrimaryInstitution: true },
  "land rover": { domain: "landrover.com", name: "Land Rover", color: "#005a2b", isPrimaryInstitution: true },
  "range rover": { domain: "landrover.com", name: "Range Rover", color: "#005a2b", isPrimaryInstitution: true },
  porsche: { domain: "porsche.com", name: "Porsche", color: "#d5001c", isPrimaryInstitution: true },
  ferrari: { domain: "ferrari.com", name: "Ferrari", color: "#cc0000", isPrimaryInstitution: true },
  lamborghini: { domain: "lamborghini.com", name: "Lamborghini", color: "#d4af37", isPrimaryInstitution: true },
  tesla: { domain: "tesla.com", name: "Tesla", color: "#e82127", isPrimaryInstitution: true },
  byd: { domain: "byd.com", name: "BYD", color: "#cc0000", isPrimaryInstitution: true },
  citroen: { domain: "citroen.com", name: "Citroën", color: "#6b21a8", isPrimaryInstitution: true },
  "force motors": { domain: "forcemotors.com", growwSym: "FORCEMOT", name: "Force Motors", color: "#0369a1", isPrimaryInstitution: true },
  force: { domain: "forcemotors.com", growwSym: "FORCEMOT", name: "Force Motors", color: "#0369a1", isPrimaryInstitution: true },
  isuzu: { domain: "isuzu.com", name: "Isuzu", color: "#cc0000", isPrimaryInstitution: true },
  "ashok leyland": { domain: "ashokleyland.com", growwSym: "ASHOKLEY", name: "Ashok Leyland", color: "#004080", isPrimaryInstitution: true },
  ashok: { domain: "ashokleyland.com", growwSym: "ASHOKLEY", name: "Ashok Leyland", color: "#004080", isPrimaryInstitution: true },
  bharatbenz: { domain: "bharatbenz.com", name: "BharatBenz", color: "#0284c7", isPrimaryInstitution: true },
  eicher: { domain: "eicher.in", growwSym: "EICHERMOT", name: "Eicher Motors", color: "#5a3e28", isPrimaryInstitution: true },
  jawa: { domain: "jawamotorcycles.com", name: "Jawa", color: "#831843", isPrimaryInstitution: true },
  yezdi: { domain: "jawamotorcycles.com", name: "Yezdi", color: "#b45309", isPrimaryInstitution: true },
  aprilia: { domain: "aprilia.com", name: "Aprilia", color: "#dc2626", isPrimaryInstitution: true },
  vespa: { domain: "vespa.com", name: "Vespa", color: "#0284c7", isPrimaryInstitution: true },
  tata: { domain: "tatamotors.com", growwSym: "TATAMOTORS", name: "Tata Motors", color: "#1d2671", isPrimaryInstitution: true },

  // ── Subscriptions, OTT & Streaming ─────────────────────────────────────────
  netflix: { domain: "netflix.com", name: "Netflix", color: "#e50914" },
  spotify: { domain: "spotify.com", name: "Spotify", color: "#1db954" },
  "prime video": { domain: "primevideo.com", name: "Prime Video", color: "#00a8e1" },
  "amazon prime": { domain: "primevideo.com", name: "Amazon Prime", color: "#00a8e1" },
  hotstar: { domain: "hotstar.com", name: "Disney+ Hotstar", color: "#0c2044" },
  "disney+": { domain: "hotstar.com", name: "Disney+ Hotstar", color: "#0c2044" },
  "disney hotstar": { domain: "hotstar.com", name: "Disney+ Hotstar", color: "#0c2044" },
  "disney plus": { domain: "hotstar.com", name: "Disney+ Hotstar", color: "#0c2044" },
  jiohotstar: { domain: "hotstar.com", name: "JioHotstar", color: "#0c2044" },
  "youtube premium": { domain: "youtube.com", name: "YouTube Premium", color: "#ff0000" },
  "youtube music": { domain: "music.youtube.com", name: "YouTube Music", color: "#ff0000" },
  youtube: { domain: "youtube.com", name: "YouTube", color: "#ff0000" },
  "apple tv": { domain: "tv.apple.com", name: "Apple TV+", color: "#000000" },
  "apple music": { domain: "music.apple.com", name: "Apple Music", color: "#fa243c" },
  "apple one": { domain: "apple.com", name: "Apple One", color: "#000000" },
  apple: { domain: "apple.com", name: "Apple", color: "#000000" },
  icloud: { domain: "icloud.com", name: "iCloud", color: "#3699ff" },
  jiocinema: { domain: "jiocinema.com", name: "JioCinema", color: "#d80064" },
  "jio cinema": { domain: "jiocinema.com", name: "JioCinema", color: "#d80064" },
  sonyliv: { domain: "sonyliv.com", name: "SonyLIV", color: "#000000" },
  "sony liv": { domain: "sonyliv.com", name: "SonyLIV", color: "#000000" },
  zee5: { domain: "zee5.com", name: "ZEE5", color: "#8230c6" },
  hulu: { domain: "hulu.com", name: "Hulu", color: "#1ce783" },
  max: { domain: "max.com", name: "Max", color: "#002be7" },
  hbo: { domain: "max.com", name: "HBO Max", color: "#002be7" },
  crunchyroll: { domain: "crunchyroll.com", name: "Crunchyroll", color: "#f47521" },
  mubi: { domain: "mubi.com", name: "MUBI", color: "#000000" },
  lionsgate: { domain: "lionsgateplay.com", name: "Lionsgate Play", color: "#000000" },
  "discovery+": { domain: "discoveryplus.in", name: "Discovery+", color: "#002d62" },
  discovery: { domain: "discoveryplus.in", name: "Discovery+", color: "#002d62" },
  sunnxt: { domain: "sunnxt.net", name: "Sun NXT", color: "#ed1c24" },
  "sun nxt": { domain: "sunnxt.net", name: "Sun NXT", color: "#ed1c24" },
  aha: { domain: "aha.video", name: "Aha", color: "#ff5000" },
  hoichoi: { domain: "hoichoi.tv", name: "Hoichoi", color: "#e50914" },
  mxplayer: { domain: "mxplayer.in", name: "MX Player", color: "#0072ff" },
  "mx player": { domain: "mxplayer.in", name: "MX Player", color: "#0072ff" },
  twitch: { domain: "twitch.tv", name: "Twitch", color: "#9146ff" },
  audible: { domain: "audible.in", name: "Audible", color: "#f7991c" },
  storytel: { domain: "storytel.com", name: "Storytel", color: "#ff5a36" },
  "kuku fm": { domain: "kukufm.com", name: "Kuku FM", color: "#ea1d24" },
  kukufm: { domain: "kukufm.com", name: "Kuku FM", color: "#ea1d24" },
  "pocket fm": { domain: "pocketfm.com", name: "Pocket FM", color: "#e11d48" },
  pocketfm: { domain: "pocketfm.com", name: "Pocket FM", color: "#e11d48" },
  gaana: { domain: "gaana.com", name: "Gaana", color: "#e72c30" },
  jiosaavn: { domain: "jiosaavn.com", name: "JioSaavn", color: "#2bc5b4" },
  saavn: { domain: "jiosaavn.com", name: "JioSaavn", color: "#2bc5b4" },
  wynk: { domain: "wynk.in", name: "Wynk Music", color: "#0055ff" },
  tidal: { domain: "tidal.com", name: "Tidal", color: "#000000" },
  soundcloud: { domain: "soundcloud.com", name: "SoundCloud", color: "#ff5500" },
  kindle: { domain: "amazon.in", name: "Kindle Unlimited", color: "#ff9900" },

  // ── AI & Developer Tools ──────────────────────────────────────────────────
  chatgpt: { domain: "chatgpt.com", name: "ChatGPT", color: "#10a37f" },
  openai: { domain: "openai.com", name: "OpenAI", color: "#10a37f" },
  claude: { domain: "claude.ai", name: "Claude AI", color: "#d97706" },
  anthropic: { domain: "anthropic.com", name: "Anthropic", color: "#d97706" },
  cursor: { domain: "cursor.com", name: "Cursor AI", color: "#000000" },
  perplexity: { domain: "perplexity.ai", name: "Perplexity AI", color: "#22b8cf" },
  midjourney: { domain: "midjourney.com", name: "Midjourney", color: "#000000" },
  github: { domain: "github.com", name: "GitHub", color: "#24292e" },
  copilot: { domain: "github.com", name: "GitHub Copilot", color: "#0969da" },
  gitlab: { domain: "gitlab.com", name: "GitLab", color: "#fc6d26" },
  vercel: { domain: "vercel.com", name: "Vercel", color: "#000000" },
  replit: { domain: "replit.com", name: "Replit", color: "#f26207" },
  jetbrains: { domain: "jetbrains.com", name: "JetBrains", color: "#000000" },
  supabase: { domain: "supabase.com", name: "Supabase", color: "#3ecf8e" },
  cloudflare: { domain: "cloudflare.com", name: "Cloudflare", color: "#f38020" },
  digitalocean: { domain: "digitalocean.com", name: "DigitalOcean", color: "#0080ff" },
  hetzner: { domain: "hetzner.com", name: "Hetzner", color: "#d50c2d" },
  postman: { domain: "postman.com", name: "Postman", color: "#ff6c37" },
  docker: { domain: "docker.com", name: "Docker", color: "#1d63ed" },
  aws: { domain: "aws.amazon.com", name: "AWS", color: "#ff9900" },

  // ── Cloud Storage & Productivity SaaS ─────────────────────────────────────
  "google one": { domain: "one.google.com", name: "Google One", color: "#4285f4" },
  "google drive": { domain: "drive.google.com", name: "Google Drive", color: "#0f9d58" },
  "google workspace": { domain: "workspace.google.com", name: "Google Workspace", color: "#4285f4" },
  google: { domain: "google.com", name: "Google", color: "#4285f4" },
  "microsoft 365": { domain: "microsoft.com", name: "Microsoft 365", color: "#0078d4" },
  "office 365": { domain: "microsoft.com", name: "Office 365", color: "#d83b01" },
  microsoft: { domain: "microsoft.com", name: "Microsoft", color: "#0078d4" },
  onedrive: { domain: "microsoft.com", name: "OneDrive", color: "#0078d4" },
  dropbox: { domain: "dropbox.com", name: "Dropbox", color: "#0061ff" },
  box: { domain: "box.com", name: "Box", color: "#0061d5" },
  mega: { domain: "mega.io", name: "Mega", color: "#d9272e" },
  proton: { domain: "proton.me", name: "Proton", color: "#6d4aff" },
  protonmail: { domain: "proton.me", name: "Proton Mail", color: "#6d4aff" },
  notion: { domain: "notion.so", name: "Notion", color: "#000000" },
  figma: { domain: "figma.com", name: "Figma", color: "#f24e1e" },
  slack: { domain: "slack.com", name: "Slack", color: "#4a154b" },
  zoom: { domain: "zoom.us", name: "Zoom", color: "#2d8cff" },
  canva: { domain: "canva.com", name: "Canva", color: "#00c4cc" },
  adobe: { domain: "adobe.com", name: "Adobe", color: "#ff0000" },
  photoshop: { domain: "adobe.com", name: "Adobe Photoshop", color: "#31a8ff" },
  "1password": { domain: "1password.com", name: "1Password", color: "#0a85ea" },
  bitwarden: { domain: "bitwarden.com", name: "Bitwarden", color: "#175ddc" },
  lastpass: { domain: "lastpass.com", name: "LastPass", color: "#d32d27" },
  dashlane: { domain: "dashlane.com", name: "Dashlane", color: "#0e353d" },
  nordvpn: { domain: "nordvpn.com", name: "NordVPN", color: "#4687ff" },
  expressvpn: { domain: "expressvpn.com", name: "ExpressVPN", color: "#da3940" },
  surfshark: { domain: "surfshark.com", name: "Surfshark", color: "#1cc8ff" },
  todoist: { domain: "todoist.com", name: "Todoist", color: "#e44332" },
  ticktick: { domain: "ticktick.com", name: "TickTick", color: "#4a8bfc" },
  asana: { domain: "asana.com", name: "Asana", color: "#f06a6a" },
  trello: { domain: "trello.com", name: "Trello", color: "#0079bf" },
  "monday.com": { domain: "monday.com", name: "Monday.com", color: "#ff3d57" },
  monday: { domain: "monday.com", name: "Monday.com", color: "#ff3d57" },
  clickup: { domain: "clickup.com", name: "ClickUp", color: "#7b68ee" },
  linear: { domain: "linear.app", name: "Linear", color: "#5e6ad2" },
  atlassian: { domain: "atlassian.com", name: "Atlassian", color: "#0052cc" },
  jira: { domain: "atlassian.com", name: "Jira", color: "#0052cc" },
  confluence: { domain: "atlassian.com", name: "Confluence", color: "#0052cc" },
  miro: { domain: "miro.com", name: "Miro", color: "#ffd02f" },
  loom: { domain: "loom.com", name: "Loom", color: "#625df5" },
  grammarly: { domain: "grammarly.com", name: "Grammarly", color: "#15c39a" },
  evernote: { domain: "evernote.com", name: "Evernote", color: "#00a82d" },
  obsidian: { domain: "obsidian.md", name: "Obsidian", color: "#7c3aed" },

  // ── News, Media & Learning ────────────────────────────────────────────────
  "the ken": { domain: "the-ken.com", name: "The Ken", color: "#990000" },
  ken: { domain: "the-ken.com", name: "The Ken", color: "#990000" },
  "the morning context": { domain: "themorningcontext.com", name: "The Morning Context", color: "#111827" },
  "morning context": { domain: "themorningcontext.com", name: "The Morning Context", color: "#111827" },
  "economic times": { domain: "economictimes.indiatimes.com", name: "The Economic Times", color: "#c4161c" },
  "et prime": { domain: "economictimes.indiatimes.com", name: "ET Prime", color: "#c4161c" },
  livemint: { domain: "livemint.com", name: "Livemint", color: "#f37023" },
  mint: { domain: "livemint.com", name: "Livemint", color: "#f37023" },
  "financial times": { domain: "ft.com", name: "Financial Times", color: "#fcd1ac" },
  ft: { domain: "ft.com", name: "Financial Times", color: "#fcd1ac" },
  "wall street journal": { domain: "wsj.com", name: "The Wall Street Journal", color: "#000000" },
  wsj: { domain: "wsj.com", name: "WSJ", color: "#000000" },
  bloomberg: { domain: "bloomberg.com", name: "Bloomberg", color: "#000000" },
  "new york times": { domain: "nytimes.com", name: "The New York Times", color: "#000000" },
  nytimes: { domain: "nytimes.com", name: "The New York Times", color: "#000000" },
  nyt: { domain: "nytimes.com", name: "The New York Times", color: "#000000" },
  "the economist": { domain: "economist.com", name: "The Economist", color: "#e3120b" },
  economist: { domain: "economist.com", name: "The Economist", color: "#e3120b" },
  hbr: { domain: "hbr.org", name: "Harvard Business Review", color: "#cc0000" },
  substack: { domain: "substack.com", name: "Substack", color: "#ff6719" },
  medium: { domain: "medium.com", name: "Medium", color: "#000000" },
  "x premium": { domain: "x.com", name: "X Premium", color: "#000000" },
  twitter: { domain: "x.com", name: "Twitter", color: "#1da1f2" },
  linkedin: { domain: "linkedin.com", name: "LinkedIn", color: "#0077b5" },
  duolingo: { domain: "duolingo.com", name: "Duolingo", color: "#58cc02" },
  coursera: { domain: "coursera.org", name: "Coursera", color: "#0056d2" },
  udemy: { domain: "udemy.com", name: "Udemy", color: "#a435f0" },
  skillshare: { domain: "skillshare.com", name: "Skillshare", color: "#00ff84" },
  masterclass: { domain: "masterclass.com", name: "MasterClass", color: "#000000" },
  leetcode: { domain: "leetcode.com", name: "LeetCode", color: "#ffa116" },
  brilliant: { domain: "brilliant.org", name: "Brilliant", color: "#000000" },
  "chess.com": { domain: "chess.com", name: "Chess.com", color: "#81b64c" },
  chess: { domain: "chess.com", name: "Chess.com", color: "#81b64c" },

  // ── Fitness, Health & Wellness ────────────────────────────────────────────
  "cult.fit": { domain: "cult.fit", name: "Cult.fit", color: "#ff3278" },
  "cult fit": { domain: "cult.fit", name: "Cult.fit", color: "#ff3278" },
  cultpass: { domain: "cult.fit", name: "Cultpass", color: "#ff3278" },
  "cure.fit": { domain: "cult.fit", name: "Cult.fit", color: "#ff3278" },
  cult: { domain: "cult.fit", name: "Cult.fit", color: "#ff3278" },
  strava: { domain: "strava.com", name: "Strava", color: "#fc4c02" },
  headspace: { domain: "headspace.com", name: "Headspace", color: "#f47e3a" },
  calm: { domain: "calm.com", name: "Calm", color: "#1996f0" },
  whoop: { domain: "whoop.com", name: "WHOOP", color: "#000000" },
  ouraring: { domain: "ouraring.com", name: "Oura", color: "#000000" },
  oura: { domain: "ouraring.com", name: "Oura", color: "#000000" },
  myfitnesspal: { domain: "myfitnesspal.com", name: "MyFitnessPal", color: "#0066ee" },
  healthifyme: { domain: "healthifyme.com", name: "HealthifyMe", color: "#ff5000" },
  ultrahuman: { domain: "ultrahuman.com", name: "Ultrahuman", color: "#000000" },

  // ── Memberships & Convenience ─────────────────────────────────────────────
  "swiggy one": { domain: "swiggy.com", name: "Swiggy One", color: "#fc8019" },
  "zomato gold": { domain: "zomato.com", name: "Zomato Gold", color: "#cb202d" },
  "times prime": { domain: "timesprime.com", name: "Times Prime", color: "#e11938" },
  blinkit: { domain: "blinkit.com", name: "Blinkit", color: "#f8cb46" },
  zepto: { domain: "zeptonow.com", name: "Zepto", color: "#5b21b6" },
  instamart: { domain: "swiggy.com", name: "Swiggy Instamart", color: "#fc8019" },
  bigbasket: { domain: "bigbasket.com", name: "BigBasket", color: "#84c225" },
  "bb daily": { domain: "bigbasket.com", name: "BB Daily", color: "#84c225" },
  bbdaily: { domain: "bigbasket.com", name: "BB Daily", color: "#84c225" },
  "country delight": { domain: "countrydelight.in", name: "Country Delight", color: "#e31837" },
  furlenco: { domain: "furlenco.com", name: "Furlenco", color: "#000000" },
  rentomojo: { domain: "rentomojo.com", name: "Rentomojo", color: "#dc2626" },

  // ── DTH, Telecom, Broadband & Utilities ───────────────────────────────────
  "tata play": { domain: "tataplay.com", name: "Tata Play", color: "#e11938", isPrimaryInstitution: true },
  "tata sky": { domain: "tataplay.com", name: "Tata Play", color: "#e11938", isPrimaryInstitution: true },
  "tata power": { domain: "tatapower.com", name: "Tata Power", color: "#005a9c", isPrimaryInstitution: true },
  "tata neu": { domain: "tatadigital.com", name: "Tata Neu", color: "#8338ec", isPrimaryInstitution: true },
  "airtel xstream": { domain: "airtel.in", name: "Airtel Xstream", color: "#e40000" },
  "airtel black": { domain: "airtel.in", name: "Airtel Black", color: "#e40000" },
  "airtel fiber": { domain: "airtel.in", name: "Airtel Fiber", color: "#e40000" },
  jiofiber: { domain: "jio.com", name: "JioFiber", color: "#0f3e99" },
  "jio fiber": { domain: "jio.com", name: "JioFiber", color: "#0f3e99" },
  jio: { domain: "jio.com", name: "Jio", color: "#0f3e99" },
  vodafone: { domain: "myvi.in", name: "Vi (Vodafone Idea)", color: "#e60000" },
  vi: { domain: "myvi.in", name: "Vi", color: "#e60000" },
  bsnl: { domain: "bsnl.co.in", name: "BSNL", color: "#005a9c" },
  "act fibernet": { domain: "actcorp.in", name: "ACT Fibernet", color: "#e51937" },
  "act broadband": { domain: "actcorp.in", name: "ACT Fibernet", color: "#e51937" },
  act: { domain: "actcorp.in", name: "ACT Fibernet", color: "#e51937" },
  hathway: { domain: "hathway.com", name: "Hathway", color: "#0066b2" },
  "dish tv": { domain: "dishtv.in", name: "Dish TV", color: "#ed1c24" },
  d2h: { domain: "d2h.com", name: "D2H", color: "#005baa" },
  "sun direct": { domain: "sundirect.in", name: "Sun Direct", color: "#f37023" },
  bescom: { domain: "bescom.karnataka.gov.in", name: "BESCOM", color: "#005a9c" },
  "adani electricity": { domain: "adanielectricity.com", name: "Adani Electricity", color: "#005a9c" },
  "torrent power": { domain: "torrentpower.com", name: "Torrent Power", color: "#005a9c" },
  igl: { domain: "iglonline.net", name: "Indraprastha Gas (IGL)", color: "#005a9c" },
  mgl: { domain: "mahanagargas.com", name: "Mahanagar Gas (MGL)", color: "#005a9c" },

  // ── Financial Markets, Analytics & Investing Research ─────────────────────
  tradingview: { domain: "tradingview.com", name: "TradingView", color: "#131722" },
  moneycontrol: { domain: "moneycontrol.com", name: "Moneycontrol", color: "#0f172a" },
  trendlyne: { domain: "trendlyne.com", name: "Trendlyne", color: "#1e3a8a" },
  screener: { domain: "screener.in", name: "Screener.in", color: "#0070f3" },
  tijori: { domain: "tijorifinance.com", name: "Tijori Finance", color: "#0f172a" },
  smallcase: { domain: "smallcase.com", name: "smallcase", color: "#1f80e0" },
  tickertape: { domain: "tickertape.in", name: "Tickertape", color: "#1f80e0" },
  valueresearch: { domain: "valueresearchonline.com", name: "Value Research", color: "#005a9c" },

  // ── Gaming Networks ───────────────────────────────────────────────────────
  playstation: { domain: "playstation.com", name: "PlayStation", color: "#003791" },
  "ps plus": { domain: "playstation.com", name: "PlayStation Plus", color: "#003791" },
  xbox: { domain: "xbox.com", name: "Xbox", color: "#107c10" },
  "game pass": { domain: "xbox.com", name: "Xbox Game Pass", color: "#107c10" },
  nintendo: { domain: "nintendo.com", name: "Nintendo", color: "#e60012" },
  steam: { domain: "steampowered.com", name: "Steam", color: "#171a21" },
  "ea play": { domain: "ea.com", name: "EA Play", color: "#ff4747" },
};

/**
 * Words that must NEVER match as loose substrings (e.g. "credit" matching "cred",
 * "card" matching "onecard", "star" matching "ninestar", "care" matching "care health").
 */
const WORD_BOUNDARY_KEYS = new Set([
  "cred",
  "card",
  "star",
  "axis",
  "care",
  "cure",
  "park",
  "max",
  "au",
  "fi",
  "sc",
  "sbi",
  "pnb",
  "bob",
  "boi",
  "iob",
  "uco",
  "cub",
  "jkb",
  "kvb",
  "ippb",
  "epfo",
  "lic",
  "dbs",
  "citi",
  "hsbc",
  "rbl",
  "idbi",
  "idfc",
  "absl",
  "uti",
  "dsp",
  "mg",
  "vw",
  "kia",
  "bmw",
  "byd",
  "ktm",
  "tvs",
  "ola",
  "vi",
  "act",
  "hbo",
  "box",
  "aha",
  "ft",
  "hbr",
  "aws",
  "igl",
  "mgl",
  "nyt",
  "wsj",
  "mubi",
  "ken",
  "oura",
  "cult",
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * High-precision Brand Resolution:
 * 1. Checks primary issuing institutions FIRST (so "ICICI Amazon Pay" or "HDFC Swiggy" maps to ICICI / HDFC Bank).
 * 2. Uses strict word boundaries for brand matching, preventing substrings like "x premium" from matching "netflix premium", "vi" matching "service", or "act" matching "contact".
 * 3. Falls back to co-branding partners only when no primary institution is present.
 */
export function resolveBrand(rawInput: string): BrandInfo | null {
  if (!rawInput) return null;
  const text = rawInput.toLowerCase().trim();

  // Normalize string for checking:
  // Separate common glued terms (e.g. "HDFCBANK" -> "hdfc bank", "SBI_CARD" -> "sbi card")
  const clean = text
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/[_\-\/\(\)]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Helper matching function
  const matchEntry = (k: string): boolean => {
    const escaped = escapeRegex(k);
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (regex.test(clean)) return true;
    // Allow glued matching only for longer unspaced keys (>= 4 chars) to support strings like "tatamotors" or "netflixpremium"
    if (k.length >= 4 && !k.includes(" ")) {
      const gluedClean = clean.replace(/\s+/g, "");
      const gluedKey = k.replace(/\s+/g, "");
      if (gluedClean.includes(gluedKey)) return true;
    }
    return false;
  };

  // Pass 1: Match Primary Financial Institutions sorted by length descending
  const primaryEntries = Object.entries(CANONICAL_BRANDS)
    .filter(([_, b]) => b.isPrimaryInstitution)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [k, brand] of primaryEntries) {
    if (matchEntry(k)) return brand;
  }

  // Pass 2: Match Secondary / Co-branding / Partner entities sorted by length descending
  const secondaryEntries = Object.entries(CANONICAL_BRANDS)
    .filter(([_, b]) => !b.isPrimaryInstitution)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [k, brand] of secondaryEntries) {
    if (matchEntry(k)) return brand;
  }

  return null;
}

/** Backward-compatible helper for bank domain string resolution */
export function resolveBankDomain(rawName: string): string {
  const brand = resolveBrand(rawName);
  return brand ? brand.domain : "";
}

/** Deterministic, legible background color for initials fallback */
export const brandInitialsColor = (name: string, fallbackColor?: string) => {
  if (fallbackColor) return fallbackColor;
  const s = name || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
};

/**
 * Universal BrandLogo component:
 * 1. Checks if the brand has a local vector SVG (e.g. LIC vector asset).
 * 2. Attempts Groww 256×256 WebP vector CDN if available (`growwSym`).
 * 3. Falls back to Google 256px Favicon CDN (`sz=256`).
 * 4. Falls back to Hunter CDN.
 * 5. Falls back to a deterministic, high-contrast brand badge avatar.
 */
export const BrandLogo: React.FC<{
  name: string;
  domain?: string;
  size?: number;
  borderRadius?: number;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  name,
  domain: explicitDomain,
  size = 40,
  borderRadius,
  accentColor,
  className,
  style,
}) => {
  const brand = resolveBrand(name);
  const targetDomain = explicitDomain || brand?.domain || "";
  const localSvg = brand?.localSvg;
  const growwSym = brand?.growwSym;

  // Candidates pipeline:
  // 0. Local vector SVG (e.g. /lic-logo.svg)
  // 1. Groww 256×256 WebP CDN (ultra-crisp vector asset for Indian banks, AMCs & brokers)
  // 2. DuckDuckGo Favicon CDN (crisp, fast, returns HTTP 404 cleanly on missing domains)
  // 3. Google Favicon 128px CDN (fast & widely cached)
  // 4. Google Favicon 256px CDN
  // 5. Hunter.io CDN
  const candidates = React.useMemo(() => {
    const list: string[] = [];
    if (localSvg) list.push(localSvg);
    if (growwSym) list.push(`https://assets-netstorage.groww.in/stock-assets/logos2/${encodeURIComponent(growwSym)}.webp`);
    if (targetDomain) {
      list.push(`https://icons.duckduckgo.com/ip3/${targetDomain}.ico`);
      list.push(`https://www.google.com/s2/favicons?domain=${targetDomain}&sz=128`);
      list.push(`https://www.google.com/s2/favicons?domain=${targetDomain}&sz=256`);
      list.push(`https://logos.hunter.io/${targetDomain}`);
    }
    return list;
  }, [localSvg, growwSym, targetDomain]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [name, targetDomain, localSvg, growwSym]);

  const handleImgError = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const br = borderRadius ?? Math.max(4, Math.round(size * 0.25));
  const activeSrc = candidates[currentIndex];

  // Render Image if available in pipeline
  if (activeSrc) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: br,
          background: "#ffffff",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          ...style,
        }}
      >
        <img
          src={activeSrc}
          alt={name}
          onError={handleImgError}
          loading="lazy"
          decoding="async"
          style={{
            width: size <= 28 ? "82%" : "75%",
            height: size <= 28 ? "82%" : "75%",
            objectFit: "contain",
            imageRendering: "-webkit-optimize-contrast",
          }}
        />
      </div>
    );
  }

  // Render Initials Badge
  const color = accentColor || brand?.color || brandInitialsColor(name);
  const words = (name || "?").trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (name || "?").slice(0, 2).toUpperCase();

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: br,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontWeight: 800,
        fontSize: Math.max(9, Math.round(size * 0.36)),
        color,
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {initials}
    </div>
  );
};

// Aliases for seamless drop-in replacements across all tabs
export const BankLogo = ({
  bankName,
  bank,
  name,
  size = 40,
  borderRadius,
  accentColor,
}: {
  bankName?: string;
  bank?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
  accentColor?: string;
}) => <BrandLogo name={bankName || bank || name || "Bank"} size={size} borderRadius={borderRadius} />;

export const MFLogo = ({
  fundName,
  name,
  size = 40,
  borderRadius,
}: {
  fundName?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={fundName || name || "Mutual Fund"} size={size} borderRadius={borderRadius} />;

export const InsurerLogo = ({
  name,
  insurer,
  size = 40,
  borderRadius,
}: {
  name?: string;
  insurer?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={insurer || name || "Insurer"} size={size} borderRadius={borderRadius} />;

export const BrokerLogo = ({
  broker,
  name,
  size = 40,
  borderRadius,
  theme,
}: {
  broker?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
  theme?: any;
}) => <BrandLogo name={broker || name || "Broker"} size={size} borderRadius={borderRadius} />;

export const BuilderLogo = ({
  name,
  size = 46,
  borderRadius,
}: {
  name: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={name || "Builder"} size={size} borderRadius={borderRadius} />;

/** Renders authentic vector SVG logos for card payment networks (Visa, Mastercard, RuPay, Amex, Diners Club) */
export const CardNetworkLogo = ({
  network,
  height = 20,
  variant = "color",
  className,
  style,
}: {
  network?: string;
  height?: number;
  variant?: "color" | "white" | "dark";
  className?: string;
  style?: React.CSSProperties;
}) => {
  const n = (network || "").toLowerCase().trim();
  const isWhite = variant === "white";

  // Visa
  if (n === "visa" || n.includes("visa")) {
    return (
      <svg
        height={height}
        viewBox="0 0 58 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      >
        <text
          x="0"
          y="17"
          fontFamily="'Times New Roman', Times, serif"
          fontSize="22"
          fontWeight="700"
          fontStyle="italic"
          fill={isWhite ? "#FFFFFF" : "#1A1F71"}
          letterSpacing="-1"
        >
          {isWhite ? (
            "VISA"
          ) : (
            <>
              <tspan fill="#1A1F71">VI</tspan>
              <tspan fill="#F7B600">S</tspan>
              <tspan fill="#1A1F71">A</tspan>
            </>
          )}
        </text>
      </svg>
    );
  }

  // Mastercard
  if (n === "mastercard" || n.includes("master")) {
    return (
      <svg
        height={height}
        viewBox="0 0 44 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      >
        <circle cx="15" cy="14" r="13" fill="#EB001B" />
        <circle cx="29" cy="14" r="13" fill="#F79E1B" />
        <path d="M22 4.8a13 13 0 0 1 0 18.4A13 13 0 0 1 22 4.8z" fill="#FF5F00" />
      </svg>
    );
  }

  // RuPay — Official NPCI Vector Logo
  if (n === "rupay" || n.includes("rupay")) {
    const textColor = isWhite ? "#FFFFFF" : "#0F172A";
    return (
      <svg
        height={height}
        viewBox="0 0 67.583808 17.596123"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      >
        <g transform="translate(-0.01611121,-1.1444177)">
          <g transform="matrix(0.35277777,0,0,-0.35277777,67.797845,1.4031532)">
            <path style={{ fill: "#00B140" }} d="m 0,0 11.488,-22.811 -24.15,-22.822 z" />
          </g>
          <g transform="matrix(0.35277777,0,0,-0.35277777,64.991459,1.4031532)">
            <path style={{ fill: "#F47920" }} d="M 0,0 11.471,-22.811 -12.663,-45.633 Z" />
          </g>
          <g transform="matrix(0.35277777,0,0,-0.35277777,0.01611121,14.573442)">
            <path
              style={{ fill: textColor }}
              d="m 0,0 11.454,41.266 h 18.312 c 5.723,0 9.546,-0.906 11.491,-2.773 1.931,-1.852 2.303,-4.875 1.139,-9.124 -0.704,-2.503 -1.774,-4.604 -3.244,-6.264 -1.458,-1.663 -3.381,-2.978 -5.749,-3.945 2.009,-0.483 3.287,-1.442 3.86,-2.88 0.57,-1.438 0.504,-3.535 -0.188,-6.284 L 35.682,4.232 35.678,4.076 C 35.276,2.462 35.395,1.598 36.05,1.528 L 35.628,0 H 23.24 c 0.042,0.971 0.119,1.839 0.201,2.568 0.09,0.746 0.201,1.324 0.311,1.721 l 1.155,4.121 c 0.582,2.143 0.618,3.638 0.078,4.499 -0.545,0.884 -1.765,1.319 -3.691,1.319 H 16.088 L 12.118,0 Z m 18.664,23.527 h 5.576 c 1.954,0 3.396,0.279 4.285,0.856 0.893,0.582 1.556,1.565 1.945,2.987 0.403,1.446 0.304,2.454 -0.274,3.027 -0.577,0.582 -1.958,0.865 -4.129,0.865 h -5.256 z"
            />
          </g>
          <g transform="matrix(0.35277777,0,0,-0.35277777,26.966392,3.8309332)">
            <path
              style={{ fill: textColor }}
              d="m 0,0 -8.444,-30.451 h -10.261 l 1.261,4.461 c -1.806,-1.774 -3.654,-3.121 -5.517,-3.982 -1.848,-0.876 -3.798,-1.307 -5.851,-1.307 -1.697,0 -3.154,0.308 -4.327,0.919 -1.187,0.609 -2.071,1.535 -2.666,2.756 -0.528,1.069 -0.758,2.389 -0.668,3.966 0.095,1.552 0.643,4.17 1.659,7.836 L -30.438,0 h 11.224 l -4.367,-15.728 c -0.638,-2.302 -0.79,-3.92 -0.479,-4.801 0.324,-0.889 1.189,-1.348 2.593,-1.348 1.414,0 2.603,0.512 3.585,1.557 0.996,1.036 1.765,2.581 2.343,4.637 L -11.208,0 Z"
            />
          </g>
          <g transform="matrix(0.35277777,0,0,-0.35277777,25.52981,14.573442)">
            <path
              style={{ fill: textColor }}
              d="m 0,0 11.442,41.266 h 15.74 c 3.473,0 6.161,-0.205 8.078,-0.655 1.913,-0.431 3.413,-1.131 4.528,-2.118 1.397,-1.291 2.253,-2.889 2.605,-4.806 0.331,-1.917 0.135,-4.15 -0.59,-6.772 C 40.521,22.302 38.274,18.767 35.072,16.297 31.86,13.859 27.886,12.634 23.143,12.634 H 15.777 L 12.278,0 Z m 18.566,22.712 h 3.958 c 2.559,0 4.358,0.316 5.412,0.926 1.02,0.618 1.745,1.716 2.187,3.277 0.442,1.582 0.328,2.688 -0.34,3.306 -0.643,0.615 -2.286,0.926 -4.915,0.926 h -3.95 z"
            />
          </g>
          <g transform="matrix(0.35277777,0,0,-0.35277777,44.934987,14.573442)">
            <path
              style={{ fill: textColor }}
              d="m 0,0 0.114,2.892 c -1.81,-1.355 -3.643,-2.379 -5.486,-3.019 -1.835,-0.652 -3.789,-0.983 -5.882,-0.983 -3.179,0 -5.396,0.864 -6.678,2.536 -1.266,1.675 -1.474,4.08 -0.61,7.148 0.827,3.028 2.298,5.257 4.42,6.682 2.11,1.442 5.634,2.474 10.578,3.134 0.627,0.102 1.467,0.184 2.519,0.311 3.655,0.423 5.707,1.397 6.149,2.986 0.23,0.87 0.09,1.512 -0.45,1.906 -0.521,0.409 -1.495,0.61 -2.901,0.61 -1.167,0 -2.106,-0.242 -2.876,-0.745 -0.769,-0.508 -1.343,-1.25 -1.732,-2.294 h -10.943 c 0.988,3.428 3.007,6.018 6.038,7.75 3.02,1.762 7.002,2.61 11.934,2.61 2.319,0 4.396,-0.217 6.232,-0.688 1.839,-0.451 3.183,-1.094 4.055,-1.872 1.073,-0.971 1.708,-2.078 1.889,-3.302 0.209,-1.221 -0.02,-2.971 -0.66,-5.261 L 11.003,3.424 C 10.852,2.868 10.823,2.372 10.905,1.921 11.003,1.491 11.191,1.123 11.523,0.86 L 11.27,0 Z M 2.728,13.597 C 1.536,13.118 -0.013,12.659 -1.938,12.155 -4.961,11.344 -6.662,10.262 -7.03,8.923 -7.285,8.062 -7.182,7.399 -6.761,6.895 c 0.415,-0.479 1.136,-0.721 2.152,-0.721 1.863,0 3.359,0.471 4.474,1.401 1.118,0.942 1.954,2.421 2.539,4.461 0.102,0.434 0.192,0.746 0.25,0.979 z"
            />
          </g>
          <g transform="matrix(0.35277777,0,0,-0.35277777,48.940953,18.806421)">
            <path
              style={{ fill: textColor }}
              d="m 0,0 2.491,9.013 h 3.212 c 1.073,0 1.917,0.212 2.515,0.598 0.607,0.401 1.02,1.077 1.258,1.987 0.119,0.401 0.192,0.823 0.242,1.302 0.032,0.508 0.032,1.045 0,1.667 L 8.004,42.45 H 19.365 L 19.189,23.974 29.107,42.45 H 39.672 L 22.138,12.146 C 20.148,8.759 18.702,6.432 17.784,5.162 16.878,3.908 16.018,2.933 15.183,2.273 14.101,1.36 12.893,0.713 11.589,0.336 10.282,-0.049 8.292,-0.241 5.617,-0.241 c -0.77,0 -1.656,0.015 -2.614,0.065 C 2.052,-0.139 1.037,-0.082 0,0"
            />
          </g>
        </g>
      </svg>
    );
  }

  // Amex — American Express Official Vector
  if (n === "amex" || n === "american express" || n.includes("amex")) {
    return (
      <svg
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      >
        <rect width="24" height="24" rx="4" fill="#006FCF" />
        <path
          fill="#FFFFFF"
          d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507"
        />
      </svg>
    );
  }

  // Diners Club
  if (n === "diners" || n === "diners club" || n.includes("diners")) {
    const textColor = isWhite ? "#FFFFFF" : "#004A97";
    return (
      <svg
        height={height}
        viewBox="0 0 72 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      >
        <circle cx="13" cy="15" r="12" fill="#004A97" />
        <circle cx="23" cy="15" r="12" fill="#0079C1" />
        <text
          x="38"
          y="13"
          fontFamily="'Arial', sans-serif"
          fontSize="7.5"
          fontWeight="800"
          fill={textColor}
          letterSpacing="0.8"
        >
          DINERS
        </text>
        <text
          x="38"
          y="23"
          fontFamily="'Arial', sans-serif"
          fontSize="7.5"
          fontWeight="800"
          fill={isWhite ? "rgba(255,255,255,0.7)" : "#0079C1"}
          letterSpacing="1.5"
        >
          CLUB
        </text>
      </svg>
    );
  }

  // Fallback Generic Card Network Icon
  return (
    <svg
      height={height}
      viewBox="0 0 32 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="20"
        rx="3"
        stroke={isWhite ? "rgba(255,255,255,0.6)" : "currentColor"}
        strokeWidth="1.5"
      />
      <rect
        x="1"
        y="7"
        width="30"
        height="4"
        fill={isWhite ? "rgba(255,255,255,0.3)" : "currentColor"}
        opacity="0.3"
      />
    </svg>
  );
};

export const ServiceLogo = ({
  name,
  website,
  category,
  size = 40,
  borderRadius,
  className,
  style,
}: {
  name: string;
  website?: string;
  category?: string;
  size?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  let explicitDomain = "";
  if (website && website.trim()) {
    try {
      const raw = website.trim();
      const url = raw.includes("://") ? raw : `https://${raw}`;
      explicitDomain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      explicitDomain = website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].trim();
    }
  }

  // If website was not specified or domain is empty, resolve via canonical brands/services
  const resolved = resolveBrand(name);
  const targetDomain = explicitDomain || resolved?.domain || "";

  return (
    <BrandLogo
      name={name}
      domain={targetDomain}
      size={size}
      borderRadius={borderRadius}
      accentColor={resolved?.color}
      className={className}
      style={style}
    />
  );
};

export const LicLogo = ({ size = 40 }: { size?: number }) => (
  <BrandLogo name="LIC" size={size} />
);

export const VehicleLogo = ({
  make,
  name,
  domain,
  size = 40,
  borderRadius,
  className,
  style,
}: {
  make?: string;
  name?: string;
  domain?: string;
  size?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <BrandLogo
    name={make || name || "Vehicle"}
    domain={domain}
    size={size}
    borderRadius={borderRadius}
    className={className}
    style={style}
  />
);

export const VehicleMakeLogo = VehicleLogo;

export const bankInitialsColor = brandInitialsColor;

const _stockLogoCache: Record<string, { logoUrl: string | null; faviconUrl: string | null } | null> = {};

export interface StockLogoProps {
  yfSym?: string;
  symbol?: string;
  name?: string;
  exchange?: string;
  size?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal StockLogo Component
 * Multi-tier high-reliability resolution pipeline:
 * 1. Groww 256×256 WebP vector CDN asset
 * 2. Synchronously resolved official website via STOCK_DOMAINS / CANONICAL_BRANDS:
 *    - DuckDuckGo Fast Favicon CDN
 *    - Google Favicon 128px / 256px CDN
 *    - Hunter.io Logo CDN
 * 3. Dynamic /api/stock-logo server endpoint (with Yahoo Finance asset profile & Twelve Data)
 * 4. EODHD direct CDN fallback
 * 5. High-contrast, deterministic initials gradient badge
 */
export const StockLogo: React.FC<StockLogoProps> = ({
  yfSym,
  symbol,
  name,
  exchange,
  size = 36,
  borderRadius,
  className,
  style,
}) => {
  const raw = String(symbol || yfSym || name || "").trim();
  const base = normalizeStockBase(raw);
  const isBSE =
    (exchange && String(exchange).toUpperCase() === "BSE") ||
    /\.BO$/i.test(raw) ||
    /\.BO$/i.test(String(yfSym || ""));
  const exch = isBSE ? "BSE" : "NSE";
  const canonicalYfSym = base ? `${base}.${isBSE ? "BO" : "NS"}` : "";

  // Synchronous domain and brand lookup
  const stockDomain = resolveStockDomain(base);
  const brandResolved = resolveBrand(name || base);
  const targetDomain = stockDomain || brandResolved?.domain || "";

  // Groww high-res WebP vector asset
  const growwSym = resolveGrowwSymbol(base);
  const growwUrl =
    !isBSE && growwSym
      ? `https://assets-netstorage.groww.in/stock-assets/logos2/${encodeURIComponent(growwSym)}.webp`
      : null;

  // EODHD fallback URL
  const eodhdUrl = base ? `https://eodhd.com/img/logos/${exch}/${base}.png` : null;

  const [apiLogoUrl, setApiLogoUrl] = useState<string | null>(null);
  const [apiFaviconUrl, setApiFaviconUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFailedUrls(new Set());
    if (!canonicalYfSym) return;

    if (canonicalYfSym in _stockLogoCache) {
      const c = _stockLogoCache[canonicalYfSym];
      setApiLogoUrl(c?.logoUrl ?? null);
      setApiFaviconUrl(c?.faviconUrl ?? null);
      return;
    }

    let cancelled = false;
    fetch(`/api/stock-logo?symbol=${encodeURIComponent(canonicalYfSym)}`)
      .then((r) => r.json())
      .then((d) => {
        _stockLogoCache[canonicalYfSym] = d;
        if (!cancelled) {
          setApiLogoUrl(d?.logoUrl ?? null);
          setApiFaviconUrl(d?.faviconUrl ?? null);
        }
      })
      .catch(() => {
        _stockLogoCache[canonicalYfSym] = null;
      });

    return () => {
      cancelled = true;
    };
  }, [canonicalYfSym]);

  const candidates = React.useMemo(() => {
    const list: string[] = [];
    if (growwUrl) list.push(growwUrl);
    if (targetDomain) {
      list.push(`https://icons.duckduckgo.com/ip3/${targetDomain}.ico`);
      list.push(`https://www.google.com/s2/favicons?domain=${targetDomain}&sz=128`);
      list.push(`https://www.google.com/s2/favicons?domain=${targetDomain}&sz=256`);
      list.push(`https://logos.hunter.io/${targetDomain}`);
    }
    if (apiLogoUrl && !list.includes(apiLogoUrl)) list.push(apiLogoUrl);
    if (eodhdUrl && !list.includes(eodhdUrl)) list.push(eodhdUrl);
    if (apiFaviconUrl && !list.includes(apiFaviconUrl)) list.push(apiFaviconUrl);
    return list;
  }, [growwUrl, targetDomain, apiLogoUrl, eodhdUrl, apiFaviconUrl]);

  const activeSrc = candidates.find((u) => !failedUrls.has(u));
  const markFailed = (url: string) => setFailedUrls((prev) => new Set([...prev, url]));

  const br = borderRadius ?? Math.max(4, Math.round(size * 0.28));
  const pad = Math.max(2, Math.round(size * 0.08));

  if (activeSrc) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: br,
          background: "#ffffff",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          padding: pad,
          boxSizing: "border-box",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          ...style,
        }}
      >
        <img
          src={activeSrc}
          alt={base || "Stock"}
          onError={() => markFailed(activeSrc)}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "-webkit-optimize-contrast",
          }}
        />
      </div>
    );
  }

  // Fallback Initials Avatar Badge with deterministic gradient
  const hue =
    Array.from(base || "?").reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const initials = (base || "?").slice(0, 2);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: br,
        background: `linear-gradient(135deg, hsl(${hue}, 55%, 42%) 0%, hsl(${hue}, 70%, 58%) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.32)),
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.01em",
        }}
      >
        {initials}
      </span>
    </div>
  );
};


