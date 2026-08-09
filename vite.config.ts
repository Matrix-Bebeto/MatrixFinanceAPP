import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const
  const missing = required.filter((key) => !env[key])

  if (mode === "production" && missing.length > 0) {
    throw new Error(`Configuracao de producao ausente: ${missing.join(", ")}`)
  }

  if (env.VITE_SUPABASE_ANON_KEY?.startsWith("sb_secret_")) {
    throw new Error("Use somente uma chave publicavel do Supabase no cliente web.")
  }

  return {
    base: "./",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(__dirname, ".") } },
    build: {
      sourcemap: false,
      target: "es2022",
    },
  }
})
