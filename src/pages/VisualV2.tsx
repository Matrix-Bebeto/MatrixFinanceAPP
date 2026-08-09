import { useMemo, useState, type ComponentType, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Eye,
  EyeOff,
  Flag,
  LayoutDashboard,
  Menu,
  Moon,
  PieChart,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { formatCurrency } from "@/src/lib/money"
import "./visual-v2.css"

type View = "overview" | "transactions" | "reports" | "goals"
type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>

const cashFlow = [
  { month: "Mar", receitas: 12400, despesas: 8200 },
  { month: "Abr", receitas: 13800, despesas: 9100 },
  { month: "Mai", receitas: 13100, despesas: 8400 },
  { month: "Jun", receitas: 15700, despesas: 9800 },
  { month: "Jul", receitas: 14900, despesas: 8900 },
  { month: "Ago", receitas: 16840, despesas: 7240 },
]

const transactions = [
  { id: 1, name: "Supermercado Aurora", category: "Alimentação", date: "Hoje, 10:42", value: -438.72, icon: ReceiptText, tint: "coral" },
  { id: 2, name: "Matrix Consultoria", category: "Receita", date: "Hoje, 08:15", value: 4250, icon: ArrowDownLeft, tint: "green" },
  { id: 3, name: "Assinatura Figma", category: "Ferramentas", date: "Ontem, 16:20", value: -96, icon: CreditCard, tint: "violet" },
  { id: 4, name: "Posto Horizonte", category: "Transporte", date: "02 ago, 18:32", value: -285.4, icon: CircleDollarSign, tint: "amber" },
  { id: 5, name: "Rendimento da reserva", category: "Investimentos", date: "01 ago, 07:10", value: 184.63, icon: TrendingUp, tint: "blue" },
]

const categories = [
  { name: "Moradia", value: 2420, percent: 33, color: "#8b7cf6" },
  { name: "Alimentação", value: 1738, percent: 24, color: "#ff7f6e" },
  { name: "Transporte", value: 1158, percent: 16, color: "#f4b858" },
  { name: "Ferramentas", value: 868, percent: 12, color: "#45b9d6" },
  { name: "Outros", value: 1056, percent: 15, color: "#728197" },
]

const goals = [
  { title: "Reserva de emergência", current: 18600, target: 30000, date: "Dez 2026", color: "mint" },
  { title: "Nova estação de trabalho", current: 7400, target: 12000, date: "Out 2026", color: "violet" },
  { title: "Viagem de férias", current: 3200, target: 8500, date: "Jan 2027", color: "amber" },
]

const navItems: Array<{ view: View; label: string; icon: Icon }> = [
  { view: "overview", label: "Visão geral", icon: LayoutDashboard },
  { view: "transactions", label: "Transações", icon: ReceiptText },
  { view: "reports", label: "Relatórios", icon: PieChart },
  { view: "goals", label: "Planejamento", icon: Target },
]

export function VisualV2() {
  const [view, setView] = useState<View>("overview")
  const [dark, setDark] = useState(true)
  const [valuesVisible, setValuesVisible] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [period, setPeriod] = useState("Este mês")

  const currentLabel = navItems.find((item) => item.view === view)?.label ?? "Visão geral"
  const money = (value: number) => valuesVisible ? formatCurrency(value) : "R$ ••••••"

  function selectView(next: View) {
    setView(next)
    setMobileMenu(false)
  }

  return (
    <div className={`mf-v2 ${dark ? "mf-v2--dark" : ""}`}>
      <div className="mf-v2__ambient mf-v2__ambient--one" />
      <div className="mf-v2__ambient mf-v2__ambient--two" />

      {mobileMenu && <button className="mf-v2__overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}

      <aside className={`mf-v2__sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="mf-v2__brand">
          <div className="mf-v2__brand-mark"><WalletCards aria-hidden="true" /></div>
          <div><strong>Matrix</strong><span>Finance</span></div>
          <button className="mf-v2__mobile-close" aria-label="Fechar menu" onClick={() => setMobileMenu(false)}><X aria-hidden="true" /></button>
        </div>

        <div className="mf-v2__preview-tag"><Sparkles aria-hidden="true" /><span>Nova interface</span><small>V2</small></div>

        <nav className="mf-v2__nav" aria-label="Navegação da prévia">
          <p>GESTÃO</p>
          {navItems.map(({ view: itemView, label, icon: NavIcon }) => (
            <button key={itemView} className={view === itemView ? "is-active" : ""} onClick={() => selectView(itemView)}>
              <NavIcon aria-hidden="true" /><span>{label}</span>{view === itemView && <i />}
            </button>
          ))}
          <p>CONTA</p>
          <button onClick={() => selectView("goals")}><Settings aria-hidden="true" /><span>Preferências</span></button>
        </nav>

        <div className="mf-v2__sidebar-card">
          <div className="mf-v2__sidebar-card-icon"><Sparkles aria-hidden="true" /></div>
          <strong>Seu dinheiro, mais claro.</strong>
          <p>Uma experiência criada para decisões financeiras tranquilas.</p>
        </div>

        <Link to="/login" className="mf-v2__back"><ArrowLeft aria-hidden="true" />Voltar para a versão atual</Link>
      </aside>

      <main className="mf-v2__main">
        <header className="mf-v2__topbar">
          <div className="mf-v2__topbar-title">
            <button className="mf-v2__menu-button" aria-label="Abrir menu" onClick={() => setMobileMenu(true)}><Menu aria-hidden="true" /></button>
            <div><span>Matrix Finance</span><strong>{currentLabel}</strong></div>
          </div>
          <div className="mf-v2__topbar-actions">
            <label className="mf-v2__search"><Search aria-hidden="true" /><input aria-label="Pesquisar" placeholder="Pesquisar" /></label>
            <button className="mf-v2__icon-button" aria-label={valuesVisible ? "Ocultar valores" : "Exibir valores"} onClick={() => setValuesVisible(!valuesVisible)}>{valuesVisible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}</button>
            <button className="mf-v2__icon-button" aria-label={dark ? "Usar tema claro" : "Usar tema escuro"} onClick={() => setDark(!dark)}>{dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
            <button className="mf-v2__icon-button mf-v2__notification" aria-label="Notificações"><Bell aria-hidden="true" /><i /></button>
            <div className="mf-v2__user"><div>MB</div><span><strong>Olá, Bebeto</strong><small>Conta principal</small></span></div>
          </div>
        </header>

        <div className="mf-v2__content">
          <section className="mf-v2__hero-row">
            <div><span className="mf-v2__eyebrow">{view === "overview" ? "SEGUNDA-FEIRA, 03 DE AGOSTO" : "MATRIX FINANCE · PRÉVIA V2"}</span><h1>{getViewTitle(view)}</h1><p>{getViewDescription(view)}</p></div>
            <div className="mf-v2__period"><CalendarDays aria-hidden="true" /><select aria-label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option>Este mês</option><option>Últimos 3 meses</option><option>Este ano</option></select></div>
          </section>

          {view === "overview" && <Overview money={money} />}
          {view === "transactions" && <TransactionsPreview money={money} />}
          {view === "reports" && <ReportsPreview money={money} />}
          {view === "goals" && <GoalsPreview money={money} />}

          <footer className="mf-v2__footer"><span><Sparkles aria-hidden="true" />Prévia visual V2 · dados ilustrativos</span><span>A interface atual permanece intacta</span></footer>
        </div>
      </main>
    </div>
  )
}

function Overview({ money }: { money: (value: number) => string }) {
  return <>
    <section className="mf-v2__metrics">
      <MetricCard label="Saldo disponível" value={money(28460.8)} note="+12,8% no período" icon={WalletCards} tone="primary" trend="up" />
      <MetricCard label="Receitas" value={money(16840)} note="+8,2% vs. mês anterior" icon={ArrowDownLeft} tone="mint" trend="up" />
      <MetricCard label="Despesas" value={money(7240.32)} note="R$ 980 abaixo da média" icon={ArrowUpRight} tone="coral" trend="down" />
      <MetricCard label="Economizado" value={money(9599.68)} note="57% da sua receita" icon={Target} tone="violet" trend="up" />
    </section>

    <section className="mf-v2__dashboard-grid">
      <article className="mf-v2__panel mf-v2__cashflow">
        <PanelHeader title="Fluxo de caixa" subtitle="Receitas e despesas nos últimos 6 meses" action="Detalhes" />
        <div className="mf-v2__chart-legend"><span><i className="mint" />Receitas</span><span><i className="coral" />Despesas</span></div>
        <div className="mf-v2__chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
              <defs><linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#39d6a2" stopOpacity={0.3} /><stop offset="100%" stopColor="#39d6a2" stopOpacity={0} /></linearGradient><linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7f6e" stopOpacity={0.2} /><stop offset="100%" stopColor="#ff7f6e" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--v2-grid)" strokeDasharray="3 5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--v2-muted)", fontSize: 12 }} dy={10} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: "var(--v2-card)", border: "1px solid var(--v2-border)", borderRadius: 14, boxShadow: "var(--v2-shadow)", color: "var(--v2-text)" }} />
              <Area type="monotone" dataKey="receitas" stroke="#39d6a2" strokeWidth={3} fill="url(#incomeGradient)" />
              <Area type="monotone" dataKey="despesas" stroke="#ff7f6e" strokeWidth={2.5} fill="url(#expenseGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="mf-v2__panel mf-v2__budget-panel">
        <PanelHeader title="Orçamento do mês" subtitle="Acompanhe seu limite" />
        <div className="mf-v2__budget-ring" style={{ "--progress": "68%" } as CSSProperties}><div><strong>68%</strong><span>utilizado</span></div></div>
        <div className="mf-v2__budget-values"><span><small>Gasto</small><strong>{money(7240)}</strong></span><span><small>Limite</small><strong>{money(10650)}</strong></span></div>
        <div className="mf-v2__budget-message"><Sparkles aria-hidden="true" /><span>Você está dentro do planejado.<strong> Continue assim.</strong></span></div>
      </article>
    </section>

    <section className="mf-v2__dashboard-grid mf-v2__dashboard-grid--bottom">
      <article className="mf-v2__panel">
        <PanelHeader title="Transações recentes" subtitle="Movimentações da conta principal" action="Ver todas" />
        <TransactionList money={money} limit={4} />
      </article>
      <article className="mf-v2__panel">
        <PanelHeader title="Gastos por categoria" subtitle="Distribuição neste mês" action="Relatório" />
        <CategoryList money={money} />
      </article>
    </section>
  </>
}

function TransactionsPreview({ money }: { money: (value: number) => string }) {
  const [filter, setFilter] = useState("Todas")
  const filtered = useMemo(() => filter === "Todas" ? transactions : transactions.filter((item) => filter === "Receitas" ? item.value > 0 : item.value < 0), [filter])
  return <section className="mf-v2__panel mf-v2__wide-panel">
    <div className="mf-v2__toolbar"><div className="mf-v2__segmented">{["Todas", "Receitas", "Despesas"].map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="mf-v2__table-search"><Search aria-hidden="true" /><input aria-label="Buscar transações" placeholder="Buscar transação..." /></label></div>
    <div className="mf-v2__transaction-summary"><span><small>Entradas</small><strong className="positive">{money(4434.63)}</strong></span><i /><span><small>Saídas</small><strong className="negative">{money(820.12)}</strong></span><i /><span><small>Movimentação líquida</small><strong>{money(3614.51)}</strong></span></div>
    <TransactionList money={money} items={filtered} />
  </section>
}

function ReportsPreview({ money }: { money: (value: number) => string }) {
  return <section className="mf-v2__reports-grid">
    <article className="mf-v2__panel mf-v2__report-highlight"><span className="mf-v2__eyebrow">PATRIMÔNIO ESTIMADO</span><strong>{money(84260.8)}</strong><p><TrendingUp aria-hidden="true" />Crescimento de 18,4% nos últimos 12 meses</p><div className="mf-v2__mini-bars">{[44, 51, 47, 59, 62, 67, 64, 72, 76, 81, 88, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></article>
    <article className="mf-v2__panel"><PanelHeader title="Composição dos gastos" subtitle="Onde seu dinheiro foi utilizado" /><div className="mf-v2__report-donut"><div /> <CategoryList money={money} compact /></div></article>
    <article className="mf-v2__panel mf-v2__report-wide"><PanelHeader title="Saúde financeira" subtitle="Indicadores calculados a partir dos seus hábitos" /><div className="mf-v2__health-grid"><HealthScore score="92" label="Organização" text="Excelente consistência nos registros" /><HealthScore score="57%" label="Taxa de economia" text="Acima da meta recomendada de 20%" /><HealthScore score="3,8x" label="Reserva" text="Meses de despesas já protegidos" /></div></article>
  </section>
}

function GoalsPreview({ money }: { money: (value: number) => string }) {
  return <section className="mf-v2__goals-grid">{goals.map((goal) => { const progress = Math.round((goal.current / goal.target) * 100); return <article key={goal.title} className={`mf-v2__goal mf-v2__goal--${goal.color}`}><div className="mf-v2__goal-icon"><Flag aria-hidden="true" /></div><span>Meta · {goal.date}</span><h2>{goal.title}</h2><strong>{money(goal.current)} <small>de {money(goal.target)}</small></strong><div className="mf-v2__goal-progress"><i style={{ width: `${progress}%` }} /></div><footer><span>{progress}% concluído</span><span>Faltam {money(goal.target - goal.current)}</span></footer></article>})}<article className="mf-v2__goal mf-v2__goal--new"><div><Target aria-hidden="true" /><h2>Crie sua próxima meta</h2><p>Transforme planos em objetivos financeiros claros.</p></div><button>Adicionar meta <ChevronRight aria-hidden="true" /></button></article></section>
}

function MetricCard({ label, value, note, icon: CardIcon, tone, trend }: { label: string; value: string; note: string; icon: Icon; tone: string; trend: "up" | "down" }) {
  return <article className={`mf-v2__metric mf-v2__metric--${tone}`}><div className="mf-v2__metric-top"><span>{label}</span><div><CardIcon aria-hidden="true" /></div></div><strong>{value}</strong><p className={trend === "up" ? "positive" : "neutral"}>{trend === "up" ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}{note}</p></article>
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return <header className="mf-v2__panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button>{action}<ChevronRight aria-hidden="true" /></button>}</header>
}

function TransactionList({ money, items = transactions, limit }: { money: (value: number) => string; items?: typeof transactions; limit?: number }) {
  const visible = limit ? items.slice(0, limit) : items
  return <div className="mf-v2__transactions">{visible.map((item) => { const TxIcon = item.icon; return <div key={item.id} className="mf-v2__transaction"><div className={`mf-v2__transaction-icon mf-v2__transaction-icon--${item.tint}`}><TxIcon aria-hidden="true" /></div><div className="mf-v2__transaction-copy"><strong>{item.name}</strong><span>{item.category} · {item.date}</span></div><strong className={item.value > 0 ? "positive" : "negative"}>{item.value > 0 ? "+" : "−"}{money(Math.abs(item.value))}</strong><button aria-label={`Abrir ${item.name}`}><ChevronRight aria-hidden="true" /></button></div>})}</div>
}

function CategoryList({ money, compact = false }: { money: (value: number) => string; compact?: boolean }) {
  return <div className={`mf-v2__categories ${compact ? "is-compact" : ""}`}>{categories.map((category) => <div key={category.name}><div className="mf-v2__category-row"><span><i style={{ background: category.color }} />{category.name}</span><strong>{money(category.value)}<small>{category.percent}%</small></strong></div>{!compact && <div className="mf-v2__category-track"><i style={{ width: `${category.percent * 2.2}%`, background: category.color }} /></div>}</div>)}</div>
}

function HealthScore({ score, label, text }: { score: string; label: string; text: string }) {
  return <div className="mf-v2__health-score"><strong>{score}</strong><span>{label}</span><p>{text}</p></div>
}

function getViewTitle(view: View) {
  if (view === "transactions") return "Suas movimentações"
  if (view === "reports") return "Inteligência financeira"
  if (view === "goals") return "Planos que viram realidade"
  return "Seu dinheiro em perspectiva"
}

function getViewDescription(view: View) {
  if (view === "transactions") return "Consulte entradas e saídas em uma linha do tempo clara e organizada."
  if (view === "reports") return "Indicadores elegantes para entender hábitos, evolução e oportunidades."
  if (view === "goals") return "Acompanhe objetivos importantes sem perder de vista sua tranquilidade."
  return "Uma visão completa, calma e objetiva da sua vida financeira."
}
