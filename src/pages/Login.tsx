import { useEffect, useState, type FormEvent } from "react"
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import "./login-v2.css"

type Mode = "login" | "signup" | "forgot"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<Mode>("login")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dark, setDark] = useState(true)
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null)

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme")
    const shouldBeDark = storedTheme ? storedTheme === "dark" : true
    setDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
  }, [])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setFeedback({ type: "success", text: "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação." })
        return
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) throw error
        setFeedback({ type: "success", text: "Conta criada. Verifique seu e-mail para concluir a confirmação." })
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    } catch (error) {
      setFeedback({ type: "error", text: getAuthErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    setFeedback(null)
    setShowPassword(false)
  }

  function toggleTheme() {
    const nextDark = !dark
    setDark(nextDark)
    localStorage.setItem("theme", nextDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", nextDark)
  }

  const heading = mode === "signup" ? "Comece sua jornada" : mode === "forgot" ? "Recupere seu acesso" : "Bem-vindo de volta"
  const description = mode === "signup" ? "Crie sua conta e organize sua vida financeira." : mode === "forgot" ? "Informe seu e-mail para receber as instruções." : "Entre para acompanhar suas finanças com clareza."

  return (
    <main className={`mf-login-v2 ${dark ? "is-dark" : ""}`}>
      <div className="mf-login-v2__ambient mf-login-v2__ambient--one" />
      <div className="mf-login-v2__ambient mf-login-v2__ambient--two" />

      <button className="mf-login-v2__theme" onClick={toggleTheme} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}>
        {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>

      <section className="mf-login-v2__story" aria-label="Apresentação do Matrix Finance">
        <a href="/login" className="mf-login-v2__brand" aria-label="Matrix Finance">
          <span><WalletCards aria-hidden="true" /></span>
          <strong>Matrix</strong><small>Finance</small>
        </a>

        <div className="mf-login-v2__story-copy">
          <span className="mf-login-v2__eyebrow"><Sparkles aria-hidden="true" /> Inteligência para suas finanças</span>
          <h1>Seu dinheiro.<br /><em>Mais claro.</em></h1>
          <p>Transforme movimentações em decisões tranquilas com uma visão completa da sua vida financeira.</p>

          <div className="mf-login-v2__benefits">
            <span><CheckCircle2 aria-hidden="true" /> Visão financeira em tempo real</span>
            <span><CheckCircle2 aria-hidden="true" /> Dados protegidos e organizados</span>
          </div>
        </div>

        <div className="mf-login-v2__insight" aria-hidden="true">
          <div><span><TrendingUp /></span><p>Resumo financeiro<small>Uma visão clara para decidir melhor</small></p></div>
          <strong>Controle e tranquilidade</strong>
          <div className="mf-login-v2__insight-chart"><i /><i /><i /><i /><i /><i /></div>
        </div>

        <p className="mf-login-v2__security"><ShieldCheck aria-hidden="true" /> Ambiente protegido pelo Supabase</p>
      </section>

      <section className="mf-login-v2__access">
        <div className="mf-login-v2__mobile-brand">
          <span><WalletCards aria-hidden="true" /></span><strong>Matrix Finance</strong>
        </div>

        <div className="mf-login-v2__form-wrap">
          <div className="mf-login-v2__form-heading">
            <span className="mf-login-v2__form-icon"><LockKeyhole aria-hidden="true" /></span>
            <h2>{heading}</h2>
            <p>{description}</p>
          </div>

          <form onSubmit={handleAuth} className="mf-login-v2__form">
            {feedback && <div className={`mf-login-v2__feedback is-${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.type === "success" && <CheckCircle2 aria-hidden="true" />}<span>{feedback.text}</span></div>}

            <label htmlFor="email">E-mail</label>
            <div className="mf-login-v2__field">
              <Mail aria-hidden="true" />
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
            </div>

            {mode !== "forgot" && <>
              <div className="mf-login-v2__label-row">
                <label htmlFor="password">Senha</label>
                {mode === "login" && <button type="button" onClick={() => changeMode("forgot")}>Esqueci minha senha</button>}
              </div>
              <div className="mf-login-v2__field">
                <LockKeyhole aria-hidden="true" />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
                <button type="button" className="mf-login-v2__password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
              </div>
              {mode === "signup" && <p className="mf-login-v2__hint">Use pelo menos 8 caracteres e evite senhas reutilizadas.</p>}
            </>}

            <button type="submit" className="mf-login-v2__submit" disabled={loading}>
              <span>{loading ? "Aguarde..." : mode === "signup" ? "Criar minha conta" : mode === "forgot" ? "Enviar instruções" : "Entrar na minha conta"}</span>
              {!loading && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <div className="mf-login-v2__switch">
            {mode === "login" ? <p>Ainda não tem uma conta? <button onClick={() => changeMode("signup")}>Criar conta grátis</button></p> : <button onClick={() => changeMode("login")}>Voltar para o login</button>}
          </div>

          <p className="mf-login-v2__privacy"><ShieldCheck aria-hidden="true" /> Suas informações são protegidas e nunca compartilhadas.</p>
        </div>
      </section>
    </main>
  )
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  if (message.includes("invalid login credentials")) return "E-mail ou senha incorretos. Verifique os dados e tente novamente."
  if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar na conta."
  if (message.includes("user already registered")) return "Este e-mail já possui uma conta. Tente entrar ou recuperar a senha."
  if (message.includes("password") && message.includes("characters")) return "A senha precisa ter pelo menos 8 caracteres."
  if (message.includes("rate limit")) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
  return "Não foi possível concluir a solicitação. Tente novamente em instantes."
}
