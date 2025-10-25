import { supabase } from '@/lib/supabase';

export function useCompletions() {
  const completeItem = async (
    itemId: string, 
    satisfactionRating?: number,
    photoUrl?: string,
    caption?: string
  ) => {
    try {
      // Get user ID
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) throw new Error('User not authenticated');

      // Update the item as completed
      const { error: itemError } = await supabase
        .from('items')
        .update({
          is_completed: true,
          satisfaction_rating: satisfactionRating,
          completed_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (itemError) throw itemError;

      // Record the completion
      const { error: completionError } = await supabase
        .from('completions')
        .insert({
          item_id: itemId,
          user_id: uid,
          photo_url: photoUrl,
          caption: caption,
          verified: true
        });

      if (completionError) throw completionError;

      // Record user activity (this will trigger streak calculation)
      const { error: activityError } = await supabase.rpc('record_user_activity', {
        p_user_id: uid,
        p_completions_count: 1
      });

      if (activityError) throw activityError;

      // Calculate points based on satisfaction and difficulty
      const { data: itemData } = await supabase
        .from('items')
        .select('difficulty')
        .eq('id', itemId)
        .single();

      const basePoints = 10;
      const difficultyMultiplier = itemData?.difficulty || 1;
      const satisfactionMultiplier = satisfactionRating ? satisfactionRating / 5 : 1;
      const pointsEarned = Math.round(basePoints * difficultyMultiplier * satisfactionMultiplier);

      // Update user points
      const { error: pointsError } = await supabase
        .from('users')
        .update({
          points: supabase.raw('points + ?', [pointsEarned])
        })
        .eq('id', uid);

      if (pointsError) throw pointsError;

      return { success: true, pointsEarned };
    } catch (error) {
      console.error('Error completing item:', error);
      return { success: false, error };
    }
  };

  const updateItemUrgency = async (itemId: string, urgencyLevel: 'overdue' | 'due_soon' | 'no_rush') => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ urgency_level: urgencyLevel })
        .eq('id', itemId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating urgency:', error);
      return { success: false, error };
    }
  };

  return {
    completeItem,
    updateItemUrgency
  };
}
