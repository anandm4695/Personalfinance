/* eslint-disable */
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

