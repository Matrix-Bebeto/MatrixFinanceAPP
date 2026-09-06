import { describe, expect, it } from "vitest"
import { matchesPeriod, summarizeTransactions } from "./dashboard"
import type { TransactionWithCategory } from "../types/database"

const transaction = (valor: number, tipo: "receita" | "despesa", date = "2026-01-01") => ({
  valor, tipo, transaction_date: date, categorias: { nome: "Materiais" },
}) as TransactionWithCategory

describe("dashboard financial calculations", () => {
  it("preserves cents and supports legacy negative expenses", () => {
    const result = summarizeTransactions([transaction(0.3, "receita"), transaction(-0.1, "despesa"), transaction(0.1, "despesa")])
    expect(result.balance).toBe(0.1)
    expect(result.expenses).toBe(0.2)
  })
  it("does not hide overspending and does not invent a ratio without income", () => {
    expect(summarizeTransactions([transaction(100, "receita"), transaction(125, "despesa")]).commitment).toBe(125)
    expect(summarizeTransactions([transaction(125, "despesa")]).commitment).toBeNull()
    expect(summarizeTransactions([]).commitment).toBeNull()
  })
  it("fills missing months and keeps categories beyond the top five in totals", () => {
    const result = summarizeTransactions([transaction(10, "receita"), transaction(20, "despesa", "2026-03-01")])
    expect(result.timeline.map(p => p.key)).toEqual(["2026-01", "2026-02", "2026-03"])
    expect(result.timeline[1].expenses).toBe(0)
    expect(result.categories[0].percentage).toBe(100)
  })
  it("includes today before noon and uses Fortaleza calendar boundaries", () => {
    expect(matchesPeriod("2026-09-06", "until_today", "9", "2026", new Date("2026-09-06T10:00:00Z"))).toBe(true)
    expect(matchesPeriod("2026-08-31", "current_month", "9", "2026", new Date("2026-09-01T01:00:00Z"))).toBe(true)
    expect(matchesPeriod("2025-12-31", "last_month", "1", "2026", new Date("2026-01-02T12:00:00Z"))).toBe(true)
  })
})
