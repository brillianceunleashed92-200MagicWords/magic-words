import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthGuard, GalaxyLoader } from './components/AuthGuard';
import LoginScreen from './screens/LoginScreen';
import ConsentInterstitial from './components/ConsentInterstitial';
import HomeScreen from './screens/HomeScreen';
import PlayScreen from './screens/PlayScreen';
import GalaxyScreen from './screens/GalaxyScreen';
import GrownUpsScreen from './screens/GrownUpsScreen';
import ChildOnboardingScreen from './screens/ChildOnboardingScreen';
import PlacementChoiceScreen from './screens/PlacementChoiceScreen';
import PlacementAdventureScreen from './screens/PlacementAdventureScreen';
import CheckInScreen from './screens/CheckInScreen';
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
  // FEAT_QUICK_WINS_R1 — sleeping stars. Set alongside questWord only
  // when the tapped node is asleep (due for review); PlayScreen reads it
  // as `initialGameType` to skip the game picker and launch straight
  // into the existing `flash_cards`/reviewOnly path. null for every
  // normal tap, so ordinary quest-starting is byte-identical to before.
  const [questGameType, setQuestGameType] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showStory, setShowStory] = useState(false);

  const childrenQ = useChildProfilesQuery(user?.id);
  // Same "active child" derivation as useCandyGalaxyData.js (activeChildId
  // from the store, falling back to the first child) — needed here too,
  // one level up, just for the account-indicator initial on BottomNav.
  const activeChild = childrenQ.data?.find((c) => c.id === activeChildId) ?? childrenQ.data?.[0] ?? null;

  // feat/auth-r1 Phase 5 — mandatory COPPA gate for OAuth-created
  // accounts (see ConsentInterstitial.jsx's own header comment). Checked
  // here, above CandyGalaxyInner, so no child-creation/Home rendering
  // path can ever be reached first. Email/password signups always have
  // this set at creation time (LoginScreen.jsx's B6 checkbox), so they
  // never see this — verified with an existing account in Phase 6.
  const needsConsentInterstitial = !!user && !user.user_metadata?.parental_consent;

  return (
    <AuthGuard user={user} isLoading={isLoading} fallback={<LoginScreen authError={authError} />} loadingMessage="Loading your galaxy…">
      {needsConsentInterstitial ? (
        <ConsentInterstitial />
      ) : (
        <CandyGalaxyInner
          childrenQ={childrenQ}
          activeChild={activeChild}
          navTab={navTab}
          setNavTab={setNavTab}
          speak={speak}
          questWord={questWord}
          setQuestWord={setQuestWord}
          questGameType={questGameType}
          setQuestGameType={setQuestGameType}
          showAddChild={showAddChild}
          setShowAddChild={setShowAddChild}
          showStory={showStory}
          setShowStory={setShowStory}
        />
      )}
    </AuthGuard>
  );
}

// Split out so hooks below AuthGuard's gate only ever run once a user
// exists — avoids conditionally calling useChildProfilesQuery with a
// null id across renders in a way that would trip the rules-of-hooks
// linter for a component this size.
function CandyGalaxyInner({ childrenQ, activeChild, navTab, setNavTab, speak, questWord, setQuestWord, questGameType, setQuestGameType, showAddChild, setShowAddChild, showStory, setShowStory }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Placement Adventure (Prompt 8) — global store, not local state, so
  // SettingsTab's "Retake placement" (nested under GrownUpsScreen's
  // prop-less tab renderer) can trigger the same flow this component
  // renders. See useUIStore.js's comment for why.
  const placementFlow = useUIStore((s) => s.placementFlow);
  const placementChildId = useUIStore((s) => s.placementChildId);
  const startPlacementFlow = useUIStore((s) => s.startPlacementFlow);
  const clearPlacementFlow = useUIStore((s) => s.clearPlacementFlow);
  // FEAT_PLACEMENT_CHECKIN_R1 — same pattern as placementFlow above:
  // DashboardTab's Check-In card (nested under GrownUpsScreen) triggers
  // this via the global store, and it takes over the whole screen
  // regardless of navTab, same as the placement adventure does.
  const checkinFlow = useUIStore((s) => s.checkinFlow);
  const checkinChildId = useUIStore((s) => s.checkinChildId);
  const clearCheckinFlow = useUIStore((s) => s.clearCheckinFlow);

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
  // both go through the same onboarding flow, then the placement choice
  // (Prompt 8) before ever reaching Home.
  if (childrenQ.data?.length === 0 || showAddChild) {
    return (
      <ChildOnboardingScreen
        onDone={(child) => { setShowAddChild(false); startPlacementFlow(child.id, 'choice'); }}
      />
    );
  }

  if (placementFlow === 'choice') {
    return (
      <PlacementChoiceScreen
        childId={placementChildId}
        onChooseBeginner={() => { clearPlacementFlow(); setNavTab('home'); }}
        onChoosePlacement={() => startPlacementFlow(placementChildId, 'adventure')}
      />
    );
  }

  if (placementFlow === 'adventure') {
    return (
      <PlacementAdventureScreen
        childId={placementChildId}
        onComplete={() => { clearPlacementFlow(); setNavTab('home'); }}
        onExit={() => { clearPlacementFlow(); setNavTab('home'); }}
      />
    );
  }

  if (checkinFlow) {
    return (
      <CheckInScreen
        childId={checkinChildId}
        onComplete={() => { clearCheckinFlow(); setNavTab('home'); }}
        onExit={() => { clearCheckinFlow(); setNavTab('home'); }}
      />
    );
  }

  if (showStory) {
    return <StoryScreen onDone={() => setShowStory(false)} />;
  }

  // FEAT_QUICK_WINS_R1 — sleeping stars. A single shared tap handler so
  // Home's sleepy-word nudge card and the Galaxy grid's word nodes route
  // identically: an asleep (review-due) word launches the existing
  // reviewOnly session (`initialGameType: 'flash_cards'`, the same id
  // Quiz Boss already uses), any other word starts a normal focus-word
  // session exactly as before this run.
  function startQuestFor(word) {
    setQuestWord(word);
    setQuestGameType(word?.sleepy ? 'flash_cards' : null);
    setNavTab('play');
  }

  return (
    <>
      {navTab === 'home' && (
        <HomeScreen
          onStartQuest={startQuestFor}
          onOpenWord={startQuestFor}
          onAddChild={() => setShowAddChild(true)}
          onOpenStory={() => setShowStory(true)}
        />
      )}
      {navTab === 'play' && (
        <PlayScreen focusWord={questWord} initialGameType={questGameType} onExit={() => { setQuestGameType(null); setNavTab('home'); }} />
      )}
      {navTab === 'galaxy' && <GalaxyScreen onOpenWord={startQuestFor} />}
      {navTab === 'grownups' && <GrownUpsScreen />}

      {navTab !== 'play' && <BottomNav active={navTab} onSelect={setNavTab} speak={speak} childInitial={activeChild?.name?.trim()?.[0]?.toUpperCase()} />}
      <CelebrationRenderer />
    </>
  );
}
