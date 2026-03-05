export interface Database {
    public: {
        Tables: {
            todos: {
                Row: {
                    id: string;
                    title: string;
                    is_completed: boolean;
                    user_id: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    is_completed?: boolean;
                    user_id?: string | null;
                    created_at?: string;
                };
                Update: {
                    title?: string;
                    is_completed?: boolean;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'todos_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}
