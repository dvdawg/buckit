import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ModelInferenceRequest {
  model_type: 'appeal_head' | 'user_vectors' | 'embeddings';
  inputs: number[][];
  version?: string;
}

interface ModelInferenceResponse {
  predictions: number[];
  model_version: string;
  inference_time_ms: number;
}

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: ModelInferenceRequest = await req.json();
    
    const startTime = Date.now();
    
    let result;
    switch (body.model_type) {
      case 'appeal_head':
        result = await runAppealHeadInference(supabase, body.inputs, body.version);
        break;
      case 'user_vectors':
        result = await computeUserVectors(supabase, body.inputs);
        break;
      case 'embeddings':
        result = await computeEmbeddings(supabase, body.inputs);
        break;
      default:
        throw new Error(`Unsupported model type: ${body.model_type}`);
    }
    
    const inferenceTime = Date.now() - startTime;
    
    const response: ModelInferenceResponse = {
      predictions: result.predictions,
      model_version: result.version,
      inference_time_ms: inferenceTime
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error in model-serving function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function runAppealHeadInference(supabase: any, inputs: number[][], version?: string) {
  // Get active model version if not specified
  let modelVersion = version;
  if (!modelVersion) {
    const { data: activeVersion } = await supabase
      .from('ml_model_versions')
      .select('version')
      .eq('model_type', 'appeal_head')
      .eq('is_active', true)
      .order('deployed_at', { ascending: false })
      .limit(1)
      .single();
    
    modelVersion = activeVersion?.version || 'default';
  }
  
  // For now, simulate appeal head inference
  // In production, this would load the actual ONNX model
  const predictions = inputs.map(input => {
    // Simple heuristic-based appeal scoring
    const avgInput = input.reduce((sum, val) => sum + val, 0) / input.length;
    const variance = input.reduce((sum, val) => sum + Math.pow(val - avgInput, 2), 0) / input.length;
    
    // Appeal score based on input characteristics
    let appealScore = 0.5; // Base score
    
    // Higher scores for more "interesting" inputs (higher variance, specific patterns)
    if (variance > 0.1) appealScore += 0.2;
    if (avgInput > 0.1) appealScore += 0.1;
    if (input.length > 100) appealScore += 0.1;
    
    // Add some randomness to simulate model uncertainty
    appealScore += (Math.random() - 0.5) * 0.1;
    
    return Math.max(0, Math.min(1, appealScore));
  });
  
  return {
    predictions,
    version: modelVersion
  };
}

async function computeUserVectors(supabase: any, inputs: number[][]) {
  // User vectors are computed from user events, not from direct input
  // This would typically be called with user IDs
  const userIds = inputs.map(input => input[0].toString()); // Assuming first element is user ID
  
  const userVectors = [];
  for (const userId of userIds) {
    const { data: userVector } = await supabase
      .from('user_vectors')
      .select('emb')
      .eq('user_id', userId)
      .single();
    
    if (userVector?.emb) {
      userVectors.push(userVector.emb);
    } else {
      // Return zero vector if no user vector exists
      userVectors.push(new Array(1536).fill(0));
    }
  }
  
  return {
    predictions: userVectors.flat(),
    version: 'current'
  };
}

async function computeEmbeddings(supabase: any, inputs: number[][]) {
  // This would typically be called with text inputs
  // For now, simulate embedding computation
  const embeddings = inputs.map(input => {
    // Simulate embedding by creating a normalized vector
    const magnitude = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return new Array(1536).fill(0);
    
    return input.map(val => val / magnitude);
  });
  
  return {
    predictions: embeddings.flat(),
    version: 'current'
  };
}

// Model loading and caching utilities
class ModelCache {
  private static instance: ModelCache;
  private models: Map<string, any> = new Map();
  
  static getInstance(): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache();
    }
    return ModelCache.instance;
  }
  
  async loadModel(supabase: any, modelType: string, version: string): Promise<any> {
    const cacheKey = `${modelType}:${version}`;
    
    if (this.models.has(cacheKey)) {
      return this.models.get(cacheKey);
    }
    
    // Load model from storage
    const { data: modelData } = await supabase
      .from('ml_model_storage')
      .select('file_data, file_type')
      .eq('model_version_id', version)
      .eq('file_type', 'onnx')
      .single();
    
    if (!modelData) {
      throw new Error(`Model ${modelType}:${version} not found in storage`);
    }
    
    // In production, this would load the ONNX model
    // For now, we'll create a mock model object
    const model = {
      type: modelType,
      version: version,
      loaded_at: new Date(),
      // Mock inference function
      predict: (inputs: number[][]) => {
        return inputs.map(input => Math.random());
      }
    };
    
    this.models.set(cacheKey, model);
    return model;
  }
  
  clearCache(): void {
    this.models.clear();
  }
}

// Health check endpoint
export async function healthCheck() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    models_loaded: ModelCache.getInstance().models.size
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
