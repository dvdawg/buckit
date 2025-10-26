import { serve } from "https:
import { createClient } from "https:

export const handler = serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const metricType = url.searchParams.get('type') || 'summary';

    let result;

    switch (metricType) {
      case 'ctr':
        const { data: ctrData } = await supabase
          .from('recs_ctr_7d')
          .select('*')
          .order('date', { ascending: false })
          .limit(7);
        result = { metric: 'ctr_7d', data: ctrData };
        break;

      case 'cpr':
        const { data: cprData } = await supabase
          .from('recs_cpr_7d')
          .select('*')
          .order('date', { ascending: false })
          .limit(7);
        result = { metric: 'cpr_7d', data: cprData };
        break;

      case 'coverage':
        const { data: coverageData } = await supabase
          .from('recs_coverage_k')
          .select('*')
          .order('date', { ascending: false })
          .limit(7);
        result = { metric: 'coverage_k', data: coverageData };
        break;

      case 'diversity':
        const { data: diversityData } = await supabase
          .from('recs_diversity_k')
          .select('*')
          .order('date', { ascending: false })
          .limit(7);
        result = { metric: 'diversity_k', data: diversityData };
        break;

      case 'latency':
        const { data: latencyData } = await supabase
          .from('recs_latency_p95')
          .select('*')
          .order('hour', { ascending: false })
          .limit(24);
        result = { metric: 'latency_p95', data: latencyData };
        break;

      case 'summary':
      default:
        const { data: summaryData } = await supabase
          .from('recs_metrics_summary')
          .select('*');
        result = { metric: 'summary', data: summaryData };
        break;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in metrics function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
