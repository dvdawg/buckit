import { createClient } from "https:

export function createLinUCBBandit(supabase: ReturnType<typeof createClient>, userId: string) {
  return {
    async injectExplore<T extends { id: string; score: number; reasons: any }>(
      current: T[], 
      all: T[], 
      exploreK = 2
    ): Promise<T[]> {
      if (all.length <= current.length) return current;
      
      const has = new Set(current.map(x => x.id));
      const pool = all.filter(x => !has.has(x.id)).slice(0, 50);
      
      if (pool.length === 0) return current;
      
      const ucbCandidates = await Promise.all(
        pool.map(async (candidate) => {
          const features = [
            candidate.reasons.appeal || 0,
            candidate.reasons.trait || 0,
            candidate.reasons.state || 0,
            candidate.reasons.social || 0,
            candidate.reasons.cost || 0,
            candidate.reasons.poprec || 0
          ];
          
          const { data: ucbScore } = await supabase.rpc('compute_ucb_score', {
            p_user_id: userId,
            p_item_id: candidate.id,
            p_features: features
          });
          
          return {
            ...candidate,
            ucbScore: ucbScore || 0
          };
        })
      );
      
      const sortedByUCB = ucbCandidates.sort((a, b) => b.ucbScore - a.ucbScore);
      const picks = sortedByUCB.slice(0, exploreK);
      
      const out = [...current];
      
      if (picks[0]) out.splice(Math.min(3, out.length), 0, picks[0]);
      if (picks[1]) out.splice(Math.min(7, out.length), 0, picks[1]);
      
      return out;
    },
    
    async updateWithReward(
      itemId: string, 
      features: number[], 
      reward: number
    ): Promise<void> {
      try {
        await supabase.rpc('update_bandit_arm', {
          p_user_id: userId,
          p_item_id: itemId,
          p_features: features,
          p_reward: reward,
          p_alpha: 1.0
        });
      } catch (error) {
        console.error('Error updating bandit arm:', error);
      }
    }
  };
}
