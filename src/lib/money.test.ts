import { describe, expect, it } from "vitest"
import { parseMoney } from "./money"

describe("money helpers", () => {
  it("parses Brazilian decimal input into exact cents", () => {
    expect(parseMoney("10,129")).toBe(10.13)
  })

  it("stores the magnitude because the transaction type carries the sign", () => {
    expect(parseMoney(-25.5)).toBe(25.5)
  })

  it("rejects invalid values", () => {
    expect(() => parseMoney("abc")).toThrow()
  })
})
