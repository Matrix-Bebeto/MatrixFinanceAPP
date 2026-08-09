import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { KeyRound } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) return setMessage("As senhas não coincidem.")
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setMessage(error.message)
    setMessage("Senha atualizada com sucesso.")
    window.setTimeout(() => navigate("/"), 1200)
  }

  return <main className="min-h-screen grid place-items-center bg-background p-4"><Card className="glass-card w-full max-w-md border-none"><CardHeader className="text-center"><KeyRound className="mx-auto mb-3 h-10 w-10 text-[#00ff88]" aria-hidden="true" /><CardTitle>Definir nova senha</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit}>{message && <div role="status" className="rounded-xl border border-border bg-foreground/5 p-3 text-sm">{message}</div>}<div><label htmlFor="new-password" className="mb-2 block text-sm font-medium">Nova senha</label><Input id="new-password" name="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div><div><label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">Confirmar senha</label><Input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div><p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p><Button className="w-full" disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</Button><Link className="block text-center text-sm text-muted-foreground hover:text-[#00ff88]" to="/login">Voltar ao login</Link></form></CardContent></Card></main>
}
