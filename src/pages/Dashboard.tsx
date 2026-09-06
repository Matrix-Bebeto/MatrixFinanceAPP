import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleAlert,
  RefreshCw,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { supabase } from "@/src/lib/supabase"
import { formatDateBR } from "@/src/lib/date"
import { formatCurrency } from "@/src/lib/money"
import { summarizeTransactions, matchesPeriod as matchesDashboardPeriod } from "@/src/lib/dashboard"
import { collectPages } from "@/src/lib/pagination"
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
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      setLoadError(false)
      try {
      const [allTransactions, allReminders] = await Promise.all([
        collectPages((from, to) => supabase
          .from("transacoes")
          .select("id, created_at, transaction_date, quando, estabelecimento, valor, detalhes, tipo, userid, category_id, categorias(nome)")
          .order("transaction_date", { ascending: false }).order("id", { ascending: false }).range(from, to)),
        collectPages((from, to) => supabase
          .from("lembretes")
          .select("id, created_at, userid, descricao, data, due_date, valor, hora, status, notificado")
          .order("due_date", { ascending: true }).order("id").range(from, to)),
      ])

      if (!active) return
      setTransactions(allTransactions)
      setReminders(allReminders)
      setLoading(false)
      setUpdatedAt(new Date())
      } catch {
        if (active) { setLoadError(true); setLoading(false) }
      }
    }

    void loadDashboard()
    return () => { active = false }
  }, [reload])

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => matchesPeriod(transaction.transaction_date, periodFilter, month, year, today)),
    [transactions, periodFilter, month, year, today],
  )

  const filteredReminders = useMemo(
    () => reminders.filter((reminder) => matchesPeriod(reminder.due_date, periodFilter, month, year, today)),
    [reminders, periodFilter, month, year, today],
  )

  const stats = useMemo(() => {
    const summary = summarizeTransactions(filteredTransactions)
    const { income, expenses } = summary
    const categories: CategoryTotal[] = summary.categories.slice(0, 5).map((category, index) => ({ ...category, percentage: Math.round(category.percentage), color: categoryColors[index] }))

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
  const financial = useMemo(() => summarizeTransactions(filteredTransactions), [filteredTransactions])
  const commitment = financial.commitment
  const recentTransactions = filteredTransactions.slice(0, 5)

  if (loading) return <div className="mf-dashboard-skeleton" role="status" aria-label="Carregando painel financeiro"><div /><div /><div /><div /><section /><span className="sr-only">Carregando painel financeiro</span></div>
  if (loadError) return <section className="mf-data-error" role="alert"><CircleAlert aria-hidden="true" /><div><h1>Não foi possível carregar seus dados</h1><p>Verifique sua conexão e tente novamente. Seus lançamentos continuam salvos.</p></div><button onClick={() => setReload(n => n + 1)}>Tentar novamente</button></section>

  return (
    <div className="mf-dashboard">
      <section className="mf-v2__hero-row">
        <div>
          <span className="mf-v2__eyebrow">{formatLongDate(today)}</span>
          <h1>Clareza para o próximo passo.</h1>
          <p>Receitas, despesas e prioridades. Tudo no mesmo lugar.</p>
        </div>

        <div className="mf-app-v2__filters">
          <div className="mf-v2__period">
            <CalendarDays aria-hidden="true" />
            <select aria-label="Período" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodType)}>
              <option value="all">Todo o histórico</option>
              <option value="until_today">Até hoje</option>
              <option value="current_month">Mês atual</option>
              <option value="last_month">Último mês</option>
              <option value="custom">Mês específico</option>
            </select>
          </div>
          {periodFilter === "custom" && <CustomPeriod month={month} year={year} onMonth={setMonth} onYear={setYear} />}
          <button className="mf-v2__icon-button" aria-label="Atualizar dados" onClick={() => setReload(n => n + 1)}><RefreshCw aria-hidden="true" /></button>
        </div>
      </section>

      <section className="mf-v2__metrics" aria-label="Resumo financeiro">
        <MetricCard label="Saldo do período" value={formatCurrency(financial.balance)} detail="Receitas menos despesas" icon={WalletCards} tone="primary" trend={financial.balance >= 0 ? "positive" : "negative"} />
        <MetricCard label="Receitas" value={formatCurrency(stats.income)} detail={periodLabel} icon={ArrowDownLeft} tone="mint" trend="positive" />
        <MetricCard label="Despesas" value={formatCurrency(stats.expenses)} detail={periodLabel} icon={ArrowUpRight} tone="coral" trend="negative" />
        <MetricCard label="Lembretes ativos" value={String(stats.activeReminders)} detail="Pendências financeiras" icon={Bell} tone="violet" trend="neutral" />
      </section>

      <section className="mf-v2__dashboard-grid">
        <article className="mf-v2__panel">
          <PanelHeader title="O movimento do seu dinheiro" subtitle={`Receitas e despesas por mês · ${periodLabel}`} action="Ver relatório" to="/reports" />
          <div className="mf-flow-legend"><span><i />Receitas</span><span><i />Despesas</span></div>
          {financial.timeline.length ? (
            <div className="mf-v2__chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financial.timeline} margin={{ top: 22, right: 14, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="mf-income" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--v2-mint)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--v2-mint)" stopOpacity={0} /></linearGradient><linearGradient id="mf-expenses" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--v2-violet)" stopOpacity={0.14} /><stop offset="100%" stopColor="var(--v2-violet)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="var(--v2-grid)" strokeDasharray="3 5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} tickMargin={12} tick={{ fill: "var(--v2-muted)", fontSize: 12 }} />
                  <YAxis width={62} axisLine={false} tickLine={false} tick={{ fill: "var(--v2-muted)", fontSize: 12 }} tickFormatter={(value) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                  <Tooltip cursor={{ fill: "var(--v2-card-soft)" }} formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "var(--v2-card)", border: "1px solid var(--v2-border)", borderRadius: 12, color: "var(--v2-text)", fontSize: 11 }} />
                  <Area name="Receitas" type="linear" dataKey="income" stroke="var(--v2-mint)" strokeWidth={2.5} fill="url(#mf-income)" isAnimationActive={false} dot={financial.timeline.length === 1} />
                  <Area name="Despesas" type="linear" dataKey="expenses" stroke="var(--v2-violet)" strokeWidth={2.5} strokeDasharray="5 4" fill="url(#mf-expenses)" isAnimationActive={false} dot={financial.timeline.length === 1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="Nenhuma movimentação neste período." />}
          {financial.timeline.length > 0 && <details className="mf-chart-data"><summary>Ver valores por mês</summary><div><table><caption className="sr-only">Receitas e despesas mensais em reais</caption><thead><tr><th scope="col">Mês</th><th scope="col">Receitas</th><th scope="col">Despesas</th></tr></thead><tbody>{financial.timeline.map(p => <tr key={p.key}><th scope="row">{p.label}</th><td>{formatCurrency(p.income)}</td><td>{formatCurrency(p.expenses)}</td></tr>)}</tbody></table></div></details>}
        </article>

        <article className={`mf-v2__panel mf-v2__budget-panel ${financial.balance < 0 ? "mf-budget-warning" : ""}`}>
          <PanelHeader title="Como está o orçamento?" subtitle="Despesas em relação às receitas" />
          <div className="mf-v2__budget-ring" style={{ "--progress": `${Math.min(commitment ?? 0, 100)}%` } as CSSProperties}>
            <div><strong>{commitment === null ? "—" : `${commitment}%`}</strong><span>{commitment === null ? "sem referência" : "das receitas"}</span></div>
          </div>
          <div className="mf-v2__budget-values"><span><small>Despesas</small><strong>{formatCurrency(stats.expenses)}</strong></span><span><small>Receitas</small><strong>{formatCurrency(stats.income)}</strong></span></div>
          <div className="mf-v2__budget-message">{financial.balance < 0 ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}<span>{!filteredTransactions.length ? "Selecione um período com movimentações para acompanhar o orçamento." : commitment === null ? "Sem receitas registradas neste período para calcular o comprometimento." : financial.balance < 0 ? `As despesas superam as receitas em ${formatCurrency(Math.abs(financial.balance))}.` : `${formatCurrency(financial.balance)} de diferença positiva entre receitas e despesas.`}</span></div>
        </article>
      </section>

      <section className="mf-v2__dashboard-grid mf-v2__dashboard-grid--bottom">
        <article className="mf-v2__panel">
          <PanelHeader title="Transações recentes" subtitle="Últimas movimentações do período" action="Ver todas" to="/transactions" />
          {recentTransactions.length ? <div className="mf-v2__transactions">{recentTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div> : <EmptyState message="Nenhuma transação encontrada neste período." />}
        </article>

        <article className="mf-v2__panel">
          <PanelHeader title="Para onde vai seu dinheiro" subtitle="As 5 maiores categorias de despesas" action="Organizar" to="/categories" />
          {stats.categories.length ? <div className="mf-v2__categories">{stats.categories.map((category) => <CategoryRow key={category.name} category={category} />)}</div> : <EmptyState message="As categorias aparecerão aqui após os primeiros lançamentos." />}
        </article>
      </section>

      <footer className="mf-v2__footer"><span><i className="mf-status-dot" />Dados carregados · {updatedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span><span>{periodLabel} · Valores em reais</span></footer>
    </div>
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
  return matchesDashboardPeriod(dateValue, period, month, year, today)
}

function getPeriodLabel(period: PeriodType, month: string, year: string) {
  if (period === "all") return "Todo o histórico"
  if (period === "until_today") return "Até hoje"
  if (period === "current_month") return "Mês atual"
  if (period === "last_month") return "Último mês"
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(Number(year), Number(month) - 1, 1))
  return `${monthName} de ${year}`
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", weekday: "long", day: "2-digit", month: "long" }).format(date).toUpperCase()
}
