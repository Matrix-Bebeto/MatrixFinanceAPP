import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Check, CreditCard, QrCode, Sparkles, CheckCircle2, X, ShieldCheck, Loader2 } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { useNavigate } from "react-router-dom"

export function Plan() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const features = [
    "Acesso completo a todas as ferramentas",
    "Suporte prioritário 24/7",
    "Categorias e transações ilimitadas",
    "Relatórios avançados com exportação em PDF",
    "Sincronização em nuvem segura e rápida",
    "Acesso antecipado a novos recursos",
  ]

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSimulatePayment = async () => {
    setProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update subscription status in profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSuccess(true)
      window.dispatchEvent(new CustomEvent('profileUpdated'))
    } catch (e: any) {
      alert("Erro ao processar pagamento: " + e.message)
    } finally {
      setProcessing(false)
    }
  }

  const isPro = profile?.subscription_status === 'active'

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 relative">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Melhore suas Finanças com o <span className="text-[#00ff88]">Pro</span>
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-base sm:text-lg">
          Obtenha acesso a todos os recursos da plataforma Matrix Finance e tenha controle total dos seus gastos.
        </p>
      </div>

      <div className="flex justify-center mt-12">
        <Card className="w-full max-w-md glass-card border-none relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 bg-[#00ff88] text-black text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
            Melhor Escolha
          </div>
          <CardHeader className="text-center pb-8 pt-8">
            <div className="inline-flex items-center gap-1 text-[#00ff88] text-sm font-semibold tracking-wider uppercase mb-2">
              <Sparkles className="w-4 h-4" />
              Acesso Ilimitado
            </div>
            <CardTitle className="text-3xl font-extrabold text-foreground">Plano Premium</CardTitle>
            <CardDescription className="mt-2 text-muted-foreground text-sm">Controle completo da sua vida financeira</CardDescription>
            <div className="mt-6 flex items-baseline justify-center gap-x-2">
              <span className="text-5xl font-extrabold tracking-tight text-foreground">R$ 29,90</span>
              <span className="text-sm font-semibold leading-6 text-muted-foreground">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="px-8">
            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#00ff88]/10 flex items-center justify-center border border-[#00ff88]/20 shrink-0">
                    <Check className="h-3 w-3 text-[#00ff88]" />
                  </div>
                  <span className="text-sm text-muted-foreground leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-6">
            {isPro ? (
              <Button 
                className="w-full h-12 text-base font-semibold bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 rounded-xl hover:bg-[#00ff88]/20 transition-all cursor-default"
                onClick={() => navigate("/subscription")}
              >
                Sua Assinatura está Ativa
              </Button>
            ) : (
              <Button 
                className="w-full h-12 text-base font-semibold bg-[#00ff88] hover:bg-[#00ff88]/90 text-black shadow-[0_0_20px_rgba(0,255,136,0.25)] hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all rounded-xl"
                onClick={() => setCheckoutOpen(true)}
              >
                Assinar Premium
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Checkout Simulator Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl glass-card border-border animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00ff88]" />
                <CardTitle className="text-foreground text-lg">Checkout Simulado</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setCheckoutOpen(false)
                  setSuccess(false)
                }} 
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {success ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto text-[#00ff88] animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
                    <p className="text-sm text-muted-foreground">Parabéns! Você agora é um membro Premium da Matrix Finance.</p>
                  </div>
                  <div className="pt-4">
                    <Button 
                      className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl w-full"
                      onClick={() => {
                        setCheckoutOpen(false)
                        setSuccess(false)
                        navigate("/")
                      }}
                    >
                      Ir para o Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-foreground/5 border border-border rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Plano Premium</p>
                      <p className="text-xs text-muted-foreground">Cobrança mensal recorrente</p>
                    </div>
                    <span className="text-lg font-bold text-foreground">R$ 29,90</span>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("pix")}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === "pix" 
                            ? "border-[#00ff88] bg-[#00ff88]/5 text-[#00ff88]" 
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === "card" 
                            ? "border-[#00ff88] bg-[#00ff88]/5 text-[#00ff88]" 
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Cartão (Simulado)
                      </button>
                    </div>
                  </div>

                  {paymentMethod === "pix" ? (
                    <div className="space-y-4 p-4 border border-border rounded-xl bg-foreground/5 text-center">
                      <div className="w-32 h-32 bg-white p-2 rounded-lg mx-auto flex items-center justify-center border border-border">
                        {/* Mock QR Code representation */}
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black rounded flex items-center justify-center text-[10px] text-white font-mono font-bold leading-none p-1">
                          MATRIX_PIX_MOCK_QR_CODE
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Escaneie o QR Code acima ou use o código PIX copia e cola. O pagamento será simulado instantaneamente ao clicar abaixo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 border border-border rounded-xl bg-foreground/5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Dados do Cartão Simulado</label>
                        <input 
                          disabled 
                          type="text" 
                          value="•••• •••• •••• 4242" 
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground/50 cursor-not-allowed" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Validade</label>
                          <input disabled type="text" value="12/30" className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground/50 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">CVC</label>
                          <input disabled type="text" value="***" className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground/50 cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCheckoutOpen(false)} 
                      className="rounded-xl border-border text-foreground hover:bg-muted flex-1 h-11"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="button" 
                      disabled={processing}
                      onClick={handleSimulatePayment}
                      className="rounded-xl bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold flex-1 h-11"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        "Confirmar Pagamento"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
