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
  { id: 12, word: "can",  type: "function", unit: 3,  mastery: 0, emoji: "✅" },
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

  // ── Session plan (1 AI call at login, replaces per-tap AI) ──
  const wordProgressForPlan = useMemo(() =>
    words.map(w => ({ word: w.word, mastery: w.mastery, last_practiced: null })),
    [words]
  );
  const { sessionPlan, planLoading, planError, regeneratePlan } =
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
      .select("word, mastery")
      .eq("user_id", user?.id)
      .then(({ data, error }) => {
        if (error) { console.error("Failed to load word_progress", error); }
        const byWord = new Map((data ?? []).map(r => [r.word, r.mastery]));
        setWords(prev => prev.map(w =>
          byWord.has(w.word)
            ? { ...w, mastery: Math.max(0, Math.min(100, byWord.get(w.word))) }
            : w
        ));
        setScoresLoaded(true);
      });
  }, [user?.id]);

  // ── Save a single word's progress to Supabase ──
  const saveWordProgress = useCallback(async (word, mastery) => {
    if (!user) return;
    const clamped = Math.max(0, Math.min(100, Math.round(mastery)));
    const { error } = await supabase
      .from("word_progress")
      .upsert({ user_id: user?.id, word, mastery: clamped }, { onConflict: "user_id,word" });
    if (error) console.error("Failed to save word_progress", error);
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

  // ── Handle a game answer (called by GameEngine after each tap) ──
  const handleProgress = useCallback(async ({ word, correct, responseTimeMs, gameType }) => {
    const current = words.find(w => w.word === word);
    const currentMastery = current?.mastery ?? 0;
    const newMastery = Math.min(100, Math.max(0,
      correct ? currentMastery + 5 : currentMastery - 2
    ));

    // Update local state immediately (instant UI feedback)
    setWords(prev => prev.map(w =>
      w.word === word ? { ...w, mastery: newMastery } : w
    ));

    // Persist to Supabase in background
    await saveWordProgress(word, newMastery);

    // Spawn particles on correct answer
    if (correct) spawnParticles(window.innerWidth / 2, window.innerHeight / 2);

    // TODO: log to learning_events table once you've added that Supabase table
    // await supabase.from("learning_events").insert({
    //   user_id: user?.id, word, game_type: gameType,
    //   correct, response_time_ms: responseTimeMs, attempt_number: 1,
    // });
  }, [words, saveWordProgress]);

  const handleSessionEnd = useCallback(({ wordsCorrect, totalWords }) => {
    console.log(`Session complete: ${wordsCorrect}/${totalWords}`);
    setGameActive(false);
  }, []);

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
          childName={profile?.name}
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
                          {profile?.name ?? "Star Learner"} ⭐
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                        Signed in as <span style={{ fontWeight: 800 }}>{user?.email}</span>
                          {!scoresLoaded && <span style={{ opacity: 0.8 }}>· Syncing…</span>}
                        </div>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, #FF6B6B, #FF8B94)", borderRadius: 20, padding: "10px 16px", textAlign: "center", boxShadow: "0 4px 20px #FF6B6B44" }}>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>🔥 12</div>
                        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>DAY STREAK</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <div className="btn-primary" onClick={signOut} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "8px 12px", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                        Log out
                      </div>
                    </div>
                  </div>

                  {/* Unit progress ring */}
                  <div style={{ background: "linear-gradient(135deg, rgba(78,205,196,0.15), rgba(255,230,109,0.1))", borderRadius: 24, padding: 20, marginBottom: 20, border: "1px solid rgba(78,205,196,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                        <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#4ECDC4" strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 32 * 0.43} ${2 * Math.PI * 32}`}
                            strokeLinecap="round" />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, color: "#4ECDC4" }}>
                              {words.filter(w => w.mastery >= 80).length}
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
                            <div style={{ height: "100%", width: "60%", borderRadius: 10, background: "linear-gradient(90deg, #4ECDC4, #FFE66D)", boxShadow: "0 0 10px #4ECDC4" }} />
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>3 of 5 words mastered</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily magic word */}
                  <div style={{ background: "linear-gradient(135deg, #FF6B6B22, #FF8B9422)", border: "1px solid #FF6B6B44", borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
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
                        <div key={w.id} className="word-orb" style={{ background: getMasteryColor(w.mastery), color: w.mastery > 0 ? "#0F0A1E" : "#ffffff44", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 800, boxShadow: getMasteryGlow(w.mastery) }}>
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
                    {words.filter(w => w.type === "content").map(w => (
                      <div key={w.id} className="word-orb" onClick={() => setActiveWord(w)} style={{ background: getMasteryColor(w.mastery), color: w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.3)", borderRadius: 22, padding: "8px 16px", fontSize: 15, fontWeight: 800, boxShadow: getMasteryGlow(w.mastery), border: w.mastery === 0 ? "2px dashed rgba(255,255,255,0.15)" : "none" }}>
                        {w.emoji} {w.word}
                      </div>
                    ))}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 22, padding: "8px 16px", fontSize: 15, color: "rgba(255,255,255,0.15)", fontWeight: 800 }}>🔒 ???</div>
                    ))}
                  </div>

                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12, color: "#FF8B94" }}>Magic Words</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                    {words.filter(w => w.type === "function").map(w => (
                      <div key={w.id} className="word-orb" onClick={() => setActiveWord(w)} style={{ background: getMasteryColor(w.mastery), color: w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.3)", borderRadius: 22, padding: "8px 16px", fontSize: 15, fontWeight: 800, boxShadow: getMasteryGlow(w.mastery), border: w.mastery === 0 ? "2px dashed rgba(255,255,255,0.15)" : "none" }}>
                        {w.word}
                      </div>
                    ))}
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
                                void saveWordProgress(activeWord.word, next);
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
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 26, marginBottom: 20 }}>
                    {profile?.name ? `${profile.name}'s Progress 👧` : "Progress Dashboard 👧"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                      { val: words.filter(w => w.mastery >= 80).length.toString(), sub: "Words mastered", color: "#4ECDC4" },
                      { val: "12🔥", sub: "Day streak",  color: "#FF6B6B" },
                      { val: "4.2h", sub: "This week",   color: "#FFE66D" },
                    ].map((s, i) => (
                      <div key={i} style={{ background: `${s.color}15`, border: `1px solid ${s.color}33`, borderRadius: 18, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

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
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 16 }}>Weekly Activity ⏱️</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
                      {[
                        { day: "Mon", mins: 22 }, { day: "Tue", mins: 35 },
                        { day: "Wed", mins: 18 }, { day: "Thu", mins: 45 },
                        { day: "Fri", mins: 30 }, { day: "Sat", mins: 55 },
                        { day: "Sun", mins: 20 },
                      ].map((d, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 9, opacity: 0.6 }}>{d.mins}m</div>
                          <div style={{ width: "100%", height: d.mins * 1.2 + "px", background: i === 5 ? "#FF6B6B" : i === 3 ? "#FFE66D" : "#4ECDC4", borderRadius: "4px 4px 0 0" }} />
                          <div style={{ fontSize: 9, opacity: 0.6 }}>{d.day}</div>
                        </div>
                      ))}
                    </div>
                  </div>

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
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 24, marginBottom: 4 }}>Ms. Johnson's Class 🏫</div>
                  <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>Kindergarten · Room 12 · 6 students</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                      { val: "67%", sub: "Avg mastery",       color: "#4ECDC4" },
                      { val: "5/6", sub: "Active today",      color: "#A8E6CF" },
                      { val: "8.2", sub: "Avg streak days",   color: "#FFE66D" },
                      { val: "2",   sub: "⚠️ Need attention", color: "#FF8B94" },
                    ].map((s, i) => (
                      <div key={i} style={{ background: `${s.color}12`, border: `1px solid ${s.color}33`, borderRadius: 18, padding: 16 }}>
                        <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 24, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12 }}>Student Progress 📋</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {STUDENTS.map((s, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.progress < 40 ? "#FF8B9444" : "rgba(255,255,255,0.1)"}`, borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 28, width: 44, height: 44, background: "rgba(255,255,255,0.08)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.avatar}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>{s.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>Unit {s.unit}</div>
                          </div>
                          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${s.progress}%`, borderRadius: 6, background: s.progress > 70 ? "linear-gradient(90deg, #4ECDC4, #A8E6CF)" : s.progress > 40 ? "linear-gradient(90deg, #FFE66D, #FFB347)" : "linear-gradient(90deg, #FF8B94, #FF6B6B)" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>{s.progress}% mastery</div>
                            <div style={{ fontSize: 11, color: s.streak > 7 ? "#FFE66D" : "rgba(255,255,255,0.5)" }}>🔥 {s.streak} days</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12 }}>Quick Actions ⚡</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                      { icon: "📤", label: "Assign Unit",      color: "#4ECDC4" },
                      { icon: "📊", label: "Export Report",    color: "#FFE66D" },
                      { icon: "📺", label: "Classroom Mode",   color: "#FF8B94" },
                      { icon: "💬", label: "Message Parents",  color: "#A8E6CF" },
                    ].map((a, i) => (
                      <div key={i} className="activity-card" style={{ background: `${a.color}12`, border: `1px solid ${a.color}33`, borderRadius: 18, padding: "16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 24 }}>{a.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: a.color }}>{a.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 16 }}>
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 12 }}>Standards Alignment 📐</div>
                    {[
                      { std: "RF.K.3c", desc: "High-frequency words", complete: 82 },
                      { std: "RF.1.3g", desc: "Irregular words",       complete: 55 },
                      { std: "L.K.5d",  desc: "Word relationships",    complete: 67 },
                    ].map((s, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}><span style={{ color: "#4ECDC4" }}>{s.std}</span> — {s.desc}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#FFE66D" }}>{s.complete}%</div>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${s.complete}%`, borderRadius: 6, background: "linear-gradient(90deg, #4ECDC4, #A8E6CF)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}
