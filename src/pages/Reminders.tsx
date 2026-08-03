import { useEffect, useMemo, useState, type FormEvent } from "react"
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Edit, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { formatDateBR, todayInAppTimeZone } from "@/src/lib/date"
import { formatCurrency, parseMoney } from "@/src/lib/money"
import { supabase } from "@/src/lib/supabase"
import type { Reminder } from "@/src/types/database"

type ReminderForm = { descricao: string; due_date: string; valor: string }
const emptyForm = (): ReminderForm => ({ descricao: "", due_date: todayInAppTimeZone(), valor: "" })

export function Reminders() {
  const [items, setItems] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ReminderForm>(emptyForm)

  async function loadReminders() {
    setLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from("lembretes")
      .select("id, created_at, userid, descricao, data, due_date, valor, hora, status, notificado")
      .order("due_date", { ascending: true })
      .limit(500)
    if (queryError) setError(queryError.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { void loadReminders() }, [])

  useEffect(() => {
    if (!dialogOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) setDialogOpen(false) }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [dialogOpen, saving])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    return term ? items.filter((item) => item.descricao?.toLocaleLowerCase("pt-BR").includes(term)) : items
  }, [items, search])

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(item: Reminder) {
    setEditing(item)
    setForm({ descricao: item.descricao ?? "", due_date: item.due_date || item.data?.slice(0, 10) || todayInAppTimeZone(), valor: item.valor?.toString() ?? "" })
    setDialogOpen(true)
  }

  async function saveReminder(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Sua sessão expirou. Entre novamente.")
      const payload = {
        descricao: form.descricao.trim(),
        due_date: form.due_date,
        data: `${form.due_date}T12:00:00`,
        valor: form.valor.trim() ? parseMoney(form.valor) : null,
        userid: user.id,
      }
      if (editing) {
        const { error: updateError } = await supabase.from("lembretes").update({ descricao: payload.descricao, due_date: payload.due_date, data: payload.data, valor: payload.valor }).eq("id", editing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from("lembretes").insert([payload])
        if (insertError) throw insertError
      }
      setDialogOpen(false)
      await loadReminders()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o lembrete.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleCompleted(item: Reminder) {
    const nextStatus = item.status === "concluido" ? "pendente" : "concluido"
    const previous = items
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: nextStatus } : candidate))
    const { error: updateError } = await supabase.from("lembretes").update({ status: nextStatus }).eq("id", item.id)
    if (updateError) { setItems(previous); setError(updateError.message) }
  }

  async function removeReminder(id: number) {
    const previous = items
    setItems((current) => current.filter((item) => item.id !== id))
    setDeleteId(null)
    const { error: deleteError } = await supabase.from("lembretes").delete().eq("id", id)
    if (deleteError) { setItems(previous); setError(deleteError.message) }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold">Lembretes</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe vencimentos sem colocar seus registros em risco.</p></div>
        <Button onClick={openNew} className="rounded-xl bg-[#00ff88] font-semibold text-black hover:bg-[#00e87b]"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Novo lembrete</Button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#ff3366]/20 bg-[#ff3366]/10 p-4 text-sm text-[#d91d51] dark:text-[#ff6690]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{error}</span><button className="ml-auto underline" onClick={() => setError(null)}>Fechar</button></div>}

      <div className="glass-panel rounded-2xl p-4">
        <label htmlFor="reminder-search" className="sr-only">Pesquisar lembretes</label>
        <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="reminder-search" type="search" placeholder="Pesquisar lembretes..." className="rounded-xl pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>

      {loading ? <div className="flex justify-center py-20" role="status"><Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" /><span className="sr-only">Carregando</span></div> : filtered.length === 0 ? <div className="glass-panel rounded-2xl p-12 text-center text-muted-foreground">Nenhum lembrete encontrado.</div> : (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Lista de lembretes">
          {filtered.map((item) => {
            const completed = item.status === "concluido"
            return <Card key={item.id} className={`glass-card border-none ${completed ? "opacity-70" : ""}`}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><CardTitle className={`text-base ${completed ? "line-through" : ""}`}>{item.descricao || "Sem descrição"}</CardTitle><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${completed ? "border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00aa5c] dark:text-[#00ff88]" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{completed ? "Concluído" : "Pendente"}</span></div></CardHeader><CardContent className="space-y-4"><div className="space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-400" aria-hidden="true" />{formatDateBR(item.due_date)}</p>{item.valor !== null && <p className="font-semibold text-foreground">{formatCurrency(item.valor)}</p>}</div><div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><Button size="sm" variant="outline" onClick={() => void toggleCompleted(item)} aria-label={completed ? "Reabrir lembrete" : "Concluir lembrete"}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></Button><Button size="sm" variant="outline" onClick={() => openEdit(item)} aria-label="Editar lembrete"><Edit className="h-4 w-4" aria-hidden="true" /></Button>{deleteId === item.id ? <><Button size="sm" onClick={() => void removeReminder(item.id)} className="bg-[#ff3366] text-white">Confirmar</Button><Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button></> : <Button size="sm" variant="outline" onClick={() => setDeleteId(item.id)} aria-label="Excluir lembrete"><Trash2 className="h-4 w-4 text-[#ff3366]" aria-hidden="true" /></Button>}</div></CardContent></Card>
          })}
        </section>
      )}

      {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title"><Card className="glass-card w-full max-w-lg"><CardHeader className="flex flex-row items-center justify-between"><CardTitle id="reminder-dialog-title">{editing ? "Editar lembrete" : "Novo lembrete"}</CardTitle><Button size="sm" variant="ghost" aria-label="Fechar" onClick={() => setDialogOpen(false)} disabled={saving}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={saveReminder} className="space-y-4"><div className="space-y-2"><label htmlFor="reminder-description" className="text-sm font-medium">Descrição</label><Input id="reminder-description" required maxLength={180} value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="reminder-date" className="text-sm font-medium">Vencimento</label><Input id="reminder-date" required type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></div><div className="space-y-2"><label htmlFor="reminder-value" className="text-sm font-medium">Valor (opcional)</label><Input id="reminder-value" type="number" inputMode="decimal" min="0" step="0.01" value={form.valor} onChange={(event) => setForm({ ...form, valor: event.target.value })} /></div></div><div className="flex justify-end gap-2 pt-3"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button><Button disabled={saving} className="bg-[#00ff88] text-black hover:bg-[#00e87b]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}{saving ? "Salvando..." : "Salvar"}</Button></div></form></CardContent></Card></div>}
    </div>
  )
}
