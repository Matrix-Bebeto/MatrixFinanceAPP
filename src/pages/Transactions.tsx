import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { AlertCircle, DollarSign, Edit, Loader2, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { todayInAppTimeZone, formatDateBR } from "@/src/lib/date"
import { formatCurrency, parseMoney } from "@/src/lib/money"
import type { Category, TransactionWithCategory } from "@/src/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"

const PAGE_SIZE = 50
type TransactionForm = { estabelecimento: string; valor: string; tipo: "receita" | "despesa"; category_id: string; detalhes: string; transaction_date: string }
const emptyForm = (): TransactionForm => ({ estabelecimento: "", valor: "", tipo: "despesa", category_id: "", detalhes: "", transaction_date: todayInAppTimeZone() })

export function Transactions() {
  const [data, setData] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState({ receitas: 0, despesas: 0, saldo: 0, total_count: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TransactionWithCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const loadSummary = useCallback(async () => {
    const { data: totals, error: summaryError } = await supabase.rpc("get_transaction_summary", {})
    if (summaryError) throw summaryError
    const total = totals?.[0]
    setSummary({ receitas: Number(total?.receitas ?? 0), despesas: Number(total?.despesas ?? 0), saldo: Number(total?.saldo ?? 0), total_count: Number(total?.total_count ?? 0) })
  }, [])

  const loadPage = useCallback(async (cursor?: number) => {
    let query = supabase.from("transacoes").select("*, categorias(nome)").order("id", { ascending: false }).limit(PAGE_SIZE)
    if (cursor) query = query.lt("id", cursor)
    const { data: rows, error: queryError } = await query
    if (queryError) throw queryError
    const typedRows = (rows ?? []) as unknown as TransactionWithCategory[]
    setData((current) => cursor ? [...current, ...typedRows] : typedRows)
    setHasMore(typedRows.length === PAGE_SIZE)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: cats, error: categoryError }] = await Promise.all([
        supabase.from("categorias").select("*").order("nome"),
        loadPage(),
        loadSummary(),
      ])
      if (categoryError) throw categoryError
      setCategories(cats ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as transações.")
    } finally { setLoading(false) }
  }, [loadPage, loadSummary])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (!isModalOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !isSaving) setIsModalOpen(false) }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [isModalOpen, isSaving])

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("pt-BR")
    if (!term) return data
    return data.filter((item) => [item.estabelecimento, item.detalhes, item.categorias?.nome].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)))
  }, [data, searchTerm])

  function openNewModal() {
    setEditingItem(null)
    setFormData({ ...emptyForm(), category_id: categories[0]?.id ?? "" })
    setIsModalOpen(true)
  }

  function openEditModal(item: TransactionWithCategory) {
    setEditingItem(item)
    setFormData({ estabelecimento: item.estabelecimento ?? "", valor: Math.abs(item.valor).toString(), tipo: item.tipo, category_id: item.category_id, detalhes: item.detalhes ?? "", transaction_date: item.transaction_date || item.created_at.slice(0, 10) })
    setIsModalOpen(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault(); setIsSaving(true); setError(null)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Sua sessão expirou. Entre novamente.")
      if (!formData.category_id) throw new Error("Crie ou selecione uma categoria.")
      const payload = { estabelecimento: formData.estabelecimento.trim(), valor: parseMoney(formData.valor), tipo: formData.tipo, category_id: formData.category_id, detalhes: formData.detalhes.trim() || null, transaction_date: formData.transaction_date, quando: formData.transaction_date }
      if (editingItem) {
        const { error: updateError } = await supabase.from("transacoes").update(payload).eq("id", editingItem.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from("transacoes").insert({ ...payload, userid: user.id })
        if (insertError) throw insertError
      }
      setIsModalOpen(false)
      await Promise.all([loadPage(), loadSummary()])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar.")
    } finally { setIsSaving(false) }
  }

  async function executeDelete(id: number) {
    const previous = data
    setData((current) => current.filter((item) => item.id !== id)); setItemToDelete(null)
    const { error: deleteError } = await supabase.from("transacoes").delete().eq("id", id)
    if (deleteError) { setData(previous); setError(deleteError.message); return }
    await loadSummary()
  }

  async function loadMore() {
    const cursor = data.at(-1)?.id
    if (!cursor) return
    setLoadingMore(true)
    try { await loadPage(cursor) } catch (pageError) { setError(pageError instanceof Error ? pageError.message : "Não foi possível carregar mais registros.") } finally { setLoadingMore(false) }
  }

  return <div className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold">Transações</h1><p className="mt-1 text-sm text-muted-foreground">{summary.total_count} lançamentos no total.</p></div><Button onClick={openNewModal} disabled={categories.length === 0} className="rounded-xl bg-[#00ff88] font-semibold text-black hover:bg-[#00e87b]"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Nova transação</Button></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#ff3366]/20 bg-[#ff3366]/10 p-4 text-sm text-[#d91d51] dark:text-[#ff6690]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{error}</span><button className="ml-auto underline" onClick={() => setError(null)}>Fechar</button></div>}
    {categories.length === 0 && !loading && <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">Crie uma categoria antes de registrar transações.</div>}
    <section className="grid gap-4 md:grid-cols-3" aria-label="Resumo financeiro"><SummaryCard title="Receitas" value={summary.receitas} icon={TrendingUp} color="text-[#00aa5c] dark:text-[#00ff88]" /><SummaryCard title="Despesas" value={summary.despesas} icon={TrendingDown} color="text-[#d91d51] dark:text-[#ff3366]" /><SummaryCard title="Saldo" value={summary.saldo} icon={DollarSign} color={summary.saldo < 0 ? "text-[#d91d51] dark:text-[#ff3366]" : "text-foreground"} /></section>
    <div className="glass-panel rounded-2xl p-4"><label htmlFor="transaction-search" className="sr-only">Pesquisar transações carregadas</label><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="transaction-search" type="search" placeholder="Pesquisar nos registros carregados..." className="rounded-xl pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
    {loading ? <div className="flex justify-center py-20" role="status"><Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" /><span className="sr-only">Carregando</span></div> : <section className="space-y-3" aria-label="Lista de transações">{filteredData.length === 0 ? <div className="glass-panel rounded-2xl p-12 text-center text-muted-foreground">Nenhuma transação encontrada.</div> : filteredData.map((item) => <Card key={item.id} className="glass-card border-none"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{item.estabelecimento || "Sem título"}</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${item.tipo === "receita" ? "border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00aa5c] dark:text-[#00ff88]" : "border-[#ff3366]/20 bg-[#ff3366]/10 text-[#d91d51] dark:text-[#ff3366]"}`}>{item.tipo}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.categorias?.nome ?? "Sem categoria"} · {formatDateBR(item.transaction_date)}</p>{item.detalhes && <p className="mt-1 truncate text-sm text-muted-foreground">{item.detalhes}</p>}</div><div className="flex items-center justify-between gap-3 sm:justify-end"><strong className={item.tipo === "receita" ? "text-[#00aa5c] dark:text-[#00ff88]" : "text-[#d91d51] dark:text-[#ff3366]"}>{item.tipo === "receita" ? "+" : "−"}{formatCurrency(Math.abs(item.valor))}</strong>{itemToDelete === item.id ? <div className="flex gap-2"><Button size="sm" onClick={() => void executeDelete(item.id)} className="bg-[#ff3366] text-white">Confirmar</Button><Button size="sm" variant="outline" onClick={() => setItemToDelete(null)}>Cancelar</Button></div> : <div className="flex gap-2"><Button size="sm" variant="outline" aria-label={`Editar ${item.estabelecimento ?? "transação"}`} onClick={() => openEditModal(item)}><Edit className="h-4 w-4" aria-hidden="true" /></Button><Button size="sm" variant="outline" aria-label={`Excluir ${item.estabelecimento ?? "transação"}`} onClick={() => setItemToDelete(item.id)}><Trash2 className="h-4 w-4 text-[#ff3366]" aria-hidden="true" /></Button></div>}</div></CardContent></Card>)}</section>}
    {hasMore && !searchTerm && <div className="flex justify-center"><Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loadingMore ? "Carregando..." : "Carregar mais"}</Button></div>}
    {isModalOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title"><Card className="glass-card w-full max-w-lg"><CardHeader className="flex flex-row items-center justify-between"><CardTitle id="transaction-dialog-title">{editingItem ? "Editar transação" : "Nova transação"}</CardTitle><Button size="sm" variant="ghost" aria-label="Fechar" onClick={() => setIsModalOpen(false)} disabled={isSaving}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSave}><Field id="estabelecimento" label="Estabelecimento"><Input id="estabelecimento" required maxLength={120} value={formData.estabelecimento} onChange={(e) => setFormData({ ...formData, estabelecimento: e.target.value })} /></Field><div className="grid grid-cols-2 gap-4"><Field id="valor" label="Valor (R$)"><Input id="valor" required type="number" inputMode="decimal" step="0.01" min="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} /></Field><Field id="tipo" label="Tipo"><select id="tipo" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as "receita" | "despesa" })}><option value="despesa">Despesa</option><option value="receita">Receita</option></select></Field></div><Field id="category" label="Categoria"><select id="category" required className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}</select></Field><Field id="transaction-date" label="Data"><Input id="transaction-date" required type="date" value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} /></Field><Field id="details" label="Detalhes (opcional)"><Input id="details" maxLength={300} value={formData.detalhes} onChange={(e) => setFormData({ ...formData, detalhes: e.target.value })} /></Field><div className="flex justify-end gap-2 pt-3"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button><Button disabled={isSaving} className="bg-[#00ff88] text-black hover:bg-[#00e87b]">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSaving ? "Salvando..." : "Salvar"}</Button></div></form></CardContent></Card></div>}
  </div>
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: typeof TrendingUp; color: string }) { return <Card className="glass-card border-none"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle><Icon className={`h-4 w-4 ${color}`} aria-hidden="true" /></CardHeader><CardContent><div className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</div></CardContent></Card> }
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children}</div> }
