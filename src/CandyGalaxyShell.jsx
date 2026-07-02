import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthGuard } from './components/AuthGuard';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PlayScreen from './screens/PlayScreen';
import GalaxyScreen from './screens/GalaxyScreen';
import GrownUpsScreen from './screens/GrownUpsScreen';
import BottomNav from './components/candy/BottomNav';
import CelebrationRenderer from './components/candy/CelebrationRenderer';
import { useUIStore } from './stores/useUIStore';
import { useSpeak } from './lib/useSpeak';

// Thin v2 app shell — replaces the old App.jsx's manual `screen` state +
// 1600-line render tree with real componentized screens per the master
// prompt's "no monolithic App.jsx" architecture rule. Auth wiring
// (useAuth/AuthGuard) is unchanged from the legacy tree, just the
// post-login experience is new.
export default function CandyGalaxyShell() {
  const { user, isLoading, authError } = useAuth();
  const navTab = useUIStore((s) => s.navTab);
  const setNavTab = useUIStore((s) => s.setNavTab);
  const { speak } = useSpeak();
  const [questWord, setQuestWord] = useState(null);

  return (
    <AuthGuard user={user} isLoading={isLoading} fallback={<LoginScreen authError={authError} />} loadingMessage="Loading your galaxy…">
      {navTab === 'home' && (
        <HomeScreen
          onStartQuest={(word) => { setQuestWord(word); setNavTab('play'); }}
          onOpenWord={(word) => { setQuestWord(word); setNavTab('play'); }}
        />
      )}
      {navTab === 'play' && (
        <PlayScreen focusWord={questWord} onExit={() => setNavTab('home')} />
      )}
      {navTab === 'galaxy' && <GalaxyScreen onOpenWord={(word) => { setQuestWord(word); setNavTab('play'); }} />}
      {navTab === 'grownups' && <GrownUpsScreen />}

      {navTab !== 'play' && <BottomNav active={navTab} onSelect={setNavTab} speak={speak} />}
      <CelebrationRenderer />
    </AuthGuard>
  );
}
