import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthGuard, GalaxyLoader } from "./components/AuthGuard";
import { useAuth } from "./hooks/useAuth";
import { useSessionPlan } from "./hooks/useSessionPlan";
import { GameEngine, GameTypeSelector } from "./games/GameEngine";

const WORDS = [
  { id: 1,  word: "cat",  type: "content",  unit: 2,  mastery: 0, emoji: "🐱" },
  { id: 2,  word: "dog",  type: "content",  unit: 9,  mastery: 0, emoji: "🐶" },
  { id: 3,  word: "bird", type: "content",  unit: 2,  mastery: 0, emoji: "🐦" },
  { id: 4,  word: "frog", type: "content",  unit: 8,  mastery: 0, emoji: "🐸" },
  { id: 5,  word: "eat",  type: "content",  unit: 3,  mastery: 0, emoji: "🍎" },
  { id: 6,  word: "fly",  type: "content",  unit: 3,  mastery: 0, emoji: "✈️" },
  { id: 7,  word: "jump", type: "content",  unit: 4,  mastery: 0, emoji: "🦘" },
  { id: 8,  word: "run",  type: "content",  unit: 9,  mastery: 0, emoji: "🏃" },
  { id: 9,  word: "big",  type: "content",  unit: 7,  mastery: 0, emoji: "🐘" },
  { id: 10, word: "sad",  type: "content",  unit: 13, mastery: 0, emoji: "😢" },
  { id: 11, word: "the",  type: "function", unit: 3,  mastery: 0, emoji: "📖" },
  { id: 12, word: "can",  type: "function", unit: 3,  mastery: 0, emoji: "🥫" },
  { id: 13, word: "is",   type: "function", unit: 5,  mastery: 0, emoji: "🔗" },
  { id: 14, word: "they", type: "function", unit: 6,  mastery: 0, emoji: "👥" },
  { id: 15, word: "not",  type: "function", unit: 3,  mastery: 0, emoji: "🚫" },
  { id: 16, word: "and",  type: "function", unit: 12, mastery: 0, emoji: "➕" },
  { id: 17, word: "with", type: "function", unit: 18, mastery: 0, emoji: "🤝" },
  { id: 18, word: "do",   type: "function", unit: 7,  mastery: 0, emoji: "⚡" },
];

const STUDENTS = [
  { name: "Emma R.",  avatar: "🐸", progress: 78, streak: 12, unit: 9,  words: 87  },
  { name: "Liam K.",  avatar: "🤖", progress: 45, streak: 3,  unit: 5,  words: 52  },
  { name: "Sofia M.", avatar: "🐶", progress: 92, streak: 21, unit: 11, words: 105 },
  { name: "Noah T.",  avatar: "🐱", progress: 31, streak: 1,  unit: 4,  words: 38  },
  { name: "Ava L.",   avatar: "🐦", progress: 67, streak: 8,  unit: 7,  words: 71  },
  { name: "James P.", avatar: "🐸", progress: 55, streak: 5,  unit: 6,  words: 60  },
];

const getMasteryColor = (m) => {
  if (m === 0)   return "#e8e8f0";
  if (m < 40)    return "#FFB347";
  if (m < 80)    return "#4ECDC4";
  return "#FFE66D";
};

const getMasteryGlow = (m) => {
  if (m === 0)   return "none";
  if (m < 40)    return "0 0 8px #FFB34799";
  if (m < 80)    return "0 0 12px #4ECDC499";
  return "0 0 16px #FFE66D, 0 0 32px #FFE66D88";
};

// ─── Derive the child's display name from Supabase auth metadata ─────────────
function getChildName(user) {
  if (!user) return 'Star Learner';
  const meta = user.user_metadata ?? {};
  const fromMeta = (meta.full_name || meta.name || '').trim();
  if (fromMeta) return fromMeta;
  const prefix = (user.email ?? '').split('@')[0];
  if (!prefix) return 'Star Learner';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

// ─── TTS helper — fire-and-forget, no cache needed for occasional garden taps ─
async function speakWord(word) {
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    new Audio(URL.createObjectURL(blob)).play();
  } catch {}
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth (replaces all the old manual session code) ──
  const { user, isLoading: authLoading, authError, signOut, profile } = useAuth();

  // ── Word progress (loaded from Supabase, falls back to WORDS defaults) ──
  const [words, setWords]               = useState(() => WORDS.map(w => ({ ...w })));
  const [scoresLoaded, setScoresLoaded] = useState(false);

  // ── Navigation ──
  const [screen, setScreen]   = useState("home");
  const [activeWord, setActiveWord] = useState(null);

  // ── Particles (celebration effect) ──
  const [particles, setParticles] = useState([]);

  // ── Game state ──
  const [gameActive,     setGameActive]     = useState(false);
  const [activeGameType, setActiveGameType] = useState("word_match");

  // ── Streak ──
  const [streak,      setStreak]      = useState(0);
  const [freezesLeft, setFreezesLeft] = useState(0);
  const [freezeUsed,  setFreezeUsed]  = useState(false);

  // ── Parent dashboard real data ──
  const [weeklyActivity, setWeeklyActivity] = useState(null); // null = not loaded yet

  // ── Teacher class ──
  const [teacherClass,     setTeacherClass]     = useState(null);
  const [showCreateClass,  setShowCreateClass]  = useState(false);
  const [newClassName,     setNewClassName]     = useState('');

  // ── Session plan (1 AI call at login, replaces per-tap AI) ──
  const wordProgressForPlan = useMemo(() =>
    words.map(w => ({ word: w.word, mastery: w.mastery, last_practiced: null })),
    [words]
  );
  const { sessionPlan, planLoading, planError, regeneratePlan, generatePlanForWord } =
    useSessionPlan(user, scoresLoaded ? wordProgressForPlan : null);

  // ── Derived ──
  const masteryByWord = useMemo(() => {
    const m = new Map();
    for (const w of words) m.set(w.word, w.mastery);
    return m;
  }, [words]);

  // ── Load word progress from Supabase on login ──
  useEffect(() => {
    if (!user) {
      setWords(WORDS.map(w => ({ ...w })));
      setScoresLoaded(false);
      return;
    }
    setScoresLoaded(false);
    supabase
      .from("word_progress")
      .select("word, mastery, correct_count, attempt_count, last_seen")
      .eq("user_id", user?.id)
      .then(({ data, error }) => {
        if (error) { console.error("Failed to load word_progress", error); }
        const byWord = new Map((data ?? []).map(r => [r.word, r]));
        setWords(prev => prev.map(w => {
          const r = byWord.get(w.word);
          if (!r) return w;
          return { ...w, mastery: Math.max(0, Math.min(100, r.mastery ?? 0)) };
        }));
        setScoresLoaded(true);
      });
  }, [user?.id]);

  // ── Load streak on login ──
  useEffect(() => {
    if (!user) { setStreak(0); setFreezesLeft(0); setFreezeUsed(false); return; }
    supabase
      .from('user_streaks')
      .select('current_streak, streak_freeze_count')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setStreak(data.current_streak ?? 0); setFreezesLeft(data.streak_freeze_count ?? 0); }
      });
  }, [user?.id]); // eslint-disable-line

  // ── Load weekly learning activity (last 7 days) ──
  useEffect(() => {
    if (!user) { setWeeklyActivity(null); return; }
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    supabase
      .from('learning_events')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .then(({ data, error }) => {
        if (error || !data) return;
        const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = {};
        data.forEach(ev => {
          const d = new Date(ev.created_at);
          const key = DAY_LABELS[d.getDay()];
          counts[key] = (counts[key] ?? 0) + 1;
        });
        const today = new Date().getDay();
        const result = Array.from({ length: 7 }, (_, i) => {
          const dayIdx = (today - 6 + i + 7) % 7;
          const day = DAY_LABELS[dayIdx];
          return { day, mins: Math.min(60, Math.round((counts[day] ?? 0) * 15 / 60)) };
        });
        setWeeklyActivity(result);
      });
  }, [user?.id]); // eslint-disable-line

  // ── Load teacher class ──
  useEffect(() => {
    if (!user) { setTeacherClass(null); return; }
    supabase
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setTeacherClass(data); });
  }, [user?.id]); // eslint-disable-line

  // ── Update streak after a completed session ──
  const updateStreak = useCallback(async () => {
    if (!user) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

    const { data: existing } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const today    = new Date(todayStr);
    const lastDate = existing?.last_activity_date ? new Date(existing.last_activity_date) : null;
    const daysDiff = lastDate ? Math.round((today - lastDate) / 86400000) : null;

    if (daysDiff === 0) return; // already logged today

    let newStreak  = existing?.current_streak      ?? 0;
    let newFreezes = existing?.streak_freeze_count ?? 0;
    let usedFreeze = false;

    if (daysDiff === 1)                        { newStreak++; }
    else if (daysDiff === 2 && newFreezes > 0) { newStreak++; newFreezes--; usedFreeze = true; }
    else                                       { newStreak = 1; }

    const newLongest = Math.max(existing?.longest_streak ?? 0, newStreak);

    await supabase.from('user_streaks').upsert({
      user_id:             user.id,
      current_streak:      newStreak,
      longest_streak:      newLongest,
      last_activity_date:  todayStr,
      streak_freeze_count: newFreezes,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'user_id' });

    setStreak(newStreak);
    setFreezesLeft(newFreezes);
    if (usedFreeze) setFreezeUsed(true);
  }, [user]); // eslint-disable-line

  // ── Save a word's progress — tracks cumulative correct/attempt counts ──
  const saveWordProgress = useCallback(async (word, correct) => {
    if (!user) return;
    try {
      // Fetch existing counts so we can compute cumulative totals
      const { data: existing } = await supabase
        .from("word_progress")
        .select("correct_count, attempt_count")
        .eq("user_id", user.id)
        .eq("word", word)
        .maybeSingle();

      const correctCount  = (existing?.correct_count  ?? 0) + (correct ? 1 : 0);
      const attemptCount  = (existing?.attempt_count  ?? 0) + 1;
      const masteryScore  = Math.round((correctCount / attemptCount) * 100);

      const { error } = await supabase
        .from("word_progress")
        .upsert({
          user_id:       user.id,
          word,
          correct_count: correctCount,
          attempt_count: attemptCount,
          last_seen:     new Date().toISOString(),
          mastery_score: masteryScore,
          mastery:       masteryScore, // keep old column in sync
        }, { onConflict: "user_id,word" });

      if (error) console.error("Failed to save word_progress", error);
      return masteryScore;
    } catch (err) {
      console.error("saveWordProgress error", err);
    }
  }, [user]);

  // ── Celebration particles ──
  function spawnParticles(x, y) {
    const newP = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x, y,
      dx: (Math.random() - 0.5) * 200,
      dy: -(Math.random() * 200 + 50),
      color: ["#FFE66D", "#FF6B6B", "#4ECDC4", "#A8E6CF", "#FF8B94"][Math.floor(Math.random() * 5)],
    }));
    setParticles(p => [...p, ...newP]);
    setTimeout(() => setParticles(p => p.filter(x => !newP.find(n => n.id === x.id))), 1000);
  }

  // ── Direct mastery override (used by slider in word detail modal) ──
  const setWordMastery = useCallback(async (word, masteryValue) => {
    if (!user) return;
    await supabase.from('word_progress').upsert({
      user_id:       user.id,
      word,
      mastery:       masteryValue,
      mastery_score: masteryValue,
    }, { onConflict: 'user_id,word' });
  }, [user]);

  // ── Handle a game answer (called by GameEngine after each tap) ──
  const handleProgress = useCallback(async ({ word, correct, responseTimeMs, gameType }) => {
    // Optimistic local update: +5 correct, -2 wrong (instant UI feedback)
    const current = words.find(w => w.word === word);
    const currentMastery = current?.mastery ?? 0;
    const optimisticMastery = Math.min(100, Math.max(0,
      correct ? currentMastery + 5 : currentMastery - 2
    ));
    setWords(prev => prev.map(w =>
      w.word === word ? { ...w, mastery: optimisticMastery } : w
    ));

    if (correct) spawnParticles(window.innerWidth / 2, window.innerHeight / 2);

    // Persist to Supabase with accurate cumulative counts; reconcile UI with server result
    const serverMastery = await saveWordProgress(word, correct);
    if (serverMastery != null && serverMastery !== optimisticMastery) {
      setWords(prev => prev.map(w =>
        w.word === word ? { ...w, mastery: serverMastery } : w
      ));
    }

    // Insert learning event (fire-and-forget, table may not exist yet)
    void supabase.from('learning_events').insert({
      user_id:          user?.id,
      word,
      correct,
      game_type:        gameType,
      response_time_ms: responseTimeMs,
    }).catch(() => {});
  }, [words, saveWordProgress, user]);

  const handleSessionEnd = useCallback(({ wordsCorrect, totalWords }) => {
    setGameActive(false);
    updateStreak().catch(() => {});
  }, [updateStreak]);

  // ── Learn tab renderer ──
  const renderLearnTab = () => {
    if (planLoading) {
      return <GalaxyLoader message="Preparing your lesson…" />;
    }

    if (!gameActive) {
      return (
        <div style={{ minHeight: "100vh", background: "#0F0A1E", paddingBottom: 80 }}>
          {/* Session goal */}
          {sessionPlan?.sessionGoal && (
            <div style={{
              padding: "1.5rem 1.5rem 0.5rem",
              textAlign: "center",
              fontFamily: "'Fredoka One', cursive",
              color: "#4ECDC4",
              fontSize: "1.1rem",
            }}>
              {sessionPlan.sessionGoal}
            </div>
          )}

          {/* Offline mode warning (non-fatal) */}
          {planError && (
            <div style={{
              margin: "0.5rem 1.5rem",
              padding: "0.75rem 1rem",
              background: "rgba(255,107,107,0.1)",
              border: "1px solid rgba(255,107,107,0.3)",
              borderRadius: 12,
              color: "#FF6B6B",
              fontSize: "0.85rem",
              fontFamily: "'Nunito', sans-serif",
            }}>
              ⚠️ Using offline mode — your progress still saves normally.
            </div>
          )}

          <GameTypeSelector
            onSelect={(gameType) => {
              setActiveGameType(gameType);
              setGameActive(true);
            }}
            unlockedGames={["word_match"]}
          />
        </div>
      );
    }

    return (
      <ErrorBoundary screen="GameEngine" onReset={() => setGameActive(false)}>
        <GameEngine
          sessionPlan={sessionPlan}
          gameType={activeGameType}
          childName={getChildName(user)}
          onProgress={handleProgress}
          onSessionEnd={handleSessionEnd}
          onHome={() => setGameActive(false)}
        />
      </ErrorBoundary>
    );
  };

  // ── Login screen ──
  const LoginScreen = () => {
    const [authMode,     setAuthMode]     = useState("sign_in");
    const [authEmail,    setAuthEmail]    = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [localError,   setLocalError]   = useState("");
    const [busy,         setBusy]         = useState(false);

    async function handleSubmit(e) {
      e.preventDefault();
      setLocalError("");
      setBusy(true);
      try {
        const email    = authEmail.trim();
        const password = authPassword;
        if (!email || !password) { setLocalError("Please enter an email and password."); return; }
        const res = authMode === "sign_up"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
        if (res.error) setLocalError(res.error.message);
      } finally {
        setBusy(false);
      }
    }

    const err = localError || authError;

    return (
      <div style={{
        fontFamily: "'Nunito', system-ui, sans-serif",
        background: "#0F0A1E", minHeight: "100vh", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(135deg, rgba(78,205,196,0.12), rgba(255,230,109,0.08))",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 22,
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        }}>
          <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: "#FFE66D", textShadow: "0 0 20px #FFE66D55" }}>
            ✨ Magic Words
          </div>
          <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>Sign in to save and sync word mastery.</div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {["sign_in", "sign_up"].map(mode => (
              <button key={mode} type="button" onClick={() => setAuthMode(mode)} style={{
                flex: 1, padding: "10px 12px", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: authMode === mode
                  ? (mode === "sign_in" ? "rgba(255,230,109,0.25)" : "rgba(78,205,196,0.22)")
                  : "rgba(255,255,255,0.06)",
                color: "#fff", fontWeight: 900, cursor: "pointer",
              }}>
                {mode === "sign_in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            {[
              { label: "Email",    value: authEmail,    setter: setAuthEmail,    type: "email",    auto: "email",           ph: "you@example.com" },
              { label: "Password", value: authPassword, setter: setAuthPassword, type: "password", auto: authMode === "sign_up" ? "new-password" : "current-password", ph: "••••••••" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 6, marginTop: f.label === "Password" ? 12 : 0 }}>
                  {f.label}
                </label>
                <input
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  type={f.type}
                  autoComplete={f.auto}
                  placeholder={f.ph}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,10,30,0.7)",
                    color: "#fff", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {err && (
              <div style={{
                marginTop: 12, background: "rgba(255,107,107,0.14)",
                border: "1px solid rgba(255,107,107,0.35)", borderRadius: 14,
                padding: "10px 12px", fontSize: 12, color: "#FF8B94", fontWeight: 800,
              }}>
                {err}
              </div>
            )}

            <button disabled={busy} type="submit" style={{
              marginTop: 14, width: "100%", padding: "12px 14px", borderRadius: 16, border: "none",
              background: "linear-gradient(135deg, #FFE66D, #FFB347)", color: "#0F0A1E",
              fontWeight: 900, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1,
            }}>
              {busy ? "Working…" : authMode === "sign_up" ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <ErrorBoundary>
      <AuthGuard
        user={user}
        isLoading={authLoading}
        fallback={<LoginScreen />}
        loadingMessage="Loading your galaxy…"
      >
        {/* ── Global styles ── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
          * { box-sizing: border-box; }
          @keyframes twinkle       { 0%,100%{opacity:0.2} 50%{opacity:0.9} }
          @keyframes particleFly   { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }
          @keyframes bounceIn      { 0%{transform:scale(0.3) rotate(-10deg);opacity:0} 60%{transform:scale(1.1) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
          @keyframes float         { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes pulse         { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
          @keyframes slideUp       { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
          @keyframes fadeInUp      { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
          .nav-btn       { transition:all 0.2s; cursor:pointer; }
          .nav-btn:hover { transform:translateY(-2px); }
          .word-orb       { transition:all 0.3s; cursor:pointer; }
          .word-orb:hover { transform:scale(1.15); }
          .activity-card       { transition:all 0.25s; cursor:pointer; }
          .activity-card:hover { transform:translateY(-4px) scale(1.02); }
          .btn-primary        { transition:all 0.2s; cursor:pointer; }
          .btn-primary:hover  { transform:translateY(-2px); filter:brightness(1.1); }
          .btn-primary:active { transform:translateY(0) scale(0.97); }
          .app-container { max-width:480px; margin:0 auto; }
          .screen-padding { padding:0 20px; }
          @media (max-width:380px) { .screen-padding { padding:0 14px; } }
          @media (min-width:600px) { .app-container { border-left:1px solid rgba(255,255,255,0.06); border-right:1px solid rgba(255,255,255,0.06); } }
        `}</style>

        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          background: "#0F0A1E", minHeight: "100vh",
          color: "#fff", position: "relative", overflow: "hidden",
        }}>
          {/* ── Star field ── */}
          <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute", borderRadius: "50%", background: "#fff",
                width:   (1 + (i * 7 % 3)) + "px",
                height:  (1 + (i * 7 % 3)) + "px",
                opacity: 0.2 + (i % 5) * 0.1,
                left:    ((i * 73) % 100) + "%",
                top:     ((i * 47) % 100) + "%",
                animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
                animationDelay: (i % 4) * 0.5 + "s",
              }} />
            ))}
          </div>

          {/* ── Particles ── */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: "fixed", left: p.x, top: p.y,
              width: 10, height: 10, borderRadius: "50%", background: p.color,
              zIndex: 9999, pointerEvents: "none",
              animation: "particleFly 1s ease-out forwards",
              "--dx": p.dx + "px", "--dy": p.dy + "px",
            }} />
          ))}

          {/* ── Bottom nav (hidden during active game) ── */}
          {!gameActive && (
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: "rgba(15,10,30,0.95)", backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex", justifyContent: "space-around",
              padding: "12px 0 max(16px, env(safe-area-inset-bottom))", zIndex: 100,
            }}>
              {[
                { id: "home",    icon: "🏠", label: "Home"    },
                { id: "learn",   icon: "🌟", label: "Learn"   },
                { id: "words",   icon: "📚", label: "My Words"},
                { id: "parent",  icon: "👨‍👩‍👧", label: "Parent" },
                { id: "teacher", icon: "🏫", label: "Teacher" },
              ].map(nav => (
                <div
                  key={nav.id}
                  className="nav-btn"
                  onClick={() => { setScreen(nav.id); setGameActive(false); }}
                  style={{
                    textAlign: "center",
                    opacity: screen === nav.id ? 1 : 0.5,
                    minWidth: 44, minHeight: 44,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 22 }}>{nav.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: screen === nav.id ? "#FFE66D" : "#fff" }}>
                    {nav.label}
                  </div>
                  {screen === nav.id && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFE66D", margin: "2px auto 0", boxShadow: "0 0 8px #FFE66D" }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Screen content ── */}
          <div style={{ position: "relative", zIndex: 1, paddingBottom: gameActive ? 0 : 90 }}>
            <div className="app-container">

              {/* ═══ HOME ═══ */}
              {screen === "home" && (
                <div className="screen-padding" style={{ animation: "slideUp 0.4s ease" }}>
                  <div style={{ paddingTop: 50, paddingBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#4ECDC4", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Welcome back!</div>
                        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 30, color: "#FFE66D", textShadow: "0 0 20px #FFE66D88" }}>
                          {getChildName(user)} ⭐
                        </div>
                        {!scoresLoaded && (
                          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Syncing…</div>
                        )}
                      </div>
                      <div style={{ background: "linear-gradient(135deg, #FF6B6B, #FF8B94)", borderRadius: 20, padding: "10px 16px", textAlign: "center", boxShadow: "0 4px 20px #FF6B6B44" }}>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>🔥 {streak}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>DAY STREAK</div>
                        {freezeUsed && <div style={{ fontSize: 9, color: '#A8E6CF', marginTop: 2 }}>❄️ Streak saved!</div>}
                        {!freezeUsed && freezesLeft > 0 && <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>🧊 ×{freezesLeft}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <div className="btn-primary" onClick={signOut} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "8px 12px", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                        Log out
                      </div>
                    </div>
                  </div>

                  {/* Unit progress ring */}
                  {(() => {
                    const masteredCount = words.filter(w => w.mastery >= 80).length;
                    const masteredFraction = words.length > 0 ? masteredCount / words.length : 0;
                    return (
                      <div style={{ background: "linear-gradient(135deg, rgba(78,205,196,0.15), rgba(255,230,109,0.1))", borderRadius: 24, padding: 20, marginBottom: 20, border: "1px solid rgba(78,205,196,0.3)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                          <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                            <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                              <circle cx="40" cy="40" r="32" fill="none" stroke="#4ECDC4" strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 32 * masteredFraction} ${2 * Math.PI * 32}`}
                                strokeLinecap="round" />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, color: "#4ECDC4" }}>
                                  {masteredCount}
                                </div>
                                <div style={{ fontSize: 8, opacity: 0.7 }}>mastered</div>
                              </div>
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18 }}>Unit 9: On the Move!</div>
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>run · dog · look · one · other</div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${masteredFraction * 100}%`, borderRadius: 10, background: "linear-gradient(90deg, #4ECDC4, #FFE66D)", boxShadow: "0 0 10px #4ECDC4" }} />
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{masteredCount} of {words.length} words mastered</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Daily magic word */}
                  <div onClick={() => setScreen("learn")} style={{ background: "linear-gradient(135deg, #FF6B6B22, #FF8B9422)", border: "1px solid #FF6B6B44", borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                    <div style={{ fontSize: 40, animation: "float 3s ease-in-out infinite", flexShrink: 0 }}>✨</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#FF8B94", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Daily Magic Word</div>
                      <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 26, color: "#FFE66D", textShadow: "0 0 15px #FFE66D88" }}>look</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Tap to unlock today's lesson →</div>
                    </div>
                    <div className="btn-primary" onClick={() => setScreen("learn")} style={{ background: "linear-gradient(135deg, #FF6B6B, #FF8B94)", borderRadius: 14, padding: "10px 16px", fontSize: 20, boxShadow: "0 4px 15px #FF6B6B44", animation: "pulse 2s ease-in-out infinite", flexShrink: 0 }}>▶</div>
                  </div>

                  {/* Today's quest */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12 }}>Today's Quest 🗺️</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { icon: "🎬", label: "Watch",  done: true  },
                        { icon: "👂", label: "Listen", done: true  },
                        { icon: "🔍", label: "Hunt",   done: false },
                        { icon: "📝", label: "Story",  done: false },
                        { icon: "⚔️", label: "Boss!",  done: false },
                      ].map((a, i) => (
                        <div key={i} className="activity-card" onClick={() => setScreen("learn")} style={{
                          flex: 1, background: a.done ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.07)",
                          border: `1px solid ${a.done ? "#4ECDC4" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 14, padding: "10px 0", textAlign: "center", minHeight: 64,
                        }}>
                          <div style={{ fontSize: 18 }}>{a.done ? "✅" : a.icon}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, opacity: a.done ? 0.7 : 1 }}>{a.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Word garden preview */}
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18 }}>Word Garden 🌱</div>
                      <div className="btn-primary" onClick={() => setScreen("words")} style={{ fontSize: 11, color: "#4ECDC4", fontWeight: 700 }}>See all →</div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {words.slice(0, 9).map(w => (
                        <div key={w.id} className="word-orb" onClick={() => {
                          speakWord(w.word);
                          generatePlanForWord(w.word);
                          setScreen('learn');
                        }} style={{ background: getMasteryColor(w.mastery), color: w.mastery > 0 ? "#0F0A1E" : "#ffffff44", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 800, boxShadow: getMasteryGlow(w.mastery), cursor: "pointer" }}>
                          {w.word}
                        </div>
                      ))}
                      <div style={{ borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 700, border: "1px dashed rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.4)" }}>+182</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ LEARN ═══ */}
              {screen === "learn" && renderLearnTab()}

              {/* ═══ MY WORDS ═══ */}
              {screen === "words" && (
                <div className="screen-padding" style={{ paddingTop: 50, paddingBottom: 20, animation: "slideUp 0.4s ease" }}>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 30, marginBottom: 4 }}>My Word Galaxy 🌌</div>
                  <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 16 }}>
                    {words.filter(w => w.mastery > 0).length} of {words.length} demo words unlocked
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    {[
                      { color: "#e8e8f0", label: "Not started"  },
                      { color: "#FFB347", label: "Learning"     },
                      { color: "#4ECDC4", label: "Getting there"},
                      { color: "#FFE66D", label: "Mastered ⭐"  },
                    ].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{l.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12, color: "#4ECDC4" }}>Content Words</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                    {words.filter(w => w.type === "content").map(w => {
                      const locked = w.unit > 5;
                      return (
                        <div key={w.id} className="word-orb"
                          onClick={() => locked ? null : setActiveWord(w)}
                          style={{
                            background: locked ? "rgba(255,255,255,0.05)" : getMasteryColor(w.mastery),
                            color: locked ? "rgba(255,255,255,0.25)" : (w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.3)"),
                            borderRadius: 22, padding: "8px 16px", fontSize: 15, fontWeight: 800,
                            boxShadow: locked ? "none" : getMasteryGlow(w.mastery),
                            border: locked ? "2px dashed rgba(255,255,255,0.1)" : (w.mastery === 0 ? "2px dashed rgba(255,255,255,0.15)" : "none"),
                            cursor: locked ? "default" : "pointer",
                            filter: locked ? "blur(0)" : "none",
                            position: "relative",
                          }}>
                          {locked ? "🔒" : w.emoji} {locked ? "???" : w.word}
                          {locked && <span style={{ position: "absolute", top: -6, right: -6, background: "#FFE66D", color: "#0F0A1E", fontSize: 8, fontWeight: 900, borderRadius: 8, padding: "2px 5px" }}>PRO</span>}
                        </div>
                      );
                    })}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 22, padding: "8px 16px", fontSize: 15, color: "rgba(255,255,255,0.12)", fontWeight: 800 }}>🔒 ???</div>
                    ))}
                  </div>

                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12, color: "#FF8B94" }}>Magic Words</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                    {words.filter(w => w.type === "function").map(w => {
                      const locked = w.unit > 5;
                      return (
                        <div key={w.id} className="word-orb"
                          onClick={() => locked ? null : setActiveWord(w)}
                          style={{
                            background: locked ? "rgba(255,255,255,0.05)" : getMasteryColor(w.mastery),
                            color: locked ? "rgba(255,255,255,0.25)" : (w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.3)"),
                            borderRadius: 22, padding: "8px 16px", fontSize: 15, fontWeight: 800,
                            boxShadow: locked ? "none" : getMasteryGlow(w.mastery),
                            border: locked ? "2px dashed rgba(255,255,255,0.1)" : (w.mastery === 0 ? "2px dashed rgba(255,255,255,0.15)" : "none"),
                            cursor: locked ? "default" : "pointer",
                            position: "relative",
                          }}>
                          {locked ? "🔒 ???" : w.word}
                          {locked && <span style={{ position: "absolute", top: -6, right: -6, background: "#FFE66D", color: "#0F0A1E", fontSize: 8, fontWeight: 900, borderRadius: 8, padding: "2px 5px" }}>PRO</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Word detail modal */}
                  {activeWord && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setActiveWord(null)}>
                      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(135deg, #1e1040, #160d35)", border: `2px solid ${getMasteryColor(activeWord.mastery)}`, borderRadius: 28, padding: 28, width: "100%", maxWidth: 360, animation: "bounceIn 0.3s ease", boxShadow: `0 20px 60px ${getMasteryColor(activeWord.mastery)}44` }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 56 }}>{activeWord.emoji}</div>
                          <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 40, color: "#FFE66D", marginTop: 8 }}>{activeWord.word}</div>
                          <div style={{ marginTop: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 13, opacity: 0.7 }}>Mastery</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: getMasteryColor(activeWord.mastery) }}>{activeWord.mastery}%</span>
                            </div>
                            <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${activeWord.mastery}%`, borderRadius: 10, background: `linear-gradient(90deg, ${getMasteryColor(activeWord.mastery)}, ${getMasteryColor(activeWord.mastery)}aa)`, transition: "width 1s ease" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                              <div style={{ fontWeight: 800 }}>Unit {activeWord.unit}</div>
                              <div style={{ fontSize: 11, opacity: 0.6 }}>Level</div>
                            </div>
                            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                              <div style={{ fontWeight: 800, color: activeWord.type === "content" ? "#4ECDC4" : "#FF8B94" }}>
                                {activeWord.type === "content" ? "Content" : "Function"}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.6 }}>Type</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>Adjust mastery</div>
                            <input type="range" min="0" max="100" value={activeWord.mastery}
                              onChange={e => {
                                const next = Number(e.target.value);
                                setWords(prev => prev.map(w => w.id === activeWord.id ? { ...w, mastery: next } : w));
                                setActiveWord(prev => prev ? { ...prev, mastery: next } : prev);
                                void setWordMastery(activeWord.word, next);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div className="btn-primary" onClick={() => { setActiveWord(null); setScreen("learn"); }} style={{ marginTop: 16, width: "100%", background: "linear-gradient(135deg, #FFE66D, #FFB347)", color: "#0F0A1E", borderRadius: 14, padding: "12px 0", fontWeight: 900, fontSize: 15, textAlign: "center" }}>
                            Practice this word →
                          </div>
                          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.5, cursor: "pointer" }} onClick={() => setActiveWord(null)}>Close</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PARENT ═══ */}
              {screen === "parent" && (
                <div className="screen-padding" style={{ paddingTop: 50, paddingBottom: 20, animation: "slideUp 0.4s ease" }}>
                  <div style={{ fontSize: 13, color: "#FF8B94", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Parent Dashboard</div>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 26, marginBottom: 4 }}>
                    {getChildName(user)}'s Progress 👧
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 20 }}>{user?.email}</div>

                  {(() => {
                    const masteredCount = words.filter(w => w.mastery >= 80).length;
                    const weekMins = weeklyActivity ? weeklyActivity.reduce((s, d) => s + d.mins, 0) : null;
                    const weekStr  = weekMins !== null ? (weekMins < 60 ? `${weekMins}m` : `${(weekMins/60).toFixed(1)}h`) : '—';
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                        {[
                          { val: masteredCount.toString(), sub: "Words mastered", color: "#4ECDC4" },
                          { val: `${streak}🔥`,           sub: "Day streak",     color: "#FF6B6B" },
                          { val: weekStr,                  sub: "This week",      color: "#FFE66D" },
                        ].map((s, i) => (
                          <div key={i} style={{ background: `${s.color}15`, border: `1px solid ${s.color}33`, borderRadius: 18, padding: "14px 10px", textAlign: "center" }}>
                            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{s.sub}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* AI coaching tip from session plan */}
                  <div style={{ background: "linear-gradient(135deg, rgba(255,230,109,0.15), rgba(255,179,71,0.1))", border: "1px solid rgba(255,230,109,0.4)", borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 28 }}>🤖</div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#FFE66D", marginBottom: 4 }}>AI Insight this week</div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                          {sessionPlan?.coachingTip || "Keep practicing! Focus on words with lower mastery scores first. Short daily sessions work better than long ones for young learners."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly activity chart */}
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 16 }}>
                      Weekly Activity ⏱️
                      {weeklyActivity === null && <span style={{ fontSize: 11, fontFamily: "'Nunito'", opacity: 0.5, marginLeft: 8 }}>loading…</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
                      {(weeklyActivity ?? [
                        { day: "Mon", mins: 0 }, { day: "Tue", mins: 0 },
                        { day: "Wed", mins: 0 }, { day: "Thu", mins: 0 },
                        { day: "Fri", mins: 0 }, { day: "Sat", mins: 0 },
                        { day: "Sun", mins: 0 },
                      ]).map((d, i, arr) => {
                        const maxMins = Math.max(...arr.map(x => x.mins), 1);
                        const barH = Math.round((d.mins / maxMins) * 60) + 4;
                        const isToday = i === arr.length - 1;
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            {d.mins > 0 && <div style={{ fontSize: 9, opacity: 0.6 }}>{d.mins}m</div>}
                            <div style={{ width: "100%", height: barH + "px", background: isToday ? "#FF6B6B" : d.mins > 30 ? "#FFE66D" : "#4ECDC4", borderRadius: "4px 4px 0 0", opacity: d.mins === 0 ? 0.2 : 1 }} />
                            <div style={{ fontSize: 9, opacity: isToday ? 1 : 0.6, color: isToday ? "#FF8B94" : undefined }}>{d.day}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Needs attention section */}
                  {(() => {
                    const struggling = words.filter(w => w.mastery > 0 && w.mastery < 50);
                    if (!struggling.length) return null;
                    return (
                      <div style={{ background: "rgba(255,107,107,0.07)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: 20, padding: 16, marginBottom: 20 }}>
                        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, color: "#FF8B94", marginBottom: 10 }}>⚠️ Needs Attention</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {struggling.map(w => (
                            <div key={w.id} style={{ background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 800, color: "#FF8B94" }}>
                              {w.emoji} {w.word} <span style={{ opacity: 0.7 }}>{w.mastery}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mastery heatmap — live data */}
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 12 }}>Word Mastery Heatmap 🗺️</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {words.map(w => (
                        <div key={w.id} title={`${w.word}: ${w.mastery}%`} style={{ width: 28, height: 28, borderRadius: 6, background: getMasteryColor(w.mastery), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.2)" }}>
                          {w.word.slice(0, 2)}
                        </div>
                      ))}
                      {Array.from({ length: 22 }).map((_, i) => (
                        <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.1)" }} />
                      ))}
                    </div>
                  </div>

                  {/* Upgrade CTA */}
                  <div style={{ background: "linear-gradient(135deg, #FF6B6B, #FF8B94)", borderRadius: 20, padding: 20, textAlign: "center", boxShadow: "0 8px 30px #FF6B6B44" }}>
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 22 }}>🌟 Free Plan</div>
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Units 1–5 only. Unlock all 200 words!</div>
                    <div className="btn-primary" style={{ display: "inline-block", marginTop: 12, background: "white", color: "#FF6B6B", borderRadius: 14, padding: "10px 28px", fontWeight: 900, fontSize: 15 }}>
                      Upgrade — $9.99/mo
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TEACHER ═══ */}
              {screen === "teacher" && (
                <div className="screen-padding" style={{ paddingTop: 50, paddingBottom: 20, animation: "slideUp 0.4s ease" }}>
                  <div style={{ fontSize: 13, color: "#A8E6CF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Teacher Dashboard</div>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 24, marginBottom: 16 }}>
                    {teacherClass ? `${teacherClass.class_name} 🏫` : 'My Classroom 🏫'}
                  </div>

                  {/* Create class modal */}
                  {showCreateClass && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowCreateClass(false)}>
                      <div onClick={e => e.stopPropagation()} style={{ background: "#1A1030", border: "2px solid #4ECDC4", borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, animation: "bounceIn 0.3s ease" }}>
                        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 22, color: "#4ECDC4", marginBottom: 16 }}>Create a Class</div>
                        <input
                          value={newClassName}
                          onChange={e => setNewClassName(e.target.value)}
                          placeholder="e.g. Ms. Kim's Kindergarten"
                          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(15,10,30,0.7)", color: "#fff", boxSizing: "border-box", marginBottom: 16 }}
                        />
                        <button
                          disabled={!newClassName.trim()}
                          onClick={async () => {
                            if (!newClassName.trim() || !user) return;
                            const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                            const { data, error } = await supabase.from('teacher_classes').insert({
                              teacher_id: user.id,
                              class_name: newClassName.trim(),
                              join_code: joinCode,
                            }).select().maybeSingle();
                            if (!error && data) { setTeacherClass(data); setShowCreateClass(false); setNewClassName(''); }
                          }}
                          style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #4ECDC4, #A8E6CF)", color: "#0F0A1E", fontWeight: 900, fontSize: 15, cursor: !newClassName.trim() ? "not-allowed" : "pointer", opacity: !newClassName.trim() ? 0.6 : 1 }}
                        >
                          Create Class ✨
                        </button>
                        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, opacity: 0.5, cursor: "pointer" }} onClick={() => setShowCreateClass(false)}>Cancel</div>
                      </div>
                    </div>
                  )}

                  {!teacherClass ? (
                    /* No class yet */
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                      <div style={{ fontSize: 64, marginBottom: 16 }}>🏫</div>
                      <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 22, marginBottom: 8 }}>Create your first class</div>
                      <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 24 }}>Students join with a 6-character code. Track their progress in real time.</div>
                      <div className="btn-primary" onClick={() => setShowCreateClass(true)} style={{ display: "inline-block", background: "linear-gradient(135deg, #4ECDC4, #A8E6CF)", color: "#0F0A1E", borderRadius: 14, padding: "12px 28px", fontWeight: 900, fontSize: 15 }}>
                        Create Class ✨
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Join code */}
                      <div style={{ background: "linear-gradient(135deg, rgba(78,205,196,0.15), rgba(168,230,207,0.1))", border: "2px solid #4ECDC4", borderRadius: 20, padding: 20, marginBottom: 20, textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#4ECDC4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Student Join Code</div>
                        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 40, color: "#FFE66D", letterSpacing: 6, textShadow: "0 0 20px #FFE66D44" }}>
                          {teacherClass.join_code}
                        </div>
                        <div
                          className="btn-primary"
                          onClick={() => navigator.clipboard?.writeText(teacherClass.join_code)}
                          style={{ marginTop: 8, display: "inline-block", background: "rgba(78,205,196,0.15)", border: "1px solid #4ECDC4", borderRadius: 10, padding: "6px 16px", fontSize: 12, fontWeight: 800, color: "#4ECDC4", cursor: "pointer" }}
                        >
                          Copy code 📋
                        </div>
                      </div>

                      {/* Empty state for students */}
                      <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 12 }}>Student Progress 📋</div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "24px 16px", textAlign: "center", marginBottom: 20 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>No students yet</div>
                        <div style={{ fontSize: 13, opacity: 0.6 }}>Share the join code above. Students enter it on the home screen to join your class.</div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                        {[
                          { icon: "📤", label: "Assign Unit",    color: "#4ECDC4" },
                          { icon: "📊", label: "Export Report",  color: "#FFE66D" },
                        ].map((a, i) => (
                          <div key={i} className="activity-card" style={{ background: `${a.color}12`, border: `1px solid ${a.color}33`, borderRadius: 18, padding: "16px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "not-allowed", opacity: 0.5 }}>
                            <div style={{ fontSize: 24 }}>{a.icon}</div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: a.color }}>{a.label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}
