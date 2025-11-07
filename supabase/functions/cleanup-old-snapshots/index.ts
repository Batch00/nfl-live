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

    // Delete snapshots older than 2 days in batches to avoid timeouts
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    
    let totalDeleted = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Delete in batches of 1000
      const { data: oldSnapshots, error: selectError } = await supabase
        .from('game_snapshots')
        .select('id')
        .lt('created_at', twoDaysAgo)
        .limit(1000);

      if (selectError) {
        console.error('Error selecting old snapshots:', selectError);
        break;
      }

      if (!oldSnapshots || oldSnapshots.length === 0) {
        hasMore = false;
        break;
      }

      const ids = oldSnapshots.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('game_snapshots')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
        break;
      }

      totalDeleted += ids.length;
      console.log(`Deleted ${ids.length} snapshots (total: ${totalDeleted})`);
      
      // If we got fewer than 1000, we're done
      if (oldSnapshots.length < 1000) {
        hasMore = false;
      }
    }

    // Get final count
    const { count, error: countError } = await supabase
      .from('game_snapshots')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Cleanup complete. Deleted ${totalDeleted} old snapshots. ${count} snapshots remaining.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: totalDeleted,
        remaining: count || 0,
        message: 'Cleanup complete'
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
