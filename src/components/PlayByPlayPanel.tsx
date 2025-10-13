import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { useState } from "react";

interface Play {
  id: string;
  type: string | null;
  text: string | null;
  awayScore: number;
  homeScore: number;
  period: number | null;
  clock: string | null;
  scoringPlay: boolean;
  yards: number;
}

interface Drive {
  id: string;
  team: string | null;
  description: string | null;
  plays: Play[];
}

interface PlayByPlayPanelProps {
  playByPlay: Drive[];
  homeTeam: string;
  awayTeam: string;
  gameId: string;
  onExport: (gameId: string) => void;
}

export const PlayByPlayPanel = ({ playByPlay, homeTeam, awayTeam, gameId, onExport }: PlayByPlayPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport(gameId);
  };

  if (!playByPlay || playByPlay.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Play-by-Play</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
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
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <div className="space-y-4">
              {playByPlay.map((drive) => (
                <div key={drive.id} className="border-l-2 border-accent pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-accent">{drive.team || 'Unknown'}</span>
                    {drive.description && (
                      <span className="text-sm text-muted-foreground">{drive.description}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {drive.plays.map((play) => (
                      <div
                        key={play.id}
                        className={`p-2 rounded text-sm ${
                          play.scoringPlay
                            ? 'bg-success/10 border-l-2 border-success'
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              {play.period && <span>Q{play.period}</span>}
                              {play.clock && <span>• {play.clock}</span>}
                              {play.type && <span>• {play.type}</span>}
                            </div>
                            <p className="text-foreground">{play.text}</p>
                          </div>
                          {play.scoringPlay && (
                            <div className="text-xs font-bold text-success">
                              {awayTeam} {play.awayScore} - {play.homeScore} {homeTeam}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
