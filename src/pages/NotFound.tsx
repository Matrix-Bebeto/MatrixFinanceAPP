import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="glass-card max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm font-semibold text-[#00aa5c] dark:text-[#00ff88]">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">O endereço informado não existe ou foi movido.</p>
        <Link to="/" className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#00ff88] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#00e87b]">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Voltar ao dashboard
        </Link>
      </section>
    </main>
  )
}
