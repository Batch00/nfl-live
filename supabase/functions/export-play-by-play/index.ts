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

    // Validate game_id is provided and not empty
    if (!gameId || gameId.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'game_id parameter is required and cannot be empty'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate game_id format (basic validation - should be alphanumeric)
    if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid game_id format. Must contain only alphanumeric characters, hyphens, or underscores.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Export play-by-play request for game:', gameId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the latest snapshot for this game
    const { data, error } = await supabase
      .from('game_snapshots')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Game not found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('Found game snapshot:', data.game_id);

    const playByPlay = data.play_by_play || [];

    if (playByPlay.length === 0) {
      return new Response(
        'No play-by-play data available for this game',
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
          status: 200,
        }
      );
    }

    // Build CSV with game metadata at the top
    let csv = '';
    
    // Add game metadata header
    csv += `Game Metadata\n`;
    csv += `Game ID,${data.game_id}\n`;
    csv += `Date,${data.game_date}\n`;
    csv += `Home Team,${data.home_team}\n`;
    csv += `Away Team,${data.away_team}\n`;
    csv += `Status,${data.game_status}\n`;
    csv += `Venue,${data.venue || 'N/A'}\n`;
    csv += `Broadcast,${data.broadcast || 'N/A'}\n`;
    csv += `Export Time,${new Date().toISOString()}\n`;
    csv += `\n`;
    
    // Add play-by-play data
    csv += `Play-by-Play Data\n`;
    
    // Flatten the drives and plays into rows
    const rows: any[] = [];
    
    for (const drive of playByPlay) {
      if (drive.plays && Array.isArray(drive.plays)) {
        for (const play of drive.plays) {
          rows.push({
            drive_team: drive.team || '',
            drive_description: drive.description || '',
            play_quarter: play.period || '',
            play_clock: play.clock || '',
            play_down: play.down || '',
            play_distance: play.distance || '',
            play_yard_line: play.yardLine || '',
            play_description: play.text || '',
            play_type: play.type || '',
            play_scored: play.scoringPlay ? 'Yes' : 'No',
            home_score: play.homeScore || 0,
            away_score: play.awayScore || 0,
          });
        }
      }
    }

    if (rows.length === 0) {
      csv += 'No plays available\n';
    } else {
      // CSV headers for play-by-play
      const headers = [
        'Drive Team', 'Drive Description', 'Quarter', 'Clock', 
        'Down', 'Distance', 'Yard Line', 'Play Description', 
        'Play Type', 'Scored', 'Home Score', 'Away Score'
      ];
      
      csv += headers.join(',') + '\n';

      // CSV rows
      for (const row of rows) {
        const values = [
          row.drive_team,
          row.drive_description,
          row.play_quarter,
          row.play_clock,
          row.play_down,
          row.play_distance,
          row.play_yard_line,
          row.play_description,
          row.play_type,
          row.play_scored,
          row.home_score,
          row.away_score,
        ].map(val => {
          const str = String(val || '');
          // Escape quotes and wrap in quotes if contains comma or quote
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        
        csv += values.join(',') + '\n';
      }
    }

    const filename = `play_by_play_${data.away_team_abbr}_vs_${data.home_team_abbr}_${data.game_date}.csv`;

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error in export-play-by-play:', error);
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
