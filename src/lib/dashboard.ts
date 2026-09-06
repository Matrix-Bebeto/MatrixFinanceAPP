import { todayInAppTimeZone } from "./date"
import type { TransactionWithCategory } from "../types/database"

export type PeriodType = "all" | "until_today" | "current_month" | "last_month" | "custom"

export function matchesPeriod(date: string, period: PeriodType, month: string, year: string, today: Date) {
  const todayKey = todayInAppTimeZone(today)
  if (period === "all") return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (period === "until_today") return date <= todayKey
  if (period === "current_month") return date.slice(0, 7) === todayKey.slice(0, 7)
  if (period === "last_month") {
    const [y, m] = todayKey.split("-").map(Number)
    return date.slice(0, 7) === `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`
  }
  return date.slice(0, 7) === `${year}-${month.padStart(2, "0")}`
}

export function summarizeTransactions(transactions: TransactionWithCategory[]) {
  let incomeCents = 0
  let expenseCents = 0
  const categories = new Map<string, number>()
  const months = new Map<string, { income: number; expenses: number }>()
  for (const transaction of transactions) {
    // Legacy rows can be negative; tipo is the source of direction throughout the app.
    const cents = Math.round(Math.abs(Number(transaction.valor)) * 100)
    if (!Number.isFinite(cents)) throw new Error("Valor de transação inválido")
    const key = transaction.transaction_date.slice(0, 7)
    const point = months.get(key) ?? { income: 0, expenses: 0 }
    if (transaction.tipo === "receita") {
      incomeCents += cents
      point.income += cents
    } else {
      expenseCents += cents
      point.expenses += cents
      const name = transaction.categorias?.nome || "Sem categoria"
      categories.set(name, (categories.get(name) ?? 0) + cents)
    }
    months.set(key, point)
  }
  const keys = [...months.keys()].sort()
  // Include months without movement so the line does not imply continuous activity.
  if (keys.length) {
    const [firstYear, firstMonth] = keys[0].split("-").map(Number)
    const cursor = new Date(Date.UTC(firstYear, firstMonth - 1, 1))
    while (cursor.toISOString().slice(0, 7) < keys[keys.length - 1]) {
      const key = cursor.toISOString().slice(0, 7)
      if (!months.has(key)) months.set(key, { income: 0, expenses: 0 })
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
  }
  return {
    income: incomeCents / 100,
    expenses: expenseCents / 100,
    balance: (incomeCents - expenseCents) / 100,
    commitment: incomeCents > 0 ? Math.round(expenseCents / incomeCents * 100) : null,
    categories: [...categories.entries()].sort((a, b) => b[1] - a[1]).map(([name, cents]) => ({
      name, value: cents / 100, percentage: expenseCents ? cents / expenseCents * 100 : 0,
    })),
    timeline: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, point]) => ({
      key,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00Z`)),
      income: point.income / 100, expenses: point.expenses / 100,
    })),
  }
}
