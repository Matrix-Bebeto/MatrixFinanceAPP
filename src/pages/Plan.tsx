import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Check } from "lucide-react"

export function Plan() {
  const features = [
    "Acesso completo à plataforma",
    "Suporte prioritário 24/7",
    "Integrações ilimitadas",
    "Relatórios avançados",
    "Gestão de equipe",
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Escolha seu Plano</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Obtenha acesso a todos os recursos da plataforma Matrix Finance e impulsione seus resultados.
        </p>
      </div>

      <div className="flex justify-center mt-12">
        <Card className="w-full max-w-md border-primary shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Recomendado
          </div>
          <CardHeader className="text-center pb-8 pt-8">
            <CardTitle className="text-2xl font-bold">Plano Premium</CardTitle>
            <CardDescription className="mt-2">Tudo que você precisa para crescer</CardDescription>
            <div className="mt-6 flex items-baseline justify-center gap-x-2">
              <span className="text-5xl font-bold tracking-tight text-foreground">VALOR DESEJADO</span>
              <span className="text-sm font-semibold leading-6 text-muted-foreground">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="px-8">
            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-6">
            <Button 
              className="w-full h-12 text-base font-medium bg-primary hover:bg-primary-hover text-white shadow-md transition-all hover:shadow-lg"
              onClick={() => window.open("COLE O SEU LINK DE PAGAMENTO AQUI", "_blank")}
            >
              Adquira já
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
