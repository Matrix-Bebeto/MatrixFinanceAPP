import { lazy, Suspense, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { supabase } from "./lib/supabase"
import { PageLoader } from "./components/PageLoader"

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })))
const Layout = lazy(() => import("./components/Layout").then((m) => ({ default: m.Layout })))
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })))
const ResetPassword = lazy(() => import("./pages/ResetPassword").then((m) => ({ default: m.ResetPassword })))
const VisualV2 = lazy(() => import("./pages/VisualV2").then((m) => ({ default: m.VisualV2 })))
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })))
const Profile = lazy(() => import("./pages/Profile").then((m) => ({ default: m.Profile })))
const Plan = lazy(() => import("./pages/Plan").then((m) => ({ default: m.Plan })))
const Subscription = lazy(() => import("./pages/Subscription").then((m) => ({ default: m.Subscription })))
const Transactions = lazy(() => import("./pages/Transactions").then((m) => ({ default: m.Transactions })))
const Categories = lazy(() => import("./pages/Categories").then((m) => ({ default: m.Categories })))
const Reports = lazy(() => import("./pages/Reports").then((m) => ({ default: m.Reports })))
const Reminders = lazy(() => import("./pages/Reminders").then((m) => ({ default: m.Reminders })))

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error && import.meta.env.DEV) console.error(error)
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  if (loading) return <PageLoader />

  return <BrowserRouter><Suspense fallback={<PageLoader />}><Routes>
    <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/visual-v2" element={<VisualV2 />} />
    <Route element={session ? <Layout /> : <Navigate to="/login" replace />}>
      <Route index element={<Dashboard />} />
      <Route path="transactions" element={<Transactions />} />
      <Route path="categories" element={<Categories />} />
      <Route path="reports" element={<Reports />} />
      <Route path="reminders" element={<Reminders />} />
      <Route path="profile" element={<Profile />} />
      <Route path="plan" element={<Plan />} />
      <Route path="subscription" element={<Subscription />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense></BrowserRouter>
}
