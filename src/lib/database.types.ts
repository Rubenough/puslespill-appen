export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      borrow_requests: {
        Row: {
          created_at: string
          id: string
          item_id: string
          loan_id: string | null
          message: string | null
          owner_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          loan_id?: string | null
          message?: string | null
          owner_id: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          loan_id?: string | null
          message?: string | null
          owner_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          brand: string | null
          created_at: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          owner_id: string
          piece_count: number | null
          player_count: number | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          owner_id: string
          piece_count?: number | null
          player_count?: number | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          owner_id?: string
          piece_count?: number | null
          player_count?: number | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_name: string
          borrower_user_id: string | null
          due_at: string | null
          id: string
          is_public: boolean
          item_id: string
          loaned_at: string
          owner_id: string
          owner_return_note: string | null
          owner_return_requested_at: string | null
          return_requested_at: string | null
          returned_at: string | null
        }
        Insert: {
          borrower_name: string
          borrower_user_id?: string | null
          due_at?: string | null
          id?: string
          is_public?: boolean
          item_id: string
          loaned_at?: string
          owner_id: string
          owner_return_note?: string | null
          owner_return_requested_at?: string | null
          return_requested_at?: string | null
          returned_at?: string | null
        }
        Update: {
          borrower_name?: string
          borrower_user_id?: string | null
          due_at?: string | null
          id?: string
          is_public?: boolean
          item_id?: string
          loaned_at?: string
          owner_id?: string
          owner_return_note?: string | null
          owner_return_requested_at?: string | null
          return_requested_at?: string | null
          returned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          initials: string | null
          invite_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          initials?: string | null
          invite_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          initials?: string | null
          invite_code?: string | null
        }
        Relationships: []
      }
      session_images: {
        Row: {
          captured_at: string
          id: string
          image_url: string
          note: string | null
          session_id: string
        }
        Insert: {
          captured_at?: string
          id?: string
          image_url: string
          note?: string | null
          session_id: string
        }
        Update: {
          captured_at?: string
          id?: string
          image_url?: string
          note?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_images_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          profile_id: string
          session_id: string
        }
        Insert: {
          profile_id: string
          session_id: string
        }
        Update: {
          profile_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_by: string
          guest_names: string[]
          id: string
          image_url: string | null
          item_id: string
          notes: string | null
          progress_pct: number | null
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_by: string
          guest_names?: string[]
          id?: string
          image_url?: string | null
          item_id: string
          notes?: string | null
          progress_pct?: number | null
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string
          guest_names?: string[]
          id?: string
          image_url?: string | null
          item_id?: string
          notes?: string | null
          progress_pct?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { p_code: string }
        Returns: {
          avatar_url: string
          friend_id: string
          full_name: string
        }[]
      }
      approve_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          id: string
          item_id: string
          loan_id: string | null
          message: string | null
          owner_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "borrow_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      cancel_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          id: string
          item_id: string
          loan_id: string | null
          message: string | null
          owner_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "borrow_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          id: string
          item_id: string
          loan_id: string | null
          message: string | null
          owner_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "borrow_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_invite_code: { Args: never; Returns: string }
      get_my_invite_code: { Args: never; Returns: string }
      mark_loan_returned: {
        Args: { p_loan_id: string }
        Returns: {
          borrower_name: string
          borrower_user_id: string | null
          due_at: string | null
          id: string
          is_public: boolean
          item_id: string
          loaned_at: string
          owner_id: string
          owner_return_note: string | null
          owner_return_requested_at: string | null
          return_requested_at: string | null
          returned_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_to_borrow: {
        Args: { p_item_id: string; p_message?: string }
        Returns: {
          created_at: string
          id: string
          item_id: string
          loan_id: string | null
          message: string | null
          owner_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "borrow_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unmark_loan_returned: {
        Args: { p_loan_id: string }
        Returns: {
          borrower_name: string
          borrower_user_id: string | null
          due_at: string | null
          id: string
          is_public: boolean
          item_id: string
          loaned_at: string
          owner_id: string
          owner_return_note: string | null
          owner_return_requested_at: string | null
          return_requested_at: string | null
          returned_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
