import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthGuard, GalaxyLoader } from './components/AuthGuard';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PlayScreen from './screens/PlayScreen';
import GalaxyScreen from './screens/GalaxyScreen';
import GrownUpsScreen from './screens/GrownUpsScreen';
import ChildOnboardingScreen from './screens/ChildOnboardingScreen';
import StoryScreen from './screens/StoryScreen';
import UpgradeResultScreen from './screens/UpgradeResultScreen';
import BottomNav from './components/candy/BottomNav';
import CelebrationRenderer from './components/candy/CelebrationRenderer';
import { useUIStore } from './stores/useUIStore';
import { useSpeak } from './lib/useSpeak';
import { useChildProfilesQuery } from './lib/queries/childProfiles';

// Thin v2 app shell — replaces the old App.jsx's manual `screen` state +
// 1600-line render tree with real componentized screens per the master
// prompt's "no monolithic App.jsx" architecture rule. Auth wiring
// (useAuth/AuthGuard) is unchanged from the legacy tree, just the
// post-login experience is new.
export default function CandyGalaxyShell() {
  const { user, isLoading, authError } = useAuth();
  const navTab = useUIStore((s) => s.navTab);
  const setNavTab = useUIStore((s) => s.setNavTab);
  const activeChildId = useUIStore((s) => s.activeChildId);
  const { speak } = useSpeak();
  const [questWord, setQuestWord] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showStory, setShowStory] = useState(false);

  const childrenQ = useChildProfilesQuery(user?.id);
  // Same "active child" derivation as useCandyGalaxyData.js (activeChildId
  // from the store, falling back to the first child) — needed here too,
  // one level up, just for the account-indicator initial on BottomNav.
  const activeChild = childrenQ.data?.find((c) => c.id === activeChildId) ?? childrenQ.data?.[0] ?? null;

  return (
    <AuthGuard user={user} isLoading={isLoading} fallback={<LoginScreen authError={authError} />} loadingMessage="Loading your galaxy…">
      <CandyGalaxyInner
        childrenQ={childrenQ}
        activeChild={activeChild}
        navTab={navTab}
        setNavTab={setNavTab}
        speak={speak}
        questWord={questWord}
        setQuestWord={setQuestWord}
        showAddChild={showAddChild}
        setShowAddChild={setShowAddChild}
        showStory={showStory}
        setShowStory={setShowStory}
      />
    </AuthGuard>
  );
}

// Split out so hooks below AuthGuard's gate only ever run once a user
// exists — avoids conditionally calling useChildProfilesQuery with a
// null id across renders in a way that would trip the rules-of-hooks
// linter for a component this size.
function CandyGalaxyInner({ childrenQ, activeChild, navTab, setNavTab, speak, questWord, setQuestWord, showAddChild, setShowAddChild, showStory, setShowStory }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (childrenQ.isLoading) {
    return <GalaxyLoader message="Loading your galaxy…" />;
  }

  // Stripe Checkout success_url/cancel_url (Phase 2 Step 6) land on
  // /app/upgrade/success or /app/upgrade/cancel — checked before the
  // normal onboarding/nav-tab branches so it takes over regardless of
  // whatever navTab was persisted from before checkout started.
  if (location.pathname === '/app/upgrade/success' || location.pathname === '/app/upgrade/cancel') {
    const outcome = location.pathname.endsWith('success') ? 'success' : 'cancel';
    return <UpgradeResultScreen outcome={outcome} onDone={() => navigate('/app')} />;
  }

  // First-run (brand-new account) or "+ Add child" from the switcher —
  // both go through the same onboarding flow.
  if (childrenQ.data?.length === 0 || showAddChild) {
    return (
      <ChildOnboardingScreen
        onDone={() => { setShowAddChild(false); setNavTab('home'); }}
      />
    );
  }

  if (showStory) {
    return <StoryScreen onDone={() => setShowStory(false)} />;
  }

  return (
    <>
      {navTab === 'home' && (
        <HomeScreen
          onStartQuest={(word) => { setQuestWord(word); setNavTab('play'); }}
          onOpenWord={(word) => { setQuestWord(word); setNavTab('play'); }}
          onAddChild={() => setShowAddChild(true)}
          onOpenStory={() => setShowStory(true)}
        />
      )}
      {navTab === 'play' && (
        <PlayScreen focusWord={questWord} onExit={() => setNavTab('home')} />
      )}
      {navTab === 'galaxy' && <GalaxyScreen onOpenWord={(word) => { setQuestWord(word); setNavTab('play'); }} />}
      {navTab === 'grownups' && <GrownUpsScreen />}

      {navTab !== 'play' && <BottomNav active={navTab} onSelect={setNavTab} speak={speak} childInitial={activeChild?.name?.trim()?.[0]?.toUpperCase()} />}
      <CelebrationRenderer />
    </>
  );
}
