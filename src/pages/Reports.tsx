import { useState, useEffect } from "react"
import { supabase } from "@/src/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Loader2, AlertCircle, Download, Filter, ArrowUpRight, ArrowDownRight, DollarSign, BarChart3 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export function Reports() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [period, setPeriod] = useState("este_mes")
  const [type, setType] = useState("todos")
  const [category, setCategory] = useState("todas")
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [period])

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
        const catName = tx.categoria || tx.category || 'Outros'
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

  // Filtragem local por tipo e categoria
  const filteredData = data.filter(item => {
    const valor = Number(item.valor || item.amount || 0)
    const itemTipo = (item.tipo || item.type || '').toLowerCase()
    const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
    const itemCategory = item.categorias?.nome || 'Outros'

    if (type === "receitas" && !isReceita) return false
    if (type === "despesas" && isReceita) return false
    if (category !== "todas" && itemCategory !== category) return false

    return true
  })

  // Cálculos
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
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
    doc.text("Resumo", 14, 46)
    
    doc.setFontSize(11)
    doc.text(`Total de Receitas: ${formatCurrency(receitas)}`, 14, 54)
    doc.text(`Total de Despesas: ${formatCurrency(despesas)}`, 14, 60)
    doc.text(`Saldo: ${formatCurrency(saldo)}`, 14, 66)
    doc.text(`Total de Transações: ${filteredData.length}`, 14, 72)

    // Transactions Table
    doc.setFontSize(14)
    doc.text("Transações", 14, 86)

    const tableData = filteredData.map(item => {
      const title = item.estabelecimento || item.descricao || item.description || item.nome || 'Sem título'
      const valor = Number(item.valor || item.amount || 0)
      const itemTipo = (item.tipo || item.type || '').toLowerCase()
      const isReceita = itemTipo === 'receita' || itemTipo === 'income' || (valor > 0 && itemTipo !== 'despesa' && itemTipo !== 'expense')
      const category = item.categorias?.nome || 'Outros'
      const date = item.data || item.date || item.created_at

      return [
        formatDate(date),
        title,
        category,
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
          <p className="text-sm text-muted-foreground mt-1">Análises personalizadas das suas transações</p>
        </div>
        <Button 
          onClick={generatePDF}
          className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.3)]"
        >
          <Download className="w-4 h-4 mr-2" />
          Gerar PDF
        </Button>
      </div>

      <Card className="glass-card border-none">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 text-[#00ff88]" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Período</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
              >
                <option value="este_mes" className="bg-card text-foreground">Este mês</option>
                <option value="mes_passado" className="bg-card text-foreground">Mês passado</option>
                <option value="ultimos_3_meses" className="bg-card text-foreground">Últimos 3 meses</option>
                <option value="este_ano" className="bg-card text-foreground">Este ano</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo</label>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
              >
                <option value="todas" className="bg-card text-foreground">Todas categorias</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-card text-foreground">{cat}</option>
                ))}
              </select>
            </div>
          </div>
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
      ) : (
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
                  <div className="text-2xl font-bold neon-green-text">{formatCurrency(receitas)}</div>
                </div>
                
                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Total de Despesas</span>
                    <ArrowDownRight className="h-4 w-4 text-[#ff3366]" />
                  </div>
                  <div className="text-2xl font-bold neon-red-text">{formatCurrency(despesas)}</div>
                </div>
                
                <div className="p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Saldo</span>
                    <DollarSign className="h-4 w-4 text-[#00ff88]" />
                  </div>
                  <div className={`text-2xl font-bold ${saldo < 0 ? 'neon-red-text' : 'text-foreground'}`}>
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
                        const category = item.categorias?.nome || 'Outros'
                        const date = item.data || item.date || item.created_at

                        return (
                          <tr key={item.id || index} className="border-b border-border hover:bg-foreground/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatDate(date)}</td>
                            <td className="px-6 py-4 font-medium flex items-center gap-2 text-foreground">
                              {isReceita ? <ArrowUpRight className="w-4 h-4 text-[#00ff88]" /> : <ArrowDownRight className="w-4 h-4 text-[#ff3366]" />}
                              {title}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{category}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${isReceita ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20' : 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/20'}`}>
                                {isReceita ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${isReceita ? 'neon-green-text' : 'neon-red-text'}`}>
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
      )}
    </div>
  )
}
