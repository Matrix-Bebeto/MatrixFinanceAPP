import { describe, expect, it } from "vitest"
import { formatDateBR, monthRange, todayInAppTimeZone } from "./date"

describe("date helpers", () => {
  it("uses the application timezone instead of UTC", () => {
    expect(todayInAppTimeZone(new Date("2026-01-01T01:00:00.000Z"))).toBe("2025-12-31")
  })

  it("formats database dates without timezone shifts", () => {
    expect(formatDateBR("2026-08-03")).toBe("03/08/2026")
  })

  it("returns the correct leap-year month range", () => {
    expect(monthRange(2024, 1)).toEqual({ start: "2024-02-01", end: "2024-02-29" })
  })
})
