import { GameCanvas } from '../components/game/GameCanvas';
import { Hud } from '../components/ui/Hud';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PauseMenu } from '../components/ui/PauseMenu';
import { StartScreen } from '../components/ui/StartScreen';
import { TransitionOverlay } from '../components/ui/TransitionOverlay';
import { useGameBootstrap } from '../hooks/useGameBootstrap';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { useGameStore } from '../stores/useGameStore';

/** Página del juego: el Canvas 3D siempre montado y la UI superpuesta según la fase. */
export function GamePage() {
  useGameBootstrap();
  usePlayerControls();
  const phase = useGameStore((s) => s.phase);
  const ready = useGameStore((s) => s.manifestLoaded);

  return (
    <main className="game-root">
      <GameCanvas />
      {ready && phase === 'menu' && <StartScreen />}
      {phase === 'playing' && <Hud />}
      {phase === 'paused' && <PauseMenu />}
      <TransitionOverlay />
      <LoadingScreen />
    </main>
  );
}
