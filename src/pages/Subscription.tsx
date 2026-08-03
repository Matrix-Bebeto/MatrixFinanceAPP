import { useEffect, useState } from "react"
import { Activity, ArrowRight, Calendar, Loader2, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { supabase } from "@/src/lib/supabase"
import type { Profile } from "@/src/types/database"
import { formatDateBR } from "@/src/lib/date"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"

export function Subscription() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { if (active) { setError("Sessão inválida."); setLoading(false) }; return }
      const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (active) { setProfile(data); setError(profileError?.message ?? null); setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="flex justify-center py-20" role="status"><Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" /><span className="sr-only">Carregando assinatura</span></div>
  const isPro = profile?.subscription_status === "active"
  return <main className="mx-auto max-w-3xl space-y-8 pb-12"><header><h1 className="text-3xl font-bold">Sua assinatura</h1><p className="mt-2 text-muted-foreground">Status fornecido pelo sistema seguro de cobrança.</p></header>{error ? <div role="alert" className="rounded-xl border border-[#ff3366]/20 bg-[#ff3366]/10 p-4 text-sm text-[#ff3366]">{error}</div> : <Card className="glass-card border-none"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className={`h-5 w-5 ${isPro ? "text-[#00ff88]" : "text-muted-foreground"}`} aria-hidden="true" />{isPro ? "Plano Pro ativo" : "Plano gratuito"}</CardTitle><CardDescription>{isPro ? "Sua assinatura foi confirmada pelo servidor." : "Você está usando os recursos gratuitos do Matrix Finance."}</CardDescription></CardHeader><CardContent className="space-y-5">{isPro && profile?.subscription_end_date && <div className="flex items-center gap-3 rounded-xl border border-border bg-foreground/5 p-4"><Calendar className="h-5 w-5 text-blue-400" aria-hidden="true" /><div><p className="text-xs uppercase text-muted-foreground">Válida até</p><p className="font-semibold">{formatDateBR(profile.subscription_end_date)}</p></div></div>}<div className="flex items-start gap-3 rounded-xl border border-border bg-foreground/5 p-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#00ff88]" aria-hidden="true" /><p>Alterações de plano não são realizadas pelo navegador. Ativações e cancelamentos dependem de confirmação segura do provedor de pagamento.</p></div>{!isPro && <Link to="/plan" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#00ff88] px-5 font-semibold text-black hover:bg-[#00e87b]">Conhecer o Pro <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>}</CardContent></Card>}</main>
}
