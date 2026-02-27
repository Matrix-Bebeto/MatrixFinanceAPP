import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Login } from "./pages/Login"
import { Dashboard } from "./pages/Dashboard"
import { Profile } from "./pages/Profile"
import { Plan } from "./pages/Plan"
import { Subscription } from "./pages/Subscription"
import { Transactions } from "./pages/Transactions"
import { Categories } from "./pages/Categories"
import { Reports } from "./pages/Reports"
import { Reminders } from "./pages/Reminders"
import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        <Route element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/subscription" element={<Subscription />} />
        </Route>
      </Routes>
    </Router>
  )
}
