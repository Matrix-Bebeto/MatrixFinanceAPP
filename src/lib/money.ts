export const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

export function parseMoney(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."))
  if (!Number.isFinite(parsed)) throw new Error("Informe um valor válido.")
  return Math.round(Math.abs(parsed) * 100) / 100
}
