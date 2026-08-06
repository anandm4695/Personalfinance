import { useEffect } from "react";
import {
  today,
  fmtINRFull,
  getCCDueDate,
  getLocalDateString,
  getEffectiveRent,
  alertDismissKey,
} from "../utils/finance";

export function useNotifications(loaded: boolean, session: any, state: any): void {
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
      state.creditCards
        .filter(
          (c: any) =>
            (c.status || "").toLowerCase() !== "closed" && Number(c.annualFee) > 0 && c.feeMonth
        )
        .forEach((c: any) => {
          const month = Number(c.feeMonth) - 1;
          const day = Number(c.feeDay) || 1;
          const now = new Date();
          let candidate = new Date(now.getFullYear(), month, day);
          if (candidate.getTime() < new Date(todayStr + "T00:00:00").getTime())
            candidate = new Date(now.getFullYear() + 1, month, day);
          const d = daysLeft(getLocalDateString(candidate));
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
      (state.bonds || []).forEach((b: any) => {
        if (!b.maturityDate) return;
        const d = daysLeft(b.maturityDate);
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
      (state.rentedProperties || [])
        .filter((p: any) => p.isActive !== false)
        .forEach((p: any) => pushRentAlert(p, true));
      (state.rentalProperties || [])
        .filter((p: any) => p.isActive !== false)
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
      (state.fixedDeposits || []).forEach((f: any) => {
        if (!f.maturityDate) return;
        const d = daysLeft(f.maturityDate);
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
      const allPolicies = [
        ...(state.lic || []).map((p: any) => ({
          name: p.planName || "LIC Policy",
          start: p.commencementDate,
          premium: p.annualPremium,
        })),
        ...(state.termPlans || []).map((p: any) => ({
          name: p.planName || "Term Plan",
          start: p.startDate,
          premium: p.annualPremium,
        })),
        ...(state.investmentPlans || []).map((p: any) => ({
          name: p.planName || "Investment Plan",
          start: p.commencementDate,
          premium: p.annualPremium,
        })),
      ];
      const todayD = new Date(todayStr + "T00:00:00");
      allPolicies.forEach((pol) => {
        if (!pol.premium || Number(pol.premium) <= 0 || !pol.start) return;
        const start = new Date(pol.start);
        if (isNaN(start.getTime())) return;
        let ann = new Date(todayD.getFullYear(), start.getMonth(), start.getDate());
        if (ann < todayD)
          ann = new Date(todayD.getFullYear() + 1, start.getMonth(), start.getDate());
        const d = daysLeft(getLocalDateString(ann));
        const title = `${pol.name} premium due`;
        if (d >= 0 && d <= leadDays && !isDismissed(title)) {
          soon.push({
            title,
            body: `${fmtINRFull(pol.premium)}${d === 0 ? " — today!" : ` in ${d}d`}`,
            type: "insurance",
          });
        }
      });
    }

    if (cats.loanRecovery !== false) {
      (state.loansGiven || []).forEach((l: any) => {
        if (!l.dueDate) return;
        const d = daysLeft(l.dueDate);
        const title = `Loan Recovery — ${l.lender || l.name || "Borrower"}`;
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
