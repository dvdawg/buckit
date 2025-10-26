import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mmrSelect } from "./mmr.ts";
import { createLinUCBBandit } from "./ucb.ts";

type Params = { userId: string; lat: number; lon: number; radiusKm?: number; k?: number };

const EMBED_DIM = Number(Deno.env.get("EMBED_DIM") ?? 384);

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

    if (rateLimitCheck && !rateLimitCheck[0]?.allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded",
        retry_after: rateLimitCheck[0]?.reset_at 
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
    
    if (candErr) {
      console.error("Error fetching candidates:", candErr);
      throw candErr;
    }

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

      // Subjective value with appeal term
      const score = 0.25*appeal + 0.25*trait + 0.20*state + 0.15*social + 0.10*poprec - 0.25*cost;

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
    .select("created_at, items:items!inner(embedding, embedding_vec)")
    .eq("user_id", userId)
    .in("event_type", ["view","like","save","start","complete"])
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = ev ?? [];
  if (!rows.length) {
    const { data: comp } = await supabase
      .from("completions")
      .select("created_at, items:items!inner(embedding, embedding_vec)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!comp?.length) return null;
    rows.push(...comp);
  }

  // Build time features for DIN-lite attention
  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  
  // Create query vector from time features
  const queryVec = new Array(dim).fill(0);
  // Simple time-based features: hour bucket and weekend indicator
  const hourBucket = Math.floor(hour / 6); // 0-3 buckets
  const weekendFlag = isWeekend ? 1 : 0;
  
  // Inject time features into query vector (simple approach)
  for (let i = 0; i < Math.min(10, dim); i++) {
    queryVec[i] = (hourBucket - 1.5) * 0.1; // Center around 0
  }
  for (let i = 10; i < Math.min(20, dim); i++) {
    queryVec[i] = weekendFlag * 0.2;
  }

  // Compute attention over recent item embeddings
  const itemEmbeddings: number[][] = [];
  const attentionWeights: number[] = [];
  
  for (const r of rows) {
    const emb = (r.items.embedding_vec || r.items.embedding) as number[] | null;
    if (!emb || emb.length !== dim) continue;
    
    itemEmbeddings.push(emb);
    
    // Compute attention score: (K·q)/sqrt(d)
    let attentionScore = 0;
    for (let i = 0; i < dim; i++) {
      attentionScore += emb[i] * queryVec[i];
    }
    attentionScore /= Math.sqrt(dim);
    
    // Add recency bias
    const ageSec = (Date.now() - new Date(r.created_at).getTime()) / 1000;
    const recencyBias = Math.exp(-ageSec / (7 * 24 * 3600) * Math.log(2));
    attentionScore += recencyBias * 0.5;
    
    attentionWeights.push(attentionScore);
  }
  
  if (itemEmbeddings.length === 0) return null;
  
  // Apply softmax to attention weights
  const maxWeight = Math.max(...attentionWeights);
  const expWeights = attentionWeights.map(w => Math.exp(w - maxWeight));
  const sumExpWeights = expWeights.reduce((sum, w) => sum + w, 0);
  const softmaxWeights = expWeights.map(w => w / sumExpWeights);
  
  // Compute attention-weighted sum
  const stateVec = new Array(dim).fill(0);
  for (let i = 0; i < itemEmbeddings.length; i++) {
    for (let j = 0; j < dim; j++) {
      stateVec[j] += itemEmbeddings[i][j] * softmaxWeights[i];
    }
  }
  
  return stateVec;
}

// Effort penalty constants
const DISTANCE_PENALTIES = {
  FREE_THRESHOLD: 3,    // 0-3km: no penalty
  LINEAR_THRESHOLD: 10, // 3-10km: linear penalty
  MAX_PENALTY: 1.5      // >10km: steeper penalty, capped
};

const PRICE_PENALTIES = {
  LOW_THRESHOLD: 25,    // ≤$25: light penalty
  MED_THRESHOLD: 100,   // ≤$100: moderate penalty
  HIGH_PENALTY: 0.50    // >$100: higher penalty
};

const DIFFICULTY_PENALTIES = {
  MIN_DIFFICULTY: 1,    // Easy difficulty
  MAX_DIFFICULTY: 5,    // Hard difficulty
  MAX_PENALTY: 0.5      // Maximum difficulty penalty
};

function distancePenalty(km?: number|null): number {
  if (!km || km <= 0) return 0;
  
  if (km <= DISTANCE_PENALTIES.FREE_THRESHOLD) {
    return 0; // No penalty for close items
  } else if (km <= DISTANCE_PENALTIES.LINEAR_THRESHOLD) {
    // Linear penalty from 3-10km
    return (km - DISTANCE_PENALTIES.FREE_THRESHOLD) / 
           (DISTANCE_PENALTIES.LINEAR_THRESHOLD - DISTANCE_PENALTIES.FREE_THRESHOLD) * 0.3;
  } else {
    // Steeper penalty beyond 10km, capped
    return Math.min(DISTANCE_PENALTIES.MAX_PENALTY, 0.3 + (km - DISTANCE_PENALTIES.LINEAR_THRESHOLD) * 0.1);
  }
}

function pricePenalty(min?: number|null, max?: number|null): number {
  // Use median price (average of min and max, or just min if max is null)
  const medianPrice = max !== null ? (min + max) / 2 : min;
  
  if (!medianPrice || medianPrice <= 0) return 0;
  
  if (medianPrice <= PRICE_PENALTIES.LOW_THRESHOLD) {
    return 0.05; // Light penalty
  } else if (medianPrice <= PRICE_PENALTIES.MED_THRESHOLD) {
    return 0.15; // Moderate penalty
  } else {
    return PRICE_PENALTIES.HIGH_PENALTY; // Higher penalty
  }
}

function difficultyPenalty(d?: number|null): number {
  if (d == null) return 0.1; // Default small penalty for missing difficulty
  
  // Map difficulty from [1,5] to [0, 0.5] penalty
  const normalized = (d - DIFFICULTY_PENALTIES.MIN_DIFFICULTY) / 
                    (DIFFICULTY_PENALTIES.MAX_DIFFICULTY - DIFFICULTY_PENALTIES.MIN_DIFFICULTY);
  
  return Math.max(0, normalized * DIFFICULTY_PENALTIES.MAX_PENALTY);
}
function popularityBoost(completes?: number|null, created_at?: string|null){
  const pop = Math.log(1 + (completes ?? 0));
  const rec = created_at ? Math.max(0, 1 - (Date.now() - new Date(created_at).getTime())/(10*24*3600*1000)) : 0;
  return (pop/3) + 0.2*rec;
}

async function applyDiversityConstraints(
  supabase: any, 
  userId: string, 
  candidates: any[], 
  k: number
): Promise<any[]> {
  const MAX_ITEMS_PER_BUCKET = Math.max(1, Math.floor(k / 3)); // Max 3 items per bucket
  const bucketCounts: Record<string, number> = {};
  const filtered: any[] = [];
  
  // Get bucket information for candidates
  const itemIds = candidates.map(c => c.id);
  const { data: items } = await supabase
    .from('items')
    .select('id, bucket_id')
    .in('id', itemIds);
  
  const itemToBucket = new Map(items?.map((item: any) => [item.id, item.bucket_id]) || []);
  
  // Apply per-bucket cap
  for (const candidate of candidates) {
    const bucketId = itemToBucket.get(candidate.id);
    if (!bucketId) {
      filtered.push(candidate);
      continue;
    }
    
    const currentCount = bucketCounts[bucketId] || 0;
    if (currentCount < MAX_ITEMS_PER_BUCKET) {
      filtered.push(candidate);
      bucketCounts[bucketId] = currentCount + 1;
    }
  }
  
  console.log(`Diversity filtering: ${candidates.length} -> ${filtered.length} items`);
  return filtered;
}

async function applyExposureDampening(
  supabase: any, 
  userId: string, 
  candidates: any[]
): Promise<any[]> {
  const dampened: any[] = [];
  
  for (const candidate of candidates) {
    // Get exposure dampening factor
    const { data: dampeningFactor } = await supabase
      .rpc('get_exposure_dampening', {
        p_user_id: userId,
        p_item_id: candidate.id,
        p_max_exposures: 5,
        p_dampening_days: 7
      });
    
    const factor = dampeningFactor || 1.0;
    
    if (factor > 0.2) { // Only include items with reasonable dampening
      dampened.push({
        ...candidate,
        score: candidate.score * factor, // Apply dampening to score
        exposure_dampening: factor
      });
    }
  }
  
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
