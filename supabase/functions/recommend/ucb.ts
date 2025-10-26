import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createLinUCBBandit(_supabase: ReturnType<typeof createClient>, _userId: string) {
  return {
    injectExplore<T extends { id: string; score: number }>(current: T[], all: T[], exploreK = 2): T[] {
      if (all.length <= current.length) return current;
      
      const has = new Set(current.map(x => x.id));
      const pool = all.filter(x => !has.has(x.id)).slice(0, 50);
      const picks = pool.slice(0, exploreK);
      const out = [...current];
      
      if (picks[0]) out.splice(Math.min(3, out.length), 0, picks[0]);
      if (picks[1]) out.splice(Math.min(7, out.length), 0, picks[1]);
      
      return out;
    }
  };
}
