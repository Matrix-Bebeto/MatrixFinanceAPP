import { useEffect, useState } from "react"
import type { User as AuthUser } from "@supabase/supabase-js"
import {
  Bell,
  ChartPie,
  Tags,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ReceiptText,
  Settings,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { BrandLogo } from "@/src/components/BrandLogo"
import { supabase } from "@/src/lib/supabase"
import type { Profile } from "@/src/types/database"
import "../pages/visual-v2.css"
import "../app-v2.css"

const navigation = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: ReceiptText, label: "Transações", path: "/transactions" },
  { icon: Tags, label: "Categorias", path: "/categories" },
  { icon: ChartPie, label: "Relatórios", path: "/reports" },
  { icon: Bell, label: "Lembretes", path: "/reminders" },
]

const accountNavigation = [
  { icon: User, label: "Perfil", path: "/profile" },
  { icon: Settings, label: "Plano e assinatura", path: "/subscription" },
]

export function Layout() {
  const location = useLocation()
  const [isDark, setIsDark] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme")
    const shouldBeDark = storedTheme ? storedTheme === "dark" : true
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)

    const fetchProfile = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData.user
      setUser(currentUser)
      if (!currentUser) return

      const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single()
      if (data) setProfile(data)
    }

    void fetchProfile()
    window.addEventListener("profileUpdated", fetchProfile)
    return () => window.removeEventListener("profileUpdated", fetchProfile)
  }, [])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const currentPage = [...navigation, ...accountNavigation].find(({ path }) => path === location.pathname)?.label ?? "Matrix Finance"
  const displayName = profile?.nome || user?.email?.split("@")[0] || "Usuário"
  const initials = displayName.slice(0, 2).toUpperCase()

  const toggleTheme = () => {
    const nextTheme = !isDark
    setIsDark(nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme)
    localStorage.setItem("theme", nextTheme ? "dark" : "light")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  const renderNavigation = (items: typeof navigation) => items.map(({ icon: Icon, label, path }) => {
    const active = location.pathname === path
    return (
      <Link key={path} to={path} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
        <Icon aria-hidden="true" />
        <span>{label}</span>
        {active && <i />}
      </Link>
    )
  })

  return (
    <div className={`mf-v2 mf-app-v2 ${isDark ? "mf-v2--dark" : ""}`}>
      <div className="mf-v2__ambient mf-v2__ambient--one" />
      <div className="mf-v2__ambient mf-v2__ambient--two" />

      {isSidebarOpen && <button className="mf-v2__overlay" aria-label="Fechar menu" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`mf-v2__sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <div className="mf-v2__brand">
          <BrandLogo className="mf-v2__brand-logo" />
          <button className="mf-v2__mobile-close" aria-label="Fechar menu" onClick={() => setIsSidebarOpen(false)}><X aria-hidden="true" /></button>
        </div>

        <div className="mf-v2__preview-tag"><Sparkles aria-hidden="true" /><span>Nova experiência</span><small>V2</small></div>

        <nav className="mf-v2__nav" aria-label="Navegação principal">
          <p>GESTÃO</p>
          {renderNavigation(navigation)}
          <p>CONTA</p>
          {renderNavigation(accountNavigation)}
        </nav>

        <div className="mf-v2__sidebar-card">
          <div className="mf-v2__sidebar-card-icon"><Sparkles aria-hidden="true" /></div>
          <strong>Seu dinheiro, mais claro.</strong>
          <p>Decisões financeiras com informação real, segurança e tranquilidade.</p>
        </div>

        <button className="mf-app-v2__logout" onClick={() => void handleLogout()}>
          <LogOut aria-hidden="true" /> Sair da conta
        </button>
      </aside>

      <main className="mf-v2__main mf-app-v2__main">
        <header className="mf-v2__topbar">
          <div className="mf-v2__topbar-title">
            <button className="mf-v2__menu-button" aria-label="Abrir menu" onClick={() => setIsSidebarOpen(true)}><Menu aria-hidden="true" /></button>
            <div><span>Matrix Finance</span><strong>{currentPage}</strong></div>
          </div>

          <div className="mf-v2__topbar-actions">
            <button className="mf-v2__icon-button" aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"} onClick={toggleTheme}>
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
            <Link to="/reminders" className="mf-v2__icon-button mf-v2__notification" aria-label="Abrir lembretes"><Bell aria-hidden="true" /><i /></Link>
            <Link to="/profile" className="mf-v2__user" aria-label="Abrir perfil">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <div>{initials}</div>}
              <span><strong>{displayName}</strong><small>{profile?.subscription_status === "active" ? "Plano Pro" : "Conta principal"}</small></span>
            </Link>
          </div>
        </header>

        <div className="mf-app-v2__scroll">
          <div className="mf-v2__content mf-app-v2__content"><Outlet /></div>
        </div>
      </main>
    </div>
  )
}
