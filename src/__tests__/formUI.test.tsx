import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Field, Input, Select, Textarea } from "../components/ui/Form";

describe("Form UI Components", () => {
  describe("Field", () => {
    it("renders label and children", () => {
      render(
        <Field label="Full Name">
          <Input placeholder="Enter name" />
        </Field>
      );
      expect(screen.getByText("Full Name")).not.toBeNull();
      expect(screen.getByPlaceholderText("Enter name")).not.toBeNull();
    });

    it("renders required red asterisk when required is passed or label has *", () => {
      render(
        <Field label="Provider *" required>
          <Input placeholder="Provider name" />
        </Field>
      );
      expect(screen.getByText("Provider")).not.toBeNull();
      expect(screen.getByText("*")).not.toBeNull();
      const input = screen.getByPlaceholderText("Provider name");
      expect(input.getAttribute("aria-required")).toBe("true");
    });

    it("displays error message and sets aria-invalid", () => {
      render(
        <Field label="Amount" error="Amount must be greater than zero">
          <Input placeholder="Amount" />
        </Field>
      );
      expect(screen.getByRole("alert").textContent).toContain("Amount must be greater than zero");
      const input = screen.getByPlaceholderText("Amount");
      expect(input.getAttribute("aria-invalid")).toBe("true");
    });

    it("displays hint text when no error", () => {
      render(
        <Field label="Notes" hint="Optional reference notes">
          <Textarea placeholder="Type notes" />
        </Field>
      );
      expect(screen.getByText("Optional reference notes")).not.toBeNull();
      const textarea = screen.getByPlaceholderText("Type notes");
      expect(textarea.getAttribute("aria-describedby")).toBeTruthy();
    });
  });

  describe("Input, Select, Textarea forwardRef and class", () => {
    it("attaches ref to Input and retains form-input class", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} className="custom-input" placeholder="Ref test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.className).toContain("form-input");
      expect(ref.current?.className).toContain("custom-input");
    });

    it("attaches ref to Select and retains form-input class", () => {
      const ref = React.createRef<HTMLSelectElement>();
      render(
        <Select ref={ref} className="custom-select">
          <option value="1">One</option>
        </Select>
      );
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current?.className).toContain("form-input");
    });

    it("attaches ref to Textarea and retains form-input class", () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} placeholder="Textarea ref" />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      expect(ref.current?.className).toContain("form-input");
    });
  });
});
