import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Params = { userId: string; lat: number; lon: number; radiusKm?: number; k?: number };

const EMBED_DIM = Number(Deno.env.get("EMBED_DIM") ?? 1536);

// MMR Selection function (embedded)
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

// LinUCB Bandit function (embedded)
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
      
      // Compute UCB scores for exploration candidates
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
      
      // Sort by UCB score and pick top exploreK
      const sortedByUCB = ucbCandidates.sort((a, b) => b.ucbScore - a.ucbScore);
      const picks = sortedByUCB.slice(0, exploreK);
      
      const out = [...current];
      
      // Inject exploration items at strategic positions
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

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1';

    // Check rate limit
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      p_user_id: body.userId,
      p_ip_address: clientIP,
      p_limit: 30,
      p_window_minutes: 10
    });

    if (rateLimitCheck && rateLimitCheck.length > 0 && !rateLimitCheck[0].allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded",
        remaining: rateLimitCheck[0].remaining,
        reset_at: rateLimitCheck[0].reset_at
      }), {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": "600" // 10 minutes
        },
      });
    }

    // Get A/B test parameters
    const { data: abParams } = await supabase.rpc('get_experiment_params', {
      p_user_id: body.userId,
      p_experiment_name: 'social_weight_test'
    });

    const experimentParams = abParams || {};
    const experimentId = experimentParams.experiment_id;
    const variant = experimentParams.variant;

    // Check cache first (include experiment variant in cache key)
    const cacheKey = `${body.userId}_${body.lat}_${body.lon}_${variant || 'control'}`;
    const { data: cachedResult } = await supabase.rpc('get_cached_recommendations', {
      p_user_id: body.userId,
      p_lat: body.lat,
      p_lon: body.lon
    });

    if (cachedResult) {
      // Increment rate limit counter
      await supabase.rpc('increment_rate_limit', {
        p_user_id: body.userId,
        p_ip_address: clientIP
      });

      return new Response(JSON.stringify({ 
        items: cachedResult.items,
        cached: true,
        remaining: rateLimitCheck?.[0]?.remaining || 0,
        experiment: { id: experimentId, variant }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Trait vector
    const { data: uv } = await supabase
      .from("user_vectors")
      .select("emb")
      .eq("user_id", body.userId)
      .maybeSingle();

    // Candidates via schema-aligned RPC
    const { data: candidates, error: candErr } = await supabase.rpc("get_recommendation_candidates", {
      p_user_id: body.userId,
      p_lat: body.lat,
      p_lon: body.lon,
      p_radius_km: radiusKm,
      p_limit: 300
    });

    if (candErr) throw candErr;

    const stateVec = await computeStateVector(supabase, body.userId, EMBED_DIM);

    const enriched = (candidates ?? []).map((c: any) => {
      const emb = (c.embedding as number[] | null) ?? null;
      const trait = dot(uv?.emb ?? null, emb);
      const state = dot(stateVec, emb);

      // Enhanced social signals with weights (A/B testable)
      const baseSocialWeight = experimentParams.social_weight || 0.15;
      const w1 = 0.10; // friend_completes weight
      const w2 = 0.08; // friend_saves weight  
      const w3 = 0.06; // friend_likes weight
      const w4 = 0.05; // collab_hint weight
      
      const social = baseSocialWeight * (w1 * (c.friend_completes ?? 0) + 
                                        w2 * (c.friend_saves ?? 0) + 
                                        w3 * (c.friend_likes ?? 0) + 
                                        w4 * (c.collab_hint ? 1 : 0));
      const cost = distancePenalty(c.distance_km) + pricePenalty(c.price_min, c.price_max) + difficultyPenalty(c.difficulty);
      const poprec = popularityBoost(c.completes, c.created_at);
      
      // Appeal score: use precomputed score or fallback to trait similarity
      const appeal = c.appeal_score ?? trait;

      // Final scoring with A/B testable weights
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
        embedding: emb 
      };
    });

    // Apply diversity constraints and exposure dampening before MMR
    const diversityFiltered = await applyDiversityConstraints(supabase, body.userId, enriched, k);
    const exposureFiltered = await applyExposureDampening(supabase, body.userId, diversityFiltered);
    
    // Use A/B test parameters for MMR and exploration
    const mmrLambda = experimentParams.mmr_lambda || 0.7;
    const exploreSlots = experimentParams.explore_slots || 2;
    
    const diversified = mmrSelect(exposureFiltered, k, mmrLambda);

    const bandit = createLinUCBBandit(supabase, body.userId);
    const final = await bandit.injectExplore(diversified, enriched, exploreSlots);

    await logImpressions(supabase, body.userId, final.map(x => x.id), body.lat, body.lon, experimentId, variant);

    const responseData = { 
      items: final.map(({ embedding, ...rest }) => rest),
      cached: false,
      remaining: rateLimitCheck?.[0]?.remaining || 0,
      experiment: { id: experimentId, variant }
    };

    // Cache the results
    await supabase.rpc('cache_recommendations', {
      p_user_id: body.userId,
      p_lat: body.lat,
      p_lon: body.lon,
      p_payload: responseData,
      p_ttl_minutes: 5
    });

    // Increment rate limit counter
    await supabase.rpc('increment_rate_limit', {
      p_user_id: body.userId,
      p_ip_address: clientIP
    });

    // Log performance metrics
    const duration = Date.now() - startTime;
    await supabase.rpc('log_performance_metric', {
      p_user_id: userId,
      p_function_name: 'recommend',
      p_duration_ms: duration,
      p_success: true
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in recommend function:", error);
    
    // Log error performance metrics
    const duration = Date.now() - startTime;
    await supabase.rpc('log_performance_metric', {
      p_user_id: userId,
      p_function_name: 'recommend',
      p_duration_ms: duration,
      p_success: false,
      p_error_message: error.message
    }).catch(() => {}); // Don't fail on logging errors

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// === helpers ===
function dot(a: number[] | null | undefined, b: number[] | null | undefined) {
  if (!a || !b) return 0;
  let s = 0;
  for (let i=0; i<Math.min(a.length,b.length); i++) s += a[i]*b[i];
  return s / (a.length || 1);
}

async function computeStateVector(supabase: any, userId: string, dim: number): Promise<number[] | null> {
  // Use recent views/likes/saves/starts/completes from events; fallback to completions
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
  // Per-bucket cap: max 3 items from same bucket
  const bucketCounts = new Map<string, number>();
  const maxPerBucket = 3;
  
  const filtered = candidates.filter(candidate => {
    const bucketId = candidate.bucket_id || 'default';
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
  experimentId?: string,
  variant?: string
){
  if (!itemIds.length) return;
  
  // Log to events table with experiment context
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
  
  // Update exposure tracking
  for (const itemId of itemIds) {
    await supabase.rpc('update_exposure_tracking', {
      p_user_id: userId,
      p_item_id: itemId,
      p_action_type: 'impression'
    });
  }
}
