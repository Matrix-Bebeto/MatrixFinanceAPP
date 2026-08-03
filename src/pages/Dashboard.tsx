import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Loader2,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { supabase } from "@/src/lib/supabase"
import { formatDateBR } from "@/src/lib/date"
import { formatCurrency } from "@/src/lib/money"
import type { Reminder, TransactionWithCategory } from "@/src/types/database"
import "../dashboard-v2.css"

type PeriodType = "all" | "until_today" | "current_month" | "last_month" | "custom"
type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
type CategoryTotal = { name: string; value: number; percentage: number; color: string }

const categoryColors = ["#42d8a6", "#9588f4", "#ff8979", "#f4b858", "#45b9d6"]

export function Dashboard() {
  const today = useMemo(() => new Date(), [])
  const [periodFilter, setPeriodFilter] = useState<PeriodType>("all")
  const [month, setMonth] = useState(String(today.getMonth() + 1))
  const [year, setYear] = useState(String(today.getFullYear()))
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      const [transactionsResult, remindersResult] = await Promise.all([
        supabase
          .from("transacoes")
          .select("id, created_at, transaction_date, quando, estabelecimento, valor, detalhes, tipo, userid, category_id, categorias(nome)")
          .order("transaction_date", { ascending: false }),
        supabase
          .from("lembretes")
          .select("id, created_at, userid, descricao, data, due_date, valor, hora, status, notificado")
          .order("due_date", { ascending: true }),
      ])

      if (!active) return
      if (transactionsResult.error) console.error("Erro ao carregar transações:", transactionsResult.error)
      if (remindersResult.error) console.error("Erro ao carregar lembretes:", remindersResult.error)
      setTransactions((transactionsResult.data ?? []) as TransactionWithCategory[])
      setReminders(remindersResult.data ?? [])
      setLoading(false)
    }

    void loadDashboard()
    return () => { active = false }
  }, [])

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => matchesPeriod(transaction.transaction_date, periodFilter, month, year, today)),
    [transactions, periodFilter, month, year, today],
  )

  const filteredReminders = useMemo(
    () => reminders.filter((reminder) => matchesPeriod(reminder.due_date, periodFilter, month, year, today)),
    [reminders, periodFilter, month, year, today],
  )

  const stats = useMemo(() => {
    let income = 0
    let expenses = 0
    const categoryMap = new Map<string, number>()

    for (const transaction of filteredTransactions) {
      const value = Math.abs(Number(transaction.valor))
      if (transaction.tipo === "receita") income += value
      if (transaction.tipo === "despesa") {
        expenses += value
        const category = transaction.categorias?.nome || "Outros"
        categoryMap.set(category, (categoryMap.get(category) ?? 0) + value)
      }
    }

    const categories: CategoryTotal[] = [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: expenses ? Math.round((value / expenses) * 100) : 0,
        color: categoryColors[index] ?? categoryColors[0],
      }))

    return {
      income,
      expenses,
      balance: income - expenses,
      transactionCount: filteredTransactions.length,
      activeReminders: filteredReminders.filter((reminder) => !["concluido", "completed"].includes(reminder.status)).length,
      categories,
    }
  }, [filteredTransactions, filteredReminders])

  const periodLabel = getPeriodLabel(periodFilter, month, year)
  const commitment = stats.income > 0 ? Math.min(Math.round((stats.expenses / stats.income) * 100), 100) : stats.expenses > 0 ? 100 : 0
  const recentTransactions = filteredTransactions.slice(0, 5)

  if (loading) return <div className="mf-app-v2__loader" role="status"><Loader2 aria-hidden="true" /><span className="sr-only">Carregando painel financeiro</span></div>

  return (
    <>
      <section className="mf-v2__hero-row">
        <div>
          <span className="mf-v2__eyebrow">{formatLongDate(today)}</span>
          <h1>Seu dinheiro em perspectiva</h1>
          <p>Uma visão completa, calma e objetiva da sua vida financeira.</p>
        </div>

        <div className="mf-app-v2__filters">
          <div className="mf-v2__period">
            <CalendarDays aria-hidden="true" />
            <select aria-label="Período" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodType)}>
              <option value="all">Até o momento</option>
              <option value="until_today">Até hoje</option>
              <option value="current_month">Mês atual</option>
              <option value="last_month">Último mês</option>
              <option value="custom">Mês específico</option>
            </select>
          </div>
          {periodFilter === "custom" && <CustomPeriod month={month} year={year} onMonth={setMonth} onYear={setYear} />}
        </div>
      </section>

      <section className="mf-v2__metrics" aria-label="Resumo financeiro">
        <MetricCard label="Saldo disponível" value={formatCurrency(stats.balance)} detail={`${stats.transactionCount} transações em ${periodLabel.toLowerCase()}`} icon={WalletCards} tone="primary" trend={stats.balance >= 0 ? "positive" : "negative"} />
        <MetricCard label="Receitas" value={formatCurrency(stats.income)} detail={periodLabel} icon={ArrowDownLeft} tone="mint" trend="positive" />
        <MetricCard label="Despesas" value={formatCurrency(stats.expenses)} detail={periodLabel} icon={ArrowUpRight} tone="coral" trend="negative" />
        <MetricCard label="Lembretes ativos" value={String(stats.activeReminders)} detail="Pendências financeiras" icon={Bell} tone="violet" trend="neutral" />
      </section>

      <section className="mf-v2__dashboard-grid">
        <article className="mf-v2__panel">
          <PanelHeader title="Gastos por categoria" subtitle={`Distribuição em ${periodLabel.toLowerCase()}`} action="Ver relatório" to="/reports" />
          {stats.categories.length ? (
            <div className="mf-v2__chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categories} margin={{ top: 22, right: 14, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--v2-grid)" strokeDasharray="3 5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--v2-muted)", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--v2-muted)", fontSize: 9 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip cursor={{ fill: "var(--v2-card-soft)" }} formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "var(--v2-card)", border: "1px solid var(--v2-border)", borderRadius: 12, color: "var(--v2-text)", fontSize: 11 }} />
                  <Bar dataKey="value" fill="var(--v2-coral)" radius={[7, 7, 2, 2]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="Cadastre despesas para visualizar a distribuição por categoria." />}
        </article>

        <article className="mf-v2__panel mf-v2__budget-panel">
          <PanelHeader title="Comprometimento" subtitle="Despesas em relação às receitas" />
          <div className="mf-v2__budget-ring" style={{ "--progress": `${commitment}%` } as CSSProperties}>
            <div><strong>{commitment}%</strong><span>utilizado</span></div>
          </div>
          <div className="mf-v2__budget-values"><span><small>Despesas</small><strong>{formatCurrency(stats.expenses)}</strong></span><span><small>Receitas</small><strong>{formatCurrency(stats.income)}</strong></span></div>
          <div className="mf-v2__budget-message"><CircleCheck aria-hidden="true" /><span>{commitment <= 70 ? <>Seu orçamento está equilibrado. <strong>Continue assim.</strong></> : <>As despesas pedem atenção. <strong>Revise as categorias.</strong></>}</span></div>
        </article>
      </section>

      <section className="mf-v2__dashboard-grid mf-v2__dashboard-grid--bottom">
        <article className="mf-v2__panel">
          <PanelHeader title="Transações recentes" subtitle="Últimas movimentações do período" action="Ver todas" to="/transactions" />
          {recentTransactions.length ? <div className="mf-v2__transactions">{recentTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div> : <EmptyState message="Nenhuma transação encontrada neste período." />}
        </article>

        <article className="mf-v2__panel">
          <PanelHeader title="Categorias em destaque" subtitle="Participação nas despesas" action="Organizar" to="/categories" />
          {stats.categories.length ? <div className="mf-v2__categories">{stats.categories.map((category) => <CategoryRow key={category.name} category={category} />)}</div> : <EmptyState message="As categorias aparecerão aqui após os primeiros lançamentos." />}
        </article>
      </section>

      <footer className="mf-v2__footer"><span><SparklineIcon />Painel conectado aos seus dados reais</span><span>Atualizado com segurança pelo Matrix Finance</span></footer>
    </>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone, trend }: { label: string; value: string; detail: string; icon: Icon; tone: "primary" | "mint" | "coral" | "violet"; trend: "positive" | "negative" | "neutral" }) {
  const TrendIcon = trend === "positive" ? TrendingUp : trend === "negative" ? TrendingDown : ReceiptText
  return <article className={`mf-v2__metric mf-v2__metric--${tone}`}><div className="mf-v2__metric-top"><span>{label}</span><div><Icon aria-hidden="true" /></div></div><strong>{value}</strong><p className={trend}><TrendIcon aria-hidden="true" />{detail}</p></article>
}

function PanelHeader({ title, subtitle, action, to }: { title: string; subtitle: string; action?: string; to?: string }) {
  return <header className="mf-v2__panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && to && <Link to={to}>{action}<ChevronRight aria-hidden="true" /></Link>}</header>
}

function TransactionRow({ transaction }: { transaction: TransactionWithCategory }) {
  const income = transaction.tipo === "receita"
  return <div className="mf-v2__transaction"><div className={`mf-v2__transaction-icon ${income ? "mf-v2__transaction-icon--green" : "mf-v2__transaction-icon--coral"}`}>{income ? <ArrowDownLeft aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</div><div className="mf-v2__transaction-copy"><strong>{transaction.estabelecimento || "Sem título"}</strong><span>{transaction.categorias?.nome || "Sem categoria"} · {formatDateBR(transaction.transaction_date)}</span></div><strong className={income ? "positive" : "negative"}>{income ? "+" : "−"}{formatCurrency(Math.abs(transaction.valor))}</strong><Link to="/transactions" aria-label={`Abrir ${transaction.estabelecimento || "transação"}`}><ChevronRight aria-hidden="true" /></Link></div>
}

function CategoryRow({ category }: { category: CategoryTotal }) {
  return <div><div className="mf-v2__category-row"><span><i style={{ background: category.color }} />{category.name}</span><strong>{formatCurrency(category.value)}<small>{category.percentage}%</small></strong></div><div className="mf-v2__category-track"><i style={{ width: `${category.percentage}%`, background: category.color }} /></div></div>
}

function EmptyState({ message }: { message: string }) {
  return <div className="mf-app-v2__empty">{message}</div>
}

function CustomPeriod({ month, year, onMonth, onYear }: { month: string; year: string; onMonth: (value: string) => void; onYear: (value: string) => void }) {
  const years = [new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]
  return <div className="mf-app-v2__custom-period"><select aria-label="Mês" value={month} onChange={(event) => onMonth(event.target.value)}>{["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"].map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select><select aria-label="Ano" value={year} onChange={(event) => onYear(event.target.value)}>{years.map((item) => <option key={item}>{item}</option>)}</select></div>
}

function matchesPeriod(dateValue: string, period: PeriodType, month: string, year: string, today: Date) {
  if (period === "all") return true
  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return false
  if (period === "until_today") return date <= today
  if (period === "current_month") return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
  if (period === "last_month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
  }
  return date.getMonth() === Number(month) - 1 && date.getFullYear() === Number(year)
}

function getPeriodLabel(period: PeriodType, month: string, year: string) {
  if (period === "all") return "Até o momento"
  if (period === "until_today") return "Até hoje"
  if (period === "current_month") return "Mês atual"
  if (period === "last_month") return "Último mês"
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(Number(year), Number(month) - 1, 1))
  return `${monthName} de ${year}`
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date).toUpperCase()
}

function SparklineIcon() {
  return <TrendingUp aria-hidden="true" />
}
