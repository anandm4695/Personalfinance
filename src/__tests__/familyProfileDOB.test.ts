import { describe, it, expect } from "vitest";
import {
  calculateAge,
  formatAge,
  isSeniorCitizen,
  isMinor,
  formatProfileOption,
  formatProfileOptionWithAge,
  DEFAULT_MASTER_DATA,
  FamilyProfile,
} from "../utils/masterData";

describe("Family Profiles Date of Birth & Dynamic Age Calculations", () => {
  it("calculates exact completed years correctly", () => {
    // Reference date: 2026-09-07
    const ref = "2026-09-07";

    // Born on 1990-09-06 (turned 36 yesterday)
    expect(calculateAge("1990-09-06", ref)).toBe(36);

    // Born on 1990-09-07 (turning 36 today)
    expect(calculateAge("1990-09-07", ref)).toBe(36);

    // Born on 1990-09-08 (still 35, birthday tomorrow)
    expect(calculateAge("1990-09-08", ref)).toBe(35);

    // Born on 2018-10-12
    expect(calculateAge("2018-10-12", ref)).toBe(7);

    // Born on 1955-01-01
    expect(calculateAge("1955-01-01", ref)).toBe(71);
  });

  it("handles leap years correctly", () => {
    // Leap day birth: Feb 29, 2000
    // On Feb 28, 2024: still 23
    expect(calculateAge("2000-02-29", "2024-02-28")).toBe(23);
    // On Feb 29, 2024: turned 24
    expect(calculateAge("2000-02-29", "2024-02-29")).toBe(24);
    // On March 1, 2024: 24
    expect(calculateAge("2000-02-29", "2024-03-01")).toBe(24);
  });

  it("safely handles null, undefined, invalid, and empty DOBs", () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
    expect(calculateAge("")).toBeNull();
    expect(calculateAge("invalid-date")).toBeNull();
    expect(calculateAge("2026-99-99")).toBeNull();
  });

  it("formats age strings nicely for UI badges", () => {
    const ref = "2026-09-07";
    expect(formatAge("1988-06-15", ref)).toBe("38 yrs");
    expect(formatAge(null)).toBeNull();
  });

  it("accurately identifies Senior Citizens (60+) and Minors (< 18)", () => {
    const ref = "2026-09-07";

    const seniorProfile: FamilyProfile = {
      id: "father",
      name: "Father",
      relation: "Father",
      dob: "1960-05-10",
    };
    expect(isSeniorCitizen(seniorProfile, ref)).toBe(true);
    expect(isMinor(seniorProfile, ref)).toBe(false);

    const nonSeniorProfile: FamilyProfile = {
      id: "self",
      name: "Self",
      relation: "Self",
      dob: "1988-06-15",
    };
    expect(isSeniorCitizen(nonSeniorProfile, ref)).toBe(false);
    expect(isMinor(nonSeniorProfile, ref)).toBe(false);

    const childProfile: FamilyProfile = {
      id: "daughter",
      name: "Daughter",
      relation: "Daughter",
      dob: "2018-10-12",
    };
    expect(isSeniorCitizen(childProfile, ref)).toBe(false);
    expect(isMinor(childProfile, ref)).toBe(true);

    const hufProfile: FamilyProfile = {
      id: "huf",
      name: "Anand Mohta HUF",
      relation: "HUF",
    };
    expect(isSeniorCitizen(hufProfile, ref)).toBe(false);
    expect(isMinor(hufProfile, ref)).toBe(false);
  });

  it("formats profile dropdown options with and without asOfDate", () => {
    const p: FamilyProfile = {
      id: "daughter",
      name: "Revika",
      relation: "Daughter",
      dob: "2018-10-12",
    };

    expect(formatProfileOption(p)).toBe("Revika (Daughter)");

    // At milestone date 2036-10-12 (College at 18)
    const formattedWithMilestone = formatProfileOptionWithAge(p, "2036-10-12");
    expect(formattedWithMilestone).toBe("Revika (Daughter · 18 yrs)");
  });

  it("validates DEFAULT_MASTER_DATA includes DOBs and HUF entity", () => {
    const profiles = DEFAULT_MASTER_DATA.familyProfiles;
    expect(profiles.length).toBeGreaterThanOrEqual(4);

    const self = profiles.find((p) => p.relation === "Self");
    expect(self?.dob).toBe("1988-06-15");

    const wife = profiles.find((p) => p.relation === "Wife");
    expect(wife?.dob).toBe("1990-08-20");

    const daughter = profiles.find((p) => p.relation === "Daughter");
    expect(daughter?.dob).toBe("2018-10-12");

    const huf = profiles.find((p) => p.relation === "HUF");
    expect(huf?.relation).toBe("HUF");
  });
});
