import React, { useState, useEffect, useMemo } from "react"
import { supabase } from "@/src/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Loader2, AlertCircle, Plus, Trash2, Edit, Search, Tags, X, GitMerge, Sparkles, Check, ArrowRight, Layers, CheckCircle2, Store, Building2, Filter } from "lucide-react"

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

  // Unification / Merge Modal state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const [mergeTab, setMergeTab] = useState<"categorias" | "estabelecimentos">("categorias")
  
  // Categorias Merge state
  const [targetCatId, setTargetCatId] = useState<string | number>("")
  const [selectedSourceCatIds, setSelectedSourceCatIds] = useState<(string | number)[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null)

  // Estabelecimentos Merge state
  const [txList, setTxList] = useState<any[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [selectedEstNames, setSelectedEstNames] = useState<string[]>([])
  const [estTargetCatId, setEstTargetCatId] = useState<string | number>("")
  const [estSearchTerm, setEstSearchTerm] = useState("")
  const [isEstMerging, setIsEstMerging] = useState(false)
  const [estMergeSuccess, setEstMergeSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (isMergeModalOpen) {
      fetchTransactionsForEstablishments()
    }
  }, [isMergeModalOpen])

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

  async function fetchTransactionsForEstablishments() {
    setTxLoading(true)
    try {
      const { data: txs, error: err } = await supabase
        .from('transacoes')
        .select('*, categorias(nome)')
        .order('created_at', { ascending: false })
        .limit(500)

      if (err) throw err
      setTxList(txs || [])
    } catch (e) {
      console.error("Erro ao buscar transações para estabelecimentos:", e)
    } finally {
      setTxLoading(false)
    }
  }

  // Helper para normalizar strings (remover acentos, minúsculas, pontuações)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim()
  }

  // Helper para pegar o nome do estabelecimento de um item
  const getEstName = (item: any) => {
    return (item.estabelecimento || item.descricao || item.nome || '').trim()
  }

  // Agrupar e sugerir duplicatas de categorias automaticamente
  const duplicateSuggestions = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    data.forEach(cat => {
      const key = normalizeString(cat.nome || '')
      if (!key) return
      if (!groups[key]) groups[key] = []
      groups[key].push(cat)
    })

    return Object.values(groups).filter(group => group.length > 1)
  }, [data])

  // Agrupar transações por Estabelecimento
  const establishmentGroups = useMemo(() => {
    const groups: Record<string, { name: string, items: any[], categories: Map<string, number> }> = {}

    txList.forEach(tx => {
      const rawName = getEstName(tx)
      if (!rawName) return
      const key = rawName.toLowerCase()

      if (!groups[key]) {
        groups[key] = { name: rawName, items: [], categories: new Map() }
      }
      groups[key].items.push(tx)
      
      const catName = tx.categorias?.nome || 'Sem Categoria'
      groups[key].categories.set(catName, (groups[key].categories.get(catName) || 0) + 1)
    })

    return Object.values(groups).sort((a, b) => b.items.length - a.items.length)
  }, [txList])

  // Sugestões para estabelecimentos com múltiplas categorias ou nomes parecidos
  const estSuggestions = useMemo(() => {
    // 1. Estabelecimentos com divergência de categorias (2 ou mais categorias diferentes)
    const divergent = establishmentGroups.filter(g => g.categories.size > 1)

    // 2. Estabelecimentos com nomes parecidos
    const prefixMap: Record<string, typeof establishmentGroups> = {}
    establishmentGroups.forEach(g => {
      const norm = normalizeString(g.name)
      const prefix = norm.substring(0, 4)
      if (prefix.length >= 3) {
        if (!prefixMap[prefix]) prefixMap[prefix] = []
        prefixMap[prefix].push(g)
      }
    })

    const similar = Object.values(prefixMap).filter(list => list.length > 1)

    return { divergent, similar }
  }, [establishmentGroups])

  const handleApplySuggestion = (group: any[]) => {
    if (!group || group.length < 2) return
    const sorted = [...group].sort((a, b) => b.nome.length - a.nome.length)
    const target = sorted[0]
    const sources = sorted.slice(1).map(s => s.id)

    setTargetCatId(target.id)
    setSelectedSourceCatIds(sources)
  }

  const toggleSourceCategory = (id: string | number) => {
    if (selectedSourceCatIds.includes(id)) {
      setSelectedSourceCatIds(selectedSourceCatIds.filter(i => i !== id))
    } else {
      setSelectedSourceCatIds([...selectedSourceCatIds, id])
    }
  }

  const toggleSelectEstablishment = (name: string) => {
    if (selectedEstNames.includes(name)) {
      setSelectedEstNames(selectedEstNames.filter(n => n !== name))
    } else {
      setSelectedEstNames([...selectedEstNames, name])
    }
  }

  const handleExecuteMerge = async () => {
    if (!targetCatId) {
      alert("Por favor, selecione a categoria principal (destino).")
      return
    }
    if (selectedSourceCatIds.length === 0) {
      alert("Por favor, selecione ao menos uma categoria para unificar e remover.")
      return
    }
    if (selectedSourceCatIds.includes(targetCatId)) {
      alert("A categoria principal não pode estar entre as categorias a serem removidas.")
      return
    }

    setIsMerging(true)
    setMergeSuccess(null)

    try {
      const targetCat = data.find(c => c.id === targetCatId)
      const targetName = targetCat ? targetCat.nome : 'Categoria Destino'

      // 1. Atualiza as transações vinculadas às categorias duplicadas
      const { error: txErr1 } = await supabase
        .from('transacoes')
        .update({ category_id: targetCatId })
        .in('category_id', selectedSourceCatIds)

      if (txErr1) console.warn("Aviso ao atualizar category_id:", txErr1)

      await supabase
        .from('transacoes')
        .update({ categoria_id: targetCatId })
        .in('categoria_id', selectedSourceCatIds)

      // 2. Apaga as categorias duplicadas antigas
      const { error: deleteErr } = await supabase
        .from('categorias')
        .delete()
        .in('id', selectedSourceCatIds)

      if (deleteErr) throw deleteErr

      setMergeSuccess(`Categorias unificadas com sucesso em "${targetName}"! Todas as transações foram atualizadas.`)
      setSelectedSourceCatIds([])
      await fetchData()
    } catch (e: any) {
      console.error("Erro ao unificar categorias:", e)
      alert("Erro ao unificar categorias: " + e.message)
    } finally {
      setIsMerging(false)
    }
  }

  const handleExecuteEstablishmentMerge = async () => {
    if (selectedEstNames.length === 0) {
      alert("Por favor, selecione ao menos um estabelecimento.")
      return
    }
    if (!estTargetCatId) {
      alert("Por favor, selecione a categoria que deseja atribuir aos estabelecimentos.")
      return
    }

    setIsEstMerging(true)
    setEstMergeSuccess(null)

    try {
      const targetCat = data.find(c => String(c.id) === String(estTargetCatId))
      const targetCatName = targetCat ? targetCat.nome : 'Categoria Destino'

      // Encontra todos os IDs de transações que correspondem aos estabelecimentos selecionados
      const matchingTxs = txList.filter(tx => {
        const name = getEstName(tx).trim().toLowerCase()
        return selectedEstNames.some(selected => selected.toLowerCase() === name)
      })

      const txIdsToUpdate = matchingTxs.map(t => t.id)

      if (txIdsToUpdate.length === 0) {
        alert("Nenhuma transação encontrada para os estabelecimentos selecionados.")
        return
      }

      // Atualiza category_id nas transações
      const { error: err1 } = await supabase
        .from('transacoes')
        .update({ category_id: estTargetCatId })
        .in('id', txIdsToUpdate)

      if (err1) console.warn("Erro ao atualizar category_id:", err1)

      await supabase
        .from('transacoes')
        .update({ categoria_id: estTargetCatId })
        .in('id', txIdsToUpdate)

      setEstMergeSuccess(`Sucesso! ${txIdsToUpdate.length} transação(ões) de ${selectedEstNames.length} estabelecimento(s) foram atualizadas para a categoria "${targetCatName}".`)
      setSelectedEstNames([])
      await fetchTransactionsForEstablishments()
    } catch (e: any) {
      console.error("Erro ao unificar por estabelecimento:", e)
      alert("Erro ao unificar por estabelecimento: " + e.message)
    } finally {
      setIsEstMerging(false)
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
          <p className="text-sm text-muted-foreground mt-1">Organize suas transações por categorias e unifique duplicadas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

          <Button 
            onClick={() => {
              setMergeSuccess(null)
              setIsMergeModalOpen(true)
            }} 
            variant="outline" 
            className="border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 rounded-xl"
          >
            <GitMerge className="w-4 h-4 mr-2" />
            Unificar Categorias
          </Button>

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
        {duplicateSuggestions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-[#00ff88] bg-[#00ff88]/10 px-3 py-1.5 rounded-xl border border-[#00ff88]/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>{duplicateSuggestions.length} grupo(s) de categorias parecidas encontrado(s)!</span>
            <button 
              onClick={() => {
                setMergeSuccess(null)
                setIsMergeModalOpen(true)
              }}
              className="underline font-bold hover:text-white ml-1"
            >
              Unificar agora
            </button>
          </div>
        )}
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

      {/* Modal Criar / Editar Categoria */}
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

      {/* Modal Unificar / Mesclar Categorias & Estabelecimentos */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl shadow-2xl glass-card border-border animate-in fade-in zoom-in duration-200 my-8">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-[#00ff88]" />
                  <div>
                    <CardTitle className="text-foreground text-lg">Central de Unificação de Categorias</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Padronize categorias e organize suas despesas por estabelecimento.
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMergeModalOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted self-end sm:self-auto">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs de Seleção */}
              <div className="flex gap-2 mt-4 pt-2 border-t border-border/50">
                <button
                  onClick={() => {
                    setMergeTab("categorias")
                    setMergeSuccess(null)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    mergeTab === "categorias"
                      ? "bg-[#00ff88] text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]"
                      : "bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Unificar Categorias Duplicadas
                </button>
                <button
                  onClick={() => {
                    setMergeTab("estabelecimentos")
                    setEstMergeSuccess(null)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    mergeTab === "estabelecimentos"
                      ? "bg-[#00ff88] text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]"
                      : "bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Unificar Categoria por Estabelecimento
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* ABA 1: UNIFICAR CATEGORIAS DUPLICADAS */}
              {mergeTab === "categorias" && (
                <>
                  {mergeSuccess && (
                    <div className="p-4 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center gap-3 text-[#00ff88]">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{mergeSuccess}</p>
                    </div>
                  )}

                  {/* Sugestões Automáticas de Categorias Duplicadas */}
                  {duplicateSuggestions.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#00ff88]">
                        <Sparkles className="w-4 h-4" />
                        Sugestões Automáticas Encontradas ({duplicateSuggestions.length})
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Encontramos categorias com nomes quase idênticos no seu cadastro. Clique em "Selecionar" para preparar a mesclagem:
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {duplicateSuggestions.map((group, idx) => (
                          <div key={idx} className="p-3 bg-card rounded-lg border border-border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">Grupos Parecidos:</span>
                              {group.map((cat) => (
                                <span key={cat.id} className="bg-foreground/5 px-2 py-1 rounded text-foreground border border-border">
                                  {cat.nome}
                                </span>
                              ))}
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => handleApplySuggestion(group)}
                              className="h-7 text-xs bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-lg shrink-0 ml-2"
                            >
                              Selecionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seleção Manual de Mesclagem */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#00ff88]" />
                        1. Categoria Principal (Destino Final)
                      </label>
                      <p className="text-xs text-muted-foreground">Esta é a categoria correta que será mantida no sistema.</p>
                      <select 
                        value={targetCatId}
                        onChange={(e) => setTargetCatId(e.target.value)}
                        className="w-full h-11 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                      >
                        <option value="" className="bg-card text-foreground">Selecione a categoria principal...</option>
                        {data.map(cat => (
                          <option key={cat.id} value={cat.id} className="bg-card text-foreground">{cat.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-[#ff3366]" />
                        2. Categorias Duplicadas para Unificar e Remover (Origens)
                      </label>
                      <p className="text-xs text-muted-foreground">Marque as categorias secundárias/com erros de digitação. Todas as transações vinculadas a elas serão transferidas para a categoria principal e elas serão excluídas.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-border rounded-xl bg-foreground/5">
                        {data
                          .filter(cat => String(cat.id) !== String(targetCatId))
                          .map(cat => {
                            const isSelected = selectedSourceCatIds.includes(cat.id)
                            return (
                              <div 
                                key={cat.id}
                                onClick={() => toggleSourceCategory(cat.id)}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected 
                                    ? "border-[#ff3366] bg-[#ff3366]/10 text-foreground font-semibold" 
                                    : "border-border hover:bg-foreground/5 text-muted-foreground"
                                }`}
                              >
                                <span className="truncate">{cat.nome}</span>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "border-[#ff3366] bg-[#ff3366] text-white" : "border-border"}`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    {targetCatId && selectedSourceCatIds.length > 0 && (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1">
                        <p className="font-bold text-blue-400">Resumo da Ação:</p>
                        <p className="text-foreground leading-relaxed">
                          Todas as transações registradas nas <strong>{selectedSourceCatIds.length} categoria(s) selecionada(s)</strong> serão reatribuídas para <strong>"{data.find(c => String(c.id) === String(targetCatId))?.nome}"</strong>. As categorias duplicadas serão removidas do sistema.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsMergeModalOpen(false)} 
                      className="rounded-xl border-border text-foreground hover:bg-muted"
                    >
                      Fechar
                    </Button>
                    <Button 
                      type="button" 
                      disabled={isMerging || !targetCatId || selectedSourceCatIds.length === 0}
                      onClick={handleExecuteMerge}
                      className="rounded-xl bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold shadow-[0_0_15px_rgba(0,255,136,0.3)] px-6"
                    >
                      {isMerging ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Unificando...
                        </>
                      ) : (
                        "Unificar e Atualizar Transações"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* ABA 2: UNIFICAR CATEGORIA POR ESTABELECIMENTO */}
              {mergeTab === "estabelecimentos" && (
                <>
                  {estMergeSuccess && (
                    <div className="p-4 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center gap-3 text-[#00ff88]">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{estMergeSuccess}</p>
                    </div>
                  )}

                  {/* Sugestões de Estabelecimentos Divergentes */}
                  {estSuggestions.divergent.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        Estabelecimentos com Categorias Divergentes ({estSuggestions.divergent.length})
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Identificamos estabelecimentos que possuem compras registradas em categorias diferentes. Clique em "Selecionar" para unificá-los numa única categoria:
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {estSuggestions.divergent.map((group, idx) => (
                          <div key={idx} className="p-3 bg-card rounded-lg border border-border flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-foreground text-sm">{group.name}</span>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-muted-foreground">Categorias atuais:</span>
                                {Array.from(group.categories.entries()).map(([cat, count]) => (
                                  <span key={cat} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                                    {cat} ({count})
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!selectedEstNames.includes(group.name)) {
                                  setSelectedEstNames([...selectedEstNames, group.name])
                                }
                              }}
                              className="h-7 text-xs bg-amber-400 hover:bg-amber-500 text-black font-semibold rounded-lg shrink-0 ml-2"
                            >
                              Selecionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Busca por estabelecimento */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#00ff88]" />
                          1. Selecione o(s) Estabelecimento(s)
                        </span>
                        {selectedEstNames.length > 0 && (
                          <span className="text-xs text-[#00ff88] font-normal">
                            {selectedEstNames.length} selecionado(s)
                          </span>
                        )}
                      </label>
                      
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar estabelecimento (ex: Uber, iFood, Mercado Livre...)"
                          value={estSearchTerm}
                          onChange={(e) => setEstSearchTerm(e.target.value)}
                          className="pl-9 bg-foreground/5 border-border text-foreground rounded-xl"
                        />
                      </div>

                      {/* Lista de Estabelecimentos */}
                      {txLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-6 h-6 animate-spin text-[#00ff88]" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-border rounded-xl bg-foreground/5">
                          {establishmentGroups
                            .filter(g => g.name.toLowerCase().includes(estSearchTerm.toLowerCase()))
                            .map((group) => {
                              const isSelected = selectedEstNames.includes(group.name)
                              return (
                                <div
                                  key={group.name}
                                  onClick={() => toggleSelectEstablishment(group.name)}
                                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between cursor-pointer transition-all ${
                                    isSelected 
                                      ? "border-[#00ff88] bg-[#00ff88]/10 text-foreground" 
                                      : "border-border hover:bg-foreground/5 text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-foreground truncate text-sm">{group.name}</span>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "border-[#00ff88] bg-[#00ff88] text-black" : "border-border"}`}>
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[11px]">
                                    <span className="text-muted-foreground">{group.items.length} transações</span>
                                    <div className="flex gap-1 overflow-x-auto max-w-[150px]">
                                      {Array.from(group.categories.keys()).slice(0, 2).map(c => (
                                        <span key={c} className="bg-foreground/10 text-foreground px-1.5 py-0.5 rounded text-[10px] truncate">
                                          {c}
                                        </span>
                                      ))}
                                      {group.categories.size > 2 && (
                                        <span className="text-muted-foreground text-[10px]">+{group.categories.size - 2}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>

                    {/* Atribuição de Categoria */}
                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Tags className="w-4 h-4 text-[#00ff88]" />
                        2. Categoria Única para Atribuir
                      </label>
                      <p className="text-xs text-muted-foreground">Todas as transações dos estabelecimentos selecionados serão atualizadas para esta categoria.</p>

                      <select 
                        value={estTargetCatId}
                        onChange={(e) => setEstTargetCatId(e.target.value)}
                        className="w-full h-11 px-3 py-2 bg-foreground/5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                      >
                        <option value="" className="bg-card text-foreground">Selecione a categoria única...</option>
                        {data.map(cat => (
                          <option key={cat.id} value={cat.id} className="bg-card text-foreground">{cat.nome}</option>
                        ))}
                      </select>
                    </div>

                    {selectedEstNames.length > 0 && estTargetCatId && (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1">
                        <p className="font-bold text-blue-400">Resumo da Atualização:</p>
                        <p className="text-foreground leading-relaxed">
                          Todas as transações pertencentes a <strong>{selectedEstNames.join(", ")}</strong> serão atualizadas para a categoria <strong>"{data.find(c => String(c.id) === String(estTargetCatId))?.nome}"</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsMergeModalOpen(false)} 
                      className="rounded-xl border-border text-foreground hover:bg-muted"
                    >
                      Fechar
                    </Button>
                    <Button 
                      type="button" 
                      disabled={isEstMerging || selectedEstNames.length === 0 || !estTargetCatId}
                      onClick={handleExecuteEstablishmentMerge}
                      className="rounded-xl bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold shadow-[0_0_15px_rgba(0,255,136,0.3)] px-6"
                    >
                      {isEstMerging ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Atualizando...
                        </>
                      ) : (
                        "Atualizar Categoria no Estabelecimento"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
