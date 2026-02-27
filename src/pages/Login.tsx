import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/src/lib/supabase"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Mail, Lock } from "lucide-react"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) setError(error.message)
      else setError("Verifique seu email para confirmar o cadastro (ou faça login se o auto-confirm estiver ativado).")
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setError(error.message)
      else navigate("/")
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00ff88]/5 via-background to-background pointer-events-none"></div>
      <Card className="w-full max-w-md glass-card border-none relative z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
        <CardHeader className="space-y-1 text-center pb-8 border-b border-border">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.3)]">
              <Lock className="w-8 h-8 text-black" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Matrix<span className="text-[#00ff88]"> Finance</span></CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSignUp ? "Crie sua conta para começar" : "Entre com suas credenciais para acessar sua conta"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-5 pt-8">
            {error && (
              <div className={`p-4 text-sm rounded-xl border ${error.includes('Verifique') ? 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20' : 'text-[#ff3366] bg-[#ff3366]/10 border-[#ff3366]/20'}`}>
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Senha
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8">
            <Button
              type="submit"
              className="w-full bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold h-12 rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all"
              disabled={loading}
            >
              {loading ? "Aguarde..." : isSignUp ? "Criar Conta" : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-[#00ff88] transition-colors"
            >
              {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem uma conta? Crie aqui"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
