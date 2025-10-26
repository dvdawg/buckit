import { serve } from "https:
import { createClient } from "https:

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const view = url.searchParams.get('view') || 'dashboard';

    switch (view) {
      case 'dashboard':
        return await getDashboard(supabase);
      case 'jobs':
        return await getTrainingJobs(supabase, url.searchParams);
      case 'models':
        return await getModelVersions(supabase);
      case 'metrics':
        return await getTrainingMetrics(supabase);
      case 'health':
        return await getSystemHealth(supabase);
      default:
        return new Response(JSON.stringify({ error: "Invalid view" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in training-monitor function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function getDashboard(supabase: any) {
  const { data: summary } = await supabase
    .from('ml_training_summary')
    .select('*');

  const { data: recentJobs } = await supabase
    .from('ml_training_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: activeModels } = await supabase
    .from('ml_model_versions')
    .select('*')
    .eq('is_active', true);

  const { data: systemMetrics } = await supabase
    .from('recs_metrics_summary')
    .select('*');

  return new Response(JSON.stringify({
    summary: summary || [],
    recent_jobs: recentJobs || [],
    active_models: activeModels || [],
    system_metrics: systemMetrics || [],
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function getTrainingJobs(supabase: any, params: URLSearchParams) {
  const modelType = params.get('model_type');
  const status = params.get('status');
  const limit = parseInt(params.get('limit') || '50');
  const offset = parseInt(params.get('offset') || '0');

  let query = supabase
    .from('ml_training_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (modelType) {
    query = query.eq('model_type', modelType);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: jobs, error } = await query;

  if (error) {
    throw new Error(`Failed to get training jobs: ${error.message}`);
  }

  return new Response(JSON.stringify({
    jobs: jobs || [],
    pagination: {
      limit,
      offset,
      has_more: (jobs?.length || 0) === limit
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function getModelVersions(supabase: any) {
  const { data: models, error } = await supabase
    .from('ml_model_versions')
    .select('*')
    .order('deployed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get model versions: ${error.message}`);
  }

  const groupedModels = (models || []).reduce((acc: any, model: any) => {
    if (!acc[model.model_type]) {
      acc[model.model_type] = [];
    }
    acc[model.model_type].push(model);
    return acc;
  }, {});

  return new Response(JSON.stringify({
    models: groupedModels,
    total_models: models?.length || 0
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function getTrainingMetrics(supabase: any) {
  const { data: jobMetrics } = await supabase
    .from('ml_training_jobs')
    .select('model_type, status, created_at, metrics')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  const { data: modelMetrics } = await supabase
    .from('ml_model_versions')
    .select('model_type, version, metrics, deployed_at')
    .eq('is_active', true);

  const successRates = (jobMetrics || []).reduce((acc: any, job: any) => {
    if (!acc[job.model_type]) {
      acc[job.model_type] = { total: 0, successful: 0 };
    }
    acc[job.model_type].total++;
    if (job.status === 'completed') {
      acc[job.model_type].successful++;
    }
    return acc;
  }, {});

  const avgTrainingTimes = (jobMetrics || [])
    .filter(job => job.status === 'completed' && job.metrics?.training_duration_ms)
    .reduce((acc: any, job: any) => {
      if (!acc[job.model_type]) {
        acc[job.model_type] = [];
      }
      acc[job.model_type].push(job.metrics.training_duration_ms);
      return acc;
    }, {});

  Object.keys(avgTrainingTimes).forEach(modelType => {
    const times = avgTrainingTimes[modelType];
    avgTrainingTimes[modelType] = {
      average: times.reduce((sum: number, time: number) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  });

  return new Response(JSON.stringify({
    success_rates: successRates,
    average_training_times: avgTrainingTimes,
    recent_jobs: jobMetrics || [],
    active_models: modelMetrics || [],
    period: '7d'
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function getSystemHealth(supabase: any) {
  const { data: dbCheck } = await supabase
    .from('ml_training_jobs')
    .select('count')
    .limit(1);

  const functionChecks = await Promise.allSettled([
    checkFunctionHealth(supabase, 'recommend'),
    checkFunctionHealth(supabase, 'embeddings'),
    checkFunctionHealth(supabase, 'model-training'),
    checkFunctionHealth(supabase, 'metrics')
  ]);

  const functionStatus = functionChecks.map((result, index) => ({
    function: ['recommend', 'embeddings', 'model-training', 'metrics'][index],
    status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    error: result.status === 'rejected' ? result.reason.message : null
  }));

  const { data: recentErrors } = await supabase
    .from('ml_training_jobs')
    .select('status, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const errorRate = recentErrors ? 
    recentErrors.filter(job => job.status === 'failed').length / recentErrors.length : 0;

  return new Response(JSON.stringify({
    database: dbCheck ? 'healthy' : 'unhealthy',
    functions: functionStatus,
    error_rate_24h: errorRate,
    overall_status: errorRate < 0.1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function checkFunctionHealth(supabase: any, functionName: string) {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${functionName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    throw new Error(`Function ${functionName} health check failed: ${error.message}`);
  }
}
