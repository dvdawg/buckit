import { serve } from "https:
import { createClient } from "https:

type Params = { userId: string; lat: number; lon: number; radiusKm?: number; k?: number };

const EMBED_DIM = 384;

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

    console.log(`Processing recommendation request for user: ${userId}`);

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
          remaining: 0,
          experiment: { id: null, variant: null }
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

      const social = 0.15 * (c.friend_completes ?? 0);
      const cost = distancePenalty(c.distance_km) + pricePenalty(c.price_min, c.price_max) + difficultyPenalty(c.difficulty);
      const poprec = popularityBoost(c.completes, c.created_at);
      
      const appeal = c.appeal_score ?? trait;

      const score = 0.25*appeal + 0.25*trait + 0.20*state + 0.15*social + 0.10*poprec - 0.25*cost;

      return { 
        id: c.id, 
        score, 
        reasons: { appeal, trait, state, social, cost, poprec }, 
        embedding: emb || undefined
      };
    });

    const diversified = mmrSelect(enriched, k, 0.7);

    const responseData = { 
      items: diversified.map(({ embedding, ...rest }) => rest),
      cached: false,
      remaining: 0,
      experiment: { id: null, variant: null }
    };

    console.log(`Successfully generated ${responseData.items.length} recommendations for user ${userId}`);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in recommend function:", error);
    
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
  try {
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
  } catch (error) {
    console.error('State vector computation error:', error);
    return null;
  }
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
