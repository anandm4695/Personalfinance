import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InformalPersonModal } from "../components/credit/InformalPersonModal";
import { LoanTakenModal } from "../components/credit/LoanTakenModal";
import { LoanGivenModal } from "../components/credit/LoanGivenModal";
import { informalPersonOutstanding, loanOutstanding, loanGivenOutstanding } from "../utils/finance";

describe("Loans & People <-> Banks & Transactions Integration", () => {
  const mockBankAccounts = [
    { id: "bank-hfdc-1", bankName: "HDFC Bank", accountNumber: "123456789012" },
    { id: "bank-sbi-1", bankName: "SBI Bank", accountNumber: "987654321098" },
  ];

  describe("InformalPersonModal Bank Integration", () => {
    it("auto-generates credit bank transaction when borrowing from a new person with bank selected", async () => {
      const onSave = vi.fn();
      render(
        <InformalPersonModal
          direction="borrowed"
          bankAccounts={mockBankAccounts}
          onSave={onSave}
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Uncle Ramesh, Rohit/i), {
        target: { value: "Rohit Sharma" },
      });

      fireEvent.change(screen.getByPlaceholderText(/50000/i), {
        target: { value: "75000" },
      });

      const selects = document.querySelectorAll("select");
      const bankSelect = selects[selects.length - 1];
      fireEvent.change(bankSelect, {
        target: { value: "bank-hfdc-1" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          person: "Rohit Sharma",
          tranches: expect.arrayContaining([
            expect.objectContaining({ amount: 75000 }),
          ]),
        }),
        expect.objectContaining({
          amount: 75000,
          type: "credit",
          category: "Loan Received",
          accountId: "bank-hfdc-1",
        })
      );
    });

    it("auto-generates debit bank transaction when lending to a new person with bank selected", async () => {
      const onSave = vi.fn();
      render(
        <InformalPersonModal
          direction="lent"
          bankAccounts={mockBankAccounts}
          onSave={onSave}
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Rajesh Sharma, Priya/i), {
        target: { value: "Priya Patel" },
      });

      fireEvent.change(screen.getByPlaceholderText(/50000/i), {
        target: { value: "30000" },
      });

      const selects = document.querySelectorAll("select");
      const bankSelect = selects[selects.length - 1];
      fireEvent.change(bankSelect, {
        target: { value: "bank-sbi-1" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Borrower/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          person: "Priya Patel",
          tranches: expect.arrayContaining([
            expect.objectContaining({ amount: 30000 }),
          ]),
        }),
        expect.objectContaining({
          amount: 30000,
          type: "debit",
          category: "Loan Given",
          accountId: "bank-sbi-1",
        })
      );
    });
  });

  describe("LoanTakenModal Bank Integration", () => {
    it("auto-generates credit bank transaction when taking a formal loan", async () => {
      const onSave = vi.fn();
      render(
        <LoanTakenModal
          bankAccounts={mockBankAccounts}
          onSave={onSave}
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/HDFC Bank, SBI, ICICI, Bajaj Finserv/i), {
        target: { value: "ICICI Home Loan" },
      });

      fireEvent.change(screen.getByPlaceholderText(/2500000/i), {
        target: { value: "2500000" },
      });

      fireEvent.change(screen.getByPlaceholderText(/8.75/i), {
        target: { value: "8.5" },
      });

      fireEvent.change(screen.getByPlaceholderText(/24500/i), {
        target: { value: "25000" },
      });

      const selects = document.querySelectorAll("select");
      const bankSelect = selects[selects.length - 1];
      fireEvent.change(bankSelect, {
        target: { value: "bank-hfdc-1" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Loan Taken/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          lender: "ICICI Home Loan",
          principal: 2500000,
        }),
        expect.objectContaining({
          amount: 2500000,
          type: "credit",
          category: "Loan Received",
          accountId: "bank-hfdc-1",
          linkedType: "loansTaken",
        })
      );
    });
  });

  describe("LoanGivenModal Bank Integration", () => {
    it("auto-generates debit bank transaction when disbursing a formal loan given", async () => {
      const onSave = vi.fn();
      render(
        <LoanGivenModal
          bankAccounts={mockBankAccounts}
          onSave={onSave}
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/Rahul Sharma, Amit Verma/i), {
        target: { value: "Vikram Mehta" },
      });

      fireEvent.change(screen.getByPlaceholderText(/100000/i), {
        target: { value: "100000" },
      });

      const selects = document.querySelectorAll("select");
      const bankSelect = selects[selects.length - 1];
      fireEvent.change(bankSelect, {
        target: { value: "bank-sbi-1" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Record Loan Given/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          borrower: "Vikram Mehta",
          principal: 100000,
        }),
        expect.objectContaining({
          amount: 100000,
          type: "debit",
          category: "Loan Given",
          accountId: "bank-sbi-1",
          linkedType: "loansGiven",
        })
      );
    });
  });

  describe("Accounting Balance Calculations", () => {
    it("accurately computes informal person outstanding across tranches and payments", () => {
      const person = {
        person: "Amit",
        tranches: [
          { amount: 50000 },
          { amount: 25000 },
        ],
        payments: [
          { amount: 20000 },
          { amount: 15000 },
        ],
      };
      // Total tranches = 75,000; Total payments = 35,000; Outstanding = 40,000
      expect(informalPersonOutstanding(person)).toBe(40000);
    });

    it("accurately handles formal loan outstanding and loan given outstanding", () => {
      const loanTaken = { principal: 500000, outstanding: 420000, status: "active" };
      expect(loanOutstanding(loanTaken)).toBe(420000);

      const loanGiven = { principal: 150000, outstanding: 90000, status: "active" };
      expect(loanGivenOutstanding(loanGiven)).toBe(90000);
    });
  });
});
