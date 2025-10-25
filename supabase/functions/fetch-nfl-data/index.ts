import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for TheOddsAPI response
interface OddsAPIGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

// Fetch odds from TheOddsAPI
async function fetchOddsFromAPI(): Promise<Map<string, any>> {
  const oddsApiKey = Deno.env.get('ODDS_API_KEY');
  const oddsMap = new Map<string, any>();
  
  if (!oddsApiKey) {
    console.warn('ODDS_API_KEY not configured - skipping odds fetch');
    return oddsMap;
  }

  try {
    // Fetch NFL odds from TheOddsAPI
    const oddsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    );

    if (!oddsResponse.ok) {
      console.error(`TheOddsAPI returned ${oddsResponse.status}: ${await oddsResponse.text()}`);
      return oddsMap;
    }

    const oddsData: OddsAPIGame[] = await oddsResponse.json();
    console.log(`Fetched odds for ${oddsData.length} games from TheOddsAPI`);

    // Map odds by team matchup for easy lookup
    for (const game of oddsData) {
      const key = `${game.away_team}_${game.home_team}`.toLowerCase().replace(/\s+/g, '_');
      
      // Parse odds from multiple bookmakers (use consensus/average)
      const parsedOdds: any = {
        commence_time: game.commence_time,
        bookmakers: [],
        consensus: {
          home_ml: null,
          away_ml: null,
          spread: null,
          spread_odds: null,
          total: null,
          over_odds: null,
          under_odds: null,
        },
        last_update: new Date().toISOString(),
      };

      // Extract odds from each bookmaker
      for (const bookmaker of game.bookmakers) {
        const bookmakerOdds: any = {
          name: bookmaker.title,
          last_update: bookmaker.last_update,
        };

        for (const market of bookmaker.markets) {
          if (market.key === 'h2h') {
            // Moneyline
            const homeML = market.outcomes.find(o => o.name === game.home_team);
            const awayML = market.outcomes.find(o => o.name === game.away_team);
            bookmakerOdds.home_moneyline = homeML?.price || null;
            bookmakerOdds.away_moneyline = awayML?.price || null;
          } else if (market.key === 'spreads') {
            // Spread
            const homeSpread = market.outcomes.find(o => o.name === game.home_team);
            const awaySpread = market.outcomes.find(o => o.name === game.away_team);
            bookmakerOdds.home_spread = homeSpread?.point || null;
            bookmakerOdds.home_spread_odds = homeSpread?.price || null;
            bookmakerOdds.away_spread = awaySpread?.point || null;
            bookmakerOdds.away_spread_odds = awaySpread?.price || null;
          } else if (market.key === 'totals') {
            // Over/Under
            const over = market.outcomes.find(o => o.name === 'Over');
            const under = market.outcomes.find(o => o.name === 'Under');
            bookmakerOdds.total = over?.point || under?.point || null;
            bookmakerOdds.over_odds = over?.price || null;
            bookmakerOdds.under_odds = under?.price || null;
          }
        }

        parsedOdds.bookmakers.push(bookmakerOdds);
      }

      // Calculate consensus (average of all bookmakers)
      if (parsedOdds.bookmakers.length > 0) {
        const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        
        const homeMLs = parsedOdds.bookmakers.map((b: any) => b.home_moneyline).filter((v: any) => v !== null);
        const awayMLs = parsedOdds.bookmakers.map((b: any) => b.away_moneyline).filter((v: any) => v !== null);
        const homeSpreads = parsedOdds.bookmakers.map((b: any) => b.home_spread).filter((v: any) => v !== null);
        const totals = parsedOdds.bookmakers.map((b: any) => b.total).filter((v: any) => v !== null);
        
        parsedOdds.consensus.home_ml = calcAvg(homeMLs);
        parsedOdds.consensus.away_ml = calcAvg(awayMLs);
        parsedOdds.consensus.spread = calcAvg(homeSpreads);
        parsedOdds.consensus.total = calcAvg(totals);
      }

      oddsMap.set(key, parsedOdds);
    }

    // Log remaining API usage
    const remaining = oddsResponse.headers.get('x-requests-remaining');
    if (remaining) {
      console.log(`TheOddsAPI requests remaining: ${remaining}`);
    }

  } catch (error) {
    console.error('Error fetching odds from TheOddsAPI:', error);
  }

  return oddsMap;
}

// Helper to match ESPN team name to Odds API team name
function normalizeTeamName(teamName: string): string {
  return teamName.toLowerCase().replace(/\s+/g, '_');
}

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
    
    // Fetch odds from TheOddsAPI in parallel with ESPN data
    const [espnResponse, oddsMap] = await Promise.all([
      fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'),
      fetchOddsFromAPI()
    ]);
    
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

        // Extract betting lines from ESPN (fallback)
        const espnBettingLines: Record<string, any> = {};
        if (competition.odds && competition.odds.length > 0) {
          const odds = competition.odds[0];
          espnBettingLines.spread = odds.spread || null;
          espnBettingLines.overUnder = odds.overUnder || null;
          espnBettingLines.homeMoneyline = odds.homeTeamOdds?.moneyLine || null;
          espnBettingLines.awayMoneyline = odds.awayTeamOdds?.moneyLine || null;
          espnBettingLines.details = odds.details || null;
          espnBettingLines.source = 'ESPN';
        }

        // Try to match with TheOddsAPI odds
        const oddsKey = `${normalizeTeamName(awayTeam.team.displayName)}_${normalizeTeamName(homeTeam.team.displayName)}`;
        const oddsApiData = oddsMap.get(oddsKey);

        // Merge betting lines - prefer TheOddsAPI if available, fallback to ESPN
        const bettingLines: Record<string, any> = oddsApiData ? {
          // TheOddsAPI data (more detailed)
          source: 'TheOddsAPI',
          game_state: competition.status.type.description, // Pregame, In Progress, Halftime, Final
          last_update: oddsApiData.last_update,
          consensus: oddsApiData.consensus,
          bookmakers: oddsApiData.bookmakers,
          // Keep ESPN data as fallback
          espn_fallback: espnBettingLines,
        } : {
          // ESPN only
          ...espnBettingLines,
          game_state: competition.status.type.description,
          last_update: new Date().toISOString(),
        };

        // Log if odds were found
        if (oddsApiData) {
          console.log(`Matched odds for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation} from TheOddsAPI`);
        } else if (Object.keys(espnBettingLines).length > 0) {
          console.log(`Using ESPN odds for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
        } else {
          console.log(`No odds available for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
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