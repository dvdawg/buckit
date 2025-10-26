import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mmrSelect } from "./mmr.ts";
import { createLinUCBBandit } from "./ucb.ts";

type Params = { userId: string; lat: number; lon: number; radiusKm?: number; k?: number };

const DIM = 384;

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = (await req.json()) as Params;
    const radiusKm = body.radiusKm ?? 15;
    const k = body.k ?? 20;

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

    const stateVec = await computeStateVector(supabase, body.userId, DIM);

    const enriched = (candidates ?? []).map((c: any) => {
      const emb = (c.embedding as number[] | null) ?? null;
      const trait = dot(uv?.emb ?? null, emb);
      const state = dot(stateVec, emb);

      const social = (c.friend_completes ?? 0) * 0.08; // tune later
      const cost = distancePenalty(c.distance_km) + pricePenalty(c.price_min, c.price_max) + difficultyPenalty(c.difficulty);
      const poprec = popularityBoost(c.completes, c.created_at);

      // Subjective value
      const score = 0.30*trait + 0.20*state + 0.15*social + 0.10*poprec - 0.25*cost;

      return {
        id: c.id,
        score,
        reasons: { trait, state, social, cost, poprec },
        embedding: emb
      };
    });

    const diversified = mmrSelect(enriched, k, 0.7);

    const bandit = createLinUCBBandit(supabase, body.userId);
    const final = bandit.injectExplore(diversified, enriched, 2);

    await logImpressions(supabase, body.userId, final.map(x => x.id), body.lat, body.lon);

    return new Response(JSON.stringify({ items: final.map(({ embedding, ...rest }) => rest) }), {
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
    for (let i=0;i<dim && i<emb.length;i++) acc[i] += emb[i]*w;
    wsum += w;
  }
  if (wsum === 0) return null;
  return acc.map(x => x/wsum);
}

function distancePenalty(km?: number|null){ return km ? Math.min(1.5, km/20) : 0; }
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
  // 1 easy, 5 hard (adjust to your scale)
  return Math.max(0, ((d-1)/4) * 0.5);
}
function popularityBoost(completes?: number|null, created_at?: string|null){
  const pop = Math.log(1 + (completes ?? 0));
  const rec = created_at ? Math.max(0, 1 - (Date.now() - new Date(created_at).getTime())/(10*24*3600*1000)) : 0;
  return (pop/3) + 0.2*rec;
}

async function logImpressions(supabase:any, userId:string, itemIds:string[], lat:number, lon:number){
  if (!itemIds.length) return;
  const rows = itemIds.map(id => ({
    user_id: userId,
    item_id: id,
    event_type: 'impression',
    strength: 0.0,
    context: { lat, lon }
  }));
  await supabase.from('events').insert(rows);
}
