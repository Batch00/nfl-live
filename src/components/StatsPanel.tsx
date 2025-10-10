import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsPanelProps {
  homeTeam: string;
  awayTeam: string;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
}

export const StatsPanel = ({
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
}: StatsPanelProps) => {
  // Common stat keys to display
  const statKeys = [
    'totalYards',
    'passingYards',
    'rushingYards',
    'turnovers',
    'possessionTime',
    'firstDowns',
  ];

  const statLabels: Record<string, string> = {
    totalYards: 'Total Yards',
    passingYards: 'Passing Yards',
    rushingYards: 'Rushing Yards',
    turnovers: 'Turnovers',
    possessionTime: 'Time of Possession',
    firstDowns: 'First Downs',
  };

  // Filter stats that exist in the data
  const availableStats = statKeys.filter(
    key => homeStats[key] || awayStats[key]
  );

  if (availableStats.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No statistics available yet
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
