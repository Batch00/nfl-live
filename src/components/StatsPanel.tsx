import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsPanelProps {
  homeTeam: string;
  awayTeam: string;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  gameStatus: string;
}

export const StatsPanel = ({
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
  gameStatus,
}: StatsPanelProps) => {
  // Common stat keys to display - expanded with more metrics
  const statKeys = [
    'totalYards',
    'passingYards',
    'rushingYards',
    'turnovers',
    'possessionTime',
    'firstDowns',
    'thirdDownEff',
    'fourthDownEff',
    'redZoneAttempts',
    'penalties',
    'penaltyYards',
  ];

  const statLabels: Record<string, string> = {
    totalYards: 'Total Yards',
    passingYards: 'Passing Yards',
    rushingYards: 'Rushing Yards',
    turnovers: 'Turnovers',
    possessionTime: 'Time of Possession',
    firstDowns: 'First Downs',
    thirdDownEff: '3rd Down Efficiency',
    fourthDownEff: '4th Down Efficiency',
    redZoneAttempts: 'Red Zone Attempts',
    penalties: 'Penalties',
    penaltyYards: 'Penalty Yards',
  };

  // Check if we have any actual stat data (not just empty objects)
  const hasStatsData = Object.keys(homeStats || {}).length > 0 || Object.keys(awayStats || {}).length > 0;
  
  // Filter stats that exist in the data
  const availableStats = statKeys.filter(
    key => homeStats?.[key] || awayStats?.[key]
  );

  // For scheduled games without data, don't show the panel
  const isGameStarted = !gameStatus.toLowerCase().includes('scheduled');
  
  if (!isGameStarted && availableStats.length === 0) {
    return null;
  }

  // For games in progress, show stats if available, otherwise show message
  if (isGameStarted && availableStats.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Statistics will appear once the game is in progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Team Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availableStats.map((statKey) => (
            <div key={statKey} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{awayTeam}</span>
                <span className="font-medium text-foreground">{statLabels[statKey]}</span>
                <span className="text-muted-foreground">{homeTeam}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right font-bold text-lg">
                  {awayStats[statKey] || '0'}
                </div>
                <div className="w-px h-6 bg-border"></div>
                <div className="flex-1 text-left font-bold text-lg">
                  {homeStats[statKey] || '0'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
