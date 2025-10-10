import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameCard } from "@/components/GameCard";
import { StatsPanel } from "@/components/StatsPanel";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Database as DatabaseIcon } from "lucide-react";
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
}

const Index = () => {
  const [games, setGames] = useState<GameSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchLatestGames = async () => {
    try {
      // Get the most recent snapshot for each unique game
      const { data, error } = await supabase
        .from('game_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by game_id and keep only the most recent
      const latestGames = data?.reduce((acc: GameSnapshot[], game: any) => {
        if (!acc.find(g => g.game_id === game.game_id)) {
          acc.push(game as GameSnapshot);
        }
        return acc;
      }, []) || [];

      setGames(latestGames);
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
          <div className="flex items-center justify-between">
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
        ) : (
          <div className="space-y-8">
            {games.map((game) => (
              <div key={game.id} className="space-y-4">
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
                />
                <StatsPanel
                  homeTeam={game.home_team_abbr}
                  awayTeam={game.away_team_abbr}
                  homeStats={game.home_stats}
                  awayStats={game.away_stats}
                />
              </div>
            ))}
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
