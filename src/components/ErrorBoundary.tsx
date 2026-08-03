import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./ui/button"

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { if (import.meta.env.DEV) console.error(error, info) }
  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="min-h-screen grid place-items-center bg-background p-6 text-foreground"><section className="glass-card max-w-md rounded-2xl p-8 text-center" role="alert"><AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[#ff3366]" aria-hidden="true" /><h1 className="text-xl font-bold">Não foi possível abrir esta tela</h1><p className="mt-2 text-sm text-muted-foreground">Seus dados estão seguros. Recarregue a página para tentar novamente.</p><Button className="mt-6" onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Recarregar</Button></section></main>
  }
}
