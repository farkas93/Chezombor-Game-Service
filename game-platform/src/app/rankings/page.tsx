'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EloRankTable } from '@/components/EloRankTable';
import { HighscoreTable } from '@/components/HighscoreTable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EloRating, HighScore, GameType } from '@/types';

export default function RankingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GameType>('chess');
  const [chessRankings, setChessRankings] = useState<EloRating[]>([]);
  const [goRankings, setGoRankings] = useState<EloRating[]>([]);
  const [highscores, setHighscores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rankings/${activeTab}`);
        const data = await res.json();
        
        // ADDED: Check if data is an array
        if (!Array.isArray(data)) {
          console.error('Rankings API returned non-array:', data);
          // Set empty array on error
          if (activeTab === 'chess') {
            setChessRankings([]);
          } else if (activeTab === 'go') {
            setGoRankings([]);
          } else if (activeTab === '2048') {
            setHighscores([]);
          }
          return;
        }
        
        if (activeTab === 'chess') {
          setChessRankings(data);
        } else if (activeTab === 'go') {
          setGoRankings(data);
        } else if (activeTab === '2048') {
          setHighscores(data);
        }
      } catch (error) {
        console.error('Error fetching rankings:', error);
        // Set empty arrays on error
        if (activeTab === 'chess') {
          setChessRankings([]);
        } else if (activeTab === 'go') {
          setGoRankings([]);
        } else if (activeTab === '2048') {
          setHighscores([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              Rankings & Highscores
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GameType)} className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="chess" className="gap-2">
                <span className="text-xl">♟️</span> Chess ELO
              </TabsTrigger>
              <TabsTrigger value="go" className="gap-2">
                <span className="text-xl">⚫</span> Go ELO
              </TabsTrigger>
              <TabsTrigger value="2048" className="gap-2">
                <span className="text-xl">🔢</span> 2048 Highscores
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chess">
              <EloRankTable 
                rankings={chessRankings} 
                loading={loading && activeTab === 'chess'} 
                gameType="chess"
              />
            </TabsContent>
            
            <TabsContent value="go">
              <EloRankTable 
                rankings={goRankings} 
                loading={loading && activeTab === 'go'} 
                gameType="go"
              />
            </TabsContent>
            
            <TabsContent value="2048">
              <HighscoreTable 
                scores={highscores} 
                loading={loading && activeTab === '2048'} 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}