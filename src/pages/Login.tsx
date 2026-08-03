import { useState, type FormEvent } from "react"
import { Lock, Mail } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"

type Mode = "login" | "signup" | "forgot"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<Mode>("login")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null)

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        if (error) throw error
        setFeedback({ type: "success", text: "Enviamos as instruções de recuperação para o seu e-mail." })
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } })
        if (error) throw error
        setFeedback({ type: "success", text: "Cadastro recebido. Verifique seu e-mail para confirmar a conta." })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Não foi possível concluir a solicitação." })
    } finally {
      setLoading(false)
    }
  }

  const title = mode === "signup" ? "Crie sua conta" : mode === "forgot" ? "Recuperar senha" : "Acesse sua conta"
  return <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00ff88]/5 via-background to-background pointer-events-none" /><Card className="w-full max-w-md glass-card border-none relative z-10"><CardHeader className="space-y-1 text-center pb-6 border-b border-border"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00cc6a]"><Lock className="h-7 w-7 text-black" aria-hidden="true" /></div><CardTitle className="text-3xl">Matrix <span className="text-[#00ff88]">Finance</span></CardTitle><CardDescription>{title}</CardDescription></CardHeader><form onSubmit={handleAuth}><CardContent className="space-y-5 pt-6">{feedback && <div role={feedback.type === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${feedback.type === "success" ? "border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00aa5c] dark:text-[#00ff88]" : "border-[#ff3366]/20 bg-[#ff3366]/10 text-[#d91d51] dark:text-[#ff6690]"}`}>{feedback.text}</div>}<div><label htmlFor="email" className="mb-2 block text-sm font-medium">E-mail</label><div className="relative"><Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" aria-hidden="true" /><Input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" className="pl-10 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></div>{mode !== "forgot" && <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium">Senha</label>{mode === "login" && <button type="button" onClick={() => { setMode("forgot"); setFeedback(null) }} className="text-xs text-muted-foreground hover:text-[#00ff88]">Esqueci minha senha</button>}</div><div className="relative"><Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" aria-hidden="true" /><Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} placeholder="••••••••" className="pl-10 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>{mode === "signup" && <p className="mt-2 text-xs text-muted-foreground">Use no mínimo 8 caracteres e evite senhas reutilizadas.</p>}</div>}</CardContent><CardFooter className="flex flex-col gap-4 pb-7"><Button type="submit" className="h-12 w-full rounded-xl bg-[#00ff88] font-semibold text-black hover:bg-[#00e87b]" disabled={loading}>{loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar instruções" : "Entrar"}</Button><button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setFeedback(null) }} className="text-sm text-muted-foreground hover:text-[#00ff88]">{mode === "login" ? "Não tem conta? Crie agora" : "Voltar ao login"}</button></CardFooter></form></Card></main>
}
