import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get scheduled training jobs
    const { data: scheduledJobs, error: jobsError } = await supabase
      .rpc('get_next_training_jobs');
    
    if (jobsError) {
      throw new Error(`Failed to get scheduled jobs: ${jobsError.message}`);
    }

    const results = [];
    
    for (const job of scheduledJobs || []) {
      try {
        console.log(`Starting scheduled training for ${job.model_type}`);
        
        // Create training job
        const { data: trainingJob, error: createError } = await supabase
          .from('ml_training_jobs')
          .insert({
            model_type: job.model_type,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error(`Failed to create training job for ${job.model_type}:`, createError);
          continue;
        }

        // Start training asynchronously
        startTrainingJob(supabase, trainingJob.id, job.model_type);
        
        // Update schedule next run time
        await updateScheduleNextRun(supabase, job.id, job.cron_expression);
        
        results.push({
          model_type: job.model_type,
          job_id: trainingJob.id,
          status: 'started'
        });
        
      } catch (error) {
        console.error(`Error processing scheduled job ${job.model_type}:`, error);
        results.push({
          model_type: job.model_type,
          status: 'error',
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${results.length} scheduled training jobs`,
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error in scheduled-training function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function startTrainingJob(supabase: any, jobId: string, modelType: string) {
  try {
    // Update job status to running
    await supabase
      .from('ml_training_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    let result;
    switch (modelType) {
      case 'appeal_head':
        result = await trainAppealHeadModel(supabase);
        break;
      case 'user_vectors':
        result = await refreshUserVectors(supabase);
        break;
      case 'embeddings':
        result = await refreshEmbeddings(supabase);
        break;
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }

    // Update job as completed
    await supabase
      .from('ml_training_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metrics: result.metrics,
        model_version: result.version
      })
      .eq('id', jobId);

    // Deploy the new model if it's an appeal head model
    if (modelType === 'appeal_head') {
      await deployModel(supabase, modelType, result.version);
    }

    console.log(`Training job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Training job ${jobId} failed:`, error);
    
    // Update job as failed
    await supabase
      .from('ml_training_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', jobId);
  }
}

async function trainAppealHeadModel(supabase: any) {
  console.log("Training appeal head model...");
  
  // For now, we'll simulate the training process
  // In production, this would call the actual Python training script
  const modelVersion = `v${Date.now()}`;
  
  // Simulate training metrics
  const metrics = {
    training_samples: Math.floor(Math.random() * 1000) + 500,
    model_accuracy: 0.8 + Math.random() * 0.15,
    training_duration_ms: 30000 + Math.floor(Math.random() * 20000),
    model_size_mb: 2.0 + Math.random() * 1.0
  };

  // Store model version
  await supabase
    .from('ml_model_versions')
    .insert({
      model_type: 'appeal_head',
      version: modelVersion,
      metrics: metrics,
      model_size_bytes: Math.floor(metrics.model_size_mb * 1024 * 1024)
    });

  return {
    version: modelVersion,
    metrics
  };
}

async function refreshUserVectors(supabase: any) {
  console.log("Refreshing user vectors...");
  
  // Refresh materialized views
  const { error } = await supabase.rpc('refresh_recs_materialized');
  if (error) {
    throw new Error(`Failed to refresh user vectors: ${error.message}`);
  }

  // Get updated count
  const { count } = await supabase
    .from('user_vectors')
    .select('*', { count: 'exact', head: true });

  return {
    version: `v${Date.now()}`,
    metrics: {
      user_vectors_count: count || 0,
      refresh_duration_ms: 5000
    }
  };
}

async function refreshEmbeddings(supabase: any) {
  console.log("Refreshing embeddings...");
  
  // Call embeddings function
  const embeddingsResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ limit: 500 })
  });

  if (!embeddingsResponse.ok) {
    throw new Error(`Failed to refresh embeddings: ${embeddingsResponse.statusText}`);
  }

  const result = await embeddingsResponse.json();

  return {
    version: `v${Date.now()}`,
    metrics: {
      embeddings_updated: result.updated || 0,
      refresh_duration_ms: 15000
    }
  };
}

async function deployModel(supabase: any, modelType: string, version: string) {
  console.log(`Deploying ${modelType} model version ${version}...`);
  
  // Deactivate other versions
  await supabase
    .from('ml_model_versions')
    .update({ is_active: false })
    .eq('model_type', modelType);

  // Activate new version
  await supabase
    .from('ml_model_versions')
    .update({
      is_active: true,
      deployed_at: new Date().toISOString()
    })
    .eq('model_type', modelType)
    .eq('version', version);
}

async function updateScheduleNextRun(supabase: any, scheduleId: string, cronExpression: string) {
  // Simple cron parser for common patterns
  const nextRun = calculateNextRun(cronExpression);
  
  await supabase
    .from('ml_training_schedules')
    .update({
      last_run: new Date().toISOString(),
      next_run: nextRun.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId);
}

function calculateNextRun(cronExpression: string): Date {
  // Simple implementation for common cron patterns
  // In production, use a proper cron library
  const now = new Date();
  const nextRun = new Date(now);
  
  if (cronExpression === '0 2 * * *') {
    // Daily at 2 AM
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0);
  } else if (cronExpression === '0 */6 * * *') {
    // Every 6 hours
    nextRun.setHours(nextRun.getHours() + 6);
    nextRun.setMinutes(0, 0, 0);
  } else if (cronExpression === '0 1 * * *') {
    // Daily at 1 AM
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(1, 0, 0, 0);
  } else {
    // Default: run again in 1 hour
    nextRun.setHours(nextRun.getHours() + 1);
  }
  
  return nextRun;
}
