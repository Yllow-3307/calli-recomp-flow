export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          weight: number;
          height: number;
          goal: string | null;
          days_per_week: number;
          level: "débutant" | "intermédiaire" | "avancé";
          equipment: string[] | null;
          onboarded: boolean;
          start_date: string | null;
          updated_at: string | null;
          age: number | null;
          sex: "homme" | "femme" | null;
          capacities: Json;
          plan: Json | null;
          training_days: Json;
          exercise_swaps: Json;
          favorite_meals: Json;
        };
        Insert: {
          id: string;
          weight?: number;
          height?: number;
          goal?: string | null;
          days_per_week?: number;
          level?: "débutant" | "intermédiaire" | "avancé";
          equipment?: string[] | null;
          onboarded?: boolean;
          start_date?: string | null;
          updated_at?: string | null;
          age?: number | null;
          sex?: "homme" | "femme" | null;
          capacities?: Json;
          plan?: Json | null;
          training_days?: Json;
          exercise_swaps?: Json;
          favorite_meals?: Json;
        };
        Update: {
          id?: string;
          weight?: number;
          height?: number;
          goal?: string | null;
          days_per_week?: number;
          level?: "débutant" | "intermédiaire" | "avancé";
          equipment?: string[] | null;
          onboarded?: boolean;
          start_date?: string | null;
          updated_at?: string | null;
          age?: number | null;
          sex?: "homme" | "femme" | null;
          capacities?: Json;
          plan?: Json | null;
          training_days?: Json;
          exercise_swaps?: Json;
          favorite_meals?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      skill_states: {
        Row: {
          user_id: string;
          skill_id: string;
          status: "non commencé" | "en cours" | "proche" | "validé" | "auto" | null;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          skill_id: string;
          status?: "non commencé" | "en cours" | "proche" | "validé" | "auto" | null;
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          skill_id?: string;
          status?: "non commencé" | "en cours" | "proche" | "validé" | "auto" | null;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "skill_states_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_templates: {
        Row: {
          id: string;
          day_of_week: number;
          title: string;
          category: string;
          duration_min: number;
          description: string | null;
          warmup: Json;
          optional_cardio: Json;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          title: string;
          category: string;
          duration_min: number;
          description?: string | null;
          warmup?: Json;
          optional_cardio?: Json;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          day_of_week?: number;
          title?: string;
          category?: string;
          duration_min?: number;
          description?: string | null;
          warmup?: Json;
          optional_cardio?: Json;
          created_at?: string | null;
        };
        Relationships: [];
      };
      exercise_templates: {
        Row: {
          id: string;
          workout_template_id: string;
          name: string;
          muscle_group: string | null;
          type: "reps" | "time" | "distance";
          sets: number;
          reps_min: number | null;
          reps_max: number | null;
          rest_seconds: number;
          instructions: string | null;
          alternatives: Json;
          sort_order: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          workout_template_id: string;
          name: string;
          muscle_group?: string | null;
          type: "reps" | "time" | "distance";
          sets?: number;
          reps_min?: number | null;
          reps_max?: number | null;
          rest_seconds?: number;
          instructions?: string | null;
          alternatives?: Json;
          sort_order?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          workout_template_id?: string;
          name?: string;
          muscle_group?: string | null;
          type?: "reps" | "time" | "distance";
          sets?: number;
          reps_min?: number | null;
          reps_max?: number | null;
          rest_seconds?: number;
          instructions?: string | null;
          alternatives?: Json;
          sort_order?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_templates_workout_template_id_fkey";
            columns: ["workout_template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          day_key: string;
          day_title: string;
          duration: number;
          rpe: number | null;
          filmed: boolean | null;
          notes: string | null;
          total_volume: number | null;
          success_count: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          day_key: string;
          day_title: string;
          duration: number;
          rpe?: number | null;
          filmed?: boolean | null;
          notes?: string | null;
          total_volume?: number | null;
          success_count?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          day_key?: string;
          day_title?: string;
          duration?: number;
          rpe?: number | null;
          filmed?: boolean | null;
          notes?: string | null;
          total_volume?: number | null;
          success_count?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_logs: {
        Row: {
          id: string;
          session_id: string;
          ex_id: string;
          name: string;
          kind: "reps" | "time" | "distance";
          target_min: number | null;
          target_max: number | null;
          sets: Json;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          ex_id: string;
          name: string;
          kind: "reps" | "time" | "distance";
          target_min?: number | null;
          target_max?: number | null;
          sets?: Json;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          ex_id?: string;
          name?: string;
          kind?: "reps" | "time" | "distance";
          target_min?: number | null;
          target_max?: number | null;
          sets?: Json;
          notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      cardio_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          type: "course" | "rameur" | "natation" | "vélo";
          distance: number | null;
          duration: number;
          pace: string | null;
          zone: "zone2" | "intervalles" | "autre" | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          type: "course" | "rameur" | "natation" | "vélo";
          distance?: number | null;
          duration: number;
          pace?: string | null;
          zone?: "zone2" | "intervalles" | "autre" | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          type?: "course" | "rameur" | "natation" | "vélo";
          distance?: number | null;
          duration?: number;
          pace?: string | null;
          zone?: "zone2" | "intervalles" | "autre" | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cardio_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight: number | null;
          waist: number | null;
          sleep: number | null;
          energy: number | null;
          fatigue: number | null;
          photo_note: string | null;
          photo_face_path: string | null;
          photo_profile_path: string | null;
          photo_back_path: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          weight?: number | null;
          waist?: number | null;
          sleep?: number | null;
          energy?: number | null;
          fatigue?: number | null;
          photo_note?: string | null;
          photo_face_path?: string | null;
          photo_profile_path?: string | null;
          photo_back_path?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          weight?: number | null;
          waist?: number | null;
          sleep?: number | null;
          energy?: number | null;
          fatigue?: number | null;
          photo_note?: string | null;
          photo_face_path?: string | null;
          photo_profile_path?: string | null;
          photo_back_path?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "body_metrics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          name: string;
          kcal: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          name: string;
          kcal: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          name?: string;
          kcal?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hydration_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          liters: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          liters?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          liters?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hydration_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_tests: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          test_id: string;
          value: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          test_id: string;
          value: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          test_id?: string;
          value?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "progress_tests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
