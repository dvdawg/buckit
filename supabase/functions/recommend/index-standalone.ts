import { serve } from "https:
import { createClient } from "https:

type Params = { userId: string; lat: number; lon: number; radiusKm?: number; k?: number };

const EMBED_DIM = Number(Deno.env.get("EMBED_DIM") ?? 1536);

function mmrSelect<T extends { embedding?: number[]; score: number }>(
  candidates: T[], k: number, lambda = 0.7
): T[] {
  const selected: T[] = [];
  const pool = [...candidates].sort((a,b)=>b.score - a.score).slice(0, 120);
  
  while (selected.length < k && pool.length) {
    let bestIdx = 0, best = -Infinity;
    
    for (let i=0; i<pool.length; i++){
      const c = pool[i];
      const simToUser = c.score;
      const simToSel = selected.length
        ? Math.max(...selected.map(s => cosine(c.embedding, s.embedding)))
        : 0;
      const s = lambda*simToUser - (1-lambda)*simToSel;
      if (s > best){ 
        best = s; 
        bestIdx = i; 
      }
    }
    selected.push(pool.splice(bestIdx,1)[0]);
  }
  
  return selected;
}

function cosine(a?: number[], b?: number[]) {
  if (!a || !b) return 0;
  let s=0, na=0, nb=0;
  for (let i=0; i<Math.min(a.length,b.length); i++){ 
    s+=a[i]*b[i]; 
    na+=a[i]*a[i]; 
    nb+=b[i]*b[i]; 
  }
  return s / (Math.sqrt(na)*Math.sqrt(nb) + 1e-8);
}

function createLinUCBBandit(supabase: ReturnType<typeof createClient>, userId: string) {
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
          try {
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
          } catch (error) {
            console.error('Error computing UCB score for item:', candidate.id, error);
            return {
              ...candidate,
              ucbScore: 0
            };
          }
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

export const handler = serve(async (req) => {
  const startTime = Date.now();
  let userId = '';
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = (await req.json()) as Params;
    userId = body.userId;
    const radiusKm = body.radiusKm ?? 15;
    const k = body.k ?? 20;

    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1';

    let rateLimitCheck = null;
    try {
      const { data: rateLimitData, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_user_id: body.userId,
        p_ip_address: clientIP,
        p_limit: 30,
        p_window_minutes: 10
      });
      
      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      } else {
        rateLimitCheck = rateLimitData;
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
    }

    if (rateLimitCheck && Array.isArray(rateLimitCheck) && rateLimitCheck.length > 0 && !(rateLimitCheck[0] as any).allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded",
        remaining: (rateLimitCheck[0] as any).remaining,
        reset_at: (rateLimitCheck[0] as any).reset_at
      }), {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": "600"
        },
      });
    }

    let experimentParams: any = {};
    let experimentId: string | null = null;
    let variant: string | null = null;
    
    try {
      const { data: abParams, error: abError } = await supabase.rpc('get_user_experiment_variant', {
        p_user_id: body.userId,
        p_experiment_name: 'social_weight_test'
      });
      
      if (abError) {
        console.error('A/B test params error:', abError);
      } else if (abParams && abParams.length > 0) {
        const exp = abParams[0];
        experimentParams = exp.params || {};
        experimentId = exp.experiment_id;
        variant = exp.variant;
      } else {
        const { data: assignedVariant, error: assignError } = await supabase.rpc('assign_user_to_experiment', {
          p_user_id: body.userId,
          p_experiment_name: 'social_weight_test'
        });
        
        if (assignError) {
          console.error('Error assigning user to experiment:', assignError);
        } else {
          variant = assignedVariant;
          const { data: newParams } = await supabase.rpc('get_user_experiment_variant', {
            p_user_id: body.userId,
            p_experiment_name: 'social_weight_test'
          });
          
          if (newParams && newParams.length > 0) {
            const exp = newParams[0];
            experimentParams = exp.params || {};
            experimentId = exp.experiment_id;
          }
        }
      }
    } catch (error) {
      console.error('A/B test params failed:', error);
    }

    const cacheKey = `${body.userId}_${body.lat}_${body.lon}_${variant || 'control'}`;
    let cachedResult = null;
    
    try {
      const { data: cacheData, error: cacheError } = await supabase.rpc('get_cached_recommendations', {
        p_user_id: body.userId,
        p_lat: body.lat,
        p_lon: body.lon
      });
      
      if (cacheError) {
        console.error('Cache check error:', cacheError);
      } else {
        cachedResult = cacheData;
      }
    } catch (error) {
      console.error('Cache check failed:', error);
    }

    if (cachedResult) {
      try {
        await supabase.rpc('increment_rate_limit', {
          p_user_id: body.userId,
          p_ip_address: clientIP
        });
      } catch (error) {
        console.error('Error incrementing rate limit for cached result:', error);
      }

      return new Response(JSON.stringify({ 
        items: (cachedResult as any).items,
        cached: true,
        remaining: (rateLimitCheck && Array.isArray(rateLimitCheck) && rateLimitCheck[0]) ? (rateLimitCheck[0] as any).remaining : 0,
        experiment: { id: experimentId, variant }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let uv: any = null;
    try {
      const { data: userVectorData, error: userVectorError } = await supabase
        .from("user_vectors")
        .select("emb")
        .eq("user_id", body.userId)
        .maybeSingle();
      
      if (userVectorError) {
        console.error('User vector error:', userVectorError);
      } else {
        uv = userVectorData;
      }
    } catch (error) {
      console.error('User vector fetch failed:', error);
    }

    let candidates = [];
    try {
      const { data: candidatesData, error: candErr } = await supabase.rpc("get_recommendation_candidates", {
        p_user_id: body.userId,
        p_lat: body.lat,
        p_lon: body.lon,
        p_radius_km: radiusKm,
        p_limit: 300
      });

      if (candErr) {
        console.error("Error fetching candidates:", candErr);
        throw new Error(`Failed to fetch candidates: ${candErr.message}`);
      }
      
      candidates = candidatesData || [];
      
      if (candidates.length === 0) {
        console.warn("No candidates found for user:", body.userId);
        return new Response(JSON.stringify({ 
          items: [],
          cached: false,
          remaining: (rateLimitCheck && Array.isArray(rateLimitCheck) && rateLimitCheck[0]) ? (rateLimitCheck[0] as any).remaining : 0,
          experiment: { id: experimentId, variant }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Candidates fetch failed:", error);
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    let stateVec: number[] | null = null;
    try {
      stateVec = await computeStateVector(supabase, body.userId, EMBED_DIM);
    } catch (error) {
      console.error('State vector computation failed:', error);
    }

    const enriched = candidates.map((c: any) => {
      const emb = (c.embedding as number[] | null) ?? null;
      const trait = dot(uv?.emb ?? null, emb);
      const state = dot(stateVec, emb);

      const baseSocialWeight = experimentParams.social_weight || 0.15;
      const w1 = 0.10;
      const w2 = 0.08;
      const w3 = 0.06;
      const w4 = 0.05;
      
      const social = baseSocialWeight * (w1 * (c.friend_completes ?? 0) + 
                                        w2 * (c.friend_saves ?? 0) + 
                                        w3 * (c.friend_likes ?? 0) + 
                                        w4 * (c.collab_hint ? 1 : 0));
      const cost = distancePenalty(c.distance_km) + pricePenalty(c.price_min, c.price_max) + difficultyPenalty(c.difficulty);
      const poprec = popularityBoost(c.completes, c.created_at);
      
      const appeal = c.appeal_score ?? trait;

      const appealWeight = experimentParams.appeal_weight || 0.25;
      const traitWeight = experimentParams.trait_weight || 0.25;
      const stateWeight = experimentParams.state_weight || 0.20;
      const costWeight = experimentParams.cost_weight || 0.25;
      
      const score = appealWeight * appeal + 
                   traitWeight * trait + 
                   stateWeight * state + 
                   social - 
                   costWeight * cost + 
                   0.10 * poprec;

      return { 
        id: c.id, 
        score, 
        reasons: { appeal, trait, state, social, cost, poprec }, 
        embedding: emb || undefined
      };
    });

    let diversityFiltered = enriched;
    let exposureFiltered = enriched;
    
    try {
      diversityFiltered = await applyDiversityConstraints(supabase, body.userId, enriched, k);
    } catch (error) {
      console.error('Diversity constraints failed:', error);
    }
    
    try {
      exposureFiltered = await applyExposureDampening(supabase, body.userId, diversityFiltered);
    } catch (error) {
      console.error('Exposure dampening failed:', error);
    }
    
    const mmrLambda = experimentParams.mmr_lambda || 0.7;
    const exploreSlots = experimentParams.explore_slots || 2;
    
    const diversified = mmrSelect(exposureFiltered, k, mmrLambda);

    let final = diversified;
    try {
      const bandit = createLinUCBBandit(supabase, body.userId);
      final = await bandit.injectExplore(diversified, enriched, exploreSlots);
    } catch (error) {
      console.error('Bandit exploration failed:', error);
    }

    try {
      await logImpressions(supabase, body.userId, final.map(x => x.id), body.lat, body.lon, experimentId, variant);
    } catch (error) {
      console.error('Log impressions failed:', error);
    }

    const responseData = { 
      items: final.map(({ embedding, ...rest }) => rest),
      cached: false,
      remaining: (rateLimitCheck && Array.isArray(rateLimitCheck) && rateLimitCheck[0]) ? (rateLimitCheck[0] as any).remaining : 0,
      experiment: { id: experimentId, variant }
    };

    try {
      await supabase.rpc('cache_recommendations', {
        p_user_id: body.userId,
        p_lat: body.lat,
        p_lon: body.lon,
        p_payload: responseData,
        p_ttl_minutes: 5
      });
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }

    try {
      await supabase.rpc('increment_rate_limit', {
        p_user_id: body.userId,
        p_ip_address: clientIP
      });
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
    }

    const duration = Date.now() - startTime;
    try {
      await supabase.rpc('log_performance_metric', {
        p_user_id: userId,
        p_function_name: 'recommend',
        p_duration_ms: duration,
        p_success: true
      });
    } catch (error) {
      console.error('Error logging performance metrics:', error);
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in recommend function:", error);
    
    const duration = Date.now() - startTime;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.rpc('log_performance_metric', {
        p_user_id: userId,
        p_function_name: 'recommend',
        p_duration_ms: duration,
        p_success: false,
        p_error_message: error.message
      });
    } catch (logError) {
      console.error('Error logging performance metrics for error:', logError);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function dot(a: number[] | null | undefined, b: number[] | null | undefined) {
  if (!a || !b) return 0;
  let s = 0;
  for (let i=0; i<Math.min(a.length,b.length); i++) s += a[i]*b[i];
  return s / (a.length || 1);
}

async function computeStateVector(supabase: any, userId: string, dim: number): Promise<number[] | null> {
  const { data: ev } = await supabase
    .from("events")
    .select("created_at, items:items!inner(embedding)")
    .eq("user_id", userId)
    .in("event_type", ["view","like","save","start","complete"])
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = ev ?? [];
  if (!rows.length) {
    const { data: comp } = await supabase
      .from("completions")
      .select("created_at, items:items!inner(embedding)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!comp?.length) return null;
    rows.push(...comp);
  }

  const now = Date.now();
  const acc = new Array(dim).fill(0);
  let wsum = 0;

  for (const r of rows) {
    const emb = r.items.embedding as number[] | null;
    if (!emb) continue;
    
    const ageSec = (now - new Date(r.created_at).getTime())/1000;
    const w = Math.exp(-ageSec/(7*24*3600) * Math.log(2));
    
    for (let i=0; i<dim && i<emb.length; i++) acc[i] += emb[i]*w;
    wsum += w;
  }

  if (wsum === 0) return null;
  return acc.map(x => x/wsum);
}

function distancePenalty(km?: number|null){
  if (!km) return 0;
  if (km <= 3) return 0;
  if (km <= 10) return (km - 3) / 7 * 0.3;
  return 0.3 + (km - 10) / 20 * 1.2;
}

function pricePenalty(min?: number|null, max?: number|null){
  const p = (max ?? min ?? 0);
  if (p <= 0) return 0;
  if (p <= 25) return 0.05;
  if (p <= 50) return 0.15;
  if (p <= 100) return 0.30;
  return 0.50;
}

function difficultyPenalty(d?: number|null){
  if (d == null) return 0.1;
  return Math.max(0, ((d-1)/4) * 0.5);
}

function popularityBoost(completes?: number|null, created_at?: string|null){
  const pop = Math.log(1 + (completes ?? 0));
  const rec = created_at ? Math.max(0, 1 - (Date.now() - new Date(created_at).getTime())/(10*24*3600*1000)) : 0;
  return (pop/3) + 0.2*rec;
}

async function applyDiversityConstraints(supabase: any, userId: string, candidates: any[], k: number): Promise<any[]> {
  const itemIds = candidates.map(c => c.id);
  const { data: items } = await supabase
    .from('items')
    .select('id, bucket_id')
    .in('id', itemIds);
  
  const itemToBucket = new Map(items?.map((item: any) => [item.id, item.bucket_id]) || []);
  
  const bucketCounts = new Map<string, number>();
  const maxPerBucket = 3;
  
  const filtered = candidates.filter(candidate => {
    const bucketId = itemToBucket.get(candidate.id) || 'default';
    const currentCount = bucketCounts.get(bucketId) || 0;
    
    if (currentCount < maxPerBucket) {
      bucketCounts.set(bucketId, currentCount + 1);
      return true;
    }
    return false;
  });
  
  console.log(`Diversity filtering: ${candidates.length} -> ${filtered.length} items`);
  return filtered;
}

async function applyExposureDampening(supabase: any, userId: string, candidates: any[]): Promise<any[]> {
  const dampened = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const { data: dampeningFactor } = await supabase.rpc('get_exposure_dampening', {
          p_user_id: userId,
          p_item_id: candidate.id,
          p_max_exposures: 5,
          p_dampening_days: 7
        });
        
        return {
          ...candidate,
          score: candidate.score * (dampeningFactor || 1.0)
        };
      } catch (error) {
        console.error('Error getting exposure dampening for item:', candidate.id, error);
        return candidate;
      }
    })
  );
  
  console.log(`Exposure dampening: ${candidates.length} -> ${dampened.length} items`);
  return dampened;
}

async function logImpressions(
  supabase:any, 
  userId:string, 
  itemIds:string[], 
  lat:number, 
  lon:number,
  experimentId?: string | null,
  variant?: string | null
){
  if (!itemIds.length) return;
  
  try {
    const eventRows = itemIds.map(id => ({
      user_id: userId,
      item_id: id,
      event_type: 'impression',
      strength: 0.0,
      context: { 
        lat, 
        lon,
        experiment_id: experimentId,
        variant: variant
      }
    }));
    await supabase.from('events').insert(eventRows);
  } catch (error) {
    console.error('Error logging impressions to events table:', error);
  }
  
  for (const itemId of itemIds) {
    try {
      await supabase.rpc('update_exposure_tracking', {
        p_user_id: userId,
        p_item_id: itemId,
        p_action_type: 'impression'
      });
    } catch (error) {
      console.error('Error updating exposure tracking for item:', itemId, error);
    }
  }
}
