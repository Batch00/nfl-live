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
    const limitParam = url.searchParams.get('limit');
    const format = url.searchParams.get('format') || 'json'; // json or csv

    // Validate and parse limit with bounds
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam)), 10000) : 1000;
    if (limitParam && isNaN(limit)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid limit parameter. Must be a number between 1 and 10000.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate date format if provided
    const isValidDate = (dateString: string): boolean => {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(dateString)) return false;
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date.getTime());
    };

    if (startDate && !isValidDate(startDate)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid start_date format. Use YYYY-MM-DD.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (endDate && !isValidDate(endDate)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid end_date format. Use YYYY-MM-DD.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate format
    if (format && !['csv', 'json'].includes(format)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid format. Use csv or json.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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
      .limit(limit);

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
        'Pass Yards', 'Pass Completions', 'Pass Attempts', 'Yards/Pass Attempt', 'Yards/Pass Completion',
        'Rush Yards', 'Rush Attempts', 'Yards/Rush Attempt',
        'Total Yards', 'Total Plays', 'Yards/Play',
        'First Downs Total', 'First Downs Passing', 'First Downs Rushing', 'First Downs Penalty',
        'Third Down Conversions', 'Third Down Attempts', 'Fourth Down Conversions', 'Fourth Down Attempts',
        'Penalties', 'Penalty Yards',
        'Turnovers', 'Interceptions Thrown', 'Fumbles Lost',
        'Sacks Allowed', 'Sack Yards Lost',
        'Red Zone Attempts', 'Red Zone Conversions',
        'Possession Time'
      ];

      let csv = csvHeaders.join(',') + '\n';

      // Helper function to safely get stat value
      // Returns empty string for missing data (better for Excel)
      const getStat = (stats: any, key: string, defaultValue: string = ''): string => {
        if (!stats || stats[key] === null || stats[key] === undefined) return defaultValue;
        return String(stats[key]);
      };

      // Helper to parse compound values like "7-14" or "2-14"
      const parseCompound = (value: string | null | undefined, index: number): string => {
        if (!value) return '';
        const str = String(value);
        // Handle both slash and dash separators
        const parts = str.includes('/') ? str.split('/') : str.split('-');
        return parts[index] || '';
      };

      // Helper to format possession time to prevent Excel from treating as time of day
      const formatPossessionTime = (value: string | null | undefined): string => {
        if (!value) return '';
        // Single quote prefix forces text format in Excel
        return `'${value}`;
      };

      // Process each game and create two rows (one for each team)
      for (const game of latestGames) {
        const homeStats = game.home_stats || {};
        const awayStats = game.away_stats || {};

        // Calculate derived stats
        const calcYardsPerCompletion = (netYards: any, completions: any): string => {
          if (!netYards || !completions) return '';
          const yards = parseFloat(netYards);
          const comps = parseFloat(String(completions).split('/')[0]);
          if (yards && comps && !isNaN(yards) && !isNaN(comps)) {
            return (yards / comps).toFixed(1);
          }
          return '';
        };

        // Away team row
        const awayRow = [
          game.game_id,
          game.away_team,
          game.home_team,
          game.game_status,
          game.quarter || '0',
          game.clock || '',
          game.venue || '',
          game.broadcast || '',
          game.game_date,
          game.away_score || '0',
          game.home_score || '0',
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
          parseCompound(getStat(awayStats, 'thirdDownEff'), 0),
          parseCompound(getStat(awayStats, 'thirdDownEff'), 1),
          parseCompound(getStat(awayStats, 'fourthDownEff'), 0),
          parseCompound(getStat(awayStats, 'fourthDownEff'), 1),
          parseCompound(getStat(awayStats, 'totalPenaltiesYards'), 0),
          parseCompound(getStat(awayStats, 'totalPenaltiesYards'), 1),
          getStat(awayStats, 'turnovers'),
          getStat(awayStats, 'interceptions'),
          getStat(awayStats, 'fumblesLost'),
          parseCompound(getStat(awayStats, 'sacksYardsLost'), 0),
          parseCompound(getStat(awayStats, 'sacksYardsLost'), 1),
          parseCompound(getStat(awayStats, 'redZoneAttempts'), 1),
          parseCompound(getStat(awayStats, 'redZoneAttempts'), 0),
          formatPossessionTime(getStat(awayStats, 'possessionTime'))
        ].map(v => `"${v}"`);

        // Home team row
        const homeRow = [
          game.game_id,
          game.home_team,
          game.away_team,
          game.game_status,
          game.quarter || '0',
          game.clock || '',
          game.venue || '',
          game.broadcast || '',
          game.game_date,
          game.home_score || '0',
          game.away_score || '0',
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
          parseCompound(getStat(homeStats, 'thirdDownEff'), 0),
          parseCompound(getStat(homeStats, 'thirdDownEff'), 1),
          parseCompound(getStat(homeStats, 'fourthDownEff'), 0),
          parseCompound(getStat(homeStats, 'fourthDownEff'), 1),
          parseCompound(getStat(homeStats, 'totalPenaltiesYards'), 0),
          parseCompound(getStat(homeStats, 'totalPenaltiesYards'), 1),
          getStat(homeStats, 'turnovers'),
          getStat(homeStats, 'interceptions'),
          getStat(homeStats, 'fumblesLost'),
          parseCompound(getStat(homeStats, 'sacksYardsLost'), 0),
          parseCompound(getStat(homeStats, 'sacksYardsLost'), 1),
          parseCompound(getStat(homeStats, 'redZoneAttempts'), 1),
          parseCompound(getStat(homeStats, 'redZoneAttempts'), 0),
          formatPossessionTime(getStat(homeStats, 'possessionTime'))
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