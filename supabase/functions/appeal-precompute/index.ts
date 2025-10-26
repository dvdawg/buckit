import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBED_DIM = Number(Deno.env.get("EMBED_DIM") ?? 1536);

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get items without appeal scores
    const { data: items, error: qerr } = await supabase
      .from("items")
      .select("id, title, description")
      .or("appeal_score.is.null,appeal_score.eq.0")
      .not("title", "is", null)
      .limit(100);
    
    if (qerr) {
      console.error("Error fetching items:", qerr);
      throw qerr;
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ 
        updated: 0, 
        message: "No items need appeal scores" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updates = [];
    for (const item of items) {
      const title = item.title || "";
      const description = item.description || "";
      const text = [title, description].filter(Boolean).join(" ");
      
      if (!text.trim()) {
        console.log(`Skipping item ${item.id} - no text content`);
        continue;
      }
      
      // Compute appeal score using the database function
      const { data: appealScore, error: scoreErr } = await supabase
        .rpc("compute_appeal_score", { p_item_id: item.id });
      
      if (scoreErr) {
        console.error(`Error computing appeal score for item ${item.id}:`, scoreErr);
        continue;
      }
      
      // If no events-based score, use text-based heuristic
      let finalScore = appealScore;
      if (finalScore === null) {
        // Simple heuristic based on text length and keywords
        const textLength = text.length;
        const hasKeywords = /amazing|great|awesome|fantastic|wonderful|excellent/i.test(text);
        const hasNegativeKeywords = /boring|terrible|awful|bad|horrible/i.test(text);
        
        let heuristicScore = 0.5; // Base score
        
        // Adjust based on text length (longer descriptions often more appealing)
        if (textLength > 100) heuristicScore += 0.1;
        if (textLength > 200) heuristicScore += 0.1;
        
        // Adjust based on keywords
        if (hasKeywords) heuristicScore += 0.2;
        if (hasNegativeKeywords) heuristicScore -= 0.3;
        
        finalScore = Math.max(0, Math.min(1, heuristicScore));
      }
      
      updates.push({ id: item.id, appeal_score: finalScore });
    }

    if (updates.length > 0) {
      // Update each item individually
      for (const update of updates) {
        const { error: uerr } = await supabase
          .from("items")
          .update({ appeal_score: update.appeal_score })
          .eq("id", update.id);
        
        if (uerr) {
          console.error(`Error updating appeal score for item ${update.id}:`, uerr);
        }
      }
    }

    return new Response(JSON.stringify({ 
      updated: updates.length,
      message: `Updated appeal scores for ${updates.length} items`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in appeal-precompute function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
