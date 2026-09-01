/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from "react";
import { THEME } from "../../utils/constants";

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
]);

/**
 * High-precision Brand Resolution:
 * 1. Checks primary issuing institutions FIRST (so "ICICI Amazon Pay" or "HDFC Swiggy" maps to ICICI / HDFC Bank).
 * 2. Uses strict word boundaries for short keys or sensitive abbreviations like `cred`, `sbi`, `lic`, preventing "credit" from matching "cred".
 * 3. Falls back to co-branding partners only when no primary institution is present.
 */
export function resolveBrand(rawInput: string): BrandInfo | null {
  if (!rawInput) return null;
  const text = rawInput.toLowerCase().trim();

  // Normalize string for checking:
  // Separate common glued terms (e.g. "HDFCBANK" -> "hdfc bank", "SBI_CARD" -> "sbi card")
  const clean = text
    .replace(/[_\-\/\(\)]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Helper matching function
  const matchEntry = (k: string): boolean => {
    if (WORD_BOUNDARY_KEYS.has(k) || k.length <= 3) {
      const regex = new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`, "i");
      return regex.test(clean);
    }
    return clean.includes(k);
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
  // 2. Google Favicon 256px CDN
  // 3. Hunter.io CDN
  const candidates = React.useMemo(() => {
    const list: string[] = [];
    if (localSvg) list.push(localSvg);
    if (growwSym) list.push(`https://assets-netstorage.groww.in/stock-assets/logos2/${encodeURIComponent(growwSym)}.webp`);
    if (targetDomain) {
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
          background: "var(--surface-0, #ffffff)",
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
          style={{
            width: "75%",
            height: "75%",
            objectFit: "contain",
            imageRendering: "-webkit-optimize-contrast",
          }}
        />
      </div>
    );
  }

  // Render Initials Badge
  const color = accentColor || brand?.color || brandInitialsColor(name);
  const initials =
    (name || "?")
      .split(/\s+/)
      .filter((w: string) => w.length > 1)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join("") ||
    (name || "?")[0]?.toUpperCase() ||
    "?";

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
  name,
  size = 40,
  borderRadius,
}: {
  bankName?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
}) => <BrandLogo name={bankName || name || "Bank"} size={size} borderRadius={borderRadius} />;

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

export const ServiceLogo = ({
  name,
  website,
  size = 40,
  borderRadius,
}: {
  name: string;
  website?: string;
  size?: number;
  borderRadius?: number;
}) => {
  let explicitDomain = "";
  if (website && website.trim()) {
    try {
      const url = website.includes("://") ? website : `https://${website}`;
      explicitDomain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      explicitDomain = website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    }
  }
  return <BrandLogo name={name} domain={explicitDomain} size={size} borderRadius={borderRadius} />;
};

export const LicLogo = ({ size = 40 }: { size?: number }) => (
  <BrandLogo name="LIC" size={size} />
);

export const bankInitialsColor = brandInitialsColor;
