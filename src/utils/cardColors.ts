// Card color palette engine
// Matches issuer name → real card gradient colors
// Order matters: most specific card names FIRST, bank-level fallbacks LAST

type Gradient = { from: string; via?: string; to: string };

const CARD_COLOR_MAP: Array<{ keys: string[]; g: Gradient }> = [
  // ── RBL specific ──────────────────────────────────────────────────────────
  { keys: ["zomato"], g: { from: "#E23744", to: "#8C0D17" } },
  { keys: ["rbl play", "play+"], g: { from: "#6D28D9", to: "#3B0764" } },
  { keys: ["shoprite"], g: { from: "#0057A8", to: "#003670" } },
  { keys: ["icon"], g: { from: "#1C1C2E", to: "#0A0A1A" } },

  // ── HDFC specific ─────────────────────────────────────────────────────────
  { keys: ["infinia"], g: { from: "#1C1C1E", via: "#3A2B0A", to: "#4A3000" } },
  { keys: ["regalia"], g: { from: "#6B1A2A", to: "#2D0A12" } },
  { keys: ["millennia"], g: { from: "#1E3A5F", to: "#0B1E3A" } },
  { keys: ["tata neu plus", "tata neu infinity"], g: { from: "#6B21A8", to: "#2D0D4E" } },
  { keys: ["tata neu"], g: { from: "#5B11A8", to: "#1D0A4E" } },
  { keys: ["swiggy"], g: { from: "#FC8019", to: "#8C3A00" } },
  { keys: ["moneyback"], g: { from: "#1565C0", to: "#0A3880" } },
  { keys: ["biz power", "biz grow", "business"], g: { from: "#0F2942", to: "#071525" } },
  { keys: ["diners club privilege"], g: { from: "#1A1A2E", to: "#000510" } },
  { keys: ["6e rewards"], g: { from: "#2C3A8C", to: "#0A1440" } },

  // ── ICICI specific ────────────────────────────────────────────────────────
  { keys: ["amazon pay icici", "amazon pay"], g: { from: "#131921", to: "#232F3E" } },
  { keys: ["coral"], g: { from: "#E85C2B", to: "#7B2000" } },
  { keys: ["sapphiro"], g: { from: "#003087", to: "#001A4D" } },
  { keys: ["rubyx"], g: { from: "#8B0000", to: "#3D0000" } },
  { keys: ["emeralde"], g: { from: "#006400", to: "#003200" } },
  { keys: ["ferrari"], g: { from: "#CC0000", to: "#6B0000" } },
  { keys: ["mmt", "makemytrip"], g: { from: "#E23744", to: "#6B0016" } },
  { keys: ["mine"], g: { from: "#1A1A2E", to: "#0F0F1A" } },
  { keys: ["hpcl super saver"], g: { from: "#003087", to: "#001A4D" } },

  // ── Axis specific ─────────────────────────────────────────────────────────
  { keys: ["magnus"], g: { from: "#2D1B69", via: "#1A0D3E", to: "#0D0826" } },
  { keys: ["flipkart axis", "flipkart"], g: { from: "#2874F0", to: "#0B3CB5" } },
  { keys: ["ace"], g: { from: "#1C1C2E", to: "#0A0A1A" } },
  { keys: ["vistara"], g: { from: "#6B21A8", via: "#312E81", to: "#1E1B4B" } },
  { keys: ["airtel axis", "airtel"], g: { from: "#E40000", to: "#7A0000" } },
  { keys: ["neo"], g: { from: "#0F172A", to: "#1E293B" } },
  { keys: ["select"], g: { from: "#7C2D12", to: "#3B0D00" } },
  { keys: ["reserve"], g: { from: "#1A1A1A", via: "#2A1A00", to: "#3D2800" } },
  { keys: ["horizon"], g: { from: "#0A2240", to: "#051020" } },

  // ── SBI specific ──────────────────────────────────────────────────────────
  { keys: ["simply click", "simplyclick"], g: { from: "#0057A8", via: "#E87722", to: "#A84B00" } },
  { keys: ["simply save", "simplysave"], g: { from: "#1565C0", to: "#0A3880" } },
  { keys: ["prime"], g: { from: "#1B3A6B", to: "#0D1F3C" } },
  { keys: ["elite"], g: { from: "#0A2240", to: "#051020" } },
  { keys: ["cashback"], g: { from: "#003087", to: "#001040" } },
  { keys: ["irctc"], g: { from: "#1565C0", to: "#003087" } },
  { keys: ["air india sbi"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["bpcl sbi"], g: { from: "#006400", to: "#003200" } },
  { keys: ["apollo sbi"], g: { from: "#0057A8", to: "#003670" } },

  // ── Kotak specific ────────────────────────────────────────────────────────
  { keys: ["811"], g: { from: "#1A1A1A", to: "#3D0000" } },
  { keys: ["white gold"], g: { from: "#2A2A2A", to: "#4A3000" } },
  { keys: ["white"], g: { from: "#3A3A3A", to: "#1A1A1A" } },
  { keys: ["league"], g: { from: "#1B0000", to: "#4A0000" } },
  { keys: ["privy league"], g: { from: "#1A0A00", via: "#3A1A00", to: "#0A0500" } },
  { keys: ["6e kotak"], g: { from: "#2C3A8C", to: "#0A1440" } },
  { keys: ["essentia"], g: { from: "#C0392B", to: "#6B0000" } },

  // ── IndusInd specific ─────────────────────────────────────────────────────
  { keys: ["celesta"], g: { from: "#3D2B00", via: "#6B4A00", to: "#1A1000" } },
  { keys: ["pioneer heritage"], g: { from: "#1A1000", via: "#3D2B00", to: "#0A0800" } },
  { keys: ["pioneer"], g: { from: "#0A3A2A", to: "#051A12" } },
  { keys: ["legend"], g: { from: "#0A1A3A", to: "#050D1F" } },
  { keys: ["platinum select"], g: { from: "#3A3A3A", to: "#1A1A1A" } },
  { keys: ["nexxt"], g: { from: "#1A237E", to: "#0D1460" } },
  { keys: ["eazydiner"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["icici bank indusind"], g: { from: "#B5330A", to: "#6B1A00" } },

  // ── Yes Bank specific ─────────────────────────────────────────────────────
  { keys: ["first preferred"], g: { from: "#003087", to: "#001A4D" } },
  { keys: ["first exclusive"], g: { from: "#0A1A3A", to: "#050D1F" } },
  { keys: ["first business"], g: { from: "#0F2942", to: "#071525" } },
  { keys: ["reserv"], g: { from: "#1A1A1A", to: "#0A0A0A" } },

  // ── IDFC First specific ───────────────────────────────────────────────────
  { keys: ["idfc first wealth", "wealth"], g: { from: "#1A237E", via: "#283593", to: "#0D1460" } },
  { keys: ["first power"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["first select"], g: { from: "#0F2942", to: "#071525" } },
  { keys: ["ashva"], g: { from: "#1A1A2E", to: "#0A0A1A" } },
  { keys: ["wow"], g: { from: "#0057A8", to: "#003670" } },

  // ── Amex specific ─────────────────────────────────────────────────────────
  { keys: ["platinum"], g: { from: "#4A4A4A", via: "#787878", to: "#2A2A2A" } },
  { keys: ["gold card", "amex gold"], g: { from: "#B8860B", via: "#DAA520", to: "#7A5800" } },
  { keys: ["centurion", "black card"], g: { from: "#0A0A0A", to: "#2A2A2A" } },
  { keys: ["mrcc"], g: { from: "#007BC1", to: "#003A5C" } },
  { keys: ["smart earn"], g: { from: "#1A237E", to: "#0D1460" } },

  // ── Standard Chartered specific ───────────────────────────────────────────
  { keys: ["ultimate"], g: { from: "#1A4A1A", to: "#0A2A0A" } },
  { keys: ["smart"], g: { from: "#006400", to: "#003200" } },
  { keys: ["manhattan"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["priority banking"], g: { from: "#004A00", to: "#002500" } },
  { keys: ["rewards+"], g: { from: "#006400", to: "#003200" } },

  // ── Federal Bank specific ─────────────────────────────────────────────────
  { keys: ["scapia"], g: { from: "#1A1A2E", to: "#16213E" } },
  { keys: ["signet"], g: { from: "#003087", to: "#001A4D" } },
  { keys: ["duo"], g: { from: "#1565C0", to: "#0A3880" } },

  // ── AU Bank specific ──────────────────────────────────────────────────────
  { keys: ["zenith+", "zenith plus"], g: { from: "#1A0533", via: "#2D0A4E", to: "#0A0019" } },
  { keys: ["zenith"], g: { from: "#2D0A4E", to: "#0A0019" } },
  { keys: ["altura+", "altura plus"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["altura"], g: { from: "#E05A00", to: "#7A2E00" } },
  { keys: ["lit"], g: { from: "#F47216", to: "#8C3A00" } },
  { keys: ["vetta"], g: { from: "#1A1A2E", to: "#0A0A1A" } },

  // ── OneCard ───────────────────────────────────────────────────────────────
  { keys: ["onecard", "one card"], g: { from: "#3A3A3A", via: "#555", to: "#1A1A1A" } },

  // ── Slice / Uni ────────────────────────────────────────────────────────────
  { keys: ["slice"], g: { from: "#6D28D9", to: "#2D0D4E" } },
  { keys: ["uni card", "unicard"], g: { from: "#5B21B6", to: "#1E0A4E" } },

  // ── DBS specific ──────────────────────────────────────────────────────────
  { keys: ["dbs altitude"], g: { from: "#C8102E", via: "#8B0000", to: "#3D0000" } },
  { keys: ["dbs treasures"], g: { from: "#8B0000", to: "#3D0000" } },

  // ── HSBC specific ─────────────────────────────────────────────────────────
  { keys: ["hsbc live+"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["hsbc premier"], g: { from: "#8B0000", to: "#3D0000" } },
  { keys: ["hsbc smart value"], g: { from: "#C8102E", to: "#6B0016" } },

  // ── Bajaj specific ────────────────────────────────────────────────────────
  { keys: ["bajaj"], g: { from: "#1565C0", to: "#0A3880" } },

  // ── Prepaid / Wallet specific ─────────────────────────────────────────────
  { keys: ["amazon"], g: { from: "#131921", to: "#232F3E" } },
  { keys: ["ola money"], g: { from: "#1D7A3C", to: "#0A3D1E" } },
  { keys: ["paytm"], g: { from: "#002970", to: "#001540" } },
  { keys: ["phonepe"], g: { from: "#5F259F", to: "#2D0F50" } },
  { keys: ["sodexo"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["mobikwik"], g: { from: "#003087", to: "#001A4D" } },
  { keys: ["freecharge"], g: { from: "#2E7D32", to: "#1B5E20" } },
  { keys: ["airtel money"], g: { from: "#E40000", to: "#7A0000" } },

  // ── BANK-LEVEL FALLBACKS (checked last) ───────────────────────────────────
  { keys: ["hdfc"], g: { from: "#1B3A6B", to: "#0D1F3C" } },
  { keys: ["icici"], g: { from: "#B5330A", to: "#6B1A00" } },
  { keys: ["sbi", "state bank"], g: { from: "#1565C0", to: "#0A3880" } },
  { keys: ["axis"], g: { from: "#820000", to: "#3D0000" } },
  { keys: ["kotak"], g: { from: "#C0392B", to: "#6B0000" } },
  { keys: ["indusind"], g: { from: "#145A32", to: "#072E18" } },
  { keys: ["yes bank", "yes first"], g: { from: "#0047AB", to: "#002366" } },
  { keys: ["standard chartered"], g: { from: "#006400", to: "#003200" } },
  { keys: ["rbl"], g: { from: "#003087", to: "#001A4D" } },
  { keys: ["idfc first", "idfc"], g: { from: "#1A237E", to: "#0D1460" } },
  { keys: ["au small", "au bank", "au sb"], g: { from: "#C0392B", to: "#6B0000" } },
  { keys: ["federal"], g: { from: "#1565C0", to: "#0A3880" } },
  { keys: ["amex", "american express"], g: { from: "#007BC1", to: "#003A5C" } },
  { keys: ["citi", "citibank"], g: { from: "#004B87", to: "#00204A" } },
  { keys: ["bob", "bank of baroda"], g: { from: "#F47216", to: "#7A3700" } },
  { keys: ["pnb", "punjab national"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["canara"], g: { from: "#4A1A78", to: "#1F0B33" } },
  { keys: ["union bank"], g: { from: "#003087", to: "#001A4D" } },
  { keys: ["indian bank"], g: { from: "#8B0000", to: "#3D0000" } },
  { keys: ["bank of india", "boi"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["central bank"], g: { from: "#C0392B", to: "#6B0000" } },
  { keys: ["dbs"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["hsbc"], g: { from: "#C8102E", to: "#6B0016" } },
  { keys: ["ola"], g: { from: "#1D7A3C", to: "#0A3D1E" } },
];

export function getCardGradient(issuer: string): string {
  const n = (issuer || "").toLowerCase().trim();
  if (!n) return "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)";

  for (const entry of CARD_COLOR_MAP) {
    if (entry.keys.some((k) => n.includes(k))) {
      const { from, via, to } = entry.g;
      return via
        ? `linear-gradient(135deg, ${from} 0%, ${via} 50%, ${to} 100%)`
        : `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
    }
  }

  return "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)";
}
