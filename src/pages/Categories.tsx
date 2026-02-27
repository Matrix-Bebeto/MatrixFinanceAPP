import React, { useState, useEffect } from "react"
import { supabase } from "@/src/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Loader2, AlertCircle, Plus, Trash2, Edit, Search, Tags, X } from "lucide-react"

export function Categories() {
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
    nome: "",
    tags: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data: cats, error: err } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true })
        .limit(100)
        
      if (err) throw new Error(`Erro do Supabase: ${err.message}`)
      
      setData(cats || [])
    } catch (e: any) {
      console.error("Exceção capturada:", e)
      setError(e.message || "Ocorreu um erro desconhecido ao buscar as categorias.")
    } finally {
      setLoading(false)
    }
  }

  const executeDelete = async (item: any) => {
    if (!item || item.id === undefined) return;
    
    setData(prevData => prevData.filter(d => d.id !== item.id));
    setItemToDelete(null);
    
    try {
      const { error } = await supabase.from('categorias').delete().eq('id', item.id);
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
      
      const { error } = await supabase.from('categorias').delete().eq('userid', user.id);
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
      nome: "",
      tags: ""
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    setEditingItem(item)
    setFormData({
      nome: item.nome || "",
      tags: item.tags || ""
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
        nome: formData.nome,
        tags: formData.tags,
        userid: user.id
      }

      if (editingItem) {
        const { error } = await supabase.from('categorias').update(payload).eq('id', editingItem.id)
        if (error) throw error
        setData(data.map(item => item.id === editingItem.id ? { ...item, ...payload } : item))
      } else {
        const { data: newItem, error } = await supabase.from('categorias').insert([payload]).select().single()
        if (error) throw error
        if (newItem) setData([...data, newItem].sort((a, b) => a.nome.localeCompare(b.nome)))
      }
      
      setIsModalOpen(false)
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredData = data.filter(item => {
    const title = (item.nome || '').toLowerCase()
    return title.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize suas transações por categorias.</p>
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
            Nova Categoria
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar categorias..." 
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
          <div className="col-span-full p-8 text-center flex flex-col items-center justify-center text-red-500 glass-panel rounded-2xl">
            <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground glass-panel rounded-2xl">
            Nenhuma categoria encontrada.
          </div>
        ) : (
          filteredData.map((item, index) => {
            const title = item.nome || 'Categoria sem nome'
            const tags = item.tags || ''

            return (
              <Card key={item.id || index} className="glass-card border-none overflow-hidden group hover:bg-white/[0.02] transition-colors">
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400 bg-blue-400/10 border border-blue-400/20">
                      <Tags className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{title}</h3>
                      {tags && <p className="text-xs text-muted-foreground mt-1">{tags}</p>}
                    </div>
                  </div>
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
              <CardTitle className="text-foreground">{editingItem ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nome da Categoria</label>
                  <Input 
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Alimentação, Moradia..."
                    className="bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tags (Opcional)</label>
                  <Input 
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="Ex: essencial, fixo..."
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
