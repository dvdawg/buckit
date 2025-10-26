import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BucketCollaborator {
  id: string;
  user_id: string;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  role: 'collaborator' | 'admin';
  invited_at: string;
  accepted_at: string | null;
}

export function useBucketCollaborators() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCollaborators = useCallback(async (bucketId: string): Promise<BucketCollaborator[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_bucket_collaborators', {
        p_bucket_id: bucketId
      });

      if (error) {
        console.error('Error fetching collaborators:', error);
        setError('Failed to fetch collaborators');
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getCollaborators:', err);
      setError('Failed to fetch collaborators');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addCollaborator = useCallback(async (bucketId: string, userId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('add_bucket_collaborator', {
        p_bucket_id: bucketId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error adding collaborator:', error);
        setError('Failed to add collaborator');
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Error in addCollaborator:', err);
      setError('Failed to add collaborator');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeCollaborator = useCallback(async (bucketId: string, userId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('remove_bucket_collaborator', {
        p_bucket_id: bucketId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error removing collaborator:', error);
        setError('Failed to remove collaborator');
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Error in removeCollaborator:', err);
      setError('Failed to remove collaborator');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getCollaborators,
    addCollaborator,
    removeCollaborator,
  };
}
