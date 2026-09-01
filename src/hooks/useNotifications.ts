import { useEffect } from "react";
import {
  today,
  fmtINRFull,
  getCCDueDate,
  getLocalDateString,
  getEffectiveRent,
  alertDismissKey,
} from "../utils/finance";
import { useMilestoneEvents } from "./useFinancialEvents";

// Far-future cutoff so useMilestoneEvents returns every upcoming event
// unfiltered by horizon — this hook applies its own `leadDays` window below.
const FAR_FUTURE_CUTOFF = "2099-12-31";

export function useNotifications(loaded: boolean, session: any, state: any): void {
  // Called at the hook's top level (not inside the useEffect below) since this
  // is itself a hook. CC annual fee, insurance premium, FD/bond maturity, and
  // loan-given repayment below now source their date/expiry/guard logic from
  // the same shared hook useAlerts.ts (the header bell) already uses, instead
  // of a third independent copy — closes the exact drift class that caused
  // this file's insurance-premium block to earlier need its own leap-day/
  // annualizePremium/expiry-check fixes. Also fixes two real bugs found while
  // wiring this up: loan-given push notifications read `l.lender || l.name`,
  // neither of which exists on a loansGiven record (the real field is
  // `.borrower`, confirmed in CreditTab.tsx) — every push always showed the
  // literal fallback string "Borrower" — and never excluded already-settled
  // loans, so a fully repaid loan could still push a "repayment due" alert.
  // Subscriptions and rent were investigated and deliberately left
  // independent: the shared hook's subscription list intentionally excludes
  // monthly cycles (calendar-declutter reasoning that doesn't apply to push
  // reminders), and rent's tenant-paid side has no shared-hook equivalent.
  const milestoneEvents = useMilestoneEvents(state, FAR_FUTURE_CUTOFF);

  // Fire browser push notifications for upcoming reminders (runs once per tab session)
  useEffect(() => {
    if (
      !loaded ||
      !session ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    // Guard: sessionStorage persists across page refreshes within the same tab,
    // so notifications fire at most once per tab open — not on every refresh.
    const sessionKey = "finance-notif-fired-" + today();
    if (sessionStorage.getItem(sessionKey)) return;

    // Only fire notifications during the configured morning window (IST).
    // Prevents reminders from popping up at night when the user casually opens the app.
    let notifStart = 6;
    let notifEnd = 10;
    try {
      const s = localStorage.getItem("finance-notif-settings");
      if (s) {
        const parsed = JSON.parse(s);
        if (typeof parsed.notifStartHour === "number") notifStart = parsed.notifStartHour;
        if (typeof parsed.notifEndHour === "number") notifEnd = parsed.notifEndHour;
      }
    } catch {}
    const nowUtc = new Date();
    const istHour =
      (nowUtc.getUTCHours() + 5 + Math.floor((nowUtc.getUTCMinutes() + 30) / 60)) % 24;
    if (istHour < notifStart || istHour >= notifEnd) return;

    sessionStorage.setItem(sessionKey, "1");

    const getNotificationIcon = (type: string) => {
      const icons: Record<string, string> = {
        credit: "https://img.icons8.com/color/128/bank-card.png",
        subscription: "https://img.icons8.com/color/128/circular-arrows.png",
        reminder: "https://img.icons8.com/color/128/bell.png",
        fd: "https://img.icons8.com/color/128/piggy-bank.png",
        insurance: "https://img.icons8.com/color/128/shield.png",
        loan: "https://img.icons8.com/color/128/hand-with-money.png",
      };
      return icons[type] || "/logo.png";
    };

    // Read user's notification preferences
    let ns = {
      leadDays: 3,
      categories: {
        creditCards: true,
        subscriptions: true,
        reminders: true,
        fdMaturities: true,
        insurancePremiums: true,
        loanRecovery: true,
        rent: true,
        bonds: true,
      },
    };
    try {
      const s = localStorage.getItem("finance-notif-settings");
      if (s) ns = { ...ns, ...JSON.parse(s) };
    } catch {}
    const leadDays = ns.leadDays || 3;
    const cats = ns.categories || {};

    const todayStr = today();
    const soon: { title: string; body: string; type: string }[] = [];
    // Anchor both ends to midnight to avoid IST timezone off-by-one errors
    const daysLeft = (d: string) =>
      Math.ceil(
        (new Date(d + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) /
          86400000
      );
    const milestoneByType = (type: string) => milestoneEvents.filter((e: any) => e.type === type);
    const isDismissed = (title: string, ...alts: string[]) =>
      [title, ...alts].some(
        (t) => state.dismissedAlerts?.[alertDismissKey(t)] > Date.now()
      );

    if (cats.reminders !== false) {
      state.reminders.forEach((r: any) => {
        if (!r.date) return;
        const d = daysLeft(r.date);
        if (d >= 0 && d <= leadDays && !isDismissed(r.title)) {
          soon.push({
            title: r.title,
            body: d === 0 ? "Due today!" : `Due in ${d} day${d !== 1 ? "s" : ""}`,
            type: "reminder",
          });
        }
      });
    }

    if (cats.creditCards !== false) {
      state.creditCards
        .filter((c: any) => (c.status || "").toLowerCase() !== "closed" && !c.autoPay)
        .forEach((c: any) => {
          const dueDate = getCCDueDate(c);
          if (!dueDate) return;
          const d = daysLeft(dueDate);
          if (
            d >= 0 &&
            d <= leadDays &&
            !isDismissed(`${c.issuer} bill due`, `${c.issuer} CC due in ${d}d`)
          ) {
            soon.push({
              title: `${c.issuer} bill due`,
              body: `${fmtINRFull(c.outstanding)} outstanding${d === 0 ? " — today!" : ` — ${d}d`}`,
              type: "credit",
            });
          }
        });

      // Annual fee — the in-app Reminders list already surfaces this as its own
      // due date (RemindersTab.tsx), but it never had a push counterpart.
      milestoneByType("cc_fee").forEach((e: any) => {
        const c = e.source;
        const d = e.days;
        const title = `${c.issuer} annual fee due`;
        if (d >= 0 && d <= leadDays && !isDismissed(title, `${c.issuer} annual fee in ${d}d`)) {
          soon.push({
            title,
            body: `${fmtINRFull(c.annualFee)} charge${d === 0 ? " today" : ` in ${d}d`}`,
            type: "credit",
          });
        }
      });
    }

    if (cats.bonds !== false) {
      milestoneByType("bond_maturity").forEach((e: any) => {
        const b = e.source;
        const d = e.days;
        const title = `Bond Maturity — ${b.name || "Bond"}`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({
            title,
            body: `${fmtINRFull(b.faceValue || b.totalInvestmentAmount || 0)} matures${d === 0 ? " today" : ` in ${d}d`}`,
            type: "fd",
          });
        }
      });
    }

    // Rent — both the tenant-paid side (rentedProperties) and the landlord-received
    // side (rentalProperties). Neither had push coverage before, despite rent usually
    // being the single largest recurring due date in the app. Mirrors the corrected
    // (non-overdue-masking) due-date logic in RemindersTab.tsx: the due date for an
    // unpaid cycle is always the current cycle's date, so an overdue payment is still
    // caught while `d <= leadDays` is still upcoming — a push never fires for something
    // already overdue, matching every other category above.
    if (cats.rent !== false) {
      const todayD = new Date(todayStr + "T00:00:00");
      const currentYear = todayD.getFullYear();
      const currentMonth = todayD.getMonth();
      const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const clampedRentDate = (year: number, month: number, day: number) => {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(day, lastDay));
      };
      const pushRentAlert = (p: any, isPayable: boolean) => {
        const rentAmt = getEffectiveRent(p);
        if (!rentAmt) return;
        const dueDay = p.dueDay ? parseInt(p.dueDay, 10) : 5;
        const history = isPayable ? p.payments || [] : p.receipts || [];
        const settledCurrent = history.some(
          (h: any) => h.date && h.date.startsWith(currentMonthStr)
        );
        if (settledCurrent) return;
        const dueDateStr = getLocalDateString(clampedRentDate(currentYear, currentMonth, dueDay));
        const d = daysLeft(dueDateStr);
        const title = `${p.propertyName || "Rent"} — ${isPayable ? "Rent due" : "Rent receivable"}`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({
            title,
            body: `${fmtINRFull(rentAmt)} due${d === 0 ? " today" : ` in ${d}d`}`,
            type: "reminder",
          });
        }
      };
      const rentTodayStr = getLocalDateString(todayD);
      (state.rentedProperties || [])
        .filter((p: any) => p.isActive !== false && (!p.agreementEnd || p.agreementEnd >= rentTodayStr))
        .forEach((p: any) => pushRentAlert(p, true));
      (state.rentalProperties || [])
        .filter((p: any) => p.isActive !== false && (!p.agreementEnd || p.agreementEnd >= rentTodayStr))
        .forEach((p: any) => pushRentAlert(p, false));
    }

    if (cats.subscriptions !== false) {
      state.subscriptions
        .filter((s: any) => s.renewalDate && !s.paused)
        .forEach((s: any) => {
          const d = daysLeft(s.renewalDate);
          if (
            d >= 0 &&
            d <= leadDays &&
            !isDismissed(`${s.name} renewal`, `${s.name} renews in ${d}d`)
          ) {
            soon.push({
              title: `${s.name} renewal`,
              body: `${fmtINRFull(s.amount)} due${d === 0 ? " today" : ` in ${d}d`}`,
              type: "subscription",
            });
          }
        });
    }

    if (cats.fdMaturities !== false) {
      milestoneByType("fd_maturity").forEach((e: any) => {
        const f = e.source;
        const d = e.days;
        const title = `FD Maturity — ${f.bank || f.bankName || "Bank"}`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({
            title,
            body: `${fmtINRFull(f.principal)} matures${d === 0 ? " today" : ` in ${d}d`}`,
            type: "fd",
          });
        }
      });
    }

    if (cats.insurancePremiums !== false) {
      // Now sources next-due-date/premium/expiry-guard from the shared
      // useMilestoneEvents hook (same one useAlerts.ts's header bell reads)
      // instead of an independent copy — this file's own copy already had
      // the leap-day/annualizePremium/expiry-check fixes applied earlier
      // this session, so this is pure dedup (prevents future drift), not a
      // behavior change.
      milestoneByType("insurance_premium").forEach((e: any) => {
        const p = e.source;
        const d = e.days;
        // Matches this file's original per-collection fallback text exactly
        // ("LIC Policy" for LIC, not the shared hook's plain "LIC" label).
        const fallback =
          e.sourceLabel === "LIC"
            ? "LIC Policy"
            : e.sourceLabel === "Term Plan"
              ? "Term Plan"
              : "Investment Plan";
        const name = p.planName || fallback;
        const title = `${name} premium due`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({
            title,
            body: `${fmtINRFull(e.amount)}${d === 0 ? " — today!" : ` in ${d}d`}`,
            type: "insurance",
          });
        }
      });
    }

    if (cats.loanRecovery !== false) {
      // Was reading `l.lender || l.name`, neither of which exists on a
      // loansGiven record (the real field is `.borrower`, confirmed in
      // CreditTab.tsx) — every push notification here always showed the
      // literal fallback string "Borrower" regardless of who actually owes
      // the money. Also never excluded already-settled loans (outstanding
      // <= 0), so a fully repaid loan could still push a "repayment due"
      // notification. Both fixed by sourcing from useMilestoneEvents, which
      // already guards on outstanding and uses the correct field.
      milestoneByType("loan_given_repayment").forEach((e: any) => {
        const l = e.source;
        const d = e.days;
        const title = `Loan Recovery — ${l.borrower || "Borrower"}`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({
            title,
            body: `${fmtINRFull(l.outstanding)} due${d === 0 ? " today" : ` in ${d}d`}`,
            type: "loan",
          });
        }
      });
    }

    soon.forEach(({ title, body, type }) => {
      try {
        new Notification(title, { body, icon: getNotificationIcon(type) });
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, session]); // intentionally omit other deps — runs once after login + load

  // Request browser notification permission once after first successful login
  useEffect(() => {
    if (!loaded || !session || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [loaded, session]);
}
