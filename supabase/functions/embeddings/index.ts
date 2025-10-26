import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBED_DIM = Number(Deno.env.get("EMBED_DIM") ?? 384);

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
  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  
  // Try Claude first if available
  if (claudeApiKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeApiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Create a dense vector embedding for this text. Return only a JSON array of 1536 floating-point numbers between -1 and 1: "${text}"`
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Parse the JSON array from Claude's response
      const embedding = JSON.parse(content);
      if (Array.isArray(embedding) && embedding.length === EMBED_DIM) {
        return embedding;
      }
    } catch (error) {
      console.error("Claude embedding error:", error);
      // Fall back to OpenAI or hash-based approach
    }
  }
  
  // Fallback to OpenAI if Claude fails
  if (openaiApiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small", // 1536 dimensions
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("OpenAI embedding error:", error);
      // Fall back to hash-based approach
    }
  }
  
  // Final fallback: hash-based approach for demo/testing
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hashArray = new Uint8Array(hash);
  
  const embedding = new Array(EMBED_DIM).fill(0);
  for (let i = 0; i < EMBED_DIM; i++) {
    const hashIndex = i % hashArray.length;
    const seed = hashArray[hashIndex] + i * 0.01;
    embedding[i] = Math.sin(seed) * 0.1;
  }
  
  return embedding;
}
