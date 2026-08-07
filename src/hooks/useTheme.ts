import { useEffect } from "react";
import { ACCENT_PALETTES, DENSITY, LIGHT_VARS, DARK_VARS } from "../utils/constants";

export function useTheme(settings: {
  darkMode: boolean;
  accentKey: string;
  density: string;
  radiusKey: string;
  fontKey: string;
  bgStyle: string;
  animSpeed: string;
}): void {
  const { darkMode, accentKey, density, radiusKey, fontKey, bgStyle, animSpeed } = settings;

  // Apply theme CSS vars whenever darkMode, accentKey, or other UI settings change
  useEffect(() => {
    const vars = darkMode ? DARK_VARS : LIGHT_VARS;
    const palette =
      (ACCENT_PALETTES as Record<string, typeof ACCENT_PALETTES.blue>)[accentKey] ||
      ACCENT_PALETTES.blue;
    const d = (DENSITY as Record<string, typeof DENSITY.normal>)[density] || DENSITY.normal;

    const radiuses: Record<string, string> = { sharp: "4px", modern: "12px", round: "24px" };
    const fonts: Record<string, string> = {
      inter: "'Inter', sans-serif",
      outfit: "'Outfit', sans-serif",
      roboto: "'Roboto', sans-serif",
      poppins: "'Poppins', sans-serif",
      "dm-sans": "'DM Sans', sans-serif",
      nunito: "'Nunito', sans-serif",
      "space-grotesk": "'Space Grotesk', sans-serif",
      lato: "'Lato', sans-serif",
      "sf-pro":
        "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif",
    };
    const anims: Record<string, string> = { snappy: "0.15s", smooth: "0.4s", relaxed: "0.8s" };

    const merged = {
      ...vars,
      "--t-accent": darkMode ? palette.dark : palette.light,
      "--card-pad": `${d.cardPad}px`,
      "--app-font-size": `${d.fontSize}px`,
      "--section-gap": `${d.sectionGap}px`,
      "--t-radius": radiuses[radiusKey] || "12px",
      "--t-font": fonts[fontKey] || "'Inter', sans-serif",
      "--t-transition": `${anims[animSpeed] || "0.4s"} cubic-bezier(0.4, 0, 0.2, 1)`,
    };

    Object.entries(merged).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
      document.body.style.setProperty(k, v);
    });
    // Drive the CSS class-based dark theme so styles.css vars activate
    document.documentElement.classList.toggle("dark-theme", darkMode);
    document.body.classList.toggle("dark-theme", darkMode);
  }, [darkMode, accentKey, density, radiusKey, fontKey, animSpeed]);

  // Background style (dots / mesh) injected dynamically since it depends on user setting
  useEffect(() => {
    const bgMap: Record<string, string> = {
      dots: "radial-gradient(circle, var(--t-line) 1.5px, transparent 1.5px)",
      mesh: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 7%, transparent) 0%, transparent 100%)",
      plain: "none",
    };
    document.body.style.setProperty("background-image", bgMap[bgStyle] || "none", "important");
    document.body.style.setProperty(
      "background-size",
      bgStyle === "dots" ? "24px 24px" : "auto",
      "important"
    );
    document.body.style.setProperty("background-attachment", "fixed", "important");
  }, [bgStyle]);
}
