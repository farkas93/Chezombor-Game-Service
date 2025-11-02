'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EloRating } from '@/types';
import { Crown, Medal, Robot, User } from 'lucide-react';

interface EloRankTableProps {
  rankings: EloRating[];
  loading: boolean;
  gameType: 'chess' | 'go';
}

export function EloRankTable({ rankings, loading, gameType }: EloRankTableProps) {
  const gameIcon = gameType === 'chess' ? '♟️' : '⚫';

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

  if (rankings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No rankings available yet.</p>
        <p className="text-sm">Play some games to get on the leaderboard!</p>
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
            <TableHead className="text-center">Rating</TableHead>
            <TableHead className="text-right">W/L/D</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((rank, index) => (
            <TableRow key={rank.playerId}>
              <TableCell className="font-medium text-center">
                {index === 0 ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    <Crown className="w-4 h-4 mr-1" /> 1
                  </Badge>
                ) : index === 1 ? (
                  <Badge className="bg-slate-400 hover:bg-slate-500">
                    <Medal className="w-4 h-4 mr-1" /> 2
                  </Badge>
                ) : index === 2 ? (
                  <Badge className="bg-amber-700 hover:bg-amber-800">
                    <Medal className="w-4 h-4 mr-1" /> 3
                  </Badge>
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {rank.playerName.toLowerCase().includes('ai') || rank.playerName.toLowerCase().includes('bot') ? (
                    <Robot className="w-4 h-4 text-blue-500" />
                  ) : (
                    <User className="w-4 h-4 text-green-500" />
                  )}
                  {rank.playerName}
                </div>
              </TableCell>
              <TableCell className="text-center font-mono font-semibold">
                {rank.rating}
              </TableCell>
              <TableCell className="text-right font-mono">
                {rank.wins}/{rank.losses}/{rank.draws}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}