import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Friend {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  points: number;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  user_info: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string;
  };
  friend_info: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface UserSearchResult {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  points: number;
  is_friend: boolean;
  friendship_status: 'none' | 'pending' | 'accepted' | 'declined';
}

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_friends');
      if (error) throw error;
      
      // Deduplicate friends by ID to prevent duplicate key errors
      const uniqueFriends = (data || []).reduce((acc: Friend[], friend: Friend) => {
        if (!acc.find(f => f.id === friend.id)) {
          acc.push(friend);
        }
        return acc;
      }, []);
      
      setFriends(uniqueFriends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFriendRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_friend_requests');
      if (error) throw error;
      setFriendRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friend requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendFriendRequest = useCallback(async (friendId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('send_friend_request', {
        p_friend_id: friendId
      });
      if (error) throw error;
      await fetchFriendRequests(); // Refresh requests
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFriendRequests]);

  const acceptFriendRequest = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      console.log('Calling accept_friend_request with p_user_id:', userId);
      const { error } = await supabase.rpc('accept_friend_request', {
        p_user_id: userId
      });
      if (error) {
        console.error('accept_friend_request error:', error);
        throw error;
      }
      console.log('Friend request accepted successfully');
      await Promise.all([fetchFriends(), fetchFriendRequests()]); // Refresh both
    } catch (err) {
      console.error('acceptFriendRequest error:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFriends, fetchFriendRequests]);

  const rejectFriendRequest = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('reject_friend_request', {
        p_user_id: userId
      });
      if (error) throw error;
      await fetchFriendRequests(); // Refresh requests
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject friend request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFriendRequests]);

  const unfriend = useCallback(async (friendId: string) => {
    try {
      setLoading(true);
      console.log('Unfriending user:', friendId);
      const { error } = await supabase.rpc('unfriend', {
        p_friend_id: friendId
      });
      if (error) {
        console.error('Unfriend error:', error);
        throw error;
      }
      console.log('Unfriend successful');
      await fetchFriends(); // Refresh friends
    } catch (err) {
      console.error('Unfriend error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unfriend');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFriends]);

  const getFriendCount = useCallback(async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_friend_count');
      if (error) throw error;
      return data || 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get friend count');
      return 0;
    }
  }, []);

  const getFriendshipStatus = useCallback(async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('get_friendship_status', {
        p_user_id: userId
      });
      if (error) throw error;
      return data || 'none';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get friendship status');
      return 'none';
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, [fetchFriends, fetchFriendRequests]);

  return {
    friends,
    friendRequests,
    loading,
    error,
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
    getFriendCount,
    getFriendshipStatus,
  };
}

export function useUserSearch() {
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (searchTerm: string, limit: number = 20) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_users', {
        search_term: searchTerm,
        limit_count: limit
      });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserByHandle = useCallback(async (handle: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_by_handle', {
        p_handle: handle
      });
      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user by handle');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchResults,
    loading,
    error,
    searchUsers,
    getUserByHandle,
  };
}
