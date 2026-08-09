import { Loader2 } from "lucide-react"
export function PageLoader() { return <div className="flex min-h-64 items-center justify-center" role="status" aria-live="polite"><Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" aria-hidden="true" /><span className="sr-only">Carregando</span></div> }
