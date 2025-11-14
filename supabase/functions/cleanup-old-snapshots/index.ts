import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting cleanup of old game snapshots...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Will delete snapshots older than: ${twoDaysAgo}`);

    // Start cleanup process
    const cleanupTask = (async () => {
      let totalDeleted = 0;
      let batchSize = 500; // Very small batches to avoid timeouts
      let hasMore = true;
      
      while (hasMore) {
        try {
          const { data, error } = await supabase.rpc('delete_old_snapshots_batch', {
            cutoff_date: twoDaysAgo,
            batch_limit: batchSize
          });
          
          if (error) {
            console.error('Error deleting batch:', error);
            break;
          }
          
          const deletedInBatch = data || 0;
          totalDeleted += deletedInBatch;
          console.log(`Deleted ${deletedInBatch} snapshots (total: ${totalDeleted})`);
          
          if (deletedInBatch < batchSize) {
            hasMore = false;
          }
          
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (e) {
          console.error('Batch deletion error:', e);
          break;
        }
      }
      
      console.log(`✅ Cleanup complete. Deleted ${totalDeleted} old snapshots.`);
    })();

    // Return immediately
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup started in background'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
