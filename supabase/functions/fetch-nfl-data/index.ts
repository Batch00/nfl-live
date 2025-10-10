import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ESPNGame {
  id: string;
  date: string;
  competitions: Array<{
    competitors: Array<{
      team: {
        displayName: string;
        abbreviation: string;
      };
      score: string;
      homeAway: string;
      statistics?: Array<{
        name: string;
        displayValue: string;
      }>;
    }>;
    status: {
      type: {
        state: string;
        description: string;
      };
      period: number;
      displayClock: string;
    };
    venue?: {
      fullName: string;
    };
    broadcasts?: Array<{
      market: string;
      names: string[];
    }>;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching NFL scoreboard from ESPN API...');
    
    // Fetch current NFL games from ESPN API
    const espnResponse = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
    );
    
    if (!espnResponse.ok) {
      throw new Error(`ESPN API returned ${espnResponse.status}`);
    }

    const espnData = await espnResponse.json();
    console.log(`Found ${espnData.events?.length || 0} games`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const snapshots = [];

    // Process each game
    for (const event of espnData.events || []) {
      try {
        const game = event as ESPNGame;
        const competition = game.competitions[0];
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

        if (!homeTeam || !awayTeam) continue;

        // Extract team statistics
        const extractStats = (competitor: any) => {
          const stats: Record<string, string> = {};
          if (competitor.statistics) {
            competitor.statistics.forEach((stat: any) => {
              stats[stat.name] = stat.displayValue;
            });
          }
          return stats;
        };

        // Create snapshot
        const snapshot = {
          game_id: game.id,
          game_date: new Date(game.date).toISOString().split('T')[0],
          home_team: homeTeam.team.displayName,
          away_team: awayTeam.team.displayName,
          home_team_abbr: homeTeam.team.abbreviation,
          away_team_abbr: awayTeam.team.abbreviation,
          home_score: parseInt(homeTeam.score) || 0,
          away_score: parseInt(awayTeam.score) || 0,
          quarter: competition.status.period,
          clock: competition.status.displayClock,
          game_status: competition.status.type.description,
          home_stats: extractStats(homeTeam),
          away_stats: extractStats(awayTeam),
          venue: competition.venue?.fullName || null,
          broadcast: competition.broadcasts?.[0]?.names?.[0] || null,
        };

        // Insert snapshot into database
        const { error } = await supabase
          .from('game_snapshots')
          .insert([snapshot]);

        if (error) {
          console.error(`Error inserting snapshot for game ${game.id}:`, error);
        } else {
          console.log(`Snapshot saved for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
          snapshots.push(snapshot);
        }
      } catch (gameError) {
        console.error('Error processing game:', gameError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapshots: snapshots.length,
        data: snapshots
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-nfl-data:', error);
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