import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface LiveBettingOddsPanelProps {
  bettingLines: {
    liveSpread?: number | null;
    liveOverUnder?: number | null;
    liveHomeMoneyline?: number | null;
    liveAwayMoneyline?: number | null;
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

  // Check if we have any live betting data
  const hasData = bettingLines.liveSpread !== undefined && bettingLines.liveSpread !== null || 
                  bettingLines.liveOverUnder !== undefined && bettingLines.liveOverUnder !== null || 
                  bettingLines.liveHomeMoneyline !== undefined && bettingLines.liveHomeMoneyline !== null || 
                  bettingLines.liveAwayMoneyline !== undefined && bettingLines.liveAwayMoneyline !== null;

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
            Live betting data will appear when available from the feed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-destructive/5 border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-destructive animate-pulse" />
          Live Betting Odds
          <span className="text-xs font-normal text-muted-foreground ml-auto">Updates periodically</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Live Moneyline */}
          {(bettingLines.liveHomeMoneyline || bettingLines.liveAwayMoneyline) && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Live Moneyline</h4>
              <div className="space-y-1">
                {bettingLines.liveAwayMoneyline && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm flex items-center gap-1">
                      {awayTeam}
                      {bettingLines.liveAwayMoneyline < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                    </span>
                    <span className={`font-bold ${bettingLines.liveAwayMoneyline < 0 ? 'text-success' : 'text-destructive'}`}>
                      {bettingLines.liveAwayMoneyline > 0 ? '+' : ''}
                      {bettingLines.liveAwayMoneyline}
                    </span>
                  </div>
                )}
                {bettingLines.liveHomeMoneyline && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm flex items-center gap-1">
                      {homeTeam}
                      {bettingLines.liveHomeMoneyline < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                    </span>
                    <span className={`font-bold ${bettingLines.liveHomeMoneyline < 0 ? 'text-success' : 'text-destructive'}`}>
                      {bettingLines.liveHomeMoneyline > 0 ? '+' : ''}
                      {bettingLines.liveHomeMoneyline}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Spread */}
          {bettingLines.liveSpread !== null && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Live Spread</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-2xl font-bold text-accent">
                  {bettingLines.liveSpread > 0 ? '+' : ''}
                  {bettingLines.liveSpread}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bettingLines.liveSpread < 0 ? homeTeam : awayTeam} favored
                </div>
              </div>
            </div>
          )}

          {/* Live Over/Under */}
          {bettingLines.liveOverUnder !== null && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Live O/U</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-2xl font-bold text-accent">
                  {bettingLines.liveOverUnder}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Points</div>
              </div>
            </div>
          )}
        </div>

        {/* Win Probability */}
        {(bettingLines.winProbability?.home || bettingLines.winProbability?.away) && (
          <div className="mt-4 p-3 bg-muted/30 rounded">
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Win Probability</h4>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-foreground">
                  {bettingLines.winProbability.away}%
                </div>
                <div className="text-xs text-muted-foreground">{awayTeam}</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-foreground">
                  {bettingLines.winProbability.home}%
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
