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
    const url = new URL(req.url);
    const gameId = url.searchParams.get('game_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = url.searchParams.get('limit') || '1000';
    const format = url.searchParams.get('format') || 'json'; // json or csv

    console.log('Export request:', { gameId, startDate, endDate, limit, format });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('game_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    if (startDate) {
      query = query.gte('game_date', startDate);
    }

    if (endDate) {
      query = query.lte('game_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    console.log(`Retrieved ${data?.length || 0} snapshots`);

    // Return data in requested format
    if (format === 'csv') {
      // Convert to CSV
      if (!data || data.length === 0) {
        return new Response('No data found', {
          headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
          status: 200,
        });
      }

      // CSV headers
      const headers = [
        'id', 'created_at', 'game_id', 'game_date',
        'home_team', 'away_team', 'home_team_abbr', 'away_team_abbr',
        'home_score', 'away_score', 'quarter', 'clock', 'game_status',
        'venue', 'broadcast', 'home_stats', 'away_stats', 'drives'
      ];

      let csv = headers.join(',') + '\n';

      // CSV rows
      for (const row of data) {
        const values = headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'object') {
            value = JSON.stringify(value).replace(/"/g, '""');
          }
          return `"${value}"`;
        });
        csv += values.join(',') + '\n';
      }

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="nfl_data_${new Date().toISOString()}.csv"`,
        },
        status: 200,
      });
    } else {
      // Return JSON
      return new Response(
        JSON.stringify({
          success: true,
          count: data?.length || 0,
          data: data || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Error in export-game-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});