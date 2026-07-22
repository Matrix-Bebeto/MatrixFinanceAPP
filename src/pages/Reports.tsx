import { useState, useEffect } from "react"
import { supabase } from "@/src/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Loader2, AlertCircle, Download, Filter, ArrowUpRight, ArrowDownRight, DollarSign, BarChart3, Calculator, PieChart as PieChartIcon, Calendar, Layers, Search, TrendingDown, ArrowUpDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export function Reports() {
  const [activeTab, setActiveTab] = useState<"visao_geral" | "gastos_totais">("visao_geral")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [period, setPeriod] = useState("este_mes")
  const [customStartDate, setCustomStartDate] = useState("2025-01-01")
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState("todos")
  const [category, setCategory] = useState("todas")
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchData()
  }, [period, customStartDate, customEndDate])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      let startDate = new Date()
      let endDate = new Date()

      if (period === "este_mes") {
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
      } else if (period === "mes_passado") {
        const lastMonth = subMonths(new Date(), 1)
        startDate = startOfMonth(lastMonth)
        endDate = endOfMonth(lastMonth)
      } else if (period === "ultimos_3_meses") {
        startDate = startOfMonth(subMonths(new Date(), 2))
        endDate = endOfMonth(new Date())
      } else if (period === "este_ano") {
        startDate = new Date(new Date().getFullYear(), 0, 1)
        endDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59)
      } else if (period === "personalizado") {
        startDate = new Date(customStartDate + "T00:00:00")
        endDate = new Date(customEndDate + "T23:59:59")
      }

      const { data: txs, error: err } = await supabase
        .from('transacoes')
        .select('*, categorias(nome)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        
      if (err) {
        throw new Error(`Erro do Supabase: ${err.message}`)
      }
      
      const transactions = txs || []
      setData(transactions)

      // Extrair categorias únicas
      const cats = new Set<string>()
      transactions.forEach(tx => {
        const catName = tx.categorias?.nome || 'Outros'
        cats.add(catName)
      })
      setAvailableCategories(Array.from(cats).sort())

    } catch (e: any) {
      console.error("Exceção capturada:", e)
      setError(e.message || "Ocorreu um erro desconhecido ao buscar os relatórios.")
    } finally {
      setLoading(false)
    }
  }

  // Filtragem local por tipo, categoria e busca
  const filteredData = data.filter(item => {
    const valor = Number(item.valor || item.amount || 0)
    const itemTipo = (item.tipo || item.type || '').toLowerCase()
    const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
    const itemCategory = item.categorias?.nome || 'Outros'
    const title = (item.estabelecimento || item.descricao || item.description || item.nome || '').toLowerCase()

    if (type === "receitas" && !isReceita) return false
    if (type === "despesas" && isReceita) return false
    if (category !== "todas" && itemCategory !== category) return false
    if (searchTerm && !title.includes(searchTerm.toLowerCase()) && !itemCategory.toLowerCase().includes(searchTerm.toLowerCase())) return false

    return true
  })

  // Cálculos Visão Geral
  let receitas = 0
  let despesas = 0
  const categoryStats: Record<string, { receitas: number, despesas: number }> = {}

  filteredData.forEach(item => {
    const valor = Number(item.valor || item.amount || 0)
    const itemTipo = (item.tipo || item.type || '').toLowerCase()
    const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
    const catName = item.categorias?.nome || 'Outros'

    if (!categoryStats[catName]) {
      categoryStats[catName] = { receitas: 0, despesas: 0 }
    }

    if (isReceita) {
      receitas += Math.abs(valor)
      categoryStats[catName].receitas += Math.abs(valor)
    } else {
      despesas += Math.abs(valor)
      categoryStats[catName].despesas += Math.abs(valor)
    }
  })

  const saldo = receitas - despesas

  const pieData = [
    { name: "Receitas", value: receitas, color: "#00ff88" },
    { name: "Despesas", value: despesas, color: "#ff3366" },
  ].filter(d => d.value > 0)

  const barData = Object.entries(categoryStats).map(([name, stats]) => ({
    name,
    Receitas: stats.receitas,
    Despesas: stats.despesas
  }))

  // Apenas Despesas para a Aba "Gastos Totais"
  const expenseData = data.filter(item => {
    const valor = Number(item.valor || item.amount || 0)
    const itemTipo = (item.tipo || item.type || '').toLowerCase()
    const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
    return !isReceita
  })

  const filteredExpenses = expenseData.filter(item => {
    const itemCategory = item.categorias?.nome || 'Outros'
    const title = (item.estabelecimento || item.descricao || item.description || item.nome || '').toLowerCase()

    if (category !== "todas" && itemCategory !== category) return false
    if (searchTerm && !title.includes(searchTerm.toLowerCase()) && !itemCategory.toLowerCase().includes(searchTerm.toLowerCase())) return false

    return true
  })

  // Agrupamento e Soma de Gastos Totais por Categoria
  const categoryExpenseTotals: Record<string, { total: number, count: number, items: any[] }> = {}
  let totalGastosGeral = 0

  expenseData.forEach(item => {
    const valor = Math.abs(Number(item.valor || item.amount || 0))
    const catName = item.categorias?.nome || 'Outros'
    totalGastosGeral += valor

    if (!categoryExpenseTotals[catName]) {
      categoryExpenseTotals[catName] = { total: 0, count: 0, items: [] }
    }
    categoryExpenseTotals[catName].total += valor
    categoryExpenseTotals[catName].count += 1
    categoryExpenseTotals[catName].items.push(item)
  })

  // Gastos filtrados selecionados
  const totalGastosFiltrados = filteredExpenses.reduce((acc, curr) => acc + Math.abs(Number(curr.valor || curr.amount || 0)), 0)
  const mediaGastosFiltrados = filteredExpenses.length > 0 ? totalGastosFiltrados / filteredExpenses.length : 0
  const maiorGastoFiltrado = filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map(i => Math.abs(Number(i.valor || i.amount || 0)))) : 0

  // Categorias Ordenadas por Maior Gasto
  const sortedCategoriesExpense = Object.entries(categoryExpenseTotals)
    .map(([catName, stats]) => ({
      name: catName,
      total: stats.total,
      count: stats.count,
      percentage: totalGastosGeral > 0 ? (stats.total / totalGastosGeral) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total)

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

  const getPeriodLabel = () => {
    switch (period) {
      case "este_mes": return "Este Mês"
      case "mes_passado": return "Mês Passado"
      case "ultimos_3_meses": return "Últimos 3 Meses"
      case "este_ano": return "Este Ano"
      case "personalizado": return `Personalizado (${formatDate(customStartDate)} a ${formatDate(customEndDate)})`
      default: return "Período"
    }
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text("Relatório Financeiro - Matrix Finance", 14, 22)
    
    // Subtitle
    doc.setFontSize(12)
    doc.text(`Período: ${getPeriodLabel()}`, 14, 30)
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 36)

    // Summary
    doc.setFontSize(14)
    doc.text("Resumo de Gastos", 14, 46)
    
    doc.setFontSize(11)
    doc.text(`Total de Receitas: ${formatCurrency(receitas)}`, 14, 54)
    doc.text(`Total de Despesas: ${formatCurrency(despesas)}`, 14, 60)
    doc.text(`Saldo: ${formatCurrency(saldo)}`, 14, 66)
    doc.text(`Total de Transações: ${filteredData.length}`, 14, 72)

    // Transactions Table
    doc.setFontSize(14)
    doc.text("Transações", 14, 86)

    const tableData = (activeTab === "gastos_totais" ? filteredExpenses : filteredData).map(item => {
      const title = item.estabelecimento || item.descricao || item.description || item.nome || 'Sem título'
      const valor = Number(item.valor || item.amount || 0)
      const itemTipo = (item.tipo || item.type || '').toLowerCase()
      const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
      const cat = item.categorias?.nome || 'Outros'
      const date = item.data || item.date || item.created_at

      return [
        formatDate(date),
        title,
        cat,
        isReceita ? 'Receita' : 'Despesa',
        `${isReceita ? '+' : '-'}${formatCurrency(Math.abs(valor))}`
      ]
    })

    autoTable(doc, {
      startY: 90,
      head: [['Data', 'Estabelecimento', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 255, 136], textColor: [0, 0, 0] },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    })

    doc.save(`relatorio_financeiro_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground mt-1">Análises detalhadas e totais consolidados das suas transações</p>
        </div>
        <Button 
          onClick={generatePDF}
          className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.3)]"
        >
          <Download className="w-4 h-4 mr-2" />
          Gerar PDF
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-card/60 backdrop-blur-md border border-border rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("visao_geral")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "visao_geral"
              ? "bg-[#00ff88] text-black shadow-[0_0_15px_rgba(0,255,136,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("gastos_totais")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "gastos_totais"
              ? "bg-[#00ff88] text-black shadow-[0_0_15px_rgba(0,255,136,0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Gastos Totais por Categoria
        </button>
      </div>

      <Card className="glass-card border-none">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 text-[#00ff88]" />
            Filtros de Período e Seleção
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Período de Análise</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
              >
                <option value="este_mes" className="bg-card text-foreground">Este mês</option>
                <option value="mes_passado" className="bg-card text-foreground">Mês passado</option>
                <option value="ultimos_3_meses" className="bg-card text-foreground">Últimos 3 meses</option>
                <option value="este_ano" className="bg-card text-foreground">Este ano</option>
                <option value="personalizado" className="bg-card text-foreground">Anual / Personalizado</option>
              </select>
            </div>

            {activeTab === "visao_geral" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Tipo de Transação</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                >
                  <option value="todos" className="bg-card text-foreground">Todos os tipos</option>
                  <option value="receitas" className="bg-card text-foreground">Apenas Receitas</option>
                  <option value="despesas" className="bg-card text-foreground">Apenas Despesas</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
              >
                <option value="todas" className="bg-card text-foreground">Todas as categorias</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-card text-foreground">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Buscar Lançamento</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                />
              </div>
            </div>
          </div>

          {period === "personalizado" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Data Inicial</label>
                <input 
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Data Final</label>
                <input 
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] [color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center p-12 glass-panel rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
        </div>
      ) : error ? (
        <div className="p-8 text-center flex flex-col items-center justify-center text-[#ff3366] glass-panel rounded-2xl">
          <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
          <p>{error}</p>
        </div>
      ) : activeTab === "visao_geral" ? (
        <>
          <Card className="glass-card border-none">
            <CardHeader className="pb-3 border-b border-border mb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Resumo do Período: {getPeriodLabel()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Total de Receitas</span>
                    <ArrowUpRight className="h-4 w-4 text-[#00ff88]" />
                  </div>
                  <div className="text-2xl font-bold text-[#00ff88]">{formatCurrency(receitas)}</div>
                </div>
                
                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Total de Despesas</span>
                    <ArrowDownRight className="h-4 w-4 text-[#ff3366]" />
                  </div>
                  <div className="text-2xl font-bold text-[#ff3366]">{formatCurrency(despesas)}</div>
                </div>
                
                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Saldo Liquidado</span>
                    <DollarSign className="h-4 w-4 text-[#00ff88]" />
                  </div>
                  <div className={`text-2xl font-bold ${saldo < 0 ? 'text-[#ff3366]' : 'text-foreground'}`}>
                    {formatCurrency(saldo)}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Total de Transações</span>
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{filteredData.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card border-none">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-foreground">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          stroke="none"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(18,20,24,0.9)', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-muted-foreground text-sm">Nenhum dado para exibir.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-foreground">Receitas vs Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#8E9299' }} 
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8E9299' }} tickFormatter={(val) => `R$ ${val}`} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(18,20,24,0.9)', color: '#fff' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="Receitas" fill="#00ff88" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Despesas" fill="#ff3366" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
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

          <Card className="glass-card border-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-foreground">Detalhes das Transações</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-foreground/5 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium">Data</th>
                      <th className="px-6 py-4 font-medium">Estabelecimento</th>
                      <th className="px-6 py-4 font-medium">Categoria</th>
                      <th className="px-6 py-4 font-medium">Tipo</th>
                      <th className="px-6 py-4 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((item, index) => {
                        const title = item.estabelecimento || item.descricao || item.description || item.nome || 'Sem título'
                        const valor = Number(item.valor || item.amount || 0)
                        const itemTipo = (item.tipo || item.type || '').toLowerCase()
                        const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
                        const cat = item.categorias?.nome || 'Outros'
                        const date = item.data || item.date || item.created_at

                        return (
                          <tr key={item.id || index} className="border-b border-border hover:bg-foreground/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatDate(date)}</td>
                            <td className="px-6 py-4 font-medium flex items-center gap-2 text-foreground">
                              {isReceita ? <ArrowUpRight className="w-4 h-4 text-[#00ff88]" /> : <ArrowDownRight className="w-4 h-4 text-[#ff3366]" />}
                              {title}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{cat}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${isReceita ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20' : 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/20'}`}>
                                {isReceita ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${isReceita ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                              {isReceita ? '+' : '-'}{formatCurrency(Math.abs(valor))}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          Nenhuma transação encontrada para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Aba Gastos Totais por Categoria / Tipo */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner de Soma de Gastos Totais */}
          <Card className="glass-card border-none bg-gradient-to-r from-[#ff3366]/10 via-card to-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff3366]/5 rounded-full blur-3xl pointer-events-none"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <TrendingDown className="w-6 h-6 text-[#ff3366]" />
                  Total de Gastos ({category === "todas" ? "Todas as Categorias" : category})
                </CardTitle>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20">
                  {getPeriodLabel()}
                </span>
              </div>
              <CardDescription className="text-muted-foreground">
                Soma de todas as despesas acumuladas para o filtro selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 pt-4">
                <div className="p-4 rounded-xl border border-[#ff3366]/20 bg-[#ff3366]/5 col-span-1 md:col-span-1">
                  <p className="text-xs font-semibold text-[#ff3366] uppercase tracking-wider mb-1">Soma de Gastos Totais</p>
                  <p className="text-3xl font-extrabold text-[#ff3366]">{formatCurrency(totalGastosFiltrados)}</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quantidade de Gastos</p>
                  <p className="text-2xl font-bold text-foreground">{filteredExpenses.length} lançamentos</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Média por Lançamento</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(mediaGastosFiltrados)}</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Maior Gasto Individual</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(maiorGastoFiltrado)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranking e Soma de Gastos por Categoria */}
          <Card className="glass-card border-none">
            <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#00ff88]" />
                  Gastos Somados por Categoria
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Clique em qualquer categoria para filtrar instantaneamente os lançamentos
                </CardDescription>
              </div>
              {category !== "todas" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCategory("todas")}
                  className="rounded-xl border-border text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar Filtro de Categoria
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {sortedCategoriesExpense.length > 0 ? (
                sortedCategoriesExpense.map((item) => (
                  <div 
                    key={item.name} 
                    onClick={() => setCategory(item.name)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      category === item.name 
                        ? "border-[#00ff88] bg-[#00ff88]/5 shadow-[0_0_15px_rgba(0,255,136,0.1)]" 
                        : "border-border hover:bg-foreground/5 hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/20 flex items-center justify-center text-[#ff3366] font-bold text-xs">
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.count} {item.count === 1 ? 'despesa' : 'despesas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-foreground text-base text-[#ff3366]">{formatCurrency(item.total)}</p>
                        <p className="text-xs font-semibold text-muted-foreground">{item.percentage.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    {/* Barra de Progresso do Gasto */}
                    <div className="w-full bg-foreground/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#ff3366] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma despesa registrada no período selecionado.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela Detalhada dos Gastos Filtrados */}
          <Card className="glass-card border-none">
            <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-foreground">
                Lista de Gastos ({filteredExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-foreground/5 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium">Data</th>
                      <th className="px-6 py-4 font-medium">Estabelecimento</th>
                      <th className="px-6 py-4 font-medium">Categoria</th>
                      <th className="px-6 py-4 font-medium text-right">Valor</th>
                      <th className="px-6 py-4 font-medium text-right">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((item, index) => {
                        const title = item.estabelecimento || item.descricao || item.description || item.nome || 'Sem título'
                        const valor = Math.abs(Number(item.valor || item.amount || 0))
                        const cat = item.categorias?.nome || 'Outros'
                        const date = item.data || item.date || item.created_at
                        const share = totalGastosFiltrados > 0 ? (valor / totalGastosFiltrados) * 100 : 0

                        return (
                          <tr key={item.id || index} className="border-b border-border hover:bg-foreground/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatDate(date)}</td>
                            <td className="px-6 py-4 font-medium flex items-center gap-2 text-foreground">
                              <ArrowDownRight className="w-4 h-4 text-[#ff3366]" />
                              {title}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{cat}</td>
                            <td className="px-6 py-4 text-right font-bold text-[#ff3366]">
                              -{formatCurrency(valor)}
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-muted-foreground font-mono">
                              {share.toFixed(1)}%
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          Nenhum gasto encontrado para os filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

