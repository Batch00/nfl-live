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

// Fetch ESPN FPI (Football Power Index) rankings
async function fetchFPIRankings(): Promise<Map<string, any>> {
  const fpiMap = new Map<string, any>();
  
  try {
    // Try ESPN's FPI endpoint - this follows their typical API pattern
    const fpiResponse = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/fpi'
    );

    if (!fpiResponse.ok) {
      console.warn(`FPI API returned ${fpiResponse.status} - FPI data unavailable`);
      return fpiMap;
    }

    const fpiData = await fpiResponse.json();
    
    // Parse FPI data and map by team abbreviation
    if (fpiData && fpiData.teams) {
      for (const team of fpiData.teams) {
        const teamAbbr = team.abbreviation || team.team?.abbreviation;
        if (teamAbbr) {
          fpiMap.set(teamAbbr.toUpperCase(), {
            fpi: team.fpi || null,
            fpi_rank: team.rank || null,
            projected_wins: team.projectedWins || null,
            projected_losses: team.projectedLosses || null,
          });
        }
      }
      console.log(`Fetched FPI rankings for ${fpiMap.size} teams`);
    }
  } catch (error) {
    console.warn('Failed to fetch FPI rankings:', error);
  }
  
  return fpiMap;
}

// Fetch ESPN Standings and calculate rankings
// Note: ESPN doesn't provide rankings directly, so we calculate them based on win percentage
async function fetchStandings(espnData: any): Promise<Map<string, any>> {
  const standingsMap = new Map<string, any>();
  const teamsByConference = new Map<string, any[]>();
  
  // NFL team abbreviations mapped to conferences
  const teamConferences: { [key: string]: string } = {
    // AFC
    'BAL': 'AFC', 'BUF': 'AFC', 'CIN': 'AFC', 'CLE': 'AFC',
    'DEN': 'AFC', 'HOU': 'AFC', 'IND': 'AFC', 'JAX': 'AFC',
    'KC': 'AFC', 'LV': 'AFC', 'LAC': 'AFC', 'MIA': 'AFC',
    'NE': 'AFC', 'NYJ': 'AFC', 'PIT': 'AFC', 'TEN': 'AFC',
    // NFC
    'ARI': 'NFC', 'ATL': 'NFC', 'CAR': 'NFC', 'CHI': 'NFC',
    'DAL': 'NFC', 'DET': 'NFC', 'GB': 'NFC', 'LAR': 'NFC',
    'MIN': 'NFC', 'NO': 'NFC', 'NYG': 'NFC', 'PHI': 'NFC',
    'SEA': 'NFC', 'SF': 'NFC', 'TB': 'NFC', 'WSH': 'NFC'
  };
  
  try {
    // Extract team records from the game data
    if (espnData && espnData.events) {
      for (const event of espnData.events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;
        
        for (const competitor of competition.competitors) {
          const team = competitor.team;
          const teamAbbr = team?.abbreviation?.toUpperCase();
          
          if (teamAbbr && competitor.records) {
            // Find overall record
            const overallRecord = competitor.records.find((r: any) => r.type === 'total');
            if (overallRecord) {
              const recordParts = overallRecord.summary.split('-');
              const wins = parseInt(recordParts[0]) || 0;
              const losses = parseInt(recordParts[1]) || 0;
              const ties = parseInt(recordParts[2]) || 0;
              
              // Calculate win percentage
              const totalGames = wins + losses + ties;
              const winPct = totalGames > 0 ? (wins + (ties * 0.5)) / totalGames : 0;
              
              // Get conference from mapping
              const conference = teamConferences[teamAbbr] || 'Unknown';
              
              const teamData = {
                abbr: teamAbbr,
                conference: conference,
                record: overallRecord.summary,
                wins: wins,
                losses: losses,
                ties: ties,
                winPct: winPct,
                differential: 0 // Will be calculated if available
              };
              
              // Group by conference for ranking calculation
              const confKey = teamData.conference;
              if (!teamsByConference.has(confKey)) {
                teamsByConference.set(confKey, []);
              }
              const confTeams = teamsByConference.get(confKey);
              if (confTeams) {
                confTeams.push(teamData);
              }
            }
          }
        }
      }
      
      // Calculate rankings within each conference
      for (const [conference, teams] of teamsByConference) {
        // Sort by win percentage (descending)
        teams.sort((a: any, b: any) => b.winPct - a.winPct);
        
        // Assign ranks
        teams.forEach((team: any, index: number) => {
          const rank = index + 1;
          standingsMap.set(team.abbr, {
            rank: `${rank} (${conference})`,
            record: team.record,
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            differential: team.differential !== 0 ? (team.differential > 0 ? `+${team.differential}` : team.differential.toString()) : 'N/A',
          });
        });
      }
      
      console.log(`Calculated standings and rankings for ${standingsMap.size} teams`);
    }
  } catch (error) {
    console.warn('Failed to extract standings:', error);
  }
  
  return standingsMap;
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
    // Fetch NFL odds from TheOddsAPI - only full game markets (second half fetched separately per-event)
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
        event_id: game.id, // Store TheOddsAPI event ID for second half odds fetch
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
        // second_half will be added later for halftime games
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
            // Full game moneyline
            const homeML = market.outcomes.find(o => o.name === game.home_team);
            const awayML = market.outcomes.find(o => o.name === game.away_team);
            bookmakerOdds.home_moneyline = homeML?.price || null;
            bookmakerOdds.away_moneyline = awayML?.price || null;
          } else if (market.key === 'spreads') {
            // Full game spread
            const homeSpread = market.outcomes.find(o => o.name === game.home_team);
            const awaySpread = market.outcomes.find(o => o.name === game.away_team);
            bookmakerOdds.home_spread = homeSpread?.point || null;
            bookmakerOdds.home_spread_odds = homeSpread?.price || null;
            bookmakerOdds.away_spread = awaySpread?.point || null;
            bookmakerOdds.away_spread_odds = awaySpread?.price || null;
          } else if (market.key === 'totals') {
            // Full game over/under
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
      // Filter out both null and undefined values to ignore missing odds
      const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      
      if (parsedOdds.bookmakers.length > 0) {
        const homeMLs = parsedOdds.bookmakers.map((b: any) => b.home_moneyline).filter((v: any) => typeof v === 'number');
        const awayMLs = parsedOdds.bookmakers.map((b: any) => b.away_moneyline).filter((v: any) => typeof v === 'number');
        const homeSpreads = parsedOdds.bookmakers.map((b: any) => b.home_spread).filter((v: any) => typeof v === 'number');
        const spreadOdds = parsedOdds.bookmakers.map((b: any) => b.home_spread_odds).filter((v: any) => typeof v === 'number');
        const totals = parsedOdds.bookmakers.map((b: any) => b.total).filter((v: any) => typeof v === 'number');
        const overOdds = parsedOdds.bookmakers.map((b: any) => b.over_odds).filter((v: any) => typeof v === 'number');
        const underOdds = parsedOdds.bookmakers.map((b: any) => b.under_odds).filter((v: any) => typeof v === 'number');
        
        parsedOdds.consensus.home_ml = calcAvg(homeMLs);
        parsedOdds.consensus.away_ml = calcAvg(awayMLs);
        parsedOdds.consensus.spread = calcAvg(homeSpreads);
        parsedOdds.consensus.spread_odds = calcAvg(spreadOdds);
        parsedOdds.consensus.total = calcAvg(totals);
        parsedOdds.consensus.over_odds = calcAvg(overOdds);
        parsedOdds.consensus.under_odds = calcAvg(underOdds);
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

// Fetch second half odds for a specific event (TheOddsAPI event ID)
async function fetchSecondHalfOdds(theOddsApiEventId: string): Promise<any | null> {
  const oddsApiKey = Deno.env.get('ODDS_API_KEY');
  
  if (!oddsApiKey) {
    return null;
  }

  try {
    // Use per-event endpoint to get second half markets
    const oddsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${theOddsApiEventId}/odds?apiKey=${oddsApiKey}&regions=us&markets=h2h_h2,spreads_h2,totals_h2&oddsFormat=american`
    );

    if (!oddsResponse.ok) {
      console.error(`TheOddsAPI event odds returned ${oddsResponse.status}: ${await oddsResponse.text()}`);
      return null;
    }

    const eventOdds: OddsAPIGame = await oddsResponse.json();
    
    // Parse second half odds from bookmakers
    const secondHalfData: any = {
      consensus: {
        home_ml: null,
        away_ml: null,
        spread: null,
        spread_odds: null,
        total: null,
        over_odds: null,
      },
      bookmakers: [],
    };

    for (const bookmaker of eventOdds.bookmakers || []) {
      const bookmakerOdds: any = { name: bookmaker.title };

      for (const market of bookmaker.markets) {
        if (market.key === 'h2h_h2') {
          const homeML = market.outcomes.find(o => o.name === eventOdds.home_team);
          const awayML = market.outcomes.find(o => o.name === eventOdds.away_team);
          bookmakerOdds.home_moneyline = homeML?.price || null;
          bookmakerOdds.away_moneyline = awayML?.price || null;
        } else if (market.key === 'spreads_h2') {
          const homeSpread = market.outcomes.find(o => o.name === eventOdds.home_team);
          bookmakerOdds.spread = homeSpread?.point || null;
          bookmakerOdds.spread_odds = homeSpread?.price || null;
        } else if (market.key === 'totals_h2') {
          const over = market.outcomes.find(o => o.name === 'Over');
          bookmakerOdds.total = over?.point || null;
          bookmakerOdds.over_odds = over?.price || null;
        }
      }

      if (Object.keys(bookmakerOdds).length > 1) {
        secondHalfData.bookmakers.push(bookmakerOdds);
      }
    }

    // Calculate consensus - filter out null and undefined to ignore missing odds
    const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    
    if (secondHalfData.bookmakers.length > 0) {
      const homeMLs = secondHalfData.bookmakers.map((b: any) => b.home_moneyline).filter((v: any) => typeof v === 'number');
      const awayMLs = secondHalfData.bookmakers.map((b: any) => b.away_moneyline).filter((v: any) => typeof v === 'number');
      const spreads = secondHalfData.bookmakers.map((b: any) => b.spread).filter((v: any) => typeof v === 'number');
      const spreadOdds = secondHalfData.bookmakers.map((b: any) => b.spread_odds).filter((v: any) => typeof v === 'number');
      const totals = secondHalfData.bookmakers.map((b: any) => b.total).filter((v: any) => typeof v === 'number');
      const overOdds = secondHalfData.bookmakers.map((b: any) => b.over_odds).filter((v: any) => typeof v === 'number');
      
      secondHalfData.consensus.home_ml = calcAvg(homeMLs);
      secondHalfData.consensus.away_ml = calcAvg(awayMLs);
      secondHalfData.consensus.spread = calcAvg(spreads);
      secondHalfData.consensus.spread_odds = calcAvg(spreadOdds);
      secondHalfData.consensus.total = calcAvg(totals);
      secondHalfData.consensus.over_odds = calcAvg(overOdds);
    }

    return secondHalfData.bookmakers.length > 0 ? secondHalfData : null;
  } catch (error) {
    console.error(`Error fetching second half odds for event ${theOddsApiEventId}:`, error);
    return null;
  }
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
    
    // First, fetch ESPN data to check game statuses
    const espnResponse = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    
    if (!espnResponse.ok) {
      throw new Error(`ESPN API returned ${espnResponse.status}`);
    }

    const espnData = await espnResponse.json();
    console.log(`Found ${espnData.events?.length || 0} games`);
    
    // Initialize Supabase client first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if any games are at halftime or end of 2nd quarter
    const halftimeGames = espnData.events?.filter((event: any) => {
      const status = event.competitions?.[0]?.status?.type?.description;
      const period = event.competitions?.[0]?.status?.period;
      // Consider halftime if: status is "Halftime", "End of 2nd Quarter", or period is 2 with clock at 0:00
      return status === 'Halftime' || 
             status === 'End of 2nd Quarter' ||
             (period === 2 && event.competitions?.[0]?.status?.displayClock === '0:00');
    }) || [];
    
    // Only fetch odds from TheOddsAPI if there are NEW halftime games without recent TheOddsAPI data
    let oddsMap = new Map<string, any>();
    if (halftimeGames.length > 0) {
      // Check which halftime games already have recent TheOddsAPI data (within last 1 minute)
      // Using 1 minute window since fetch runs every minute - this ensures we get odds on first halftime detection
      const halftimeGameIds = halftimeGames.map((event: any) => event.id);
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      
      const { data: recentSnapshots } = await supabase
        .from('game_snapshots')
        .select('game_id, betting_lines')
        .in('game_id', halftimeGameIds)
        .eq('game_status', 'Halftime')
        .gte('created_at', oneMinuteAgo)
        .order('created_at', { ascending: false });
      
      // Find games that have TheOddsAPI data already (must have source field and it must be 'TheOddsAPI')
      const gamesWithOddsData = new Set(
        recentSnapshots?.filter(snap => 
          snap.betting_lines && 
          typeof snap.betting_lines === 'object' && 
          (snap.betting_lines as any).source === 'TheOddsAPI' &&
          (snap.betting_lines as any).bookmakers && 
          (snap.betting_lines as any).bookmakers.length > 0
        ).map(snap => snap.game_id) || []
      );
      
      if (gamesWithOddsData.size === halftimeGames.length) {
        console.log('ℹ️ All halftime games already have recent TheOddsAPI data - skipping API call to conserve quota');
      } else {
        const newHalftimeCount = halftimeGames.length - gamesWithOddsData.size;
        console.log(`🏈 ${newHalftimeCount} halftime game(s) need odds data - fetching from TheOddsAPI...`);
        oddsMap = await fetchOddsFromAPI();
      }
    } else {
      console.log('ℹ️ No halftime games - skipping TheOddsAPI to conserve quota');
    }
    
    // Fetch FPI rankings for all teams
    const fpiMap = await fetchFPIRankings();
    
    // Extract standings from scoreboard data
    const standingsMap = await fetchStandings(espnData);

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
        let oddsApiData = oddsMap.get(oddsKey);

        // If this is a halftime game, fetch second half odds using the stored event ID
        const isHalftime = competition.status.type.description === 'Halftime';
        if (isHalftime && oddsApiData && oddsApiData.event_id) {
          console.log(`Fetching second half odds for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}...`);
          const secondHalfOdds = await fetchSecondHalfOdds(oddsApiData.event_id);
          
          if (secondHalfOdds) {
            oddsApiData.second_half = secondHalfOdds;
            console.log(`✅ Second half odds added for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
          } else {
            console.log(`⚠️ No second half odds available for ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
          }
        }

        // Merge betting lines - prefer TheOddsAPI if available, fallback to ESPN
        const bettingLines: Record<string, any> = oddsApiData ? {
          // TheOddsAPI data (more detailed)
          source: 'TheOddsAPI',
          game_state: competition.status.type.description, // Pregame, In Progress, Halftime, Final
          last_update: oddsApiData.last_update,
          consensus: oddsApiData.consensus,
          bookmakers: oddsApiData.bookmakers,
          // Include second half odds if available
          ...(oddsApiData.second_half && { second_half: oddsApiData.second_half }),
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
        
        // Normalize game status to capture halftime more reliably
        let normalizedStatus = competition.status.type.description;
        const period = competition.status.period;
        const clock = competition.status.displayClock;
        
        // If period is 2 and clock is at 0:00, or status is "End of 2nd Quarter", treat as Halftime
        if ((period === 2 && clock === '0:00') || normalizedStatus === 'End of 2nd Quarter') {
          normalizedStatus = 'Halftime';
        }
        
        // Extract date in Central Time (America/Chicago)
        // Central Time is UTC-6 (CST) or UTC-5 (CDT)
        const gameDateTime = new Date(game.date);
        const centralDateTime = new Date(gameDateTime.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const year = centralDateTime.getFullYear();
        const month = String(centralDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(centralDateTime.getDate()).padStart(2, '0');
        const localGameDate = `${year}-${month}-${day}`;
        
        // Get FPI data for both teams
        const homeFPI = fpiMap.get(homeTeam.team.abbreviation.toUpperCase()) || null;
        const awayFPI = fpiMap.get(awayTeam.team.abbreviation.toUpperCase()) || null;
        
        // Get standings data for both teams
        const homeStandings = standingsMap.get(homeTeam.team.abbreviation.toUpperCase()) || null;
        const awayStandings = standingsMap.get(awayTeam.team.abbreviation.toUpperCase()) || null;
        
        const snapshot = {
          game_id: game.id,
          game_date: localGameDate,
          game_start_time: game.date,
          home_team: homeTeam.team.displayName,
          away_team: awayTeam.team.displayName,
          home_team_abbr: homeTeam.team.abbreviation,
          away_team_abbr: awayTeam.team.abbreviation,
          home_score: parseInt(homeTeam.score) || 0,
          away_score: parseInt(awayTeam.score) || 0,
          quarter: competition.status.period,
          clock: competition.status.displayClock,
          game_status: normalizedStatus,
          home_stats: finalHomeStats,
          away_stats: finalAwayStats,
          home_fpi: homeFPI,
          away_fpi: awayFPI,
          home_standings: homeStandings,
          away_standings: awayStandings,
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