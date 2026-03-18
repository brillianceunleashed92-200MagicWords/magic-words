import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const WORDS = [
  { id: 1, word: "cat", type: "content", unit: 2, mastery: 95, emoji: "🐱" },
  { id: 2, word: "dog", type: "content", unit: 9, mastery: 72, emoji: "🐶" },
  { id: 3, word: "bird", type: "content", unit: 2, mastery: 88, emoji: "🐦" },
  { id: 4, word: "frog", type: "content", unit: 8, mastery: 45, emoji: "🐸" },
  { id: 5, word: "eat", type: "content", unit: 3, mastery: 100, emoji: "🍎" },
  { id: 6, word: "fly", type: "content", unit: 3, mastery: 80, emoji: "✈️" },
  { id: 7, word: "jump", type: "content", unit: 4, mastery: 60, emoji: "🦘" },
  { id: 8, word: "run", type: "content", unit: 9, mastery: 30, emoji: "🏃" },
  { id: 9, word: "big", type: "content", unit: 7, mastery: 100, emoji: "🐘" },
  { id: 10, word: "sad", type: "content", unit: 13, mastery: 0, emoji: "😢" },
  { id: 11, word: "the", type: "function", unit: 3, mastery: 100, emoji: "📖" },
  { id: 12, word: "can", type: "function", unit: 3, mastery: 90, emoji: "✅" },
  { id: 13, word: "is", type: "function", unit: 5, mastery: 85, emoji: "🔗" },
  { id: 14, word: "they", type: "function", unit: 6, mastery: 55, emoji: "👥" },
  { id: 15, word: "not", type: "function", unit: 3, mastery: 78, emoji: "🚫" },
  { id: 16, word: "and", type: "function", unit: 12, mastery: 20, emoji: "➕" },
  { id: 17, word: "with", type: "function", unit: 18, mastery: 0, emoji: "🤝" },
  { id: 18, word: "do", type: "function", unit: 7, mastery: 65, emoji: "⚡" },
];

const ACTIVITIES = [
  { id: "video", label: "Magic Video", icon: "🎬", color: "#FF6B6B" },
  { id: "taphear", label: "Tap & Hear", icon: "👂", color: "#4ECDC4" },
  { id: "wordhunt", label: "Word Hunt", icon: "🔍", color: "#FFE66D" },
  { id: "fillstory", label: "Fill the Story", icon: "📝", color: "#A8E6CF" },
  { id: "quizboss", label: "Quiz Boss", icon: "⚔️", color: "#FF8B94" },
];

const STUDENTS = [
  { name: "Emma R.", avatar: "🐸", progress: 78, streak: 12, unit: 9, words: 87 },
  { name: "Liam K.", avatar: "🤖", progress: 45, streak: 3, unit: 5, words: 52 },
  { name: "Sofia M.", avatar: "🐶", progress: 92, streak: 21, unit: 11, words: 105 },
  { name: "Noah T.", avatar: "🐱", progress: 31, streak: 1, unit: 4, words: 38 },
  { name: "Ava L.", avatar: "🐦", progress: 67, streak: 8, unit: 7, words: 71 },
  { name: "James P.", avatar: "🐸", progress: 55, streak: 5, unit: 6, words: 60 },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("sign_in"); // sign_in | sign_up
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [screen, setScreen] = useState("home");
  const [activeWord, setActiveWord] = useState(null);
  const [quizState, setQuizState] = useState({ step: 0, selected: null, correct: false, score: 0 });
  const [particles, setParticles] = useState([]);

  const [words, setWords] = useState(() => WORDS.map(w => ({ ...w })));
  const [scoresLoaded, setScoresLoaded] = useState(false);
  const [learnWord, setLearnWord] = useState("run");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [pendingNextWord, setPendingNextWord] = useState("");
  const [pendingQuiz, setPendingQuiz] = useState(null); // { question, options, correctIndex }

  const masteryById = useMemo(() => {
    const m = new Map();
    for (const w of words) m.set(w.id, w.mastery);
    return m;
  }, [words]);

  const masteryByWord = useMemo(() => {
    const m = new Map();
    for (const w of words) m.set(w.word, w.mastery);
    return m;
  }, [words]);

  const currentLearn = useMemo(() => {
    const found = words.find(w => w.word === learnWord);
    return found ?? words[0] ?? null;
  }, [learnWord, words]);

  const QUIZ_WORDS = [
    { word: "cat", options: ["🐶", "🐱", "🐦", "🐸"], correct: 1 },
    { word: "fly", options: ["🏊", "🏃", "✈️", "🚗"], correct: 2 },
    { word: "big", options: ["🐜", "🐭", "🐘", "🐇"], correct: 2 },
  ];

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

  const getMasteryColor = (m) => {
    if (m === 0) return "#e8e8f0";
    if (m < 40) return "#FFB347";
    if (m < 80) return "#4ECDC4";
    return "#FFE66D";
  };

  const getMasteryGlow = (m) => {
    if (m === 0) return "none";
    if (m < 40) return "0 0 8px #FFB34799";
    if (m < 80) return "0 0 12px #4ECDC499";
    return "0 0 16px #FFE66D, 0 0 32px #FFE66D88";
  };

  async function loadUserProgress(u) {
    if (!u) return;
    setScoresLoaded(false);
    const { data, error } = await supabase
      .from("word_progress")
      .select("word, mastery")
      .eq("user_id", u.id);

    if (error) {
      console.error("Failed to load word_progress", error);
      setScoresLoaded(true);
      return;
    }

    const byWord = new Map((data ?? []).map(r => [r.word, r.mastery]));
    setWords(prev =>
      prev.map(w => (byWord.has(w.word) ? { ...w, mastery: Math.max(0, Math.min(100, byWord.get(w.word) ?? w.mastery)) } : w))
    );
    setScoresLoaded(true);
  }

  async function saveWordProgress(u, word, mastery) {
    if (!u) return;
    const clamped = Math.max(0, Math.min(100, Math.round(mastery)));
    const { error } = await supabase
      .from("word_progress")
      .upsert(
        { user_id: u.id, word, mastery: clamped },
        { onConflict: "user_id,word" }
      );
    if (error) {
      console.error("Failed to save word_progress", error);
    }
  }

  function setWordMastery(wordId, nextMastery) {
    setWords(prev => prev.map(w => (w.id === wordId ? { ...w, mastery: nextMastery } : w)));
  }

  async function callAiHelper(word, mastery) {
    setAiBusy(true);
    setAiError("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-helper", {
        body: { word, mastery },
      });
      if (error) throw error;
      const quiz = data?.quiz;
      const nextWord = typeof data?.nextWord === "string" ? data.nextWord : "";
      const msg = typeof data?.encouragement === "string" ? data.encouragement : "";

      if (msg) setEncouragement(msg);
      if (nextWord) setPendingNextWord(nextWord);
      if (quiz?.question && Array.isArray(quiz?.options) && typeof quiz?.correctIndex === "number") {
        setPendingQuiz({
          question: String(quiz.question),
          options: quiz.options.map(String).slice(0, 4),
          correctIndex: Number(quiz.correctIndex),
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setAiError("AI helper is unavailable right now. Please try again.");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      const email = authEmail.trim();
      const password = authPassword;
      if (!email || !password) {
        setAuthError("Please enter an email and password.");
        return;
      }

      const res =
        authMode === "sign_up"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (res.error) {
        setAuthError(res.error.message);
        return;
      }

      // If email confirmations are enabled, user might be null here.
      const u = res.data?.user ?? res.data?.session?.user ?? null;
      setUser(u);
      if (u) await loadUserProgress(u);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setScoresLoaded(false);
  }

  useEffect(() => {
    let unsub = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user ?? null;
      setUser(u);
      if (u) await loadUserProgress(u);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) void loadUserProgress(nextUser);
        if (!nextUser) {
          setScoresLoaded(false);
          setWords(WORDS.map(w => ({ ...w })));
        }
      });
      unsub = sub?.subscription ?? null;
    })();
    return () => {
      if (unsub) unsub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Ensure we always have a valid learn word that exists in our set.
    if (!currentLearn && words.length > 0) setLearnWord(words[0].word);
  }, [currentLearn, words]);

  if (!user) {
    return (
      <div style={{
        fontFamily: "'Nunito', system-ui, sans-serif",
        background: "#0F0A1E",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 420,
          background: "linear-gradient(135deg, rgba(78,205,196,0.12), rgba(255,230,109,0.08))",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 22,
          padding: 22,
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        }}>
          <div style={{
            fontFamily: "'Fredoka One', sans-serif",
            fontSize: 28,
            color: "#FFE66D",
            textShadow: "0 0 20px #FFE66D55",
          }}>Magic Words</div>
          <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>
            Sign in to save and sync word mastery.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setAuthMode("sign_in")}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: authMode === "sign_in" ? "rgba(255,230,109,0.25)" : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("sign_up")}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: authMode === "sign_up" ? "rgba(78,205,196,0.22)" : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 6 }}>Email</label>
            <input
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(15,10,30,0.7)",
                color: "#fff",
                outline: "none",
              }}
            />

            <label style={{ display: "block", fontSize: 11, opacity: 0.7, marginTop: 12, marginBottom: 6 }}>Password</label>
            <input
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              type="password"
              autoComplete={authMode === "sign_up" ? "new-password" : "current-password"}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(15,10,30,0.7)",
                color: "#fff",
                outline: "none",
              }}
            />

            {authError && (
              <div style={{
                marginTop: 12,
                background: "rgba(255,107,107,0.14)",
                border: "1px solid rgba(255,107,107,0.35)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 12,
                color: "#FF8B94",
                fontWeight: 800,
              }}>
                {authError}
              </div>
            )}

            <button
              disabled={authBusy}
              type="submit"
              style={{
                marginTop: 14,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg, #FFE66D, #FFB347)",
                color: "#0F0A1E",
                fontWeight: 900,
                cursor: authBusy ? "not-allowed" : "pointer",
                opacity: authBusy ? 0.7 : 1,
              }}
            >
              {authBusy ? "Working..." : authMode === "sign_up" ? "Create account" : "Sign in"}
            </button>

            <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>
              {authMode === "sign_up"
                ? "If your Supabase project requires email confirmation, check your inbox after creating an account."
                : "Forgot password? You can reset it from your Supabase Auth settings or add a reset flow later."}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Nunito', system-ui, sans-serif",
      background: "#0F0A1E",
      minHeight: "100vh",
      color: "#fff",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Star background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: Math.random() * 3 + 1 + "px",
            height: Math.random() * 3 + 1 + "px",
            borderRadius: "50%",
            background: "#fff",
            opacity: Math.random() * 0.6 + 0.2,
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: Math.random() * 3 + "s",
          }} />
        ))}
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed", left: p.x, top: p.y,
          width: 10, height: 10, borderRadius: "50%",
          background: p.color, zIndex: 9999, pointerEvents: "none",
          animation: "particleFly 1s ease-out forwards",
          "--dx": p.dx + "px", "--dy": p.dy + "px",
        }} />
      ))}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.9} }
        @keyframes particleFly {
          0%{transform:translate(0,0) scale(1);opacity:1}
          100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}
        }
        @keyframes bounceIn {
          0%{transform:scale(0.3) rotate(-10deg);opacity:0}
          60%{transform:scale(1.1) rotate(3deg)}
          100%{transform:scale(1) rotate(0);opacity:1}
        }
        @keyframes float {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)}
        }
        @keyframes shimmer {
          0%{background-position:200% center}
          100%{background-position:-200% center}
        }
        @keyframes pulse {
          0%,100%{transform:scale(1)} 50%{transform:scale(1.05)}
        }
        @keyframes slideUp {
          from{transform:translateY(30px);opacity:0}
          to{transform:translateY(0);opacity:1}
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .nav-btn { transition: all 0.2s; cursor: pointer; }
        .nav-btn:hover { transform: translateY(-2px); }
        .word-orb { transition: all 0.3s; cursor: pointer; }
        .word-orb:hover { transform: scale(1.15); }
        .activity-card { transition: all 0.25s; cursor: pointer; }
        .activity-card:hover { transform: translateY(-4px) scale(1.02); }
        .btn-primary { transition: all 0.2s; cursor: pointer; }
        .btn-primary:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-primary:active { transform: translateY(0) scale(0.97); }
      `}</style>

      {/* Navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(15,10,30,0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex", justifyContent: "space-around",
        padding: "12px 0 16px", zIndex: 100,
      }}>
        {[
          { id: "home", icon: "🏠", label: "Home" },
          { id: "learn", icon: "🌟", label: "Learn" },
          { id: "words", icon: "📚", label: "My Words" },
          { id: "parent", icon: "👨‍👩‍👧", label: "Parent" },
          { id: "teacher", icon: "🏫", label: "Teacher" },
        ].map(nav => (
          <div key={nav.id} className="nav-btn" onClick={() => setScreen(nav.id)}
            style={{ textAlign: "center", opacity: screen === nav.id ? 1 : 0.5 }}>
            <div style={{ fontSize: 24 }}>{nav.icon}</div>
            <div style={{
              fontSize: 10, fontWeight: 700, marginTop: 2,
              color: screen === nav.id ? "#FFE66D" : "#fff",
              fontFamily: "'Nunito', sans-serif",
            }}>{nav.label}</div>
            {screen === nav.id && (
              <div style={{
                width: 4, height: 4, borderRadius: "50%",
                background: "#FFE66D", margin: "2px auto 0",
                boxShadow: "0 0 8px #FFE66D",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Screens */}
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 80 }}>

        {/* ═══ HOME SCREEN ═══ */}
        {screen === "home" && (
          <div style={{ padding: "0 20px", animation: "slideUp 0.4s ease" }}>
            {/* Header */}
            <div style={{ paddingTop: 50, paddingBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#4ECDC4", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Welcome back!</div>
                  <div style={{
                    fontFamily: "'Fredoka One', sans-serif",
                    fontSize: 32, color: "#FFE66D",
                    textShadow: "0 0 20px #FFE66D88",
                  }}>Emma ⭐</div>
                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                    Signed in as <span style={{ fontWeight: 800 }}>{user.email}</span>{" "}
                    {!scoresLoaded && <span style={{ opacity: 0.8 }}>· Syncing…</span>}
                  </div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #FF6B6B, #FF8B94)",
                  borderRadius: 20, padding: "10px 16px",
                  textAlign: "center",
                  boxShadow: "0 4px 20px #FF6B6B44",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>🔥 12</div>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>DAY STREAK</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <div
                  className="btn-primary"
                  onClick={handleLogout}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 14,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 900,
                    opacity: 0.85,
                  }}
                >
                  Log out
                </div>
              </div>
            </div>

            {/* Progress ring area */}
            <div style={{
              background: "linear-gradient(135deg, rgba(78,205,196,0.15), rgba(255,230,109,0.1))",
              borderRadius: 24, padding: 20, marginBottom: 20,
              border: "1px solid rgba(78,205,196,0.3)",
            }}>
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
                      <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, color: "#4ECDC4" }}>87</div>
                      <div style={{ fontSize: 8, opacity: 0.7 }}>words</div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20 }}>Unit 9: On the Move!</div>
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>run · dog · look · one · other</div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: "60%", borderRadius: 10,
                        background: "linear-gradient(90deg, #4ECDC4, #FFE66D)",
                        boxShadow: "0 0 10px #4ECDC4",
                      }} />
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>3 of 5 words mastered</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Magic */}
            <div style={{
              background: "linear-gradient(135deg, #FF6B6B22, #FF8B9422)",
              border: "1px solid #FF6B6B44",
              borderRadius: 20, padding: 16, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ fontSize: 40, animation: "float 3s ease-in-out infinite" }}>✨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#FF8B94", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Daily Magic Word</div>
                <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, color: "#FFE66D", textShadow: "0 0 15px #FFE66D88" }}>look</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Tap to unlock today's lesson →</div>
              </div>
              <div className="btn-primary" onClick={() => setScreen("learn")} style={{
                background: "linear-gradient(135deg, #FF6B6B, #FF8B94)",
                borderRadius: 14, padding: "10px 16px",
                fontSize: 20, boxShadow: "0 4px 15px #FF6B6B44",
                animation: "pulse 2s ease-in-out infinite",
              }}>▶</div>
            </div>

            {/* Today's Activities */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12 }}>Today's Quest 🗺️</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { icon: "🎬", label: "Watch", done: true },
                  { icon: "👂", label: "Listen", done: true },
                  { icon: "🔍", label: "Hunt", done: false },
                  { icon: "📝", label: "Story", done: false },
                  { icon: "⚔️", label: "Boss!", done: false },
                ].map((a, i) => (
                  <div key={i} className="activity-card" onClick={() => setScreen("learn")} style={{
                    flex: 1, background: a.done ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${a.done ? "#4ECDC4" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 14, padding: "10px 0", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 20 }}>{a.done ? "✅" : a.icon}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, opacity: a.done ? 0.7 : 1 }}>{a.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Word Garden Preview */}
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18 }}>Word Garden 🌱</div>
                <div className="btn-primary" onClick={() => setScreen("words")} style={{
                  fontSize: 11, color: "#4ECDC4", fontWeight: 700, cursor: "pointer"
                }}>See all →</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {words.slice(0, 9).map(w => (
                  <div key={w.id} className="word-orb" style={{
                    background: getMasteryColor(w.mastery),
                    color: w.mastery > 0 ? "#0F0A1E" : "#ffffff44",
                    borderRadius: 20, padding: "5px 12px",
                    fontSize: 13, fontWeight: 800,
                    boxShadow: getMasteryGlow(w.mastery),
                  }}>{w.word}</div>
                ))}
                <div style={{
                  borderRadius: 20, padding: "5px 12px",
                  fontSize: 13, fontWeight: 700,
                  border: "1px dashed rgba(255,255,255,0.3)",
                  color: "rgba(255,255,255,0.4)",
                }}>+191</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEARN SCREEN ═══ */}
        {screen === "learn" && (
          <div style={{ animation: "slideUp 0.4s ease" }}>
            {/* Hero */}
            <div style={{
              background: "linear-gradient(160deg, #1a0f3d, #0F0A1E)",
              padding: "50px 20px 30px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 11, color: "#4ECDC4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Unit 9 · On the Move!</div>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 36 }}>
                Today's Word:{" "}
                <span style={{ color: "#FFE66D", textShadow: "0 0 20px #FFE66D" }}>
                  {currentLearn?.word ?? learnWord}
                </span>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <div style={{ background: "rgba(78,205,196,0.2)", borderRadius: 10, padding: "4px 12px", fontSize: 12, color: "#4ECDC4", fontWeight: 700 }}>
                  {currentLearn?.type === "function" ? "Magic Word" : "Content Word"}
                </div>
                <div style={{ background: "rgba(255,107,107,0.2)", borderRadius: 10, padding: "4px 12px", fontSize: 12, color: "#FF6B6B", fontWeight: 700 }}>
                  Unit {currentLearn?.unit ?? 1}
                </div>
                <div style={{ background: "rgba(255,230,109,0.2)", borderRadius: 10, padding: "4px 12px", fontSize: 12, color: "#FFE66D", fontWeight: 700 }}>
                  {(masteryByWord.get(currentLearn?.word ?? learnWord) ?? 0)}% Mastered
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 20px" }}>
              {/* Big word card */}
              <div style={{
                background: "linear-gradient(135deg, #1e1040, #160d35)",
                border: "2px solid rgba(255,230,109,0.3)",
                borderRadius: 28, padding: 30, marginBottom: 24, textAlign: "center",
                boxShadow: "0 8px 40px rgba(255,230,109,0.1)",
                animation: "float 4s ease-in-out infinite",
              }}>
                <div style={{ fontSize: 70 }}>{currentLearn?.emoji ?? "✨"}</div>
                <div style={{
                  fontFamily: "'Fredoka One', sans-serif",
                  fontSize: 56, color: "#FFE66D",
                  textShadow: "0 0 30px #FFE66D88",
                  letterSpacing: 4, marginTop: 8,
                }}>{currentLearn?.word ?? learnWord}</div>
                <div style={{ fontSize: 16, opacity: 0.7, marginTop: 8 }}>
                  {pendingQuiz?.question ? "New challenge ready!" : "Tap an answer to practice."}
                </div>
                <div className="btn-primary" style={{
                  display: "inline-block", marginTop: 16,
                  background: "linear-gradient(135deg, #4ECDC4, #45B7D1)",
                  borderRadius: 50, padding: "10px 24px",
                  fontSize: 14, fontWeight: 800,
                  boxShadow: "0 4px 20px #4ECDC444",
                }}>🔊 Hear it!</div>
              </div>

              {/* Quiz section */}
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 22, marginBottom: 16 }}>
                {pendingQuiz?.question
                  ? pendingQuiz.question
                  : `Which picture shows "${currentLearn?.word ?? learnWord}"? 🎯`}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {(pendingQuiz?.options?.length === 4 ? pendingQuiz.options : ["🏊", "🏃", "😴", "🍎"]).map((emoji, i) => {
                  const isCorrect = pendingQuiz?.correctIndex === i || (!pendingQuiz && i === 1);
                  const isSelected = quizState.selected === i;
                  return (
                    <div key={i} className="activity-card" onClick={(e) => {
                      if (quizState.selected !== null) return;
                      setQuizState(q => ({ ...q, selected: i, correct: isCorrect, score: isCorrect ? q.score + 1 : q.score }));
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (isCorrect) spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);

                      const wordObj = currentLearn;
                      const currentMastery = masteryByWord.get(wordObj?.word ?? learnWord) ?? 0;
                      const updatedMastery = isCorrect ? Math.min(100, currentMastery + 5) : currentMastery;

                      if (wordObj && isCorrect) {
                        setWordMastery(wordObj.id, updatedMastery);
                        void saveWordProgress(user, wordObj.word, updatedMastery);
                      }

                      // Call ai-helper after the child answers.
                      const wordToSend = wordObj?.word ?? learnWord;
                      setEncouragement("");
                      setPendingNextWord("");
                      setPendingQuiz(null);
                      void callAiHelper(wordToSend, updatedMastery);
                    }} style={{
                      background: isSelected
                        ? (isCorrect ? "rgba(78,205,196,0.3)" : "rgba(255,107,107,0.3)")
                        : "rgba(255,255,255,0.06)",
                      border: `2px solid ${isSelected ? (isCorrect ? "#4ECDC4" : "#FF6B6B") : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 20, padding: 20, textAlign: "center",
                      boxShadow: isSelected && isCorrect ? "0 0 20px #4ECDC455" : "none",
                    }}>
                      <div style={{ fontSize: 40 }}>{emoji}</div>
                      <div style={{ fontWeight: 800, marginTop: 8, fontSize: 16 }}>Pick</div>
                      {isSelected && <div style={{ marginTop: 8, fontSize: 20 }}>{isCorrect ? "✅" : "❌"}</div>}
                    </div>
                  );
                })}
              </div>

              {quizState.selected !== null && (
                <div style={{
                  background: quizState.correct ? "rgba(78,205,196,0.15)" : "rgba(255,107,107,0.15)",
                  border: `1px solid ${quizState.correct ? "#4ECDC4" : "#FF6B6B"}`,
                  borderRadius: 20, padding: 16, marginBottom: 20,
                  animation: "bounceIn 0.4s ease",
                }}>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20 }}>
                    {encouragement
                      ? encouragement
                      : quizState.correct
                        ? "🎉 Amazing! You got it!"
                        : "💪 Nice try! Let's practice again!"}
                  </div>
                  {aiBusy && (
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                      Thinking of your next word…
                    </div>
                  )}
                  {aiError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#FF8B94", fontWeight: 900 }}>
                      {aiError}
                    </div>
                  )}
                  <div className="btn-primary" onClick={() => {
                    const next = pendingNextWord;
                    if (next && words.some(w => w.word === next)) setLearnWord(next);
                    setQuizState({ step: 0, selected: null, correct: false, score: 0 });
                  }} style={{
                    display: "inline-block", marginTop: 12,
                    background: "linear-gradient(135deg, #FFE66D, #FFB347)",
                    color: "#0F0A1E", borderRadius: 14, padding: "10px 24px",
                    fontWeight: 900, fontSize: 14,
                  }}>
                    {pendingNextWord ? `Next: ${pendingNextWord} →` : "Next Activity →"}
                  </div>
                </div>
              )}

              {/* Activity strip */}
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 12 }}>More Activities</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                {ACTIVITIES.map((act) => (
                  <div key={act.id} className="activity-card" style={{
                    flexShrink: 0, width: 90,
                    background: `${act.color}22`,
                    border: `1px solid ${act.color}55`,
                    borderRadius: 18, padding: "14px 0",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 28 }}>{act.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 6, color: act.color }}>{act.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MY WORDS SCREEN ═══ */}
        {screen === "words" && (
          <div style={{ padding: "50px 20px 20px", animation: "slideUp 0.4s ease" }}>
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 32, marginBottom: 4 }}>My Word Galaxy 🌌</div>
            <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 20 }}>87 of 200 magic words unlocked</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
              Your mastery scores are saved to Supabase and sync across devices.
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { color: "#e8e8f0", label: "Not started" },
                { color: "#FFB347", label: "Learning" },
                { color: "#4ECDC4", label: "Getting there" },
                { color: "#FFE66D", label: "Mastered ⭐" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, boxShadow: l.color !== "#e8e8f0" ? `0 0 8px ${l.color}` : "none" }} />
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{l.label}</div>
                </div>
              ))}
            </div>

            {/* Content Words */}
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12, color: "#4ECDC4" }}>
              Content Words (action & naming)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {words.filter(w => w.type === "content").map(w => (
                <div key={w.id} className="word-orb" onClick={() => {
                  setActiveWord(w);
                  if (w.mastery > 70) {
                    // No animation trigger here because we no longer have an event target.
                  }
                }} style={{
                  background: getMasteryColor(w.mastery),
                  color: w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.3)",
                  borderRadius: 22, padding: "8px 16px",
                  fontSize: 15, fontWeight: 800,
                  boxShadow: getMasteryGlow(w.mastery),
                  border: w.mastery === 0 ? "2px dashed rgba(255,255,255,0.15)" : "none",
                }}>
                  {w.emoji} {w.word}
                </div>
              ))}
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "2px dashed rgba(255,255,255,0.08)",
                  borderRadius: 22, padding: "8px 16px",
                  fontSize: 15, color: "rgba(255,255,255,0.15)", fontWeight: 800,
                }}>🔒 ???</div>
              ))}
            </div>

            {/* Function Words */}
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12, color: "#FF8B94" }}>
              Magic Words (connectors & helpers)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {words.filter(w => w.type === "function").map(w => (
                <div key={w.id} className="word-orb" onClick={() => {
                  setActiveWord(w);
                }} style={{
                  background: getMasteryColor(w.mastery),
                  color: w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.3)",
                  borderRadius: 22, padding: "8px 16px",
                  fontSize: 15, fontWeight: 800,
                  boxShadow: getMasteryGlow(w.mastery),
                  border: w.mastery === 0 ? "2px dashed rgba(255,255,255,0.15)" : "none",
                }}>
                  {w.word}
                </div>
              ))}
            </div>

            {/* Word detail modal */}
            {activeWord && (
              <div style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(8px)", zIndex: 500,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20,
              }} onClick={() => setActiveWord(null)}>
                <div onClick={e => e.stopPropagation()} style={{
                  background: "linear-gradient(135deg, #1e1040, #160d35)",
                  border: `2px solid ${getMasteryColor(activeWord.mastery)}`,
                  borderRadius: 28, padding: 30, width: "100%", maxWidth: 360,
                  animation: "bounceIn 0.3s ease",
                  boxShadow: `0 20px 60px ${getMasteryColor(activeWord.mastery)}44`,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 60 }}>{activeWord.emoji}</div>
                    <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 42, color: "#FFE66D", marginTop: 8 }}>{activeWord.word}</div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, opacity: 0.7 }}>Mastery</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: getMasteryColor(activeWord.mastery) }}>{activeWord.mastery}%</span>
                      </div>
                      <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${activeWord.mastery}%`, borderRadius: 10,
                          background: `linear-gradient(90deg, ${getMasteryColor(activeWord.mastery)}, ${getMasteryColor(activeWord.mastery)}aa)`,
                          boxShadow: `0 0 10px ${getMasteryColor(activeWord.mastery)}`,
                          transition: "width 1s ease",
                        }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                        <div style={{ fontWeight: 800 }}>Unit {activeWord.unit}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>Level</div>
                      </div>
                      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: activeWord.type === "content" ? "#4ECDC4" : "#FF8B94" }}>{activeWord.type === "content" ? "Content" : "Function"}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>Type</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>Adjust mastery</div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={activeWord.mastery}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setWords(prev =>
                            prev.map(w => (w.id === activeWord.id ? { ...w, mastery: next } : w))
                          );
                          setActiveWord(prev => (prev ? { ...prev, mastery: next } : prev));
                          void saveWordProgress(user, activeWord.word, next);
                        }}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="btn-primary" onClick={() => { setActiveWord(null); setScreen("learn"); }} style={{
                      marginTop: 16, width: "100%",
                      background: "linear-gradient(135deg, #FFE66D, #FFB347)",
                      color: "#0F0A1E", borderRadius: 14, padding: "12px 0",
                      fontWeight: 900, fontSize: 15, textAlign: "center",
                    }}>Practice this word →</div>
                    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.5, cursor: "pointer" }} onClick={() => setActiveWord(null)}>Close</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PARENT DASHBOARD ═══ */}
        {screen === "parent" && (
          <div style={{ padding: "50px 20px 20px", animation: "slideUp 0.4s ease" }}>
            <div style={{ fontSize: 13, color: "#FF8B94", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Parent Dashboard</div>
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 28, marginBottom: 20 }}>Emma's Progress 👧</div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { val: "87", sub: "Words learned", icon: "📚", color: "#4ECDC4" },
                { val: "12🔥", sub: "Day streak", icon: "⚡", color: "#FF6B6B" },
                { val: "4.2h", sub: "This week", icon: "⏱️", color: "#FFE66D" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: `${s.color}15`, border: `1px solid ${s.color}33`,
                  borderRadius: 18, padding: "14px 10px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* AI Insight */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255,230,109,0.15), rgba(255,179,71,0.1))",
              border: "1px solid rgba(255,230,109,0.4)",
              borderRadius: 20, padding: 16, marginBottom: 20,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ fontSize: 30 }}>🤖</div>
                <div>
                  <div style={{ fontWeight: 800, color: "#FFE66D", marginBottom: 4 }}>AI Insight this week</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                    Emma is excelling at content words (82% avg mastery) but needs more practice with function words like <strong>"and," "with,"</strong> and <strong>"they."</strong> Recommended: 10 min of Unit 12 activities.
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly activity chart */}
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 16, marginBottom: 20,
            }}>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 16 }}>Weekly Activity ⏱️</div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
                {[
                  { day: "Mon", mins: 22, color: "#4ECDC4" },
                  { day: "Tue", mins: 35, color: "#4ECDC4" },
                  { day: "Wed", mins: 18, color: "#4ECDC4" },
                  { day: "Thu", mins: 45, color: "#FFE66D" },
                  { day: "Fri", mins: 30, color: "#4ECDC4" },
                  { day: "Sat", mins: 55, color: "#FF6B6B" },
                  { day: "Sun", mins: 20, color: "#4ECDC4" },
                ].map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>{d.mins}m</div>
                    <div style={{
                      width: "100%", height: d.mins * 1.2 + "px",
                      background: d.color, borderRadius: "6px 6px 0 0",
                      boxShadow: `0 0 8px ${d.color}66`,
                    }} />
                    <div style={{ fontSize: 10, opacity: 0.6 }}>{d.day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mastery heatmap preview */}
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 16, marginBottom: 20,
            }}>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 12 }}>Word Mastery Heatmap 🗺️</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {words.map(w => (
                  <div key={w.id} title={`${w.word}: ${w.mastery}%`} style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: getMasteryColor(w.mastery),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800,
                    color: w.mastery > 0 ? "#0F0A1E" : "rgba(255,255,255,0.2)",
                    boxShadow: w.mastery > 80 ? `0 0 8px ${getMasteryColor(w.mastery)}` : "none",
                  }}>{w.word.slice(0, 2)}</div>
                ))}
                {Array.from({ length: 22 }).map((_, i) => (
                  <div key={i} style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                  }} />
                ))}
              </div>
            </div>

            {/* Upgrade CTA */}
            <div style={{
              background: "linear-gradient(135deg, #FF6B6B, #FF8B94)",
              borderRadius: 20, padding: 20, textAlign: "center",
              boxShadow: "0 8px 30px #FF6B6B44",
            }}>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 22 }}>🌟 Free Plan</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Units 1–5 only. Unlock all 200 words!</div>
              <div className="btn-primary" style={{
                display: "inline-block", marginTop: 12,
                background: "white", color: "#FF6B6B",
                borderRadius: 14, padding: "10px 28px",
                fontWeight: 900, fontSize: 15,
              }}>Upgrade — $9.99/mo</div>
            </div>
          </div>
        )}

        {/* ═══ TEACHER DASHBOARD ═══ */}
        {screen === "teacher" && (
          <div style={{ padding: "50px 20px 20px", animation: "slideUp 0.4s ease" }}>
            <div style={{ fontSize: 13, color: "#A8E6CF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Teacher Dashboard</div>
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 26, marginBottom: 4 }}>Ms. Johnson's Class 🏫</div>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>Kindergarten · Room 12 · 6 students</div>

            {/* Class stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { val: "67%", sub: "Avg mastery", color: "#4ECDC4" },
                { val: "5/6", sub: "Active today", color: "#A8E6CF" },
                { val: "8.2", sub: "Avg streak days", color: "#FFE66D" },
                { val: "2", sub: "⚠️ Need attention", color: "#FF8B94" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: `${s.color}12`, border: `1px solid ${s.color}33`,
                  borderRadius: 18, padding: 16,
                }}>
                  <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 24, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Student roster */}
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12 }}>Student Progress 📋</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {STUDENTS.map((s, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${s.progress < 40 ? "#FF8B9444" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 18, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    fontSize: 30, width: 44, height: 44,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{s.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>Unit {s.unit} · {s.words} words</div>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${s.progress}%`, borderRadius: 6,
                        background: s.progress > 70 ? "linear-gradient(90deg, #4ECDC4, #A8E6CF)"
                          : s.progress > 40 ? "linear-gradient(90deg, #FFE66D, #FFB347)"
                            : "linear-gradient(90deg, #FF8B94, #FF6B6B)",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{s.progress}% mastery</div>
                      <div style={{ fontSize: 11, color: s.streak > 7 ? "#FFE66D" : "rgba(255,255,255,0.5)" }}>🔥 {s.streak} days</div>
                    </div>
                  </div>
                  {s.progress < 40 && (
                    <div style={{
                      background: "#FF8B9422", border: "1px solid #FF8B9488",
                      borderRadius: 10, padding: "4px 8px", fontSize: 11, color: "#FF8B94", fontWeight: 800,
                    }}>⚠️</div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 20, marginBottom: 12 }}>Quick Actions ⚡</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { icon: "📤", label: "Assign Unit", color: "#4ECDC4" },
                { icon: "📊", label: "Export Report", color: "#FFE66D" },
                { icon: "📺", label: "Classroom Mode", color: "#FF8B94" },
                { icon: "💬", label: "Message Parents", color: "#A8E6CF" },
              ].map((a, i) => (
                <div key={i} className="activity-card" style={{
                  background: `${a.color}12`, border: `1px solid ${a.color}33`,
                  borderRadius: 18, padding: "16px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ fontSize: 24 }}>{a.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: a.color }}>{a.label}</div>
                </div>
              ))}
            </div>

            {/* Standards alignment */}
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 16,
            }}>
              <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: 18, marginBottom: 12 }}>Standards Alignment 📐</div>
              {[
                { std: "RF.K.3c", desc: "High-frequency words", complete: 82 },
                { std: "RF.1.3g", desc: "Irregular words", complete: 55 },
                { std: "L.K.5d", desc: "Word relationships", complete: 67 },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}><span style={{ color: "#4ECDC4" }}>{s.std}</span> — {s.desc}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#FFE66D" }}>{s.complete}%</div>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${s.complete}%`, borderRadius: 6,
                      background: "linear-gradient(90deg, #4ECDC4, #A8E6CF)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
