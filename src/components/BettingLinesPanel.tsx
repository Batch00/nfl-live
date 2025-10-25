import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BettingLinesPanelProps {
  bettingLines: any; // Can be TheOddsAPI format or ESPN fallback
  homeTeam: string;
  awayTeam: string;
  gameStatus: string;
}

// Helper to parse betting lines from either TheOddsAPI or ESPN format
function parseBettingLines(bettingLines: any) {
  if (!bettingLines) return null;

  // TheOddsAPI format
  if (bettingLines.source === 'TheOddsAPI' && bettingLines.consensus) {
    return {
      source: 'TheOddsAPI',
      spread: bettingLines.consensus.spread,
      total: bettingLines.consensus.total,
      homeML: bettingLines.consensus.home_ml,
      awayML: bettingLines.consensus.away_ml,
      bookmakers: bettingLines.bookmakers || [],
      gameState: bettingLines.game_state,
      lastUpdate: bettingLines.last_update,
    };
  }

  // ESPN fallback format
  if (bettingLines.spread !== undefined || bettingLines.overUnder !== undefined) {
    return {
      source: 'ESPN',
      spread: bettingLines.spread,
      total: bettingLines.overUnder,
      homeML: bettingLines.homeMoneyline,
      awayML: bettingLines.awayMoneyline,
      bookmakers: [],
      gameState: bettingLines.game_state,
    };
  }

  return null;
}

export const BettingLinesPanel = ({ 
  bettingLines, 
  homeTeam, 
  awayTeam,
  gameStatus 
}: BettingLinesPanelProps) => {
  // Parse betting lines
  const odds = parseBettingLines(bettingLines);

  if (!odds) {
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Pregame Information
          </div>
          <div className="text-xs font-normal text-muted-foreground">
            {odds.source === 'TheOddsAPI' ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live odds from {odds.bookmakers.length} sportsbooks
              </span>
            ) : (
              'ESPN Odds'
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Consensus Odds */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-border pb-2">
            {odds.source === 'TheOddsAPI' ? 'Consensus Odds' : 'Full Game'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Moneyline */}
            {(odds.homeML !== null || odds.awayML !== null) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Moneyline</h4>
                <div className="space-y-1">
                  {odds.awayML !== null && (
                    <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm flex items-center gap-1">
                        {awayTeam}
                        {odds.awayML < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                      </span>
                      <span className={`font-bold ${odds.awayML < 0 ? 'text-success' : 'text-destructive'}`}>
                        {odds.awayML > 0 ? '+' : ''}
                        {Math.round(odds.awayML)}
                      </span>
                    </div>
                  )}
                  {odds.homeML !== null && (
                    <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm flex items-center gap-1">
                        {homeTeam}
                        {odds.homeML < 0 && <TrendingDown className="w-3 h-3 text-success" />}
                      </span>
                      <span className={`font-bold ${odds.homeML < 0 ? 'text-success' : 'text-destructive'}`}>
                        {odds.homeML > 0 ? '+' : ''}
                        {Math.round(odds.homeML)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Spread */}
            {odds.spread !== null && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Spread</h4>
                <div className="p-3 bg-muted/50 rounded text-center">
                  <div className="text-2xl font-bold text-accent">
                    {odds.spread > 0 ? '+' : ''}
                    {typeof odds.spread === 'number' ? odds.spread.toFixed(1) : odds.spread}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {odds.spread < 0 ? homeTeam : awayTeam} favored
                  </div>
                </div>
              </div>
            )}

            {/* Over/Under */}
            {odds.total !== null && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Over/Under</h4>
                <div className="p-3 bg-muted/50 rounded text-center">
                  <div className="text-2xl font-bold text-accent">
                    {typeof odds.total === 'number' ? odds.total.toFixed(1) : odds.total}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total Points</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sportsbook Comparison - Only for TheOddsAPI */}
        {odds.source === 'TheOddsAPI' && odds.bookmakers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-border pb-2">
              Sportsbook Comparison
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {odds.bookmakers.slice(0, 5).map((book: any, idx: number) => (
                <div key={idx} className="p-2 bg-muted/30 rounded text-xs">
                  <div className="font-semibold mb-1">{book.name}</div>
                  <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                    <div>
                      <span className="font-medium">ML:</span>{' '}
                      {book.away_moneyline ? `${book.away_moneyline > 0 ? '+' : ''}${book.away_moneyline}` : '-'} /{' '}
                      {book.home_moneyline ? `${book.home_moneyline > 0 ? '+' : ''}${book.home_moneyline}` : '-'}
                    </div>
                    <div>
                      <span className="font-medium">Spread:</span>{' '}
                      {book.home_spread ? `${book.home_spread > 0 ? '+' : ''}${book.home_spread}` : '-'}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> {book.total || '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {odds.bookmakers.length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing 5 of {odds.bookmakers.length} sportsbooks
              </p>
            )}
          </div>
        )}

        {/* Data Source Footer */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          {odds.source === 'TheOddsAPI' ? (
            <>
              Powered by TheOddsAPI • {odds.gameState || 'Pregame'} • 
              Updated: {odds.lastUpdate ? new Date(odds.lastUpdate).toLocaleTimeString() : 'N/A'}
            </>
          ) : (
            'Odds provided by ESPN'
          )}
        </div>
      </CardContent>
    </Card>
  );
};
