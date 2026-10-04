import { describe, it, expect } from "vitest";
import { parseCreditReportText } from "../utils/creditReportParser";

describe("Credit Report & Statement Parser", () => {
  it("parses CIBIL official report text correctly", () => {
    const rawCibil = `
      TRANSUNION CIBIL LIMITED
      CONSUMER CREDIT INFORMATION REPORT
      REPORT DATE: 18/08/2026
      CONTROL NUMBER: 9812739123
      CIBIL SCORE: 815
      TOTAL ACCOUNTS: 12
      OVERDUE ACCOUNTS: 0
      TOTAL OUTSTANDING: ₹ 1,45,000
      RECENT ENQUIRIES: 1
    `;

    const parsed = parseCreditReportText(rawCibil);
    expect(parsed).not.toBeNull();
    expect(parsed?.bureau).toBe("CIBIL");
    expect(parsed?.score).toBe(815);
    expect(parsed?.checkDate).toBe("2026-08-18");
    expect(parsed?.summary?.totalAccounts).toBe(12);
    expect(parsed?.summary?.recentInquiries).toBe(1);
  });

  it("parses Experian text alert and score correctly", () => {
    const rawExperian = `
      Experian Credit Report Summary
      As of 02-Oct-2026
      Your Experian Credit Score is 838 / 900
      Status: Excellent
      Active Accounts: 6
    `;

    const parsed = parseCreditReportText(rawExperian);
    expect(parsed).not.toBeNull();
    expect(parsed?.bureau).toBe("Experian");
    expect(parsed?.score).toBe(838);
    expect(parsed?.checkDate).toBe("2026-10-02");
    expect(parsed?.summary?.activeAccounts).toBe(6);
  });

  it("parses CRIF High Mark SMS alert format", () => {
    const sms = "Dear Customer, your CRIF High Mark credit score is 775 as on 15/09/2026. Check details on crifhighmark.com";
    const parsed = parseCreditReportText(sms);
    expect(parsed).not.toBeNull();
    expect(parsed?.bureau).toBe("CRIF");
    expect(parsed?.score).toBe(775);
    expect(parsed?.checkDate).toBe("2026-09-15");
  });

  it("parses OneScore notification format", () => {
    const onescoreText = `
      OneScore Monthly Credit Refresh
      CIBIL Score: 792
      Experian Score: 810
      Checked on 2026-09-20
    `;
    const parsed = parseCreditReportText(onescoreText);
    expect(parsed).not.toBeNull();
    expect(parsed?.score).toBe(792);
    expect(parsed?.checkDate).toBe("2026-09-20");
    expect(parsed?.source).toBe("OneScore");
  });

  it("returns null for invalid or non-credit text", () => {
    expect(parseCreditReportText("Hello world random text")).toBeNull();
    expect(parseCreditReportText("")).toBeNull();
  });
});
