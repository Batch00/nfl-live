import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface GameCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeScore: number;
  awayScore: number;
  quarter: number;
  clock: string | null;
  gameStatus: string;
  venue?: string | null;
  broadcast?: string | null;
}

export const GameCard = ({
  homeTeam,
  awayTeam,
  homeTeamAbbr,
  awayTeamAbbr,
  homeScore,
  awayScore,
  quarter,
  clock,
  gameStatus,
  venue,
  broadcast,
}: GameCardProps) => {
  const isHomeWinning = homeScore > awayScore;
  const isAwayWinning = awayScore > homeScore;
  const isTied = homeScore === awayScore;

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border shadow-card hover:shadow-glow transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant={gameStatus.toLowerCase().includes('in progress') ? "default" : "secondary"}>
            {gameStatus}
          </Badge>
          {broadcast && (
            <span className="text-xs text-muted-foreground">{broadcast}</span>
          )}
        </div>
        {venue && (
          <p className="text-xs text-muted-foreground mt-1">{venue}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Away Team */}
        <div className={`flex items-center justify-between p-3 rounded-lg mb-2 transition-colors ${
          isAwayWinning ? 'bg-success/10' : 'bg-muted/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-muted-foreground">{awayTeamAbbr}</div>
            <div className="text-sm font-medium">{awayTeam}</div>
          </div>
          <div className="flex items-center gap-2">
            {isAwayWinning && <TrendingUp className="w-5 h-5 text-success" />}
            <div className={`text-3xl font-bold ${isAwayWinning ? 'text-success' : ''}`}>
              {awayScore}
            </div>
          </div>
        </div>

        {/* Home Team */}
        <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
          isHomeWinning ? 'bg-success/10' : 'bg-muted/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-muted-foreground">{homeTeamAbbr}</div>
            <div className="text-sm font-medium">{homeTeam}</div>
          </div>
          <div className="flex items-center gap-2">
            {isHomeWinning && <TrendingUp className="w-5 h-5 text-success" />}
            <div className={`text-3xl font-bold ${isHomeWinning ? 'text-success' : ''}`}>
              {homeScore}
            </div>
          </div>
        </div>

        {/* Game Clock */}
        <div className="mt-4 text-center">
          <div className="text-sm text-muted-foreground">
            {quarter === 1 ? '1st' : quarter === 2 ? '2nd' : quarter === 3 ? '3rd' : '4th'} Quarter
          </div>
          <div className="text-lg font-mono font-semibold text-accent">{clock}</div>
        </div>
      </CardContent>
    </Card>
  );
};
