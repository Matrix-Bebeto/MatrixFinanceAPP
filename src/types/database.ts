export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string | null; nome: string | null; avatar_url: string | null; created_at: string; updated_at: string; phone: string | null; whatsapp: string | null; email: string | null; ativo: boolean | null; assinaturaid: string | null; customerid: string | null; stripe_customer_id: string | null; subscription_id: string | null; subscription_status: string | null; subscription_end_date: string | null }
        Insert: { id: string; username?: string | null; nome?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string; phone?: string | null; whatsapp?: string | null; email?: string | null }
        Update: { nome?: string | null; avatar_url?: string | null; updated_at?: string; phone?: string | null; whatsapp?: string | null }
        Relationships: []
      }
      categorias: {
        Row: { id: string; userid: string; nome: string; tags: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; userid: string; nome: string; tags?: string | null; created_at?: string; updated_at?: string }
        Update: { nome?: string; tags?: string | null; updated_at?: string }
        Relationships: []
      }
      lembretes: {
        Row: { id: number; created_at: string; userid: string; descricao: string | null; data: string | null; due_date: string; valor: number | null; hora: string | null; status: string; notificado: boolean | null }
        Insert: { id?: number; created_at?: string; userid: string; descricao?: string | null; data?: string | null; due_date?: string; valor?: number | null; hora?: string | null; status?: string | null; notificado?: boolean | null }
        Update: { descricao?: string | null; data?: string | null; due_date?: string; valor?: number | null; hora?: string | null; status?: string | null; notificado?: boolean | null }
        Relationships: []
      }
      transacoes: {
        Row: { id: number; created_at: string; transaction_date: string; quando: string | null; estabelecimento: string | null; valor: number; detalhes: string | null; tipo: "receita" | "despesa"; userid: string; category_id: string }
        Insert: { id?: number; created_at?: string; transaction_date?: string; quando?: string | null; estabelecimento?: string | null; valor: number; detalhes?: string | null; tipo: "receita" | "despesa"; userid: string; category_id: string }
        Update: { transaction_date?: string; quando?: string | null; estabelecimento?: string | null; valor?: number; detalhes?: string | null; tipo?: "receita" | "despesa"; category_id?: string }
        Relationships: [{ foreignKeyName: "transacoes_category_owner_fkey"; columns: ["category_id", "userid"]; isOneToOne: false; referencedRelation: "categorias"; referencedColumns: ["id", "userid"] }]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_transaction_summary: { Args: { p_start_date?: string | null; p_end_date?: string | null }; Returns: { receitas: number; despesas: number; saldo: number; total_count: number }[] }
      merge_user_categories: { Args: { p_target_category_id: string; p_source_category_ids: string[] }; Returns: number }
      assign_transactions_category: { Args: { p_transaction_ids: number[]; p_category_id: string }; Returns: number }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Category = Database["public"]["Tables"]["categorias"]["Row"]
export type Reminder = Database["public"]["Tables"]["lembretes"]["Row"]
export type Transaction = Database["public"]["Tables"]["transacoes"]["Row"]
export type TransactionWithCategory = Transaction & { categorias: Pick<Category, "nome"> | null }
