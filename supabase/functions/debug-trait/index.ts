import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBED_DIM = Number(Deno.env.get("EMBED_DIM") ?? 1536);

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user trait vector
    const { data: uv } = await supabase
      .from("user_vectors")
      .select("emb")
      .eq("user_id", userId)
      .maybeSingle();

    if (!uv?.emb) {
      return new Response(JSON.stringify({ 
        error: "No user vector found",
        userId,
        hasUserVector: false 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get top 5 items by trait similarity
    const { data: items, error } = await supabase
      .from("items")
      .select("id, title, description, embedding, embedding_vec")
      .not("embedding", "is", null)
      .limit(10);

    if (error) {
      throw error;
    }

    const results = (items ?? [])
      .map((item: any) => {
        const emb = item.embedding_vec || item.embedding;
        if (!emb) return null;
        
        const trait = dot(uv.emb, emb);
        return {
          id: item.id,
          title: item.title,
          trait_similarity: trait,
          has_embedding_vec: !!item.embedding_vec,
          has_embedding: !!item.embedding,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.trait_similarity - a.trait_similarity)
      .slice(0, 5);

    return new Response(JSON.stringify({
      userId,
      hasUserVector: true,
      userVectorDim: uv.emb?.length,
      topItems: results,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in debug-trait function:", error);
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
