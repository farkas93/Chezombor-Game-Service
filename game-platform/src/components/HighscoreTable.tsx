'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HighScore } from '@/types';
import { Trophy, Robot, User } from 'lucide-react';

interface HighscoreTableProps {
  scores: HighScore[];
  loading: boolean;
}

export function HighscoreTable({ scores, loading }: HighscoreTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-96 bg-slate-200 rounded"></div>
          <div className="h-8 w-96 bg-slate-200 rounded"></div>
          <div className="h-8 w-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No highscores available yet.</p>
        <p className="text-sm">Play 2048 to set some records!</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scores.map((score, index) => (
            <TableRow key={`${score.playerId}-${index}`}>
              <TableCell className="font-medium text-center">
                {index === 0 ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    <Trophy className="w-4 h-4 mr-1" /> 1
                  </Badge>
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {score.playerType === 'ai' ? (
                    <Robot className="w-4 h-4 text-blue-500" />
                  ) : (
                    <User className="w-4 h-4 text-green-500" />
                  )}
                  {score.playerName}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={score.playerType === 'ai' ? 'secondary' : 'default'}>
                  {score.playerType === 'ai' ? 'AI' : 'Human'}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-mono font-semibold">
                {score.score.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {new Date(score.date).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}