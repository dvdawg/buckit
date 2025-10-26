import { useState, useEffect } from 'react';
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

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_friends');
      if (error) throw error;
      setFriends(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
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
  };

  const sendFriendRequest = async (friendId: string) => {
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
  };

  const acceptFriendRequest = async (userId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('accept_friend_request', {
        p_user_id: userId
      });
      if (error) throw error;
      await Promise.all([fetchFriends(), fetchFriendRequests()]); // Refresh both
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectFriendRequest = async (userId: string) => {
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
  };

  const unfriend = async (friendId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('unfriend', {
        p_friend_id: friendId
      });
      if (error) throw error;
      await fetchFriends(); // Refresh friends
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfriend');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getFriendCount = async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_friend_count');
      if (error) throw error;
      return data || 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get friend count');
      return 0;
    }
  };

  const getFriendshipStatus = async (userId: string): Promise<string> => {
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
  };

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

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

  const searchUsers = async (searchTerm: string, limit: number = 20) => {
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
  };

  const getUserByHandle = async (handle: string) => {
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
  };

  return {
    searchResults,
    loading,
    error,
    searchUsers,
    getUserByHandle,
  };
}
