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
  home_stats: any;
  away_stats: any;
  play_by_play: any[];
  game_start_time: string;
  betting_lines?: any;
  home_fpi?: any;
  away_fpi?: any;
  created_at: string;
}

function calculateNFLWeek(gameDate: string): string {
  const date = new Date(gameDate);
  const seasonStart = new Date(date.getFullYear(), 8, 1); // September 1st
  const diffTime = Math.abs(date.getTime() - seasonStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const week = Math.ceil(diffDays / 7);
  return week.toString();
}

function generateCSV(game: GameSnapshot): string {
  let csv = '';
  
  // Game metadata
  csv += `Game Date,${game.game_date}\n`;
  csv += `Year,${new Date(game.game_date).getFullYear()}\n`;
  csv += `Week,${calculateNFLWeek(game.game_date)}\n`;
  csv += `Home Team,${game.home_team}\n`;
  csv += `Away Team,${game.away_team}\n`;
  csv += `Home Score,${game.home_score}\n`;
  csv += `Away Score,${game.away_score}\n`;
  csv += `Quarter,${game.quarter}\n`;
  csv += `Clock,${game.clock}\n`;
  csv += `Status,${game.game_status}\n`;
  csv += `Venue,${game.venue || 'N/A'}\n`;
  csv += `Broadcast,${game.broadcast || 'N/A'}\n`;
  
  // Add ELO power rankings if available
  if (game.home_fpi || game.away_fpi) {
    csv += `\n`;
    csv += `Power Rankings (ELO - FiveThirtyEight)\n`;
    if (game.home_fpi) {
      csv += `Home Team ELO Rating,${game.home_fpi.fpi || 'N/A'}\n`;
      csv += `Home Team ELO Rank,${game.home_fpi.fpi_rank || 'N/A'}\n`;
      if (game.home_fpi.qb_adjusted_elo) {
        csv += `Home Team QB-Adjusted ELO,${game.home_fpi.qb_adjusted_elo}\n`;
      }
    }
    if (game.away_fpi) {
      csv += `Away Team ELO Rating,${game.away_fpi.fpi || 'N/A'}\n`;
      csv += `Away Team ELO Rank,${game.away_fpi.fpi_rank || 'N/A'}\n`;
      if (game.away_fpi.qb_adjusted_elo) {
        csv += `Away Team QB-Adjusted ELO,${game.away_fpi.qb_adjusted_elo}\n`;
      }
    }
  }
  
  csv += `\n`;
  csv += `Export Time,${new Date().toISOString()}\n`;
  csv += `\n`;
  
  // Betting Lines Section
  csv += `\n=== BETTING LINES ===\n`;
  if (game.betting_lines && typeof game.betting_lines === 'object') {
    const lines = game.betting_lines as any;
    csv += `Data Source,${lines.source || 'N/A'}\n`;
    csv += `Last Updated,${lines.last_update || 'N/A'}\n`;
    csv += `\n`;
    
    if (lines.consensus) {
      csv += `Consensus Spread,${lines.consensus.spread || 'N/A'}\n`;
      csv += `Consensus Total,${lines.consensus.total || 'N/A'}\n`;
      csv += `Home Moneyline,${lines.consensus.home_ml || 'N/A'}\n`;
      csv += `Away Moneyline,${lines.consensus.away_ml || 'N/A'}\n`;
    }
    
    if (lines.second_half) {
      csv += `\nSecond Half Betting Lines\n`;
      csv += `Second Half Spread,${lines.second_half.consensus?.spread || 'N/A'}\n`;
      csv += `Second Half Total,${lines.second_half.consensus?.total || 'N/A'}\n`;
    }
  } else {
    csv += `No betting lines available\n`;
  }
  
  csv += `\n`;
  
  // Team Stats Section
  csv += `\n=== TEAM STATISTICS ===\n`;
  csv += `Statistic,${game.home_team},${game.away_team}\n`;
  
  const homeStats = game.home_stats || {};
  const awayStats = game.away_stats || {};
  const statKeys = new Set([...Object.keys(homeStats), ...Object.keys(awayStats)]);
  
  statKeys.forEach(key => {
    const homeVal = homeStats[key] || 'N/A';
    const awayVal = awayStats[key] || 'N/A';
    csv += `${key},${homeVal},${awayVal}\n`;
  });
  
  csv += `\n`;
  
  // Play by Play Section
  csv += `\n=== PLAY BY PLAY ===\n`;
  csv += `Drive ID,Team,Description,Play ID,Play Type,Play Text,Away Score,Home Score,Period,Clock,Down,Distance,Yard Line\n`;
  
  if (game.play_by_play && Array.isArray(game.play_by_play)) {
    game.play_by_play.forEach(drive => {
      if (drive.plays && Array.isArray(drive.plays)) {
        drive.plays.forEach((play: any) => {
          csv += `${drive.id},${drive.team || ''},${(drive.description || '').replace(/,/g, ';')},${play.id},${play.type || ''},${(play.text || '').replace(/,/g, ';')},${play.awayScore},${play.homeScore},${play.period},${play.clock},${play.down || ''},${play.distance || ''},${play.yardLine || ''}\n`;
        });
      }
    });
  }
  
  return csv;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { game_id } = await req.json();
    
    if (!game_id) {
      return new Response(
        JSON.stringify({ error: 'game_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📧 Manual email trigger for game ${game_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get active email recipients
    const { data: recipients } = await supabase
      .from('halftime_email_recipients')
      .select('email, name')
      .eq('active', true);

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active email recipients' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${recipients.length} active email recipients`);

    // Get the most recent halftime snapshot for this game
    const { data: snapshot, error: snapshotError } = await supabase
      .from('game_snapshots')
      .select('*')
      .eq('game_id', game_id)
      .eq('game_status', 'Halftime')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError || !snapshot) {
      return new Response(
        JSON.stringify({ 
          error: 'No halftime snapshot found for this game',
          details: snapshotError?.message 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found halftime snapshot for ${snapshot.away_team_abbr} @ ${snapshot.home_team_abbr}`);

    // Generate CSV
    const csvContent = generateCSV(snapshot as GameSnapshot);
    const year = new Date(snapshot.game_date).getFullYear();
    const week = calculateNFLWeek(snapshot.game_date);
    const filename = `${year}_Week${week}_${snapshot.away_team_abbr}_at_${snapshot.home_team_abbr}_Halftime.csv`;

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from: 'NFL Halftime Data <onboarding@resend.dev>',
          to: [recipient.email],
          subject: `Halftime Stats: ${snapshot.away_team} @ ${snapshot.home_team} - Week ${week}`,
          text: `Halftime statistics and betting lines for ${snapshot.away_team} @ ${snapshot.home_team}.\n\nSee attached CSV for complete data.`,
          attachments: [
            {
              filename: filename,
              content: btoa(csvContent),
            },
          ],
        });

        console.log(`✅ Email sent to ${recipient.email}`);

        // Record the export
        await supabase.from('halftime_exports').insert({
          game_id: snapshot.game_id,
          year: year as any,
          week: week as any,
          home_team: snapshot.home_team,
          away_team: snapshot.away_team,
          game_date: snapshot.game_date,
          csv_filename: filename,
          csv_content: csvContent,
          recipient_email: recipient.email,
          email_status: 'success',
        });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
        
        await supabase.from('halftime_exports').insert({
          game_id: snapshot.game_id,
          year: year as any,
          week: week as any,
          home_team: snapshot.home_team,
          away_team: snapshot.away_team,
          game_date: snapshot.game_date,
          csv_filename: filename,
          recipient_email: recipient.email,
          email_status: 'failed',
          error_message: emailError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        game: `${snapshot.away_team_abbr} @ ${snapshot.home_team_abbr}`,
        recipients: recipients.length,
        filename
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in manual-halftime-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
