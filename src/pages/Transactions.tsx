import React, { useState, useEffect } from "react"
import { supabase } from "@/src/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Loader2, AlertCircle, Plus, Trash2, Edit, Search, Filter, TrendingDown, TrendingUp, DollarSign, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function Transactions() {
  const [data, setData] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    estabelecimento: "",
    valor: "",
    tipo: "despesa",
    category_id: "",
    detalhes: "",
    created_at: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      // Fetch categories for the dropdown
      const { data: cats } = await supabase.from('categorias').select('*').order('nome')
      if (cats) setCategories(cats)

      const { data: txs, error: err } = await supabase
        .from('transacoes')
        .select('*, categorias(nome)')
        .order('created_at', { ascending: false })
        .limit(100)
        
      if (err) {
        console.error("Erro ao buscar transações:", err)
        throw new Error(`Erro do Supabase: ${err.message}`)
      }
      
      setData(txs || [])
    } catch (e: any) {
      console.error("Exceção capturada:", e)
      setError(e.message || "Ocorreu um erro desconhecido ao buscar as transações.")
    } finally {
      setLoading(false)
    }
  }

  const executeDelete = async (item: any) => {
    if (!item || item.id === undefined) return;
    
    setData(prevData => prevData.filter(d => d.id !== item.id));
    setItemToDelete(null);
    
    try {
      const { error } = await supabase.from('transacoes').delete().eq('id', item.id);
      if (error) {
        fetchData();
        throw error;
      }
    } catch (e: any) {
      console.error("Erro ao remover:", e);
      alert("Erro ao remover: " + e.message);
    }
  }

  const executeDeleteAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      setData([]); 
      setIsDeletingAll(false);
      
      const { error } = await supabase.from('transacoes').delete().eq('userid', user.id);
      if (error) {
        fetchData();
        throw error;
      }
    } catch (e: any) {
      console.error("Erro ao remover todas:", e);
      alert("Erro ao remover todas: " + e.message);
    }
  }

  const openNewModal = () => {
    setEditingItem(null)
    setFormData({
      estabelecimento: "",
      valor: "",
      tipo: "despesa",
      category_id: categories.length > 0 ? categories[0].id : "",
      detalhes: "",
      created_at: new Date().toISOString().split('T')[0]
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    setEditingItem(item)
    setFormData({
      estabelecimento: item.estabelecimento || "",
      valor: item.valor ? Math.abs(item.valor).toString() : "",
      tipo: (item.tipo || "despesa").toLowerCase(),
      category_id: item.category_id || (categories.length > 0 ? categories[0].id : ""),
      detalhes: item.detalhes || "",
      created_at: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      if (!formData.category_id) {
        throw new Error("Por favor, selecione uma categoria. Se não houver nenhuma, crie uma primeiro na página de Categorias.")
      }

      const payload = {
        estabelecimento: formData.estabelecimento,
        valor: Math.abs(Number(formData.valor)),
        tipo: formData.tipo,
        category_id: formData.category_id,
        detalhes: formData.detalhes,
        quando: formData.created_at,
        userid: user.id,
        created_at: new Date(formData.created_at).toISOString()
      }

      if (editingItem) {
        const { error } = await supabase.from('transacoes').update(payload).eq('id', editingItem.id)
        if (error) throw error
        
        // Update local state with the joined category name for display
        const catName = categories.find(c => c.id === payload.category_id)?.nome
        setData(data.map(item => item.id === editingItem.id ? { ...item, ...payload, categorias: { nome: catName } } : item))
      } else {
        const { data: newItem, error } = await supabase.from('transacoes').insert([payload]).select('*, categorias(nome)').single()
        if (error) throw error
        if (newItem) setData([newItem, ...data])
      }
      
      setIsModalOpen(false)
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculations
  let receitas = 0
  let despesas = 0
  
  const filteredData = data.filter(item => {
    const title = (item.estabelecimento || '').toLowerCase()
    return title.includes(searchTerm.toLowerCase())
  })

  filteredData.forEach(item => {
    const valor = Number(item.valor || 0)
    const tipo = (item.tipo || '').toLowerCase()
    const isReceita = tipo === 'receita' || tipo === 'income' || (valor > 0 && tipo !== 'despesa' && tipo !== 'expense')
    
    if (isReceita) receitas += Math.abs(valor)
    else despesas += Math.abs(valor)
  })

  const saldo = receitas - despesas

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

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas receitas e despesas.</p>
        </div>
        <div className="flex items-center gap-2">
          {isDeletingAll ? (
            <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-xl border border-red-500/20 backdrop-blur-md">
              <span className="text-xs text-[#ff3366] font-medium px-2">Remover todas?</span>
              <Button onClick={executeDeleteAll} size="sm" className="h-8 bg-[#ff3366] hover:bg-[#ff3366]/90 text-white text-xs rounded-lg">Sim</Button>
              <Button onClick={() => setIsDeletingAll(false)} variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-muted rounded-lg">Não</Button>
            </div>
          ) : (
            <Button onClick={() => setIsDeletingAll(true)} variant="outline" className="text-[#ff3366] border-[#ff3366]/30 bg-[#ff3366]/5 hover:bg-[#ff3366]/10 rounded-xl">
              <Trash2 className="w-4 h-4 mr-2" />
              Remover Todas
            </Button>
          )}
          <Button onClick={openNewModal} className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00ff88]/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
            <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center border border-[#00ff88]/20">
              <TrendingUp className="h-4 w-4 text-[#00ff88]" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-[#00ff88]">{formatCurrency(receitas)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff3366]/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
            <div className="w-8 h-8 rounded-full bg-[#ff3366]/10 flex items-center justify-center border border-[#ff3366]/20">
              <TrendingDown className="h-4 w-4 text-[#ff3366]" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-[#ff3366]">{formatCurrency(despesas)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl font-bold ${saldo < 0 ? 'text-[#ff3366]' : 'text-foreground'}`}>
              {formatCurrency(saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar transações..." 
            className="pl-9 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-foreground/5 border-border text-foreground hover:bg-muted rounded-xl">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20 glass-panel rounded-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
          </div>
        ) : error ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-red-500 glass-panel rounded-2xl">
            <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground glass-panel rounded-2xl">
            Nenhuma transação encontrada.
          </div>
        ) : (
          filteredData.map((item, index) => {
            const title = item.estabelecimento || 'Transação sem título'
            const valor = Number(item.valor || 0)
            const tipo = (item.tipo || '').toLowerCase()
            const isReceita = tipo === 'receita' || tipo === 'income' || (valor > 0 && tipo !== 'despesa' && tipo !== 'expense')
            const category = item.categorias?.nome || 'Sem categoria'
            const date = item.created_at
            const details = item.detalhes || ''

            return (
              <Card key={item.id || index} className="glass-card border-none overflow-hidden group hover:bg-white/[0.02] transition-colors">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-3 rounded-2xl flex items-center justify-center shrink-0 border ${isReceita ? 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff3366]/10 border-[#ff3366]/20 text-[#ff3366]'}`}>
                      {isReceita ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base text-foreground">{title}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${isReceita ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20' : 'bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/20'}`}>
                          {isReceita ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><span className="font-medium text-foreground/70">Categoria:</span> {category}</p>
                        <p><span className="font-medium text-foreground/70">Data:</span> {formatDate(date)}</p>
                        {details && <p><span className="font-medium text-foreground/70">Detalhes:</span> {details}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4 sm:gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0 border-border">
                    <span className={`font-bold text-lg ${isReceita ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                      {isReceita ? '+' : '-'}{formatCurrency(Math.abs(valor))}
                    </span>
                    {itemToDelete === item.id ? (
                      <div className="flex gap-2 items-center bg-red-500/10 p-1 rounded-lg border border-red-500/20">
                        <Button onClick={() => executeDelete(item)} size="sm" className="h-8 bg-[#ff3366] hover:bg-[#ff3366]/90 text-white px-2 text-xs rounded-md">Confirmar</Button>
                        <Button onClick={() => setItemToDelete(null)} variant="outline" size="sm" className="h-8 px-2 text-xs border-border text-foreground hover:bg-muted rounded-md">Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button onClick={() => openEditModal(item)} variant="outline" size="sm" className="h-8 w-8 p-0 text-blue-400 border-blue-400/30 bg-blue-400/10 hover:bg-blue-400/20 hover:text-blue-300 rounded-lg">
                          <Edit className="w-4 h-4"/>
                        </Button>
                        <Button onClick={() => setItemToDelete(item.id)} variant="outline" size="sm" className="h-8 w-8 p-0 text-[#ff3366] border-[#ff3366]/30 bg-[#ff3366]/10 hover:bg-[#ff3366]/20 hover:text-[#ff3366] rounded-lg">
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl glass-card border-border animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <CardTitle className="text-foreground">{editingItem ? 'Editar Transação' : 'Nova Transação'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Estabelecimento</label>
                  <Input 
                    required
                    value={formData.estabelecimento}
                    onChange={(e) => setFormData({...formData, estabelecimento: e.target.value})}
                    placeholder="Ex: Supermercado, Salário..."
                    className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Valor (R$)</label>
                    <Input 
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                      placeholder="0.00"
                      className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tipo</label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    >
                      <option value="despesa" className="bg-card text-foreground">Despesa</option>
                      <option value="receita" className="bg-card text-foreground">Receita</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Categoria</label>
                  <select 
                    required
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88] disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  >
                    {categories.length === 0 && <option value="" className="bg-card text-muted-foreground">Crie uma categoria primeiro</option>}
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-card text-foreground">{cat.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Data</label>
                  <Input 
                    required
                    type="date"
                    value={formData.created_at}
                    onChange={(e) => setFormData({...formData, created_at: e.target.value})}
                    className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88] [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Detalhes (Opcional)</label>
                  <Input 
                    value={formData.detalhes}
                    onChange={(e) => setFormData({...formData, detalhes: e.target.value})}
                    placeholder="Observações adicionais..."
                    className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl border-border text-foreground hover:bg-muted">Cancelar</Button>
                  <Button type="submit" disabled={isSaving} className="rounded-xl bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingItem ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
