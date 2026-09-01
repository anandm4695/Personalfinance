import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  VehiclesTab,
  IndianNumberPlate,
  VehicleModal,
  ServiceModal,
  InsuranceModal,
  resolveVehicleColor,
  PRESET_VEHICLE_COLORS,
} from "../components/tabs/VehiclesTab";
import { MasterDataContext, DEFAULT_MASTER_DATA } from "../utils/masterData";
import { PrivacyProvider } from "../context/PrivacyContext";

// Mock react-dom createPortal for server rendering tests
vi.mock("react-dom", async () => {
  const original = await vi.importActual<any>("react-dom");
  return {
    ...original,
    default: {
      ...(original.default || {}),
      createPortal: (children: any) => children,
    },
    createPortal: (children: any) => children,
  };
});

// Simple mock for recharts ResponsiveContainer
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

// Mock animated numbers and hooks
vi.mock("../hooks/useAnimatedNumber", () => ({
  useAnimatedNumber: (val: number) => val,
}));

vi.mock("../hooks/useAsyncAction", () => ({
  useAsyncAction: (fn: any) => ({
    run: fn,
    loading: false,
    error: null,
  }),
}));

const mockState = {
  vehicles: [
    {
      id: "v1",
      make: "Tata",
      model: "Nexon EV",
      year: 2023,
      color: "Daytona Grey",
      fuelType: "electric",
      vehicleType: "four-wheeler",
      registrationNumber: "MH02EV1234",
      chassisNumber: "MAT621000N1234567",
      engineNumber: "ENG998877",
      purchaseDate: "2023-05-15",
      purchasePrice: 1650000,
      purchaseBasicCost: 1400000,
      purchaseCgstAmount: 35000,
      purchaseSgstAmount: 35000,
      rtoCharges: 80000,
      accessoriesCharges: 25000,
      currentValue: 1350000,
      currentOdometer: 14200,
      insuranceExpiry: "2026-12-31",
      pucExpiry: "2026-11-15",
      nextServiceDueDate: "2026-10-01",
      nextServiceDueOdometer: 20000,
      owner: "self",
      notes: "Installed 7.2kW AC home charger",
      serviceHistory: [
        {
          id: "s1",
          date: "2024-01-10",
          type: "regular_service",
          description: "1st Periodic Service & Software Update",
          cost: 2400,
          odometer: 7500,
          serviceCenter: "Tata Motors EV Tech Center",
          notes: "Tire rotation and brake inspection",
        },
      ],
      insuranceHistory: [
        {
          id: "i1",
          policyType: "zero_dep",
          insurer: "ACKO General Insurance",
          policyNumber: "ACKO-EV-9921",
          tenure: "1_year",
          fromDate: "2023-05-15",
          toDate: "2026-12-31",
          basicCost: 28000,
          cgstAmount: 2520,
          sgstAmount: 2520,
          totalPremium: 33040,
          notes: "Includes zero depreciation and battery pack protection",
        },
      ],
    },
    {
      id: "v2",
      make: "Royal Enfield",
      model: "Hunter 350",
      year: 2022,
      color: "Dapper Ash",
      fuelType: "petrol",
      vehicleType: "two-wheeler",
      registrationNumber: "MH01AB9876",
      purchasePrice: 195000,
      currentValue: 155000,
      currentOdometer: 8500,
      insuranceExpiry: "2026-09-10",
      pucExpiry: "2026-08-01",
      owner: "self",
      serviceHistory: [],
      insuranceHistory: [],
    },
  ],
  profile: { name: "Anand Mohta", fy: "2024-2025" },
  masterData: DEFAULT_MASTER_DATA,
};

describe("VehiclesTab Component", () => {
  it("renders the redesigned executive garage hub with fleet valuation and Indian HSRP plates", () => {
    const html = renderToString(
      <PrivacyProvider>
        <MasterDataContext.Provider value={mockState.masterData}>
          <VehiclesTab state={mockState} />
        </MasterDataContext.Provider>
      </PrivacyProvider>
    );

    expect(html).toContain("Vehicles &amp; Digital Garage");
    expect(html).toContain("Fleet Market Valuation");
    expect(html).toContain("Nexon EV");
    expect(html).toContain("Hunter 350");
    expect(html).toContain("IND");
    expect(html).toContain("MH02EV1234");
    expect(html).toContain("MH01AB9876");
    expect(html).toContain("Garage Showcase");
    expect(html).toContain("Fleet Matrix");
    expect(html).toContain("Service Center");
  });

  it("renders empty state when no vehicles are configured", () => {
    const emptyState = { ...mockState, vehicles: [] };
    const html = renderToString(
      <PrivacyProvider>
        <MasterDataContext.Provider value={mockState.masterData}>
          <VehiclesTab state={emptyState} />
        </MasterDataContext.Provider>
      </PrivacyProvider>
    );

    expect(html).toContain("Your Garage is Empty");
    expect(html).toContain("Add First Vehicle");
  });

  it("renders IndianNumberPlate component correctly with EV and standard styling", () => {
    const evPlateHtml = renderToString(
      <IndianNumberPlate registrationNumber="MH02EV1234" isElectric={true} size="md" />
    );
    expect(evPlateHtml).toContain("IND");
    expect(evPlateHtml).toContain("MH02EV1234");

    const normalPlateHtml = renderToString(
      <IndianNumberPlate registrationNumber="DL01AB9999" isElectric={false} size="sm" />
    );
    expect(normalPlateHtml).toContain("IND");
    expect(normalPlateHtml).toContain("DL01AB9999");
  });

  it("resolves various automotive paint color names and hex codes correctly", () => {
    const grey = resolveVehicleColor("Daytona Grey");
    expect(grey.hex).toBe("#475569");

    const white = resolveVehicleColor("Arctic White");
    expect(white.hex).toBe("#f8fafc");

    const red = resolveVehicleColor("Crimson Red");
    expect(red.hex).toBe("#dc2626");

    const customHex = resolveVehicleColor("#10b981");
    expect(customHex.hex).toBe("#10b981");

    expect(PRESET_VEHICLE_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it("renders VehicleModal with live color preview banner and quick preset chips", () => {
    const html = renderToString(
      <MasterDataContext.Provider value={mockState.masterData}>
        <VehicleModal onClose={() => {}} onSave={() => {}} />
      </MasterDataContext.Provider>
    );

    expect(html).toContain("Add Vehicle to Garage");
    expect(html).toContain("Fuel Type");
    expect(html).toContain("Daytona Grey");
    expect(html).toContain("Arctic White");
    expect(html).toContain("Onyx Black");
    expect(html).toContain("Popular:");
    expect(html).toContain("Tata Motors");
    expect(html).toContain("Mahindra");
  });

  it("renders ServiceModal and InsuranceModal correctly with brand logos", () => {
    const serviceHtml = renderToString(
      <MasterDataContext.Provider value={mockState.masterData}>
        <ServiceModal vehicleName="Tata Nexon EV" onClose={() => {}} onSave={() => {}} />
      </MasterDataContext.Provider>
    );
    expect(serviceHtml).toContain("Service Category");
    expect(serviceHtml).toContain("Regular Service");
    expect(serviceHtml).toContain("Service Center / Workshop");

    const insuranceHtml = renderToString(
      <MasterDataContext.Provider value={mockState.masterData}>
        <InsuranceModal vehicleName="Tata Nexon EV" onClose={() => {}} onSave={() => {}} />
      </MasterDataContext.Provider>
    );
    expect(insuranceHtml).toContain("Policy Cover Type");
    expect(insuranceHtml).toContain("Comprehensive Package");
    expect(insuranceHtml).toContain("Insurance Provider / Company");
  });

  it("resolves automotive brand logos correctly across Indian and global makes", async () => {
    const { resolveBrand, VehicleLogo } = await import("../components/ui/BrandLogos");

    const tata = resolveBrand("Tata Motors");
    expect(tata).toBeTruthy();
    expect(tata?.domain).toBe("tatamotors.com");
    expect(tata?.growwSym).toBe("TATAMOTORS");

    const maruti = resolveBrand("Maruti Suzuki");
    expect(maruti).toBeTruthy();
    expect(maruti?.domain).toBe("marutisuzuki.com");

    const mahindra = resolveBrand("Mahindra");
    expect(mahindra).toBeTruthy();
    expect(mahindra?.domain).toBe("mahindra.com");

    const royalEnfield = resolveBrand("Royal Enfield");
    expect(royalEnfield).toBeTruthy();
    expect(royalEnfield?.domain).toBe("royalenfield.com");

    const bmw = resolveBrand("BMW");
    expect(bmw).toBeTruthy();
    expect(bmw?.domain).toBe("bmw.com");

    const ather = resolveBrand("Ather Energy");
    expect(ather).toBeTruthy();
    expect(ather?.domain).toBe("atherenergy.com");

    const logoHtml = renderToString(<VehicleLogo make="Tata Motors" size={48} />);
    expect(logoHtml).toContain("img");
    expect(logoHtml).toContain("TATAMOTORS");
  });
});

