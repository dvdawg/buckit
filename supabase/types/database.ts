export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string
          handle: string | null
          full_name: string | null
          avatar_url: string | null
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          handle?: string | null
          full_name?: string | null
          avatar_url?: string | null
          points?: number
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          handle?: string | null
          full_name?: string | null
          avatar_url?: string | null
          points?: number
          created_at?: string
        }
      }
      buckets: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          visibility: 'private' | 'friends' | 'public'
          is_collaborative: boolean
          cover_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          visibility?: 'private' | 'friends' | 'public'
          is_collaborative?: boolean
          cover_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          visibility?: 'private' | 'friends' | 'public'
          is_collaborative?: boolean
          cover_url?: string | null
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          bucket_id: string
          owner_id: string
          title: string
          description: string | null
          location_name: string | null
          location_point: unknown | null
          deadline: string | null
          tags: string[] | null
          price_min: number | null
          price_max: number | null
          difficulty: number | null
          visibility: 'private' | 'friends' | 'public'
          embedding: number[] | null
          created_at: string
          tsv: string
        }
        Insert: {
          id?: string
          bucket_id: string
          owner_id: string
          title: string
          description?: string | null
          location_name?: string | null
          location_point?: unknown | null
          deadline?: string | null
          tags?: string[] | null
          price_min?: number | null
          price_max?: number | null
          difficulty?: number | null
          visibility?: 'private' | 'friends' | 'public'
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          bucket_id?: string
          owner_id?: string
          title?: string
          description?: string | null
          location_name?: string | null
          location_point?: unknown | null
          deadline?: string | null
          tags?: string[] | null
          price_min?: number | null
          price_max?: number | null
          difficulty?: number | null
          visibility?: 'private' | 'friends' | 'public'
          embedding?: number[] | null
          created_at?: string
        }
      }
      bucket_collaborators: {
        Row: {
          bucket_id: string
          user_id: string
          role: string
        }
        Insert: {
          bucket_id: string
          user_id: string
          role?: string
        }
        Update: {
          bucket_id?: string
          user_id?: string
          role?: string
        }
      }
      completions: {
        Row: {
          id: string
          item_id: string
          user_id: string
          photo_url: string | null
          caption: string | null
          tagged_friend_ids: string[] | null
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          user_id: string
          photo_url?: string | null
          caption?: string | null
          tagged_friend_ids?: string[] | null
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          user_id?: string
          photo_url?: string | null
          caption?: string | null
          tagged_friend_ids?: string[] | null
          verified?: boolean
          created_at?: string
        }
      }
      friendships: {
        Row: {
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
        }
        Insert: {
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
        }
        Update: {
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
        }
      }
      feed_events: {
        Row: {
          id: number
          actor_id: string
          verb: string
          object_type: string
          object_id: string
          audience: string
          created_at: string
        }
        Insert: {
          id?: number
          actor_id: string
          verb: string
          object_type: string
          object_id: string
          audience?: string
          created_at?: string
        }
        Update: {
          id?: number
          actor_id?: string
          verb?: string
          object_type?: string
          object_id?: string
          audience?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      me_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      home_feed: {
        Args: {
          limit_rows?: number
          offset_rows?: number
        }
        Returns: {
          id: number
          actor_id: string
          verb: string
          object_type: string
          object_id: string
          audience: string
          created_at: string
        }[]
      }
      create_bucket: {
        Args: {
          p_title: string
          p_description?: string
          p_visibility?: string
        }
        Returns: string
      }
      create_item: {
        Args: {
          p_bucket_id: string
          p_title: string
          p_description?: string
          p_url?: string
        }
        Returns: string
      }
      complete_item: {
        Args: {
          p_item_id: string
          p_photo_url?: string
          p_caption?: string
          p_tagged_friend_ids?: string[]
        }
        Returns: string
      }
      send_friend_request: {
        Args: {
          p_friend_id: string
        }
        Returns: boolean
      }
      accept_friend_request: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
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
