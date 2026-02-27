import React, { useState, useEffect } from "react"
import { supabase } from "@/src/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Loader2, AlertCircle, Plus, Trash2, Edit, Search, Calendar, Clock, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function Reminders() {
  const [data, setData] = useState<any[]>([])
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
    descricao: "",
    data: new Date().toISOString().split('T')[0],
    valor: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data: rems, error: err } = await supabase
        .from('lembretes')
        .select('*')
        .order('data', { ascending: true })
        .limit(100)
        
      if (err) throw new Error(`Erro do Supabase: ${err.message}`)
      
      setData(rems || [])
    } catch (e: any) {
      console.error("Exceção capturada:", e)
      setError(e.message || "Ocorreu um erro desconhecido ao buscar os lembretes.")
    } finally {
      setLoading(false)
    }
  }

  const executeDelete = async (item: any) => {
    if (!item || item.id === undefined) return;
    
    setData(prevData => prevData.filter(d => d.id !== item.id));
    setItemToDelete(null);
    
    try {
      const { error } = await supabase.from('lembretes').delete().eq('id', item.id);
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
      
      const { error } = await supabase.from('lembretes').delete().eq('userid', user.id);
      if (error) {
        fetchData();
        throw error;
      }
    } catch (e: any) {
      console.error("Erro ao remover todos:", e);
      alert("Erro ao remover todos: " + e.message);
    }
  }

  const openNewModal = () => {
    setEditingItem(null)
    setFormData({
      descricao: "",
      data: new Date().toISOString().split('T')[0],
      valor: ""
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    setEditingItem(item)
    setFormData({
      descricao: item.descricao || "",
      data: item.data ? item.data.split('T')[0] : new Date().toISOString().split('T')[0],
      valor: item.valor ? item.valor.toString() : ""
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const payload = {
        descricao: formData.descricao,
        data: new Date(formData.data).toISOString(),
        valor: formData.valor ? Number(formData.valor) : null,
        userid: user.id
      }

      if (editingItem) {
        const { error } = await supabase.from('lembretes').update(payload).eq('id', editingItem.id)
        if (error) throw error
        setData(data.map(item => item.id === editingItem.id ? { ...item, ...payload } : item))
      } else {
        const { data: newItem, error } = await supabase.from('lembretes').insert([payload]).select().single()
        if (error) throw error
        if (newItem) setData([...data, newItem].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()))
      }
      
      setIsModalOpen(false)
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredData = data.filter(item => {
    const title = (item.descricao || '').toLowerCase()
    return title.includes(searchTerm.toLowerCase())
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch (e) {
      return dateString
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Lembretes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus lembretes e contas a pagar/receber.</p>
        </div>
        <div className="flex items-center gap-2">
          {isDeletingAll ? (
            <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-xl border border-red-500/20 backdrop-blur-md">
              <span className="text-xs text-[#ff3366] font-medium px-2">Remover todos?</span>
              <Button onClick={executeDeleteAll} size="sm" className="h-8 bg-[#ff3366] hover:bg-[#ff3366]/90 text-white text-xs rounded-lg">Sim</Button>
              <Button onClick={() => setIsDeletingAll(false)} variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-muted rounded-lg">Não</Button>
            </div>
          ) : (
            <Button onClick={() => setIsDeletingAll(true)} variant="outline" className="text-[#ff3366] border-[#ff3366]/30 bg-[#ff3366]/5 hover:bg-[#ff3366]/10 rounded-xl">
              <Trash2 className="w-4 h-4 mr-2" />
              Remover Todos
            </Button>
          )}
          <Button onClick={openNewModal} className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <Plus className="w-4 h-4 mr-2" />
            Novo Lembrete
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar lembretes..." 
            className="pl-9 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-20 glass-panel rounded-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
          </div>
        ) : error ? (
          <div className="col-span-full p-8 text-center flex flex-col items-center justify-center text-[#ff3366] glass-panel rounded-2xl">
            <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground glass-panel rounded-2xl">
            Nenhum lembrete encontrado.
          </div>
        ) : (
          filteredData.map((item, index) => {
            const title = item.descricao || 'Sem descrição'
            const date = item.data
            const valor = Number(item.valor || 0)

            return (
              <Card key={item.id || index} className="glass-card border-none overflow-hidden group hover:bg-white/[0.02] transition-colors">
                <div className="p-5 flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-base text-foreground">
                        {title}
                      </h3>
                      <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <Clock className="w-3 h-3" />
                        Pendente
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1.5">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        {formatDate(date)}
                      </p>
                      {valor > 0 && (
                        <p className="font-medium text-[#00ff88] mt-2">
                          {formatCurrency(valor)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-2">
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
              <CardTitle className="text-foreground">{editingItem ? 'Editar Lembrete' : 'Novo Lembrete'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Descrição</label>
                  <Input 
                    required
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Ex: Pagar conta de luz..."
                    className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Data</label>
                    <Input 
                      required
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88] [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Valor (Opcional)</label>
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                      placeholder="0.00"
                      className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                    />
                  </div>
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
