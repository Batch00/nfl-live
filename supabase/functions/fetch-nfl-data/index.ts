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
    odds?: Array<{
      details?: string;
      overUnder?: number;
      spread?: number;
      homeTeamOdds?: {
        moneyLine?: number;
      };
      awayTeamOdds?: {
        moneyLine?: number;
      };
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

        // Extract betting lines
        const bettingLines: Record<string, any> = {};
        if (competition.odds && competition.odds.length > 0) {
          const odds = competition.odds[0];
          bettingLines.spread = odds.spread || null;
          bettingLines.overUnder = odds.overUnder || null;
          bettingLines.homeMoneyline = odds.homeTeamOdds?.moneyLine || null;
          bettingLines.awayMoneyline = odds.awayTeamOdds?.moneyLine || null;
          bettingLines.details = odds.details || null;
        }

        // Fetch detailed game summary for stats and play-by-play data
        let playByPlay: any[] = [];
        let detailedHomeStats: Record<string, string> = {};
        let detailedAwayStats: Record<string, string> = {};
        
        try {
          const summaryResponse = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${game.id}`
          );
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            
            // Extract team statistics from detailed summary
            if (summaryData.boxscore?.teams) {
              for (const team of summaryData.boxscore.teams) {
                const teamStats: Record<string, string> = {};
                if (team.statistics) {
                  for (const stat of team.statistics) {
                    // Map common stat names to readable format
                    const statName = stat.name.replace(/([A-Z])/g, ' $1').trim();
                    teamStats[stat.name] = stat.displayValue;
                  }
                }
                
                if (team.homeAway === 'home') {
                  detailedHomeStats = teamStats;
                } else {
                  detailedAwayStats = teamStats;
                }
              }
              
              if (Object.keys(detailedHomeStats).length > 0 || Object.keys(detailedAwayStats).length > 0) {
                console.log(`Extracted team stats for game ${game.id}`);
              }
            }
            
            // Extract play-by-play data
            if (summaryData.drives?.previous) {
              playByPlay = summaryData.drives.previous.map((drive: any) => ({
                id: drive.id,
                team: drive.team?.abbreviation || null,
                description: drive.description || null,
                plays: drive.plays?.map((play: any) => ({
                  id: play.id,
                  type: play.type?.text || null,
                  text: play.text || null,
                  awayScore: play.awayScore || 0,
                  homeScore: play.homeScore || 0,
                  period: play.period?.number || null,
                  clock: play.clock?.displayValue || null,
                  scoringPlay: play.scoringPlay || false,
                  yards: play.statYardage || 0,
                  down: play.start?.down || null,
                  distance: play.start?.distance || null,
                  yardLine: play.start?.yardLine || null,
                })) || [],
              }));
            }
          }
        } catch (summaryError) {
          console.error(`Error fetching summary for game ${game.id}:`, summaryError);
        }

        // Create snapshot - use detailed stats if available, otherwise fallback to basic stats
        const finalHomeStats = Object.keys(detailedHomeStats).length > 0 ? detailedHomeStats : extractStats(homeTeam);
        const finalAwayStats = Object.keys(detailedAwayStats).length > 0 ? detailedAwayStats : extractStats(awayTeam);
        
        const snapshot = {
          game_id: game.id,
          game_date: new Date(game.date).toISOString().split('T')[0],
          game_start_time: game.date,
          home_team: homeTeam.team.displayName,
          away_team: awayTeam.team.displayName,
          home_team_abbr: homeTeam.team.abbreviation,
          away_team_abbr: awayTeam.team.abbreviation,
          home_score: parseInt(homeTeam.score) || 0,
          away_score: parseInt(awayTeam.score) || 0,
          quarter: competition.status.period,
          clock: competition.status.displayClock,
          game_status: competition.status.type.description,
          home_stats: finalHomeStats,
          away_stats: finalAwayStats,
          venue: competition.venue?.fullName || null,
          broadcast: competition.broadcasts?.[0]?.names?.[0] || null,
          betting_lines: bettingLines,
          play_by_play: playByPlay,
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