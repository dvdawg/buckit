import { supabase } from './supabase';

export interface RecommendationParams {
  lat: number;
  lon: number;
  radiusKm?: number;
  k?: number;
}

export interface RecommendationItem {
  id: string;
  score: number;
  reasons: {
    trait: number;
    state: number;
    social: number;
    cost: number;
    poprec: number;
  };
}

export interface RecommendationResponse {
  items: RecommendationItem[];
}

export interface EventLogParams {
  itemId: string;
  eventType: 'impression' | 'view' | 'like' | 'save' | 'start' | 'complete' | 'comment' | 'hide' | 'skip';
  strength?: number;
  context?: Record<string, any>;
}

// Get current user ID from auth
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Get the internal user ID from the users table
  const { data: userData, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();
    
  if (error || !userData) {
    throw new Error('User not found in database');
  }
  
  return userData.id;
}

// Fetch recommendations from the Edge Function
export async function fetchRecommendations(params: RecommendationParams): Promise<RecommendationResponse> {
  try {
    const userId = await getCurrentUserId();
    
    const response = await supabase.functions.invoke('recommend', {
      body: {
        userId,
        lat: params.lat,
        lon: params.lon,
        radiusKm: params.radiusKm ?? 15,
        k: params.k ?? 20,
      },
    });

    if (response.error) {
      throw new Error(`Recommendation error: ${response.error.message}`);
    }

    return response.data as RecommendationResponse;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
}

// Log user events for implicit feedback
export async function logEvent(params: EventLogParams): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        item_id: params.itemId,
        event_type: params.eventType,
        strength: params.strength ?? getDefaultStrength(params.eventType),
        context: params.context ?? {},
      });

    if (error) {
      console.error('Error logging event:', error);
      // Don't throw here as event logging shouldn't break the UI
    }
  } catch (error) {
    console.error('Error logging event:', error);
    // Don't throw here as event logging shouldn't break the UI
  }
}

// Get default strength values for different event types
function getDefaultStrength(eventType: string): number {
  const strengths: Record<string, number> = {
    impression: 0.0,
    view: 0.25,
    like: 1.0,
    save: 1.5,
    start: 2.0,
    complete: 3.0,
    comment: 1.2,
    hide: -1.0,
    skip: -0.5,
  };
  
  return strengths[eventType] ?? 0.0;
}

// Debounced view logging to avoid spam
let viewTimeouts: Map<string, NodeJS.Timeout> = new Map();

export function logViewDebounced(itemId: string, delay = 800): void {
  // Clear existing timeout for this item
  const existingTimeout = viewTimeouts.get(itemId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // Set new timeout
  const timeout = setTimeout(() => {
    logEvent({ itemId, eventType: 'view' });
    viewTimeouts.delete(itemId);
  }, delay);
  
  viewTimeouts.set(itemId, timeout);
}

// Helper to log completion (both to events and completions table)
export async function logCompletion(
  itemId: string, 
  photoUrl?: string, 
  caption?: string, 
  taggedFriendIds?: string[]
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    
    // Log to events table for recommendation learning
    await logEvent({ 
      itemId, 
      eventType: 'complete', 
      strength: 3.0 
    });
    
    // Also log to completions table for verification/media
    const { error } = await supabase
      .from('completions')
      .insert({
        item_id: itemId,
        user_id: userId,
        photo_url: photoUrl,
        caption: caption,
        tagged_friend_ids: taggedFriendIds,
        verified: false, // Will be verified later
      });

    if (error) {
      console.error('Error logging completion:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error logging completion:', error);
    throw error;
  }
}
