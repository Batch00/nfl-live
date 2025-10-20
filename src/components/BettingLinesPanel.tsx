import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BettingLinesPanelProps {
  bettingLines: {
    spread?: number | null;
    overUnder?: number | null;
    homeMoneyline?: number | null;
    awayMoneyline?: number | null;
    details?: string | null;
    firstHalfSpread?: number | null;
    firstHalfOverUnder?: number | null;
    secondHalfSpread?: number | null;
    secondHalfOverUnder?: number | null;
  };
  homeTeam: string;
  awayTeam: string;
  gameStatus: string;
}

export const BettingLinesPanel = ({ 
  bettingLines, 
  homeTeam, 
  awayTeam,
  gameStatus 
}: BettingLinesPanelProps) => {
  // Only show betting lines for scheduled/pregame games
  const status = gameStatus.toLowerCase();
  if (!status.includes('scheduled') && !status.includes('pregame')) {
    return null;
  }

  // Check if we have any betting data
  const hasData = bettingLines.spread !== null || 
                  bettingLines.overUnder !== null || 
                  bettingLines.homeMoneyline !== null || 
                  bettingLines.awayMoneyline !== null;

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Pregame Betting Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Betting lines not yet available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Pregame Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Full Game Lines */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-border pb-2">
            Full Game
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Moneyline */}
            {(bettingLines.homeMoneyline || bettingLines.awayMoneyline) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Moneyline</h4>
                <div className="space-y-1">
                  {bettingLines.awayMoneyline && (
                    <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm flex items-center gap-1">
                        {awayTeam}
                        {bettingLines.awayMoneyline < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                      </span>
                      <span className={`font-bold ${bettingLines.awayMoneyline < 0 ? 'text-success' : 'text-destructive'}`}>
                        {bettingLines.awayMoneyline > 0 ? '+' : ''}
                        {bettingLines.awayMoneyline}
                      </span>
                    </div>
                  )}
                  {bettingLines.homeMoneyline && (
                    <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm flex items-center gap-1">
                        {homeTeam}
                        {bettingLines.homeMoneyline < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                      </span>
                      <span className={`font-bold ${bettingLines.homeMoneyline < 0 ? 'text-success' : 'text-destructive'}`}>
                        {bettingLines.homeMoneyline > 0 ? '+' : ''}
                        {bettingLines.homeMoneyline}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Spread */}
            {bettingLines.spread !== null && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Spread</h4>
                <div className="p-3 bg-muted/50 rounded text-center">
                  <div className="text-2xl font-bold text-accent">
                    {bettingLines.spread > 0 ? '+' : ''}
                    {bettingLines.spread}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {bettingLines.spread < 0 ? homeTeam : awayTeam} favored
                  </div>
                </div>
              </div>
            )}

            {/* Over/Under */}
            {bettingLines.overUnder !== null && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Over/Under</h4>
                <div className="p-3 bg-muted/50 rounded text-center">
                  <div className="text-2xl font-bold text-accent">
                    {bettingLines.overUnder}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total Points</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* First Half Lines */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-border pb-2">
            First Half
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Spread</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-xl font-bold text-muted-foreground">
                  {bettingLines.firstHalfSpread !== null && bettingLines.firstHalfSpread !== undefined
                    ? `${bettingLines.firstHalfSpread > 0 ? '+' : ''}${bettingLines.firstHalfSpread}`
                    : '—'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Over/Under</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-xl font-bold text-muted-foreground">
                  {bettingLines.firstHalfOverUnder ?? '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Second Half Lines */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-border pb-2">
            Second Half
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Spread</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-xl font-bold text-muted-foreground">
                  {bettingLines.secondHalfSpread !== null && bettingLines.secondHalfSpread !== undefined
                    ? `${bettingLines.secondHalfSpread > 0 ? '+' : ''}${bettingLines.secondHalfSpread}`
                    : '—'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Over/Under</h4>
              <div className="p-3 bg-muted/50 rounded text-center">
                <div className="text-xl font-bold text-muted-foreground">
                  {bettingLines.secondHalfOverUnder ?? '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
