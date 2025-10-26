import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DIM = 384; // keep in sync with vector dimension (your existing schema uses 384)

interface RequestBody {
  limit?: number;
}

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json().catch(() => ({}));
    const limit = body.limit ?? 200;

    // Get items without embeddings that have valid titles
    const { data: items, error: qerr } = await supabase
      .from("items")
      .select("id, title, description")
      .is("embedding", null)
      .not("title", "is", null)  // Only get items with non-null titles
      .limit(limit);
    
    if (qerr) {
      console.error("Error fetching items:", qerr);
      throw qerr;
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: "No items need embeddings" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updates = [];
    for (const item of items) {
      // Ensure we have valid text content
      const title = item.title || "";
      const description = item.description || "";
      const text = [title, description].filter(Boolean).join(" ");
      
      // Skip items with no text content
      if (!text.trim()) {
        console.log(`Skipping item ${item.id} - no text content`);
        continue;
      }
      
      const vec = await getTextEmbedding(text);
      updates.push({ id: item.id, embedding: vec });
    }

    if (updates.length > 0) {
      // Update each item individually to avoid null constraint issues
      for (const update of updates) {
        const { error: uerr } = await supabase
          .from("items")
          .update({ embedding: update.embedding })
          .eq("id", update.id);
        
        if (uerr) {
          console.error(`Error updating embedding for item ${update.id}:`, uerr);
          // Continue with other items instead of failing completely
        }
      }
    }

    // Refresh materialized views
    const { error: ferr } = await supabase.rpc("refresh_recs_materialized");
    if (ferr) {
      console.error("Error refreshing materialized views:", ferr);
      // Don't throw here, as the embeddings were updated successfully
    }

    return new Response(JSON.stringify({ updated: updates.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in embeddings function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function getTextEmbedding(text: string): Promise<number[]> {
  // TODO: integrate your embedding provider (must return DIM-length floats).
  // For now, using a simple hash-based approach for demonstration
  // In production, replace with OpenAI, Cohere, or other embedding service
  
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hashArray = new Uint8Array(hash);
  
  // Generate deterministic but varied embeddings based on text content
  const embedding = new Array(DIM).fill(0);
  for (let i = 0; i < DIM; i++) {
    const hashIndex = i % hashArray.length;
    const seed = hashArray[hashIndex] + i * 0.01;
    embedding[i] = Math.sin(seed) * 0.1; // Small values for cosine similarity
  }
  
  return embedding;
}
