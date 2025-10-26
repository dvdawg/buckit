import { serve } from "https:
import { createClient } from "https:

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, itemId, eventType, features } = await req.json();

    if (!userId || !itemId || !eventType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rewardMap: Record<string, number> = {
      'impression': 0.0,
      'view': 0.1,
      'like': 0.5,
      'save': 0.7,
      'start': 0.8,
      'complete': 1.0,
      'hide': -0.3,
      'skip': -0.1
    };

    const reward = rewardMap[eventType] || 0.0;

    const { error } = await supabase.rpc('update_bandit_arm', {
      p_user_id: userId,
      p_item_id: itemId,
      p_features: features || [0, 0, 0, 0, 0, 0],
      p_reward: reward,
      p_alpha: 1.0
    });

    if (error) {
      console.error("Error updating bandit arm:", error);
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      reward,
      message: `Updated bandit arm for user ${userId}, item ${itemId} with reward ${reward}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in bandit-update function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
