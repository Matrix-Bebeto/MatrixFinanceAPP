import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Receipt, Calendar, CreditCard, Activity, ArrowRight, Loader2, Sparkles, AlertTriangle, X } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { useNavigate } from "react-router-dom"

export function Subscription() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  const fetchSubscriptionInfo = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    } catch (err) {
      console.error("Erro ao carregar informações da assinatura:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCanceling(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Update subscription status in profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          subscription_status: 'inactive',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setShowCancelModal(false)
      window.dispatchEvent(new CustomEvent('profileUpdated'))
      await fetchSubscriptionInfo()
    } catch (e: any) {
      alert("Erro ao cancelar assinatura: " + e.message)
    } finally {
      setCanceling(false)
    }
  }

  useEffect(() => {
    fetchSubscriptionInfo()
  }, [])

  const isPro = profile?.subscription_status === 'active'

  // Calculate next billing date (30 days from today)
  const getNextBillingDate = () => {
    const today = new Date()
    today.setDate(today.getDate() + 30)
    return today.toLocaleDateString('pt-BR')
  }

  // Calculate last billing date (today)
  const getLastBillingDate = () => {
    const today = new Date()
    return today.toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-8 max-w-3xl pb-12 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sua Assinatura</h1>
        <p className="text-muted-foreground mt-2">Gerencie os detalhes do seu plano e histórico de pagamentos.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 glass-panel rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
        </div>
      ) : isPro ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="glass-card border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
            <CardHeader className="border-b border-border pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#00ff88]" />
                    Plano Ativo
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Informações atuais sobre sua assinatura Pro.
                  </CardDescription>
                </div>
                <span className="inline-flex items-center rounded-full bg-[#00ff88]/10 px-3 py-1 text-xs font-bold text-[#00ff88] border border-[#00ff88]/20 uppercase tracking-wider">
                  Premium
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="p-2.5 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl text-[#00ff88]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                    <p className="text-base font-bold text-foreground">Ativa (Renovação Automática)</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Mensal</p>
                    <p className="text-base font-bold text-foreground">R$ 29,90</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próxima Cobrança</p>
                    <p className="text-base font-bold text-foreground">{getNextBillingDate()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-foreground/5">
                  <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Último Pagamento</p>
                    <p className="text-base font-bold text-foreground">{getLastBillingDate()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border flex justify-end">
                <Button 
                  variant="outline" 
                  className="text-[#ff3366] border-[#ff3366]/30 bg-[#ff3366]/5 hover:bg-[#ff3366]/10 rounded-xl px-6 h-11"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancelar Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="glass-card border-none text-center py-12 px-6 animate-in fade-in duration-300">
          <CardContent className="space-y-6">
            <div className="w-16 h-16 bg-muted/20 border border-border rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <Activity className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-foreground">Plano Grátis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você está utilizando a versão básica do Matrix Finance. Faça o upgrade para o Plano Pro para desbloquear relatórios ilimitados, suporte prioritário e exportações avançadas.
              </p>
            </div>
            <div className="pt-4">
              <Button 
                className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.2)] px-8 h-12 inline-flex items-center gap-2"
                onClick={() => navigate("/plan")}
              >
                Escolher um Plano
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl glass-card border-border animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ff3366]" />
                <CardTitle className="text-foreground text-lg">Cancelar Assinatura</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowCancelModal(false)} 
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tem certeza de que deseja cancelar sua assinatura Premium? Você perderá o acesso aos relatórios avançados de PDF e suporte priorizado ao final do período de faturamento.
              </p>
              <div className="pt-4 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCancelModal(false)} 
                  className="rounded-xl border-border text-foreground hover:bg-muted flex-1 h-11"
                >
                  Manter Assinatura
                </Button>
                <Button 
                  type="button" 
                  disabled={canceling}
                  onClick={handleCancelSubscription}
                  className="rounded-xl bg-[#ff3366] hover:bg-[#ff3366]/90 text-white font-semibold flex-1 h-11"
                >
                  {canceling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cancelando...
                    </>
                  ) : (
                    "Confirmar Cancelamento"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
