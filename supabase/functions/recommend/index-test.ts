import { serve } from "https:
import { createClient } from "https:

type Params = { userId: string; lat: number; lon: number; radiusKm?: number; k?: number };

export const handler = serve(async (req) => {
  try {
    console.log("Test function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    console.log("Supabase URL:", supabaseUrl ? "Found" : "Missing");
    console.log("Service Key:", supabaseServiceKey ? "Found" : "Missing");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = (await req.json()) as Params;
    
    console.log("Request body:", body);
    
    const { data: testData, error: testError } = await supabase
      .from("users")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.error("Database connection test failed:", testError);
      return new Response(JSON.stringify({ 
        error: "Database connection failed", 
        details: testError.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log("Database connection successful");
    
    const { data: candidatesData, error: candErr } = await supabase.rpc("get_recommendation_candidates", {
      p_user_id: body.userId,
      p_lat: body.lat,
      p_lon: body.lon,
      p_radius_km: body.radiusKm ?? 15,
      p_limit: 10
    });
    
    if (candErr) {
      console.error("RPC function failed:", candErr);
      return new Response(JSON.stringify({ 
        error: "RPC function failed", 
        details: candErr.message,
        code: candErr.code,
        hint: candErr.hint
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log("RPC function successful, candidates:", candidatesData?.length || 0);
    
    return new Response(JSON.stringify({ 
      success: true,
      candidates: candidatesData?.length || 0,
      message: "Test function working"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Test function error:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
