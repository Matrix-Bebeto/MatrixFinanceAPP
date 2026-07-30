import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Filter, Lightbulb, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { supabase } from "@/src/lib/supabase"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function Dashboard() {
  const currentDate = new Date()
  type PeriodType = 'all' | 'until_today' | 'current_month' | 'last_month' | 'custom'
  
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('all')
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString())
  const [year, setYear] = useState(currentDate.getFullYear().toString())
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    lembretes: 0,
    transacoesCount: 0
  })

  const [barData, setBarData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [nextReminder, setNextReminder] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [periodFilter, month, year])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar transações com categorias
      const { data: txs, error: txError } = await supabase
        .from('transacoes')
        .select('*, categorias(nome)')
        .order('created_at', { ascending: false })

      if (txError) {
        console.error("Erro ao buscar transações no Dashboard:", txError)
      }

      // Buscar lembretes (tenta 'lembretes' ou 'reminders')
      let rems: any[] = []
      const { data: lembretes, error: remError } = await supabase
        .from('lembretes')
        .select('*')

      if (remError) {
        console.log("Tentando buscar da tabela 'reminders'...")
        const { data: reminders } = await supabase
          .from('reminders')
          .select('*')
        if (reminders) rems = reminders
      } else if (lembretes) {
        rems = lembretes
      }

      const now = new Date()

      // Filtrar transações de acordo com o filtro de período
      const filteredTxs = (txs || []).filter(tx => {
        if (periodFilter === 'all') return true

        const rawDateStr = tx.data || tx.data_transacao || tx.created_at
        if (!rawDateStr) return true
        const txDate = new Date(rawDateStr)

        if (periodFilter === 'until_today') {
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
          return txDate <= endOfToday
        }

        if (periodFilter === 'current_month') {
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
        }

        if (periodFilter === 'last_month') {
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return txDate.getMonth() === lastMonthDate.getMonth() && txDate.getFullYear() === lastMonthDate.getFullYear()
        }

        if (periodFilter === 'custom') {
          const targetMonthIndex = parseInt(month) - 1
          const targetYear = parseInt(year)
          return txDate.getMonth() === targetMonthIndex && txDate.getFullYear() === targetYear
        }

        return true
      })

      // Filtrar lembretes
      const filteredRems = (rems || []).filter(r => {
        if (periodFilter === 'all') return true

        const rawDateStr = r.data || r.date || r.data_vencimento || r.due_date || r.created_at
        if (!rawDateStr) return true
        const rDate = new Date(rawDateStr)

        if (periodFilter === 'until_today') {
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
          return rDate <= endOfToday
        }

        if (periodFilter === 'current_month') {
          return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear()
        }

        if (periodFilter === 'last_month') {
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return rDate.getMonth() === lastMonthDate.getMonth() && rDate.getFullYear() === lastMonthDate.getFullYear()
        }

        if (periodFilter === 'custom') {
          const targetMonthIndex = parseInt(month) - 1
          const targetYear = parseInt(year)
          return rDate.getMonth() === targetMonthIndex && rDate.getFullYear() === targetYear
        }

        return true
      })

      let receitas = 0
      let despesas = 0
      const categoryTotals: Record<string, number> = {}

      filteredTxs.forEach(tx => {
        const valor = Number(tx.valor || tx.amount || 0)
        const tipo = (tx.tipo || tx.type || '').toLowerCase()
        
        const isReceita = tipo === 'receita' || tipo === 'income' || (valor > 0 && tipo !== 'despesa' && tipo !== 'expense')
        const isDespesa = tipo === 'despesa' || tipo === 'expense' || valor < 0

        if (isReceita) {
          receitas += Math.abs(valor)
        } else if (isDespesa) {
          despesas += Math.abs(valor)
          
          const catName = tx.categorias?.nome || 'Outros'
          categoryTotals[catName] = (categoryTotals[catName] || 0) + Math.abs(valor)
        }
      })

      setStats({
        receitas,
        despesas,
        saldo: receitas - despesas,
        lembretes: filteredRems.filter(r => r.status !== 'concluido' && r.status !== 'completed').length,
        transacoesCount: filteredTxs.length
      })

      const formattedBarData = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      setBarData(formattedBarData)

      setPieData([
        { name: "Receitas", value: receitas, color: "#00ff88" },
        { name: "Despesas", value: despesas, color: "#ff3366" },
      ])

      const pendingRems = filteredRems.filter(r => r.status !== 'concluido' && r.status !== 'completed')
      if (pendingRems.length > 0) {
        const sortedRems = [...pendingRems].sort((a, b) => {
          const dateA = new Date(a.data || a.date || a.data_vencimento || a.due_date).getTime()
          const dateB = new Date(b.data || b.date || b.data_vencimento || b.due_date).getTime()
          return dateA - dateB
        })
        setNextReminder(sortedRems[0])
      } else {
        setNextReminder(null)
      }

    } catch (error) {
      console.error("Erro ao processar dados do dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const cleanDate = dateString.split('T')[0]
      const parts = cleanDate.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        if (year.length === 4) {
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
        }
      }
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch (e) {
      return dateString
    }
  }

  const months = [
    { value: "1", label: "janeiro" },
    { value: "2", label: "fevereiro" },
    { value: "3", label: "março" },
    { value: "4", label: "abril" },
    { value: "5", label: "maio" },
    { value: "6", label: "junho" },
    { value: "7", label: "julho" },
    { value: "8", label: "agosto" },
    { value: "9", label: "setembro" },
    { value: "10", label: "outubro" },
    { value: "11", label: "novembro" },
    { value: "12", label: "dezembro" },
  ]

  const years = ["2024", "2025", "2026", "2027"]

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'all': return 'Até o momento'
      case 'until_today': return 'Até hoje'
      case 'current_month': return 'Mês atual'
      case 'last_month': return 'Último mês'
      case 'custom':
        const mLabel = months.find(m => m.value === month)?.label || ''
        return `${mLabel} de ${year}`
      default: return 'Até o momento'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral das suas finanças • {stats.transacoesCount} transações ({getPeriodLabel().toLowerCase()})
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          <select 
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className="h-10 px-4 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] backdrop-blur-md font-medium"
          >
            <option value="all" className="bg-card text-foreground">Até o momento (Todas)</option>
            <option value="until_today" className="bg-card text-foreground">Até Hoje</option>
            <option value="current_month" className="bg-card text-foreground">Mês Atual</option>
            <option value="last_month" className="bg-card text-foreground">Último Mês</option>
            <option value="custom" className="bg-card text-foreground">Mês / Ano Específico</option>
          </select>

          {periodFilter === 'custom' && (
            <>
              <select 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 px-4 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] backdrop-blur-md"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value} className="bg-card text-foreground">{m.label}</option>
                ))}
              </select>
              <select 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 px-4 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] backdrop-blur-md"
              >
                {years.map(y => (
                  <option key={y} value={y} className="bg-card text-foreground">{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#00ff88]" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00ff88]/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Receitas
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center border border-[#00ff88]/20">
                  <ArrowUpRight className="h-4 w-4 text-[#00ff88]" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-[#00ff88]">{formatCurrency(stats.receitas)}</div>
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff3366]/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Despesas
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-[#ff3366]/10 flex items-center justify-center border border-[#ff3366]/20">
                  <ArrowDownRight className="h-4 w-4 text-[#ff3366]" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-[#ff3366]">{formatCurrency(stats.despesas)}</div>
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Acumulado
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <DollarSign className="h-4 w-4 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className={`text-3xl font-bold ${stats.saldo < 0 ? 'text-[#ff3366]' : 'text-foreground'}`}>
                  {formatCurrency(stats.saldo)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas ({getPeriodLabel().toLowerCase()})</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lembretes Ativos
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Calendar className="h-4 w-4 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-purple-400">{stats.lembretes}</div>
                <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2 glass-card border-none">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Gastos por Categoria</CardTitle>
                <p className="text-sm text-muted-foreground">Distribuição dos seus gastos ({getPeriodLabel().toLowerCase()})</p>
              </CardHeader>
              <CardContent className="pl-0">
                <div className="h-[250px] w-full">
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val}`} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#121418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                        <Bar dataKey="value" fill="#ff3366" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Nenhum dado de despesa para exibir.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Receitas vs Despesas</CardTitle>
                <p className="text-sm text-muted-foreground">Proporção entre receitas e despesas do período</p>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full flex items-center justify-center">
                  {stats.receitas > 0 || stats.despesas > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#121418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Nenhum dado para exibir.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2 glass-card border-none">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Resumo do Período</CardTitle>
                <p className="text-sm text-muted-foreground">Estatísticas detalhadas do período selecionado</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <span className="text-sm font-medium text-muted-foreground">Receitas</span>
                    <span className="text-sm font-bold text-[#00ff88]">{formatCurrency(stats.receitas)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <span className="text-sm font-medium text-muted-foreground">Despesas</span>
                    <span className="text-sm font-bold text-[#ff3366]">{formatCurrency(stats.despesas)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <span className="text-sm font-medium text-muted-foreground">Saldo</span>
                    <span className={`text-sm font-bold ${stats.saldo < 0 ? 'text-[#ff3366]' : 'text-foreground'}`}>
                      {formatCurrency(stats.saldo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-muted-foreground">Total de Transações</span>
                    <span className="text-sm font-bold text-foreground">{stats.transacoesCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    Próximo Lembrete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nextReminder ? (
                    <div className="p-4 rounded-xl bg-foreground/5 border border-border">
                      <p className="font-medium text-sm text-foreground">{nextReminder.descricao || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(nextReminder.data || nextReminder.date || nextReminder.data_vencimento || nextReminder.due_date)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum lembrete pendente para este período.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    Dica do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Categorize suas despesas para identificar onde gasta mais e otimizar seu orçamento.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
