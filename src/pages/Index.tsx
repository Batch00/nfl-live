import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameCard } from "@/components/GameCard";
import { StatsPanel } from "@/components/StatsPanel";
import { PlayByPlayPanel } from "@/components/PlayByPlayPanel";
import { BettingLinesPanel } from "@/components/BettingLinesPanel";
import { LiveBettingOddsPanel } from "@/components/LiveBettingOddsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, Database as DatabaseIcon, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameSnapshot {
  id: string;
  created_at: string;
  game_id: string;
  home_team: string;
  away_team: string;
  home_team_abbr: string;
  away_team_abbr: string;
  home_score: number;
  away_score: number;
  quarter: number;
  clock: string | null;
  game_status: string;
  home_stats: any;
  away_stats: any;
  venue?: string | null;
  broadcast?: string | null;
  game_start_time?: string | null;
  betting_lines?: any;
  play_by_play?: any;
}

const Index = () => {
  const [games, setGames] = useState<GameSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Sort games: in progress first, then scheduled, then completed (most recent)
  const sortGames = (gamesList: GameSnapshot[]) => {
    return [...gamesList].sort((a, b) => {
      const aStatus = a.game_status.toLowerCase();
      const bStatus = b.game_status.toLowerCase();
      
      const aIsLive = aStatus.includes('in progress') || aStatus.includes('halftime') || 
                      aStatus.includes('1st') || aStatus.includes('2nd') || 
                      aStatus.includes('3rd') || aStatus.includes('4th');
      const bIsLive = bStatus.includes('in progress') || bStatus.includes('halftime') || 
                      bStatus.includes('1st') || bStatus.includes('2nd') || 
                      bStatus.includes('3rd') || bStatus.includes('4th');
      
      const aIsScheduled = aStatus.includes('scheduled');
      const bIsScheduled = bStatus.includes('scheduled');
      
      // Live games first
      if (aIsLive && !bIsLive) return -1;
      if (!aIsLive && bIsLive) return 1;
      
      // Then scheduled games
      if (aIsScheduled && !bIsScheduled) return -1;
      if (!aIsScheduled && bIsScheduled) return 1;
      
      // For scheduled games, sort by start time (earliest first)
      if (aIsScheduled && bIsScheduled) {
        const aTime = new Date(a.game_start_time || 0).getTime();
        const bTime = new Date(b.game_start_time || 0).getTime();
        return aTime - bTime;
      }
      
      // For completed games, sort by most recent first
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  };

  // Filter games based on search query
  const filterGames = (gamesList: GameSnapshot[]) => {
    if (!searchQuery.trim()) return gamesList;
    
    const query = searchQuery.toLowerCase();
    return gamesList.filter(game => 
      game.home_team.toLowerCase().includes(query) ||
      game.away_team.toLowerCase().includes(query) ||
      game.home_team_abbr.toLowerCase().includes(query) ||
      game.away_team_abbr.toLowerCase().includes(query) ||
      game.game_id.toLowerCase().includes(query) ||
      (game.game_start_time && new Date(game.game_start_time).toLocaleDateString().includes(query))
    );
  };

  const sortedAndFilteredGames = sortGames(filterGames(games));

  // Categorize games for display
  const liveGames = sortedAndFilteredGames.filter(g => {
    const status = g.game_status.toLowerCase();
    return status.includes('in progress') || status.includes('halftime') || 
           status.includes('1st') || status.includes('2nd') || 
           status.includes('3rd') || status.includes('4th');
  });

  const upcomingGames = sortedAndFilteredGames.filter(g => 
    g.game_status.toLowerCase().includes('scheduled')
  );

  const completedGames = sortedAndFilteredGames.filter(g => {
    const status = g.game_status.toLowerCase();
    return status.includes('final') || status.includes('completed');
  });

  const fetchLatestGames = async () => {
    try {
      // Calculate date range for current NFL week (Tuesday to Monday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // NFL week starts on Tuesday
      // Calculate days since last Tuesday
      let daysSinceTuesday;
      if (dayOfWeek >= 2) { // Tuesday (2) to Saturday (6)
        daysSinceTuesday = dayOfWeek - 2;
      } else { // Sunday (0) or Monday (1)
        daysSinceTuesday = dayOfWeek + 5; // 5 days back from Sunday, 6 from Monday
      }
      
      // Start of current week (last Tuesday at 00:00)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysSinceTuesday);
      weekStart.setHours(0, 0, 0, 0);
      
      // End of current week (next Monday at 23:59)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // If it's early in the week (Tue-Wed) include previous week's games too
      const fetchStart = new Date(weekStart);
      if (dayOfWeek === 2 || dayOfWeek === 3) { // Tuesday or Wednesday
        fetchStart.setDate(weekStart.getDate() - 7); // Go back one more week
      }

      console.log('Fetching games for current week:', {
        start: fetchStart.toISOString(),
        end: weekEnd.toISOString()
      });

      // Get the most recent snapshot for each unique game
      const { data, error } = await supabase
        .from('game_snapshots')
        .select('*')
        .gte('game_date', fetchStart.toISOString().split('T')[0])
        .lte('game_date', weekEnd.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Group by game_id and keep only the most recent
      const latestGames = data?.reduce((acc: GameSnapshot[], game: any) => {
        if (!acc.find(g => g.game_id === game.game_id)) {
          acc.push(game as GameSnapshot);
        }
        return acc;
      }, []) || [];

      console.log(`Found ${latestGames.length} games for current week`);
      setGames(sortGames(latestGames));
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error loading games",
        description: "Failed to fetch game data from database",
        variant: "destructive",
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-nfl-data');
      
      if (error) throw error;

      toast({
        title: "Data refreshed",
        description: `Updated ${data.snapshots} game snapshots`,
      });

      // Fetch the updated games
      await fetchLatestGames();
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error refreshing data",
        description: "Failed to fetch latest NFL data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/export-game-data?format=csv&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nfl_data_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "CSV file downloaded",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Failed to download CSV file",
        variant: "destructive",
      });
    }
  };

  const exportPlayByPlay = async (gameId: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/export-play-by-play?game_id=${gameId}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `play_by_play_${gameId}_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Play-by-play CSV downloaded",
      });
    } catch (error) {
      console.error('Error exporting play-by-play:', error);
      toast({
        title: "Export failed",
        description: "Failed to download play-by-play CSV",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLatestGames();
    
    // Auto-refresh every 45 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshData();
      }, 45000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                NFL Live Data Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time game tracking for betting edge analysis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'border-success text-success' : ''}
              >
                <DatabaseIcon className="w-4 h-4 mr-2" />
                Auto: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by team name, abbreviation, game ID, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {games.length === 0 ? (
          <div className="text-center py-16">
            <DatabaseIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Games Found</h2>
            <p className="text-muted-foreground mb-6">
              Click "Refresh" to fetch the latest NFL game data
            </p>
            <Button onClick={refreshData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Fetch Games
            </Button>
          </div>
        ) : sortedAndFilteredGames.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Matches Found</h2>
            <p className="text-muted-foreground">
              Try adjusting your search query
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Live Games Section */}
            {liveGames.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-foreground">Live Games</h2>
                  <span className="text-sm text-muted-foreground">({liveGames.length})</span>
                </div>
                <div className="space-y-8">
                  {liveGames.map((game) => (
                    <div key={game.id} className="space-y-4 p-6 rounded-lg border border-destructive/20 bg-card/50">
                      <GameCard
                        homeTeam={game.home_team}
                        awayTeam={game.away_team}
                        homeTeamAbbr={game.home_team_abbr}
                        awayTeamAbbr={game.away_team_abbr}
                        homeScore={game.home_score}
                        awayScore={game.away_score}
                        quarter={game.quarter}
                        clock={game.clock}
                        gameStatus={game.game_status}
                        venue={game.venue}
                        broadcast={game.broadcast}
                        gameStartTime={game.game_start_time}
                      />
                      <LiveBettingOddsPanel
                        bettingLines={game.betting_lines || {}}
                        homeTeam={game.home_team_abbr}
                        awayTeam={game.away_team_abbr}
                        gameStatus={game.game_status}
                      />
                      <StatsPanel
                        homeTeam={game.home_team_abbr}
                        awayTeam={game.away_team_abbr}
                        homeStats={game.home_stats}
                        awayStats={game.away_stats}
                        gameStatus={game.game_status}
                      />
                      <PlayByPlayPanel
                        playByPlay={game.play_by_play || []}
                        homeTeam={game.home_team_abbr}
                        awayTeam={game.away_team_abbr}
                        gameId={game.game_id}
                        onExport={exportPlayByPlay}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Games Section */}
            {upcomingGames.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <h2 className="text-2xl font-bold text-foreground">Upcoming Games</h2>
                  <span className="text-sm text-muted-foreground">({upcomingGames.length})</span>
                </div>
                <div className="space-y-8">
                  {upcomingGames.map((game) => (
                    <div key={game.id} className="space-y-4 p-6 rounded-lg border border-primary/20 bg-card/50">
                      <GameCard
                        homeTeam={game.home_team}
                        awayTeam={game.away_team}
                        homeTeamAbbr={game.home_team_abbr}
                        awayTeamAbbr={game.away_team_abbr}
                        homeScore={game.home_score}
                        awayScore={game.away_score}
                        quarter={game.quarter}
                        clock={game.clock}
                        gameStatus={game.game_status}
                        venue={game.venue}
                        broadcast={game.broadcast}
                        gameStartTime={game.game_start_time}
                      />
                      <BettingLinesPanel
                        bettingLines={game.betting_lines || {}}
                        homeTeam={game.home_team_abbr}
                        awayTeam={game.away_team_abbr}
                        gameStatus={game.game_status}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Games Section */}
            {completedGames.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                  <h2 className="text-2xl font-bold text-foreground">Completed Games</h2>
                  <span className="text-sm text-muted-foreground">({completedGames.length})</span>
                </div>
                <div className="space-y-8">
                  {completedGames.map((game) => (
                    <div key={game.id} className="space-y-4 p-6 rounded-lg border border-border bg-card/30">
                      <GameCard
                        homeTeam={game.home_team}
                        awayTeam={game.away_team}
                        homeTeamAbbr={game.home_team_abbr}
                        awayTeamAbbr={game.away_team_abbr}
                        homeScore={game.home_score}
                        awayScore={game.away_score}
                        quarter={game.quarter}
                        clock={game.clock}
                        gameStatus={game.game_status}
                        venue={game.venue}
                        broadcast={game.broadcast}
                        gameStartTime={game.game_start_time}
                      />
                      <StatsPanel
                        homeTeam={game.home_team_abbr}
                        awayTeam={game.away_team_abbr}
                        homeStats={game.home_stats}
                        awayStats={game.away_stats}
                        gameStatus={game.game_status}
                      />
                      <PlayByPlayPanel
                        playByPlay={game.play_by_play || []}
                        homeTeam={game.home_team_abbr}
                        awayTeam={game.away_team_abbr}
                        gameId={game.game_id}
                        onExport={exportPlayByPlay}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Data powered by ESPN API • Updates every 45 seconds during live games
          </p>
          <p className="mt-2">
            API Endpoint: <code className="bg-muted px-2 py-1 rounded text-xs">
              /functions/v1/export-game-data?format=json
            </code>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
