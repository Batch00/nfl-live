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

      // Get only the latest snapshot per game
      const latestGamesMap = new Map();
      for (const snapshot of data) {
        if (!latestGamesMap.has(snapshot.game_id)) {
          latestGamesMap.set(snapshot.game_id, snapshot);
        }
      }
      const latestGames = Array.from(latestGamesMap.values());

      // Create flattened CSV with one row per team per game
      const csvHeaders = [
        'Game ID', 'Team', 'Opponent', 'Status', 'Quarter', 'Clock', 'Venue', 'Broadcast', 'Game Date',
        'Team Score', 'Opponent Score',
        'Passing Yards', 'Completions', 'Attempts', 'Yards/Attempt', 'Yards/Completion',
        'Rushing Yards', 'Rush Attempts', 'Yards/Rush',
        'Total Yards', 'Total Plays', 'Yards/Play',
        'First Downs', 'First Downs Passing', 'First Downs Rushing', 'First Downs Penalty',
        'Third Down Conversions', 'Fourth Down Conversions',
        'Penalties', 'Penalty Yards',
        'Turnovers', 'Interceptions', 'Fumbles Lost',
        'Sacks', 'Sacks Yards Lost',
        'Red Zone Attempts', 'Red Zone Conversions',
        'Possession Time'
      ];

      let csv = csvHeaders.join(',') + '\n';

      // Helper function to safely get stat value
      const getStat = (stats: any, key: string, defaultValue: string = '—'): string => {
        if (!stats || stats[key] === null || stats[key] === undefined) return defaultValue;
        return String(stats[key]);
      };

      // Helper to parse compound values like "7-14" or "2-14"
      const parseCompound = (value: string | null | undefined, index: number): string => {
        if (!value) return '—';
        const parts = String(value).split('-');
        return parts[index] || '—';
      };

      // Process each game and create two rows (one for each team)
      for (const game of latestGames) {
        const homeStats = game.home_stats || {};
        const awayStats = game.away_stats || {};

        // Calculate derived stats
        const calcYardsPerCompletion = (netYards: any, completions: any): string => {
          const yards = parseFloat(netYards);
          const comps = parseFloat(String(completions).split('/')[0]);
          if (yards && comps) return (yards / comps).toFixed(1);
          return '—';
        };

        // Away team row
        const awayRow = [
          game.game_id,
          game.away_team,
          game.home_team,
          game.game_status,
          game.quarter || '0',
          game.clock || '—',
          game.venue || '—',
          game.broadcast || '—',
          game.game_date,
          game.away_score,
          game.home_score,
          getStat(awayStats, 'netPassingYards'),
          parseCompound(getStat(awayStats, 'completionAttempts'), 0),
          parseCompound(getStat(awayStats, 'completionAttempts'), 1),
          getStat(awayStats, 'yardsPerPass'),
          calcYardsPerCompletion(getStat(awayStats, 'netPassingYards'), getStat(awayStats, 'completionAttempts')),
          getStat(awayStats, 'rushingYards'),
          getStat(awayStats, 'rushingAttempts'),
          getStat(awayStats, 'yardsPerRushAttempt'),
          getStat(awayStats, 'totalYards'),
          getStat(awayStats, 'totalOffensivePlays'),
          getStat(awayStats, 'yardsPerPlay'),
          getStat(awayStats, 'firstDowns'),
          getStat(awayStats, 'firstDownsPassing'),
          getStat(awayStats, 'firstDownsRushing'),
          getStat(awayStats, 'firstDownsPenalty'),
          getStat(awayStats, 'thirdDownEff'),
          getStat(awayStats, 'fourthDownEff'),
          parseCompound(getStat(awayStats, 'totalPenaltiesYards'), 0),
          parseCompound(getStat(awayStats, 'totalPenaltiesYards'), 1),
          getStat(awayStats, 'turnovers'),
          getStat(awayStats, 'interceptions'),
          getStat(awayStats, 'fumblesLost'),
          parseCompound(getStat(awayStats, 'sacksYardsLost'), 0),
          parseCompound(getStat(awayStats, 'sacksYardsLost'), 1),
          parseCompound(getStat(awayStats, 'redZoneAttempts'), 1),
          parseCompound(getStat(awayStats, 'redZoneAttempts'), 0),
          getStat(awayStats, 'possessionTime')
        ].map(v => `"${v}"`);

        // Home team row
        const homeRow = [
          game.game_id,
          game.home_team,
          game.away_team,
          game.game_status,
          game.quarter || '0',
          game.clock || '—',
          game.venue || '—',
          game.broadcast || '—',
          game.game_date,
          game.home_score,
          game.away_score,
          getStat(homeStats, 'netPassingYards'),
          parseCompound(getStat(homeStats, 'completionAttempts'), 0),
          parseCompound(getStat(homeStats, 'completionAttempts'), 1),
          getStat(homeStats, 'yardsPerPass'),
          calcYardsPerCompletion(getStat(homeStats, 'netPassingYards'), getStat(homeStats, 'completionAttempts')),
          getStat(homeStats, 'rushingYards'),
          getStat(homeStats, 'rushingAttempts'),
          getStat(homeStats, 'yardsPerRushAttempt'),
          getStat(homeStats, 'totalYards'),
          getStat(homeStats, 'totalOffensivePlays'),
          getStat(homeStats, 'yardsPerPlay'),
          getStat(homeStats, 'firstDowns'),
          getStat(homeStats, 'firstDownsPassing'),
          getStat(homeStats, 'firstDownsRushing'),
          getStat(homeStats, 'firstDownsPenalty'),
          getStat(homeStats, 'thirdDownEff'),
          getStat(homeStats, 'fourthDownEff'),
          parseCompound(getStat(homeStats, 'totalPenaltiesYards'), 0),
          parseCompound(getStat(homeStats, 'totalPenaltiesYards'), 1),
          getStat(homeStats, 'turnovers'),
          getStat(homeStats, 'interceptions'),
          getStat(homeStats, 'fumblesLost'),
          parseCompound(getStat(homeStats, 'sacksYardsLost'), 0),
          parseCompound(getStat(homeStats, 'sacksYardsLost'), 1),
          parseCompound(getStat(homeStats, 'redZoneAttempts'), 1),
          parseCompound(getStat(homeStats, 'redZoneAttempts'), 0),
          getStat(homeStats, 'possessionTime')
        ].map(v => `"${v}"`);

        csv += awayRow.join(',') + '\n';
        csv += homeRow.join(',') + '\n';
      }

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="nfl_team_stats_${new Date().toISOString().split('T')[0]}.csv"`,
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