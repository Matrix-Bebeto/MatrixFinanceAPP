const APP_TIME_ZONE = "America/Fortaleza"

export function todayInAppTimeZone(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

export function formatDateBR(value?: string | null) {
  if (!value) return ""
  const [year, month, day] = value.slice(0, 10).split("-")
  return year?.length === 4 && month && day ? `${day}/${month}/${year}` : value
}

export function monthRange(year: number, monthIndex: number) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  return { start, end: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` }
}
