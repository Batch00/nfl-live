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

  // Organized stat categories
  const statCategories = {
    basic: [
      { key: 'totalYards', label: 'Total Yards' },
      { key: 'firstDowns', label: 'First Downs' },
      { key: 'turnovers', label: 'Turnovers' },
      { key: 'possessionTime', label: 'Time of Possession' },
    ],
    passing: [
      { key: 'passingYards', label: 'Passing Yards' },
      { key: 'completionAttempts', label: 'Completions / Attempts' },
      { key: 'yardsPerPassAttempt', label: 'Yards per Pass Attempt' },
      { key: 'yardsPerCompletion', label: 'Yards per Completion' },
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
    penalties: [
      { key: 'penalties', label: 'Penalties' },
      { key: 'penaltyYards', label: 'Penalty Yards' },
    ],
  };

  // Calculate advanced metrics
  const calculateAdvancedMetrics = () => {
    const homeTotal = parseInt(homeStats?.totalYards || '0');
    const awayTotal = parseInt(awayStats?.totalYards || '0');
    const homePlays = parseInt(homeStats?.totalPlays || '0');
    const awayPlays = parseInt(awayStats?.totalPlays || '0');
    
    return {
      yardsPerPlay: {
        home: homePlays > 0 ? (homeTotal / homePlays).toFixed(1) : '—',
        away: awayPlays > 0 ? (awayTotal / awayPlays).toFixed(1) : '—',
      },
      sacks: {
        home: homeStats?.sacks || '—',
        away: awayStats?.sacks || '—',
      },
      fumblesLost: {
        home: homeStats?.fumblesLost || '—',
        away: awayStats?.fumblesLost || '—',
      },
      redZoneTD: {
        home: homeStats?.redZoneTD || '—',
        away: awayStats?.redZoneTD || '—',
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Penalties</h3>
              {statCategories.penalties.map(renderStatRow)}
            </div>

            {/* Advanced Metrics */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Advanced Metrics</h3>
              {renderAdvancedMetric('Yards per Play', advancedMetrics.yardsPerPlay.home, advancedMetrics.yardsPerPlay.away)}
              {renderAdvancedMetric('Sacks', advancedMetrics.sacks.home, advancedMetrics.sacks.away)}
              {renderAdvancedMetric('Fumbles Lost', advancedMetrics.fumblesLost.home, advancedMetrics.fumblesLost.away)}
              {renderAdvancedMetric('Red Zone TD %', advancedMetrics.redZoneTD.home, advancedMetrics.redZoneTD.away)}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
