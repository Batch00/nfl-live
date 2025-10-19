import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface LiveBettingOddsPanelProps {
  bettingLines: {
    // Live odds (preferred)
    liveSpread?: number | null;
    liveOverUnder?: number | null;
    liveHomeMoneyline?: number | null;
    liveAwayMoneyline?: number | null;
    // Pregame odds (fallback)
    spread?: number | null;
    overUnder?: number | null;
    homeMoneyline?: number | null;
    awayMoneyline?: number | null;
    winProbability?: {
      home?: number | null;
      away?: number | null;
    };
  };
  homeTeam: string;
  awayTeam: string;
  gameStatus: string;
}

export const LiveBettingOddsPanel = ({ 
  bettingLines, 
  homeTeam, 
  awayTeam,
  gameStatus 
}: LiveBettingOddsPanelProps) => {
  // Only show for games in progress
  const status = gameStatus.toLowerCase();
  const isLive = status.includes('in progress') || status.includes('halftime') || 
                 status.includes('1st') || status.includes('2nd') || 
                 status.includes('3rd') || status.includes('4th');

  if (!isLive) {
    return null;
  }

  // Try to get live odds first, fallback to pregame odds
  const spread = bettingLines.liveSpread ?? bettingLines.spread;
  const overUnder = bettingLines.liveOverUnder ?? bettingLines.overUnder;
  const homeMoneyline = bettingLines.liveHomeMoneyline ?? bettingLines.homeMoneyline;
  const awayMoneyline = bettingLines.liveAwayMoneyline ?? bettingLines.awayMoneyline;
  const winProb = bettingLines.winProbability;

  // Check if we have any betting data
  const hasData = spread !== undefined && spread !== null || 
                  overUnder !== undefined && overUnder !== null || 
                  homeMoneyline !== undefined && homeMoneyline !== null || 
                  awayMoneyline !== undefined && awayMoneyline !== null;

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-warning" />
            Live Betting Odds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Odds currently unavailable
          </p>
          <p className="text-xs text-muted-foreground text-center">
            ESPN API does not provide live betting odds. Consider integrating with a dedicated odds provider API for live betting data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine if we're showing pregame odds (fallback) or live odds
  const isPreGameOdds = !bettingLines.liveSpread && bettingLines.spread !== undefined;

  return (
    <Card className="bg-gradient-to-br from-card to-destructive/5 border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-destructive animate-pulse" />
          {isPreGameOdds ? 'Opening Odds' : 'Live Betting Odds'}
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {isPreGameOdds ? 'Pregame lines' : 'Updates periodically'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPreGameOdds && (
          <div className="mb-3 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning">
            Note: Live odds unavailable from ESPN API. Showing opening lines for reference.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Moneyline */}
          {(homeMoneyline || awayMoneyline) && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Moneyline</h4>
              <div className="space-y-1">
                {awayMoneyline && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm flex items-center gap-1">
                      {awayTeam}
                      {awayMoneyline < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                    </span>
                    <span className={`font-bold ${awayMoneyline < 0 ? 'text-success' : 'text-destructive'}`}>
                      {awayMoneyline > 0 ? '+' : ''}
                      {awayMoneyline}
                    </span>
                  </div>
                )}
                {homeMoneyline && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm flex items-center gap-1">
                      {homeTeam}
                      {homeMoneyline < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                    </span>
                    <span className={`font-bold ${homeMoneyline < 0 ? 'text-success' : 'text-destructive'}`}>
                      {homeMoneyline > 0 ? '+' : ''}
                      {homeMoneyline}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spread */}
          {spread !== null && spread !== undefined && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Spread</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-2xl font-bold text-accent">
                  {spread > 0 ? '+' : ''}
                  {spread}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {spread < 0 ? homeTeam : awayTeam} favored
                </div>
              </div>
            </div>
          )}

          {/* Over/Under */}
          {overUnder !== null && overUnder !== undefined && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">O/U</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-2xl font-bold text-accent">
                  {overUnder}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Points</div>
              </div>
            </div>
          )}
        </div>

        {/* Win Probability */}
        {(winProb?.home || winProb?.away) && (
          <div className="mt-4 p-3 bg-muted/30 rounded">
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Win Probability</h4>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-foreground">
                  {winProb.away}%
                </div>
                <div className="text-xs text-muted-foreground">{awayTeam}</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-foreground">
                  {winProb.home}%
                </div>
                <div className="text-xs text-muted-foreground">{homeTeam}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
