import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Receipt, Calendar, CreditCard, Activity } from "lucide-react"

export function Subscription() {
  const [loading, setLoading] = useState(false)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptionInfo = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // COLE A URL DO WEBHOOK DE INFORMAÇÕES DE ASSINATURA AQUI
      const webhookUrl = "COLE A URL DO WEBHOOK DE INFORMAÇÕES DE ASSINATURA AQUI"
      
      // Basic Auth
      const username = "USUARIO"
      const password = "SENHA"
      const headers = new Headers()
      headers.set('Authorization', 'Basic ' + btoa(username + ":" + password))
      headers.set('Content-Type', 'application/json')

      // Simulated API call for preview purposes
      // In production, uncomment the fetch call below
      /*
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: headers,
      })
      
      if (!response.ok) throw new Error('Falha ao buscar informações')
      const data = await response.json()
      setSubscriptionInfo(data)
      */
      
      // Simulate network delay and mock data
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSubscriptionInfo({
        status: "Ativa",
        plan: "Premium",
        nextBilling: "15/11/2023",
        amount: "VALOR DESEJADO",
        lastPayment: "15/10/2023"
      })
      
    } catch (err) {
      setError("Erro ao carregar informações da assinatura.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptionInfo()
  }, [])

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sua Assinatura</h1>
        <p className="text-muted-foreground mt-2">Gerencie os detalhes do seu plano e histórico de pagamentos.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalhes do Plano</CardTitle>
              <CardDescription>
                Informações atuais sobre sua assinatura.
              </CardDescription>
            </div>
            {subscriptionInfo?.status === "Ativa" && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Ativa
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-500/10 p-4 rounded-md border border-red-500/20">
              {error}
              <Button 
                variant="outline" 
                className="mt-4 w-full"
                onClick={fetchSubscriptionInfo}
              >
                Tentar Novamente
              </Button>
            </div>
          ) : subscriptionInfo ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/50">
                <div className="p-2 bg-background rounded-md shadow-sm">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plano Atual</p>
                  <p className="text-lg font-semibold text-foreground">{subscriptionInfo.plan}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/50">
                <div className="p-2 bg-background rounded-md shadow-sm">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Mensal</p>
                  <p className="text-lg font-semibold text-foreground">{subscriptionInfo.amount}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/50">
                <div className="p-2 bg-background rounded-md shadow-sm">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Próxima Cobrança</p>
                  <p className="text-lg font-semibold text-foreground">{subscriptionInfo.nextBilling}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/50">
                <div className="p-2 bg-background rounded-md shadow-sm">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Último Pagamento</p>
                  <p className="text-lg font-semibold text-foreground">{subscriptionInfo.lastPayment}</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
