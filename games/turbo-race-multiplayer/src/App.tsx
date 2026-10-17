/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import GameCanvas from './components/GameCanvas';
import { Player } from './types';

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
const PLAYER_NAMES = ['You', 'Blaze', 'Shadow', 'Nitro', 'Drift', 'Turbo'];

function generateAIPlayers(count: number): Record<string, Player> {
  const players: Record<string, Player> = {};
  
  // Local player
  players['local-player'] = {
    id: 'local-player',
    x: 650,
    y: 750,
    angle: Math.PI,
    color: PLAYER_COLORS[0],
    name: PLAYER_NAMES[0],
    speed: 0,
    laps: 0,
    bestLapTime: Infinity,
    nitro: 100,
    drifting: false,
  };

  // AI players
  for (let i = 1; i <= count; i++) {
    const id = `ai-${i}`;
    players[id] = {
      id,
      x: 650 + i * 15,
      y: 750 + (i % 2 === 0 ? 20 : -20),
      angle: Math.PI,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      name: PLAYER_NAMES[i % PLAYER_NAMES.length],
      speed: 0,
      laps: 0,
      bestLapTime: Infinity,
      nitro: 100,
      drifting: false,
    };
  }

  return players;
}

export default function App() {
  const initialPlayers = React.useMemo(() => generateAIPlayers(3), []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start font-sans text-slate-100">
      <header className="w-full max-w-4xl mx-auto p-2 flex justify-between items-center transition-all">
        <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 transform -skew-x-12 transition-all">
          TURBO RACE
        </h1>
      </header>

      <main className="flex-1 w-full flex flex-col items-center p-0 transition-all">
        <GameCanvas initialPlayers={initialPlayers} />
      </main>
    </div>
  );
}
