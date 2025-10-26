import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { jobType } = await req.json();

    let result;

    switch (jobType) {
      case 'embeddings':
        result = await runEmbeddingsJob(supabase);
        break;
      case 'refresh_materialized':
        result = await runRefreshMaterializedJob(supabase);
        break;
      case 'appeal_precompute':
        result = await runAppealPrecomputeJob(supabase);
        break;
      case 'bandit_decay':
        result = await runBanditDecayJob(supabase);
        break;
      case 'cleanup_cache':
        result = await runCleanupCacheJob(supabase);
        break;
      case 'all':
        result = await runAllJobs(supabase);
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scheduled-jobs function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function runEmbeddingsJob(supabase: any) {
  console.log("Running embeddings job...");
  
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ limit: 200 })
  });

  const result = await response.json();
  console.log("Embeddings job completed:", result);

  return {
    job: 'embeddings',
    success: response.ok,
    result
  };
}

async function runRefreshMaterializedJob(supabase: any) {
  console.log("Running refresh materialized views job...");
  
  const { error } = await supabase.rpc('refresh_recs_materialized');
  
  if (error) {
    console.error("Error refreshing materialized views:", error);
    throw error;
  }

  console.log("Materialized views refreshed successfully");

  return {
    job: 'refresh_materialized',
    success: true,
    message: 'Materialized views refreshed'
  };
}

async function runAppealPrecomputeJob(supabase: any) {
  console.log("Running appeal precompute job...");
  
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/appeal-precompute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  const result = await response.json();
  console.log("Appeal precompute job completed:", result);

  return {
    job: 'appeal_precompute',
    success: response.ok,
    result
  };
}

async function runBanditDecayJob(supabase: any) {
  console.log("Running bandit decay job...");
  
  const { data, error } = await supabase
    .from('recs_bandit_arms')
    .update({ 
      alpha: supabase.sql`alpha * 0.99`
    })
    .lt('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .select();

  if (error) {
    console.error("Error decaying bandit arms:", error);
    throw error;
  }

  console.log(`Decayed ${data?.length || 0} bandit arms`);

  return {
    job: 'bandit_decay',
    success: true,
    decayed_count: data?.length || 0
  };
}

async function runCleanupCacheJob(supabase: any) {
  console.log("Running cache cleanup job...");
  
  const { data, error } = await supabase.rpc('cleanup_expired_cache');
  
  if (error) {
    console.error("Error cleaning up cache:", error);
    throw error;
  }

  console.log(`Cleaned up ${data || 0} expired cache entries`);

  return {
    job: 'cleanup_cache',
    success: true,
    cleaned_count: data || 0
  };
}

async function runAllJobs(supabase: any) {
  console.log("Running all scheduled jobs...");
  
  const results = [];
  
  try {
    results.push(await runRefreshMaterializedJob(supabase));
    results.push(await runEmbeddingsJob(supabase));
    results.push(await runAppealPrecomputeJob(supabase));
    results.push(await runBanditDecayJob(supabase));
    results.push(await runCleanupCacheJob(supabase));
  } catch (error) {
    console.error("Error in all jobs:", error);
    results.push({ job: 'error', success: false, error: error.message });
  }

  return {
    job: 'all',
    success: results.every(r => r.success),
    results
  };
}
