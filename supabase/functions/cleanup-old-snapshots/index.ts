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

    // Delete snapshots older than 2 days using direct SQL for better performance
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`Deleting snapshots older than: ${twoDaysAgo}`);
    
    // Use raw SQL for bulk delete (more efficient than batch processing)
    const { data, error } = await supabase.rpc('delete_old_snapshots', {
      cutoff_date: twoDaysAgo
    });
    
    if (error) {
      console.error('Error deleting old snapshots:', error);
      throw error;
    }
    
    const totalDeleted = data || 0;
    console.log(`Deleted ${totalDeleted} old snapshots`);

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
