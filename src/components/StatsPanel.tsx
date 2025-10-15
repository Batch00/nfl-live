import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  // Helper to parse penalties from "count-yards" format
  const parsePenalties = (stats: Record<string, string>) => {
    const penaltyData = stats?.totalPenaltiesYards;
    if (!penaltyData) return { count: '—', yards: '—' };
    const parts = penaltyData.split('-');
    return { count: parts[0] || '—', yards: parts[1] || '—' };
  };

  // Helper to parse sacks from "count-yards" format
  const parseSacks = (stats: Record<string, string>) => {
    const sacksData = stats?.sacksYardsLost;
    if (!sacksData) return '—';
    const parts = sacksData.split('-');
    return parts[0] || '—';
  };

  // Helper to calculate yards per completion
  const calculateYardsPerCompletion = (stats: Record<string, string>) => {
    const completions = stats?.completionAttempts?.split('/')[0];
    const passingYards = stats?.netPassingYards;
    if (!completions || !passingYards) return '—';
    const comp = parseInt(completions);
    const yards = parseInt(passingYards);
    return comp > 0 ? (yards / comp).toFixed(1) : '—';
  };

  const homePenalties = parsePenalties(homeStats);
  const awayPenalties = parsePenalties(awayStats);

  // Organized stat categories with correct keys
  const statCategories = {
    basic: [
      { key: 'totalYards', label: 'Total Yards' },
      { key: 'firstDowns', label: 'First Downs' },
      { key: 'turnovers', label: 'Turnovers' },
      { key: 'possessionTime', label: 'Time of Possession' },
    ],
    passing: [
      { key: 'netPassingYards', label: 'Passing Yards' },
      { key: 'completionAttempts', label: 'Completions / Attempts' },
      { key: 'yardsPerPass', label: 'Yards per Pass Attempt' },
    ],
    rushing: [
      { key: 'rushingYards', label: 'Rushing Yards' },
      { key: 'rushingAttempts', label: 'Rushing Attempts' },
      { key: 'yardsPerRushAttempt', label: 'Yards per Rush Attempt' },
    ],
    efficiency: [
      { key: 'thirdDownEff', label: '3rd Down Efficiency' },
      { key: 'fourthDownEff', label: '4th Down Efficiency' },
      { key: 'redZoneAttempts', label: 'Red Zone Attempts' },
    ],
  };

  // Calculate advanced metrics
  const calculateAdvancedMetrics = () => {
    return {
      yardsPerPlay: {
        home: homeStats?.yardsPerPlay || '—',
        away: awayStats?.yardsPerPlay || '—',
      },
      yardsPerCompletion: {
        home: calculateYardsPerCompletion(homeStats),
        away: calculateYardsPerCompletion(awayStats),
      },
      sacks: {
        home: parseSacks(homeStats),
        away: parseSacks(awayStats),
      },
      fumblesLost: {
        home: homeStats?.fumblesLost || '—',
        away: awayStats?.fumblesLost || '—',
      },
      interceptions: {
        home: homeStats?.interceptions || '—',
        away: awayStats?.interceptions || '—',
      },
    };
  };

  const advancedMetrics = calculateAdvancedMetrics();

  // Check if we have any actual stat data
  const hasStatsData = Object.keys(homeStats || {}).length > 0 || Object.keys(awayStats || {}).length > 0;
  
  // Check which stats are available
  const hasAnyStats = Object.values(statCategories).some(category =>
    category.some(stat => homeStats?.[stat.key] || awayStats?.[stat.key])
  );

  // For scheduled games without data, don't show the panel
  const isGameStarted = !gameStatus.toLowerCase().includes('scheduled');
  
  if (!isGameStarted && !hasAnyStats) {
    return null;
  }

  // For games in progress, show stats if available, otherwise show message
  if (isGameStarted && !hasAnyStats) {
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

  const renderStatRow = (stat: { key: string; label: string }) => {
    const homeValue = homeStats?.[stat.key];
    const awayValue = awayStats?.[stat.key];
    
    if (!homeValue && !awayValue) return null;

    return (
      <div key={stat.key} className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{awayTeam}</span>
          <span className="font-medium text-foreground">{stat.label}</span>
          <span className="text-muted-foreground">{homeTeam}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-right font-bold text-lg">
            {awayValue || '—'}
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex-1 text-left font-bold text-lg">
            {homeValue || '—'}
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedMetric = (label: string, homeValue: string, awayValue: string) => {
    if (homeValue === '—' && awayValue === '—') return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{awayTeam}</span>
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-muted-foreground">{homeTeam}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-right font-bold text-lg">
            {awayValue}
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex-1 text-left font-bold text-lg">
            {homeValue}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Statistics</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-8">
            {/* Basic Stats */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overall</h3>
              {statCategories.basic.map(renderStatRow)}
            </div>

            {/* Passing Stats */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Passing</h3>
              {statCategories.passing.map(renderStatRow)}
            </div>

            {/* Rushing Stats */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rushing</h3>
              {statCategories.rushing.map(renderStatRow)}
            </div>

            {/* Efficiency Stats */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Efficiency</h3>
              {statCategories.efficiency.map(renderStatRow)}
            </div>

            {/* Penalties */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Penalties</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{awayTeam}</span>
                  <span className="font-medium text-foreground">Penalties (Count)</span>
                  <span className="text-muted-foreground">{homeTeam}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-right font-bold text-lg">
                    {awayPenalties.count}
                  </div>
                  <div className="w-px h-6 bg-border"></div>
                  <div className="flex-1 text-left font-bold text-lg">
                    {homePenalties.count}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{awayTeam}</span>
                  <span className="font-medium text-foreground">Penalty Yards</span>
                  <span className="text-muted-foreground">{homeTeam}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-right font-bold text-lg">
                    {awayPenalties.yards}
                  </div>
                  <div className="w-px h-6 bg-border"></div>
                  <div className="flex-1 text-left font-bold text-lg">
                    {homePenalties.yards}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Metrics */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Advanced Metrics</h3>
              {renderAdvancedMetric('Yards per Play', advancedMetrics.yardsPerPlay.home, advancedMetrics.yardsPerPlay.away)}
              {renderAdvancedMetric('Yards per Completion', advancedMetrics.yardsPerCompletion.home, advancedMetrics.yardsPerCompletion.away)}
              {renderAdvancedMetric('Sacks', advancedMetrics.sacks.home, advancedMetrics.sacks.away)}
              {renderAdvancedMetric('Interceptions', advancedMetrics.interceptions.home, advancedMetrics.interceptions.away)}
              {renderAdvancedMetric('Fumbles Lost', advancedMetrics.fumblesLost.home, advancedMetrics.fumblesLost.away)}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
