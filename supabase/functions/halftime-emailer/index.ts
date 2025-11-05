import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameSnapshot {
  id: string;
  game_id: string;
  game_date: string;
  home_team: string;
  away_team: string;
  home_team_abbr: string;
  away_team_abbr: string;
  home_score: number;
  away_score: number;
  quarter: number;
  clock: string;
  game_status: string;
  venue: string;
  broadcast: string;
  play_by_play: any[];
  game_start_time: string;
  betting_lines?: any;
  created_at: string; // Database timestamp field
}

// Calculate NFL week from game date
// 2025 NFL Season: Week 1 starts Sept 9 (Tuesday before first Thursday game)
// Each week runs Tuesday-Monday (Tuesday starts new week for scheduling purposes)
function calculateNFLWeek(gameDate: string): string {
  const date = new Date(gameDate + 'T00:00:00'); // Ensure consistent parsing
  
  // 2025 NFL Season Week 1 starts Tuesday, Sept 9, 2025
  const week1Start = new Date('2025-09-09T00:00:00');
  
  // Calculate days since season start
  const diffTime = date.getTime() - week1Start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Each week is 7 days, starting Tuesday
  const week = Math.max(1, Math.floor(diffDays / 7) + 1);
  
  return String(week).padStart(2, '0');
}

// Generate CSV content from play-by-play data
function generateCSV(game: GameSnapshot): string {
  let csv = '';
  
  // Add game metadata header
  csv += `Game Metadata\n`;
  csv += `Game ID,${game.game_id}\n`;
  csv += `Date,${game.game_date}\n`;
  csv += `Home Team,${game.home_team}\n`;
  csv += `Away Team,${game.away_team}\n`;
  csv += `Status,${game.game_status}\n`;
  csv += `Venue,${game.venue || 'N/A'}\n`;
  csv += `Broadcast,${game.broadcast || 'N/A'}\n`;
  csv += `Export Time,${new Date().toISOString()}\n`;
  csv += `\n`;
  
  // Add betting odds section if available
  if (game.betting_lines && Object.keys(game.betting_lines).length > 0) {
    csv += `Betting Odds\n`;
    const odds = game.betting_lines as any;
    
    if (odds.source === 'TheOddsAPI' && odds.consensus) {
      csv += `Odds Source,TheOddsAPI\n`;
      csv += `Game State,${odds.game_state || 'N/A'}\n`;
      csv += `Last Updated,${odds.last_update || 'N/A'}\n`;
      csv += `\n`;
      csv += `Consensus Odds (Average of Multiple Sportsbooks)\n`;
      csv += `Home Moneyline,${odds.consensus.home_ml ? (odds.consensus.home_ml > 0 ? '+' : '') + Math.round(odds.consensus.home_ml) : 'N/A'}\n`;
      csv += `Away Moneyline,${odds.consensus.away_ml ? (odds.consensus.away_ml > 0 ? '+' : '') + Math.round(odds.consensus.away_ml) : 'N/A'}\n`;
      csv += `Spread,${odds.consensus.spread ? (odds.consensus.spread > 0 ? '+' : '') + odds.consensus.spread.toFixed(1) : 'N/A'}\n`;
      csv += `Total (Over/Under),${odds.consensus.total ? odds.consensus.total.toFixed(1) : 'N/A'}\n`;
      csv += `\n`;
      
      // Add individual sportsbook odds
      if (odds.bookmakers && odds.bookmakers.length > 0) {
        csv += `Individual Sportsbook Odds (Full Game)\n`;
        csv += `Sportsbook,Home ML,Away ML,Spread,Home Spread Odds,Total,Over Odds,Under Odds\n`;
        for (const book of odds.bookmakers) {
          csv += `${book.name || 'N/A'},`;
          csv += `${book.home_moneyline ? (book.home_moneyline > 0 ? '+' : '') + book.home_moneyline : 'N/A'},`;
          csv += `${book.away_moneyline ? (book.away_moneyline > 0 ? '+' : '') + book.away_moneyline : 'N/A'},`;
          csv += `${book.home_spread ? (book.home_spread > 0 ? '+' : '') + book.home_spread : 'N/A'},`;
          csv += `${book.home_spread_odds ? (book.home_spread_odds > 0 ? '+' : '') + book.home_spread_odds : 'N/A'},`;
          csv += `${book.total || 'N/A'},`;
          csv += `${book.over_odds ? (book.over_odds > 0 ? '+' : '') + book.over_odds : 'N/A'},`;
          csv += `${book.under_odds ? (book.under_odds > 0 ? '+' : '') + book.under_odds : 'N/A'}\n`;
        }
      }
      
      // Add second half odds if available
      if (odds.second_half && odds.second_half.bookmakers && odds.second_half.bookmakers.length > 0) {
        csv += `\n`;
        csv += `Second Half Odds (LIVE - Key for Betting!)\n`;
        csv += `Second Half Consensus\n`;
        csv += `Home Moneyline,${odds.second_half.consensus.home_ml ? (odds.second_half.consensus.home_ml > 0 ? '+' : '') + Math.round(odds.second_half.consensus.home_ml) : 'N/A'}\n`;
        csv += `Away Moneyline,${odds.second_half.consensus.away_ml ? (odds.second_half.consensus.away_ml > 0 ? '+' : '') + Math.round(odds.second_half.consensus.away_ml) : 'N/A'}\n`;
        csv += `Spread,${odds.second_half.consensus.spread ? (odds.second_half.consensus.spread > 0 ? '+' : '') + odds.second_half.consensus.spread.toFixed(1) : 'N/A'}\n`;
        csv += `Total (Over/Under),${odds.second_half.consensus.total ? odds.second_half.consensus.total.toFixed(1) : 'N/A'}\n`;
        csv += `\n`;
        csv += `Individual Sportsbook Odds (Second Half)\n`;
        csv += `Sportsbook,Home ML,Away ML,Spread,Spread Odds,Total,Over Odds\n`;
        for (const book of odds.second_half.bookmakers) {
          csv += `${book.name || 'N/A'},`;
          csv += `${book.home_moneyline ? (book.home_moneyline > 0 ? '+' : '') + book.home_moneyline : 'N/A'},`;
          csv += `${book.away_moneyline ? (book.away_moneyline > 0 ? '+' : '') + book.away_moneyline : 'N/A'},`;
          csv += `${book.spread ? (book.spread > 0 ? '+' : '') + book.spread : 'N/A'},`;
          csv += `${book.spread_odds ? (book.spread_odds > 0 ? '+' : '') + book.spread_odds : 'N/A'},`;
          csv += `${book.total || 'N/A'},`;
          csv += `${book.over_odds ? (book.over_odds > 0 ? '+' : '') + book.over_odds : 'N/A'}\n`;
        }
      } else {
        csv += `\n`;
        csv += `Second Half Odds\n`;
        csv += `No second half odds available at this time\n`;
      }
    } else {
      // ESPN fallback odds
      csv += `Odds Source,${odds.source || 'ESPN (Limited)'}\n`;
      csv += `Game State,${odds.game_state || 'N/A'}\n`;
      csv += `Spread,${odds.spread || 'N/A'}\n`;
      csv += `Over/Under,${odds.overUnder || 'N/A'}\n`;
      csv += `Home Moneyline,${odds.homeMoneyline || 'N/A'}\n`;
      csv += `Away Moneyline,${odds.awayMoneyline || 'N/A'}\n`;
      csv += `Details,${odds.details || 'N/A'}\n`;
    }
    csv += `\n`;
  } else {
    csv += `Betting Odds\n`;
    csv += `No betting odds available for this game\n`;
    csv += `\n`;
  }
  
  // Add play-by-play data
  csv += `Play-by-Play Data\n`;
  
  const playByPlay = game.play_by_play || [];
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
    const headers = [
      'Drive Team', 'Drive Description', 'Quarter', 'Clock', 
      'Down', 'Distance', 'Yard Line', 'Play Description', 
      'Play Type', 'Scored', 'Home Score', 'Away Score'
    ];
    
    csv += headers.join(',') + '\n';

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
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      
      csv += values.join(',') + '\n';
    }
  }

  return csv;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏈 Starting halftime emailer check...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active email recipients from database
    const { data: recipients, error: recipientsError } = await supabase
      .from('halftime_email_recipients')
      .select('email, name')
      .eq('active', true);

    if (recipientsError) {
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      console.log('No active email recipients configured');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active email recipients',
          processed: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${recipients.length} active email recipients`);

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not set');
    }
    const resend = new Resend(resendApiKey);

    // Query for games at halftime
    const { data: halftimeGames, error: queryError } = await supabase
      .from('game_snapshots')
      .select('*')
      .eq('game_status', 'Halftime')
      .order('created_at', { ascending: false });

    if (queryError) {
      throw queryError;
    }

    console.log(`Found ${halftimeGames?.length || 0} total game snapshots at halftime`);

    if (!halftimeGames || halftimeGames.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No games at halftime',
          processed: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Deduplicate games - keep only the most recent snapshot per game_id that has TheOddsAPI odds
    // Also track the OLDEST halftime timestamp for each game to calculate true halftime age
    const uniqueGamesMap = new Map<string, GameSnapshot>();
    const oldestHalftimeTimestamps = new Map<string, string>();
    
    for (const game of halftimeGames as GameSnapshot[]) {
      const existingGame = uniqueGamesMap.get(game.game_id);
      
      // Track the oldest halftime timestamp for this game
      const currentOldest = oldestHalftimeTimestamps.get(game.game_id);
      if (!currentOldest || game.created_at < currentOldest) {
        oldestHalftimeTimestamps.set(game.game_id, game.created_at);
      }
      
      // Check if this snapshot has TheOddsAPI odds (better than ESPN fallback)
      const hasTheOddsAPIData = game.betting_lines && 
                                 typeof game.betting_lines === 'object' && 
                                 (game.betting_lines as any).source === 'TheOddsAPI';
      
      const existingHasTheOddsAPIData = existingGame?.betting_lines && 
                                         typeof existingGame.betting_lines === 'object' && 
                                         (existingGame.betting_lines as any).source === 'TheOddsAPI';
      
      // Prefer snapshots with TheOddsAPI data, otherwise take the most recent
      if (!existingGame || 
          (hasTheOddsAPIData && !existingHasTheOddsAPIData) ||
          (hasTheOddsAPIData === existingHasTheOddsAPIData && !existingGame)) {
        uniqueGamesMap.set(game.game_id, game);
      }
    }
    const uniqueGames = Array.from(uniqueGamesMap.values());
    console.log(`Deduplicated to ${uniqueGames.length} unique games`);

    // Get list of already emailed game IDs
    const gameIds = uniqueGames.map(g => g.game_id);
    const { data: alreadyEmailed } = await supabase
      .from('halftime_exports')
      .select('game_id, created_at')
      .in('game_id', gameIds);

    const emailedGameIds = new Set(alreadyEmailed?.map(e => e.game_id) || []);
    
    // Calculate how long each game has been at halftime (for fallback logic)
    // Use the OLDEST halftime snapshot timestamp, not the most recent one
    const now = new Date();
    const getHalftimeAge = (gameId: string) => {
      const oldestTimestamp = oldestHalftimeTimestamps.get(gameId);
      if (!oldestTimestamp) return 0;
      const firstHalftimeTime = new Date(oldestTimestamp);
      return Math.floor((now.getTime() - firstHalftimeTime.getTime()) / 1000 / 60); // minutes
    };

    // Process each halftime game that hasn't been emailed yet
    const results = [];
    for (let i = 0; i < uniqueGames.length; i++) {
      const game = uniqueGames[i];
      
      if (emailedGameIds.has(game.game_id)) {
        console.log(`Game ${game.game_id} already emailed, skipping`);
        continue;
      }

      // Add delay between emails to respect Resend's 2 requests/second rate limit
      if (i > 0) {
        console.log('Waiting 600ms to respect rate limit...');
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      try {
        console.log(`Processing game ${game.game_id}: ${game.away_team_abbr} @ ${game.home_team_abbr}`);

        // Check if this game has TheOddsAPI odds
        const hasTheOddsAPIData = game.betting_lines && 
                                   typeof game.betting_lines === 'object' && 
                                   (game.betting_lines as any).source === 'TheOddsAPI';
        
        // Check for second half odds specifically
        const hasSecondHalfOdds = hasTheOddsAPIData &&
                                   (game.betting_lines as any).second_half && 
                                   (game.betting_lines as any).second_half.bookmakers &&
                                   (game.betting_lines as any).second_half.bookmakers.length > 0;
        
        const halftimeAge = getHalftimeAge(game.game_id);
        
        // FALLBACK LOGIC: After 3 minutes at halftime, send with whatever odds we have
        // This prevents games from never being sent if odds fetch fails
        if (!hasTheOddsAPIData || !hasSecondHalfOdds) {
          if (halftimeAge < 3) {
            console.log(`⏳ Game ${game.game_id} waiting for complete odds (age: ${halftimeAge}min). TheOddsAPI: ${hasTheOddsAPIData}, SecondHalf: ${hasSecondHalfOdds}`);
            continue;
          } else {
            console.warn(`⚠️ Game ${game.game_id} has been at halftime for ${halftimeAge} minutes without complete odds. Sending with available data.`);
            console.warn(`   TheOddsAPI data: ${hasTheOddsAPIData}, Second half odds: ${hasSecondHalfOdds}`);
          }
        } else {
          console.log(`✅ Game ${game.game_id} has complete odds data (age: ${halftimeAge}min), proceeding with email`);
        }

        // Generate CSV content
        const csvContent = generateCSV(game);

        // Calculate NFL week and format filename
        const year = new Date(game.game_date).getFullYear().toString().slice(-2);
        const week = calculateNFLWeek(game.game_date);
        const filename = `NFL${year}_${week}_${game.home_team_abbr}v${game.away_team_abbr}_plays.csv`;

        console.log(`Generated filename: ${filename}`);

        // Convert CSV to base64 for email attachment
        const csvBase64 = btoa(csvContent);

        // Prepare recipient list
        const recipientEmails = recipients.map(r => r.email);

        // Send email with CSV attachment to all recipients
        const emailResult = await resend.emails.send({
          from: 'NFL Play-by-Play <noreply@randomstep.com>',
          to: recipientEmails,
          subject: `🏈 Halftime Play-by-Play: ${game.away_team_abbr} @ ${game.home_team_abbr}`,
          html: `
            <h2>Halftime Play-by-Play Export</h2>
            <p>Game has reached halftime. Attached is the play-by-play data and betting odds for:</p>
            <ul>
              <li><strong>Game:</strong> ${game.away_team} @ ${game.home_team}</li>
              <li><strong>Score:</strong> ${game.away_team_abbr} ${game.away_score} - ${game.home_team_abbr} ${game.home_score}</li>
              <li><strong>Date:</strong> ${game.game_date}</li>
              <li><strong>Venue:</strong> ${game.venue || 'N/A'}</li>
              <li><strong>Broadcast:</strong> ${game.broadcast || 'N/A'}</li>
            </ul>
            <p>The attached CSV file contains:</p>
            <ul>
              <li>All play-by-play data up to halftime</li>
              <li>Detailed betting odds from TheOddsAPI (if available)</li>
              <li>Multiple sportsbook comparisons for moneyline, spread, and totals</li>
            </ul>
            <p><small>Note: Odds are captured at the time of halftime and represent the most recent available data from multiple sportsbooks.</small></p>
          `,
          attachments: [
            {
              filename: filename,
              content: csvBase64,
            }
          ]
        });

        console.log(`Email sent successfully for game ${game.game_id} to ${recipientEmails.length} recipients`, emailResult);

        // Record the export in the database with full metadata for Python access
        const gameYear = new Date(game.game_date).getFullYear();
        const gameWeek = parseInt(calculateNFLWeek(game.game_date));
        
        const { error: insertError } = await supabase
          .from('halftime_exports')
          .insert({
            game_id: game.game_id,
            email_status: 'success',
            recipient_email: recipientEmails.join(', '),
            csv_filename: filename,
            csv_content: csvContent, // Store the actual CSV content
            year: gameYear,
            week: gameWeek,
            home_team: game.home_team,
            away_team: game.away_team,
            game_date: game.game_date,
            csv_path: filename, // CSV sent as attachment, path is the filename
          });

        if (insertError) {
          console.error(`Failed to record export for game ${game.game_id}:`, insertError);
        }

        results.push({
          game_id: game.game_id,
          filename: filename,
          status: 'success'
        });

      } catch (error) {
        console.error(`Error processing game ${game.game_id}:`, error);
        
        // Record the failed export with metadata
        const recipientEmails = recipients.map(r => r.email);
        const gameYear = new Date(game.game_date).getFullYear();
        const gameWeek = parseInt(calculateNFLWeek(game.game_date));
        const failedFilename = `NFL_${game.game_id}_plays.csv`;
        
        await supabase
          .from('halftime_exports')
          .insert({
            game_id: game.game_id,
            email_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            recipient_email: recipientEmails.join(', '),
            csv_filename: failedFilename,
            csv_content: null, // No CSV content on failure
            year: gameYear,
            week: gameWeek,
            home_team: game.home_team,
            away_team: game.away_team,
            game_date: game.game_date,
            csv_path: failedFilename,
          });

        results.push({
          game_id: game.game_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Halftime emailer completed. Processed ${results.length} games`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} halftime games`,
        processed: results.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in halftime-emailer:', error);
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
