import { Link, useLocation, Outlet } from "react-router-dom"
import { LayoutDashboard, Receipt, Tags, PieChart, Bell, User, LogOut, PanelLeftClose, PanelLeft, Sun, Moon, Aperture, X } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { useEffect, useState } from "react"

export function Layout() {
  const location = useLocation()
  const [isDark, setIsDark] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    // Check local storage or system preference
    const storedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const shouldBeDark = storedTheme === 'dark' || (!storedTheme && prefersDark)
    
    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    const fetchProfile = () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
        if (user) {
          supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
            if (data) setProfile(data)
          })
        }
      })
    }

    fetchProfile()

    window.addEventListener('profileUpdated', fetchProfile)
    return () => window.removeEventListener('profileUpdated', fetchProfile)
  }, [])

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Receipt, label: "Transações", path: "/transactions" },
    { icon: Tags, label: "Categorias", path: "/categories" },
    { icon: PieChart, label: "Relatórios", path: "/reports" },
    { icon: Bell, label: "Lembretes", path: "/reminders" },
    { icon: User, label: "Perfil", path: "/profile" },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card/95 backdrop-blur-xl flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#00cc6a] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,136,0.3)]">
              <Aperture className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Matrix<span className="text-[#00ff88]"> Finance</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu Principal</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm border border-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-[#00ff88]" : ""}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 mb-4 px-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-border object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm border border-border">
                {(profile?.nome || user?.email || "U").substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{profile?.nome || user?.email || "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.subscription_status === 'active' ? 'Plano Pro' : 'Plano Grátis'}
              </p>
            </div>
          </div>
          
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between px-4 py-2.5 w-full rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isDark ? 'bg-[#00ff88]' : 'bg-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 w-full rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-background to-background pointer-events-none"></div>
        
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/30 backdrop-blur-md flex items-center justify-between px-4 md:px-8 relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors md:hidden"
            >
              <PanelLeft className="w-6 h-6" />
            </button>
            <PanelLeftClose className="w-5 h-5 text-muted-foreground hidden md:block" />
            <span className="font-medium text-foreground/80">Matrix Finance</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
