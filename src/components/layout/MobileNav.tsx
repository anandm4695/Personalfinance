import React from "react";
import {
  PieChart as PieIcon,
  Landmark,
  TrendingUp,
  Target,
  Settings,
} from "lucide-react";
import { THEME } from "../../utils/constants";

interface MobileNavProps {
  tab: string;
  setTab: (tab: string) => void;
  setSubTab: (subTab: any) => void;
}

export function MobileNav({ tab, setTab, setSubTab }: MobileNavProps) {
  const mobileNavTabs = [
    { id: "analytics", label: "Analytics", icon: PieIcon },
    { id: "banks", label: "Banks", icon: Landmark },
    { id: "investments", label: "Invest", icon: TrendingUp },
    { id: "goals", label: "Goals", icon: Target },
    { id: "settings", label: "More", icon: Settings },
  ];
  return (
    <nav className="mobile-bottom-nav" style={{ justifyContent: "space-around" }}>
      {mobileNavTabs.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSubTab(null);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              color: active ? THEME.accent : THEME.muted,
              fontFamily: "inherit",
              transition: "color 0.2s ease",
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: active ? `${THEME.accent}1f` : "transparent",
                transition: "background 0.2s ease",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.03em",
                lineHeight: 1,
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
