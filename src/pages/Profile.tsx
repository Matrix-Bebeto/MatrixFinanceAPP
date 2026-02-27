import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Phone, CheckCircle2, AlertCircle, User, Mail, Link as LinkIcon, Loader2, Save } from "lucide-react"
import { supabase } from "@/src/lib/supabase"

export function Profile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    phone: "",
    whatsapp: "",
    avatar_url: ""
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (profile) {
        setFormData({
          nome: profile.nome || "",
          email: profile.email || user.email || "",
          phone: profile.phone || "",
          whatsapp: profile.whatsapp || "",
          avatar_url: profile.avatar_url || ""
        })
      } else {
        setFormData(prev => ({ ...prev, email: user.email || "" }))
      }
    } catch (error: any) {
      console.error("Erro ao carregar perfil:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setStatus("idle")
    
    try {
      const payload = {
        id: userId,
        nome: formData.nome,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })

      if (error) throw error
      
      setStatus("success")
      setStatusMessage("Perfil atualizado com sucesso!")
      window.dispatchEvent(new CustomEvent('profileUpdated'))
      
      // Hide success message after 3 seconds
      setTimeout(() => setStatus("idle"), 3000)
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error)
      setStatus("error")
      setStatusMessage("Erro ao atualizar perfil. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 glass-panel rounded-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Perfil do Usuário</h1>
        <p className="text-muted-foreground mt-2">Gerencie suas informações pessoais e de contato.</p>
      </div>

      <Card className="glass-card border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
        <CardHeader className="border-b border-border pb-6">
          <CardTitle className="text-xl text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-[#00ff88]" />
            Informações Pessoais
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Atualize seus dados para manter sua conta segura.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-2xl border-2 border-[#00ff88]/30 shadow-[0_0_15px_rgba(0,255,136,0.1)] overflow-hidden shrink-0">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (formData.nome || formData.email || "U").substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="space-y-2 flex-1 w-full">
                <label className="text-sm font-medium text-foreground">URL da Foto de Perfil</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    className="pl-10 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    className="pl-10 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    disabled
                    className="pl-10 bg-foreground/5 border-border text-foreground/50 rounded-xl cursor-not-allowed"
                    value={formData.email}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado aqui.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+55 (11) 99999-9999"
                    className="pl-10 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#00ff88]/70" />
                  <Input
                    type="tel"
                    placeholder="+55 (11) 99999-9999"
                    className="pl-10 bg-foreground/5 border-border text-foreground rounded-xl focus-visible:ring-[#00ff88]"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-[#00ff88] bg-[#00ff88]/10 p-4 rounded-xl border border-[#00ff88]/20 animate-in fade-in">
                <CheckCircle2 className="h-5 w-5" />
                {statusMessage}
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 text-sm text-[#ff3366] bg-[#ff3366]/10 p-4 rounded-xl border border-[#ff3366]/20 animate-in fade-in">
                <AlertCircle className="h-5 w-5" />
                {statusMessage}
              </div>
            )}

            <div className="pt-6 border-t border-border flex justify-end">
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-semibold rounded-xl px-8 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
