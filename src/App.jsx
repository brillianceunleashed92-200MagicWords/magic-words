import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthGuard, GalaxyLoader } from "./components/AuthGuard";
import { useAuth } from "./hooks/useAuth";
import { useSessionPlan } from "./hooks/useSessionPlan";
import { GameEngine, GameTypeSelector, SessionComplete, UpgradeModal } from "./games/GameEngine";
import QRCode from "qrcode";
import { colors as tokens } from "./design-system/tokens";
import WordGalaxyMap from "./components/WordGalaxyMap";
import LevelUpCelebration from "./components/LevelUpCelebration";
import WordIcon from "./design-system/primitives/WordIcon";
import sessionQuestIcon from "./assets/icons/quests/session.svg";
import masterQuestIcon from "./assets/icons/quests/master.svg";
import novaIdleIcon from "./assets/icons/nova/idle.svg";
import { LEVELS, MAX_LEVEL, getLevelInfo } from "./lib/levels";

const UNIT_NAMES = {
  1:'My World', 2:'Animals', 3:'Actions', 4:'More Actions',
  5:'Describing', 6:'Family', 7:'Food & Drink', 8:'Colors',
  9:'Home & Travel', 10:'Numbers', 11:'Function Words', 12:'Pronouns',
  13:'Prepositions', 14:'More Describing', 15:'School & Learning',
  16:'Nature', 17:'Body Parts', 18:'Advanced Words',
};

const WORDS = [
  // Unit 1: My World
  { id:1,   word:"cat",     type:"content",  unit:1,  mastery:0, emoji:"🐱" },
  { id:2,   word:"dog",     type:"content",  unit:1,  mastery:0, emoji:"🐶" },
  { id:3,   word:"bird",    type:"content",  unit:1,  mastery:0, emoji:"🐦" },
  { id:4,   word:"fish",    type:"content",  unit:1,  mastery:0, emoji:"🐟" },
  { id:5,   word:"bear",    type:"content",  unit:1,  mastery:0, emoji:"🐻" },
  { id:6,   word:"ball",    type:"content",  unit:1,  mastery:0, emoji:"⚽" },
  { id:7,   word:"book",    type:"content",  unit:1,  mastery:0, emoji:"📚" },
  { id:8,   word:"cup",     type:"content",  unit:1,  mastery:0, emoji:"🥤" },
  // Unit 2: Animals
  { id:9,   word:"frog",    type:"content",  unit:2,  mastery:0, emoji:"🐸" },
  { id:10,  word:"horse",   type:"content",  unit:2,  mastery:0, emoji:"🐴" },
  { id:11,  word:"lion",    type:"content",  unit:2,  mastery:0, emoji:"🦁" },
  { id:12,  word:"rabbit",  type:"content",  unit:2,  mastery:0, emoji:"🐰" },
  { id:13,  word:"duck",    type:"content",  unit:2,  mastery:0, emoji:"🦆" },
  { id:14,  word:"cow",     type:"content",  unit:2,  mastery:0, emoji:"🐄" },
  { id:15,  word:"pig",     type:"content",  unit:2,  mastery:0, emoji:"🐷" },
  { id:16,  word:"turtle",  type:"content",  unit:2,  mastery:0, emoji:"🐢" },
  // Unit 3: Actions
  { id:17,  word:"eat",     type:"content",  unit:3,  mastery:0, emoji:"🍎" },
  { id:18,  word:"jump",    type:"content",  unit:3,  mastery:0, emoji:"🦘" },
  { id:19,  word:"run",     type:"content",  unit:3,  mastery:0, emoji:"🏃" },
  { id:20,  word:"swim",    type:"content",  unit:3,  mastery:0, emoji:"🏊" },
  { id:21,  word:"fly",     type:"content",  unit:3,  mastery:0, emoji:"✈️" },
  { id:22,  word:"dance",   type:"content",  unit:3,  mastery:0, emoji:"💃" },
  { id:23,  word:"sing",    type:"content",  unit:3,  mastery:0, emoji:"🎤" },
  { id:24,  word:"play",    type:"content",  unit:3,  mastery:0, emoji:"🎮" },
  // Unit 4: More Actions
  { id:25,  word:"stop",    type:"content",  unit:4,  mastery:0, emoji:"🛑" },
  { id:26,  word:"go",      type:"content",  unit:4,  mastery:0, emoji:"🚦" },
  { id:27,  word:"look",    type:"content",  unit:4,  mastery:0, emoji:"👀" },
  { id:28,  word:"see",     type:"content",  unit:4,  mastery:0, emoji:"👁️" },
  { id:29,  word:"help",    type:"content",  unit:4,  mastery:0, emoji:"🆘" },
  { id:30,  word:"sleep",   type:"content",  unit:4,  mastery:0, emoji:"😴" },
  { id:31,  word:"open",    type:"content",  unit:4,  mastery:0, emoji:"🚪" },
  { id:32,  word:"sit",     type:"content",  unit:4,  mastery:0, emoji:"🪑" },
  // Unit 5: Describing
  { id:33,  word:"big",     type:"content",  unit:5,  mastery:0, emoji:"🐘" },
  { id:34,  word:"small",   type:"content",  unit:5,  mastery:0, emoji:"🐭" },
  { id:35,  word:"hot",     type:"content",  unit:5,  mastery:0, emoji:"🌶️" },
  { id:36,  word:"cold",    type:"content",  unit:5,  mastery:0, emoji:"🧊" },
  { id:37,  word:"happy",   type:"content",  unit:5,  mastery:0, emoji:"😊" },
  { id:38,  word:"sad",     type:"content",  unit:5,  mastery:0, emoji:"😢" },
  { id:39,  word:"fast",    type:"content",  unit:5,  mastery:0, emoji:"⚡" },
  { id:40,  word:"slow",    type:"content",  unit:5,  mastery:0, emoji:"🐌" },
  // Unit 6: Family
  { id:41,  word:"mom",     type:"content",  unit:6,  mastery:0, emoji:"👩" },
  { id:42,  word:"dad",     type:"content",  unit:6,  mastery:0, emoji:"👨" },
  { id:43,  word:"baby",    type:"content",  unit:6,  mastery:0, emoji:"👶" },
  { id:44,  word:"boy",     type:"content",  unit:6,  mastery:0, emoji:"👦" },
  { id:45,  word:"girl",    type:"content",  unit:6,  mastery:0, emoji:"👧" },
  { id:46,  word:"friend",  type:"content",  unit:6,  mastery:0, emoji:"🤝" },
  { id:47,  word:"man",     type:"content",  unit:6,  mastery:0, emoji:"🧔" },
  { id:48,  word:"woman",   type:"content",  unit:6,  mastery:0, emoji:"👩‍🦰" },
  // Unit 7: Food & Drink
  { id:49,  word:"apple",   type:"content",  unit:7,  mastery:0, emoji:"🍎" },
  { id:50,  word:"milk",    type:"content",  unit:7,  mastery:0, emoji:"🥛" },
  { id:51,  word:"cookie",  type:"content",  unit:7,  mastery:0, emoji:"🍪" },
  { id:52,  word:"cake",    type:"content",  unit:7,  mastery:0, emoji:"🎂" },
  { id:53,  word:"pizza",   type:"content",  unit:7,  mastery:0, emoji:"🍕" },
  { id:54,  word:"bread",   type:"content",  unit:7,  mastery:0, emoji:"🍞" },
  { id:55,  word:"egg",     type:"content",  unit:7,  mastery:0, emoji:"🥚" },
  { id:56,  word:"water",   type:"content",  unit:7,  mastery:0, emoji:"💧" },
  // Unit 8: Colors
  { id:57,  word:"red",     type:"content",  unit:8,  mastery:0, emoji:"🔴" },
  { id:58,  word:"blue",    type:"content",  unit:8,  mastery:0, emoji:"🔵" },
  { id:59,  word:"green",   type:"content",  unit:8,  mastery:0, emoji:"🟢" },
  { id:60,  word:"yellow",  type:"content",  unit:8,  mastery:0, emoji:"🟡" },
  { id:61,  word:"orange",  type:"content",  unit:8,  mastery:0, emoji:"🟠" },
  { id:62,  word:"purple",  type:"content",  unit:8,  mastery:0, emoji:"🟣" },
  { id:63,  word:"pink",    type:"content",  unit:8,  mastery:0, emoji:"🩷" },
  { id:64,  word:"black",   type:"content",  unit:8,  mastery:0, emoji:"⬛" },
  // Unit 9: Home & Travel
  { id:65,  word:"bed",     type:"content",  unit:9,  mastery:0, emoji:"🛏️" },
  { id:66,  word:"chair",   type:"content",  unit:9,  mastery:0, emoji:"🪑" },
  { id:67,  word:"door",    type:"content",  unit:9,  mastery:0, emoji:"🚪" },
  { id:68,  word:"house",   type:"content",  unit:9,  mastery:0, emoji:"🏠" },
  { id:69,  word:"car",     type:"content",  unit:9,  mastery:0, emoji:"🚗" },
  { id:70,  word:"bus",     type:"content",  unit:9,  mastery:0, emoji:"🚌" },
  { id:71,  word:"hat",     type:"content",  unit:9,  mastery:0, emoji:"🎩" },
  { id:72,  word:"shoe",    type:"content",  unit:9,  mastery:0, emoji:"👟" },
  // Unit 10: Numbers
  { id:73,  word:"one",     type:"content",  unit:10, mastery:0, emoji:"1️⃣" },
  { id:74,  word:"two",     type:"content",  unit:10, mastery:0, emoji:"2️⃣" },
  { id:75,  word:"three",   type:"content",  unit:10, mastery:0, emoji:"3️⃣" },
  { id:76,  word:"four",    type:"content",  unit:10, mastery:0, emoji:"4️⃣" },
  { id:77,  word:"five",    type:"content",  unit:10, mastery:0, emoji:"5️⃣" },
  { id:78,  word:"six",     type:"content",  unit:10, mastery:0, emoji:"6️⃣" },
  { id:79,  word:"seven",   type:"content",  unit:10, mastery:0, emoji:"7️⃣" },
  { id:80,  word:"ten",     type:"content",  unit:10, mastery:0, emoji:"🔟" },
  // Unit 11: Function Words
  { id:81,  word:"the",     type:"function", unit:11, mastery:0, emoji:"📖" },
  { id:82,  word:"a",       type:"function", unit:11, mastery:0, emoji:"🅰️" },
  { id:83,  word:"is",      type:"function", unit:11, mastery:0, emoji:"🔗" },
  { id:84,  word:"not",     type:"function", unit:11, mastery:0, emoji:"🚫" },
  { id:85,  word:"can",     type:"function", unit:11, mastery:0, emoji:"✅" },
  { id:86,  word:"and",     type:"function", unit:11, mastery:0, emoji:"➕" },
  { id:87,  word:"or",      type:"function", unit:11, mastery:0, emoji:"🔀" },
  { id:88,  word:"but",     type:"function", unit:11, mastery:0, emoji:"↔️" },
  // Unit 12: Pronouns
  { id:89,  word:"I",       type:"function", unit:12, mastery:0, emoji:"👆" },
  { id:90,  word:"you",     type:"function", unit:12, mastery:0, emoji:"👉" },
  { id:91,  word:"he",      type:"function", unit:12, mastery:0, emoji:"🧔" },
  { id:92,  word:"she",     type:"function", unit:12, mastery:0, emoji:"👩" },
  { id:93,  word:"we",      type:"function", unit:12, mastery:0, emoji:"👫" },
  { id:94,  word:"they",    type:"function", unit:12, mastery:0, emoji:"👥" },
  { id:95,  word:"me",      type:"function", unit:12, mastery:0, emoji:"🫵" },
  { id:96,  word:"my",      type:"function", unit:12, mastery:0, emoji:"💭" },
  // Unit 13: Prepositions
  { id:97,  word:"in",      type:"function", unit:13, mastery:0, emoji:"📦" },
  { id:98,  word:"on",      type:"function", unit:13, mastery:0, emoji:"⬆️" },
  { id:99,  word:"up",      type:"function", unit:13, mastery:0, emoji:"☝️" },
  { id:100, word:"down",    type:"function", unit:13, mastery:0, emoji:"👇" },
  { id:101, word:"to",      type:"function", unit:13, mastery:0, emoji:"➡️" },
  { id:102, word:"at",      type:"function", unit:13, mastery:0, emoji:"📍" },
  { id:103, word:"for",     type:"function", unit:13, mastery:0, emoji:"🎁" },
  { id:104, word:"with",    type:"function", unit:13, mastery:0, emoji:"🤝" },
  // Unit 14: More Describing
  { id:105, word:"good",    type:"content",  unit:14, mastery:0, emoji:"👍" },
  { id:106, word:"bad",     type:"content",  unit:14, mastery:0, emoji:"👎" },
  { id:107, word:"pretty",  type:"content",  unit:14, mastery:0, emoji:"🌸" },
  { id:108, word:"funny",   type:"content",  unit:14, mastery:0, emoji:"😂" },
  { id:109, word:"new",     type:"content",  unit:14, mastery:0, emoji:"✨" },
  { id:110, word:"old",     type:"content",  unit:14, mastery:0, emoji:"👴" },
  { id:111, word:"loud",    type:"content",  unit:14, mastery:0, emoji:"📢" },
  { id:112, word:"quiet",   type:"content",  unit:14, mastery:0, emoji:"🤫" },
  // Unit 15: School & Learning
  { id:113, word:"read",    type:"content",  unit:15, mastery:0, emoji:"📖" },
  { id:114, word:"write",   type:"content",  unit:15, mastery:0, emoji:"✏️" },
  { id:115, word:"draw",    type:"content",  unit:15, mastery:0, emoji:"🎨" },
  { id:116, word:"learn",   type:"content",  unit:15, mastery:0, emoji:"🎓" },
  { id:117, word:"count",   type:"content",  unit:15, mastery:0, emoji:"🔢" },
  { id:118, word:"share",   type:"content",  unit:15, mastery:0, emoji:"🤲" },
  { id:119, word:"color",   type:"content",  unit:15, mastery:0, emoji:"🖍️" },
  { id:120, word:"cut",     type:"content",  unit:15, mastery:0, emoji:"✂️" },
  // Unit 16: Nature
  { id:121, word:"sun",     type:"content",  unit:16, mastery:0, emoji:"☀️" },
  { id:122, word:"moon",    type:"content",  unit:16, mastery:0, emoji:"🌙" },
  { id:123, word:"star",    type:"content",  unit:16, mastery:0, emoji:"⭐" },
  { id:124, word:"rain",    type:"content",  unit:16, mastery:0, emoji:"🌧️" },
  { id:125, word:"snow",    type:"content",  unit:16, mastery:0, emoji:"❄️" },
  { id:126, word:"wind",    type:"content",  unit:16, mastery:0, emoji:"💨" },
  { id:127, word:"tree",    type:"content",  unit:16, mastery:0, emoji:"🌳" },
  { id:128, word:"flower",  type:"content",  unit:16, mastery:0, emoji:"🌸" },
  // Unit 17: Body Parts
  { id:129, word:"hand",    type:"content",  unit:17, mastery:0, emoji:"✋" },
  { id:130, word:"foot",    type:"content",  unit:17, mastery:0, emoji:"🦶" },
  { id:131, word:"eye",     type:"content",  unit:17, mastery:0, emoji:"👁️" },
  { id:132, word:"ear",     type:"content",  unit:17, mastery:0, emoji:"👂" },
  { id:133, word:"nose",    type:"content",  unit:17, mastery:0, emoji:"👃" },
  { id:134, word:"mouth",   type:"content",  unit:17, mastery:0, emoji:"👄" },
  { id:135, word:"head",    type:"content",  unit:17, mastery:0, emoji:"🗣️" },
  { id:136, word:"heart",   type:"content",  unit:17, mastery:0, emoji:"❤️" },
  // Unit 18: Advanced Words
  { id:137, word:"do",      type:"function", unit:18, mastery:0, emoji:"⚡" },
  { id:138, word:"it",      type:"function", unit:18, mastery:0, emoji:"👈" },
  { id:139, word:"that",    type:"function", unit:18, mastery:0, emoji:"🎯" },
  { id:140, word:"all",     type:"function", unit:18, mastery:0, emoji:"🌐" },
  { id:141, word:"more",    type:"function", unit:18, mastery:0, emoji:"➕" },
  { id:142, word:"no",      type:"function", unit:18, mastery:0, emoji:"❌" },
  { id:143, word:"yes",     type:"function", unit:18, mastery:0, emoji:"✅" },
  { id:144, word:"now",     type:"function", unit:18, mastery:0, emoji:"⏰" },
  // Bonus words (spread across units)
  { id:145, word:"monkey",  type:"content",  unit:2,  mastery:0, emoji:"🐒" },
  { id:146, word:"shark",   type:"content",  unit:2,  mastery:0, emoji:"🦈" },
  { id:147, word:"ant",     type:"content",  unit:2,  mastery:0, emoji:"🐜" },
  { id:148, word:"bee",     type:"content",  unit:2,  mastery:0, emoji:"🐝" },
  { id:149, word:"soup",    type:"content",  unit:7,  mastery:0, emoji:"🍲" },
  { id:150, word:"juice",   type:"content",  unit:7,  mastery:0, emoji:"🧃" },
  { id:151, word:"banana",  type:"content",  unit:7,  mastery:0, emoji:"🍌" },
  { id:152, word:"grapes",  type:"content",  unit:7,  mastery:0, emoji:"🍇" },
  { id:153, word:"white",   type:"content",  unit:8,  mastery:0, emoji:"⬜" },
  { id:154, word:"brown",   type:"content",  unit:8,  mastery:0, emoji:"🟫" },
  { id:155, word:"gray",    type:"content",  unit:8,  mastery:0, emoji:"🩶" },
  { id:156, word:"gold",    type:"content",  unit:8,  mastery:0, emoji:"🥇" },
  { id:157, word:"nine",    type:"content",  unit:10, mastery:0, emoji:"9️⃣" },
  { id:158, word:"eight",   type:"content",  unit:10, mastery:0, emoji:"8️⃣" },
  { id:159, word:"zero",    type:"content",  unit:10, mastery:0, emoji:"0️⃣" },
  { id:160, word:"many",    type:"function", unit:18, mastery:0, emoji:"🔢" },
  { id:161, word:"push",    type:"content",  unit:4,  mastery:0, emoji:"👊" },
  { id:162, word:"pull",    type:"content",  unit:4,  mastery:0, emoji:"🪝" },
  { id:163, word:"throw",   type:"content",  unit:4,  mastery:0, emoji:"🎯" },
  { id:164, word:"catch",   type:"content",  unit:4,  mastery:0, emoji:"🧤" },
  { id:165, word:"stand",   type:"content",  unit:4,  mastery:0, emoji:"🧍" },
  { id:166, word:"hop",     type:"content",  unit:4,  mastery:0, emoji:"🐇" },
  { id:167, word:"clean",   type:"content",  unit:14, mastery:0, emoji:"🧹" },
  { id:168, word:"dirty",   type:"content",  unit:14, mastery:0, emoji:"🗑️" },
  { id:169, word:"wet",     type:"content",  unit:14, mastery:0, emoji:"💦" },
  { id:170, word:"dry",     type:"content",  unit:14, mastery:0, emoji:"🌵" },
  { id:171, word:"full",    type:"content",  unit:14, mastery:0, emoji:"🍱" },
  { id:172, word:"empty",   type:"content",  unit:14, mastery:0, emoji:"🪣" },
  { id:173, word:"phone",   type:"content",  unit:9,  mastery:0, emoji:"📱" },
  { id:174, word:"light",   type:"content",  unit:9,  mastery:0, emoji:"💡" },
  { id:175, word:"clock",   type:"content",  unit:9,  mastery:0, emoji:"🕐" },
  { id:176, word:"table",   type:"content",  unit:9,  mastery:0, emoji:"🪜" },
  { id:177, word:"pencil",  type:"content",  unit:15, mastery:0, emoji:"✏️" },
  { id:178, word:"paper",   type:"content",  unit:15, mastery:0, emoji:"📄" },
  { id:179, word:"box",     type:"content",  unit:15, mastery:0, emoji:"📦" },
  { id:180, word:"bag",     type:"content",  unit:15, mastery:0, emoji:"👜" },
  { id:181, word:"sky",     type:"content",  unit:16, mastery:0, emoji:"🌤️" },
  { id:182, word:"cloud",   type:"content",  unit:16, mastery:0, emoji:"☁️" },
  { id:183, word:"fire",    type:"content",  unit:16, mastery:0, emoji:"🔥" },
  { id:184, word:"ice",     type:"content",  unit:16, mastery:0, emoji:"🧊" },
  { id:185, word:"hair",    type:"content",  unit:17, mastery:0, emoji:"💇" },
  { id:186, word:"arm",     type:"content",  unit:17, mastery:0, emoji:"💪" },
  { id:187, word:"leg",     type:"content",  unit:17, mastery:0, emoji:"🦵" },
  { id:188, word:"teeth",   type:"content",  unit:17, mastery:0, emoji:"🦷" },
  { id:189, word:"this",    type:"function", unit:11, mastery:0, emoji:"👇" },
  { id:190, word:"here",    type:"function", unit:13, mastery:0, emoji:"📍" },
  { id:191, word:"there",   type:"function", unit:13, mastery:0, emoji:"🗺️" },
  { id:192, word:"then",    type:"function", unit:18, mastery:0, emoji:"⏭️" },
  { id:193, word:"after",   type:"function", unit:18, mastery:0, emoji:"➡️" },
  { id:194, word:"before",  type:"function", unit:18, mastery:0, emoji:"⬅️" },
  { id:195, word:"so",      type:"function", unit:18, mastery:0, emoji:"⤴️" },
  { id:196, word:"because", type:"function", unit:18, mastery:0, emoji:"❓" },
  { id:197, word:"when",    type:"function", unit:18, mastery:0, emoji:"📅" },
  { id:198, word:"where",   type:"function", unit:18, mastery:0, emoji:"🗺️" },
  { id:199, word:"what",    type:"function", unit:18, mastery:0, emoji:"❔" },
  { id:200, word:"how",     type:"function", unit:18, mastery:0, emoji:"🤔" },
];

const STUDENTS = [
  { name: "Emma R.",  avatar: "🐸", progress: 78, streak: 12, unit: 9,  words: 87  },
  { name: "Liam K.",  avatar: "🤖", progress: 45, streak: 3,  unit: 5,  words: 52  },
  { name: "Sofia M.", avatar: "🐶", progress: 92, streak: 21, unit: 11, words: 105 },
  { name: "Noah T.",  avatar: "🐱", progress: 31, streak: 1,  unit: 4,  words: 38  },
  { name: "Ava L.",   avatar: "🐦", progress: 67, streak: 8,  unit: 7,  words: 71  },
  { name: "James P.", avatar: "🐸", progress: 55, streak: 5,  unit: 6,  words: 60  },
];

const AVATARS = [
  { emoji: '🚀', name: 'Rocket Kid' },
  { emoji: '👾', name: 'Space Alien' },
  { emoji: '🌟', name: 'Star' },
  { emoji: '🦊', name: 'Space Fox' },
  { emoji: '🐸', name: 'Galaxy Frog' },
  { emoji: '🦁', name: 'Cosmic Lion' },
  { emoji: '🐶', name: 'Astro Pup' },
  { emoji: '🐱', name: 'Moon Cat' },
];

function getDailyMessage(streak, words) {
  if (streak > 1) return `🔥 ${streak} days in a row! You're on fire!`;
  const masteredCount = words.filter(w => w.mastery >= 80).length;
  const justMastered = words.find(w => w.mastery >= 80);
  if (masteredCount === 1 && justMastered) return `You just mastered "${justMastered.word}"! Amazing! 🌟`;
  if (masteredCount > 0 && masteredCount < 5) return `You know ${masteredCount} magic words! Keep going! 🚀`;
  if (words.filter(w => w.mastery > 0).length === 0) return `Ready for your first space mission? Let's go! 🚀`;
  return `Welcome back, explorer! Your words are waiting ✨`;
}

// Matches the Word Galaxy legend: Learning -> Marigold, Getting there ->
// Comet Teal, Mastered -> Sunrise Coral (see CLAUDE.md dawn token table).
const getMasteryColor = (m) => {
  if (m === 0)   return "#e8e8f0";
  if (m < 40)    return tokens.marigold;
  if (m < 80)    return tokens.cometTeal;
  return tokens.sunriseCoral;
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

// ─── TTS helper — fire-and-forget, used for garden taps and Nova greeting ─────
async function speakWord(text) {
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
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
  const [sessionResult,  setSessionResult]  = useState(null); // set on session end
  const [questsCompleted, setQuestsCompleted] = useState({ session: false, words: false });

  // ── Streak ──
  const [streak,       setStreak]       = useState(null); // null = loading, prevents flash of 0
  const [freezesLeft,  setFreezesLeft]  = useState(0);
  const [freezeUsed,   setFreezeUsed]   = useState(false);
  const [streakLoaded, setStreakLoaded] = useState(false);

  // ── Parent dashboard real data ──
  const [weeklyActivity, setWeeklyActivity] = useState(null); // null = not loaded yet

  // ── User stats (XP, level, avatar) ──
  const [avatar,           setAvatar]           = useState('🚀');
  const [totalXP,          setTotalXP]          = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showLevelUp,      setShowLevelUp]      = useState(false);
  const [levelUpInfo,      setLevelUpInfo]      = useState(null);
  const [xpFloats,         setXpFloats]         = useState([]);

  // ── Teacher class ──
  const [teacherClass,     setTeacherClass]     = useState(null);
  const [showCreateClass,  setShowCreateClass]  = useState(false);
  const [newClassName,     setNewClassName]     = useState('');
  const [createClassError, setCreateClassError] = useState('');
  const [creatingClass,    setCreatingClass]    = useState(false);
  const [classMembers,     setClassMembers]     = useState([]);
  const [qrDataUrl,        setQrDataUrl]        = useState(null);

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
    if (!user) {
      setStreak(null);
      setFreezesLeft(0);
      setFreezeUsed(false);
      setStreakLoaded(false);
      return;
    }
    supabase
      .from('user_streaks')
      .select('current_streak, streak_freeze_count')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[user_streaks load]', error);
        setStreak(data?.current_streak ?? 0);
        setFreezesLeft(data?.streak_freeze_count ?? 0);
        setStreakLoaded(true);
      });
  }, [user?.id]); // eslint-disable-line

  // ── Load user_stats (XP, level, avatar) on login ──
  useEffect(() => {
    if (!user) { setAvatar('🚀'); setTotalXP(0); return; }
    supabase
      .from('user_stats')
      .select('total_xp, current_level, avatar')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[user_stats load]', error);
        if (data) {
          setAvatar(data.avatar ?? '🚀');
          setTotalXP(data.total_xp ?? 0);
        }
      });
  }, [user?.id]); // eslint-disable-line

  // ── Load weekly learning activity (last 7 days) ──
  const loadWeeklyActivity = useCallback(() => {
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
        if (error || !data) { setWeeklyActivity([]); return; }
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

  useEffect(() => {
    loadWeeklyActivity();
  }, [loadWeeklyActivity]);

  // ── Load teacher class ──
  useEffect(() => {
    if (!user) { setTeacherClass(null); setClassMembers([]); return; }
    supabase
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setTeacherClass(data); });
  }, [user?.id]); // eslint-disable-line

  // ── Load class members when a class exists ──
  useEffect(() => {
    if (!teacherClass?.id) { setClassMembers([]); return; }
    supabase
      .from('class_members')
      .select('user_id, joined_at')
      .eq('class_id', teacherClass.id)
      .then(({ data }) => setClassMembers(data ?? []));
  }, [teacherClass?.id]); // eslint-disable-line

  // ── Generate QR code for teacher class join link ──
  useEffect(() => {
    if (!teacherClass?.class_code) { setQrDataUrl(null); return; }
    const joinUrl = `https://200magicwordsapp.com/join/${teacherClass.class_code}`;
    QRCode.toDataURL(joinUrl, {
      width: 180, margin: 1,
      color: { dark: '#4ECDC4', light: '#0F0A1E' },
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [teacherClass?.class_code]); // eslint-disable-line

  // ── Update streak after a completed session ──
  const updateStreak = useCallback(async () => {
    if (!user) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

    const { data: existing, error: readErr } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (readErr) console.error('[user_streaks read before update]', readErr);

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

    const { error: writeErr } = await supabase.from('user_streaks').upsert({
      user_id:             user.id,
      current_streak:      newStreak,
      longest_streak:      newLongest,
      last_activity_date:  todayStr,
      streak_freeze_count: newFreezes,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (writeErr) console.error('[user_streaks upsert]', writeErr);

    setStreak(newStreak);
    setFreezesLeft(newFreezes);
    if (usedFreeze) setFreezeUsed(true);
  }, [user]); // eslint-disable-line

  // ── Save XP to user_stats (only touches XP/level columns — avatar is saved separately
  //     to avoid overwriting it with a stale closure value, and vice versa) ──
  const saveXP = useCallback(async (newTotal) => {
    if (!user) return;
    const levelInfo = getLevelInfo(newTotal);
    const { error } = await supabase.from('user_stats').upsert({
      user_id:       user.id,
      total_xp:      newTotal,
      current_level: levelInfo.level,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) console.error('[user_stats saveXP]', error);
  }, [user]);

  // ── Save avatar to user_stats ──
  const saveAvatar = useCallback(async (newAvatar) => {
    if (!user) return;
    setAvatar(newAvatar);
    setShowAvatarPicker(false);
    const { error } = await supabase.from('user_stats').upsert({
      user_id:    user.id,
      avatar:     newAvatar,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) console.error('[user_stats saveAvatar]', error);
  }, [user]);

  // ── Handle XP earned from a session (called by GameEngine via onXP) ──
  const handleXP = useCallback(async (sessionXPAmount) => {
    const prevLevel = getLevelInfo(totalXP);
    const newTotal  = totalXP + sessionXPAmount;
    setTotalXP(newTotal);
    const newLevel = getLevelInfo(newTotal);
    const floatId = Date.now();
    setXpFloats(prev => [...prev, { id: floatId, amount: sessionXPAmount }]);
    setTimeout(() => setXpFloats(prev => prev.filter(f => f.id !== floatId)), 1400);
    if (newLevel.level > prevLevel.level) {
      setLevelUpInfo(newLevel);
      setShowLevelUp(true);
      spawnParticles(window.innerWidth / 2, window.innerHeight / 2);
      setTimeout(() => setShowLevelUp(false), 4200);
    }
    await saveXP(newTotal);
  }, [totalXP, saveXP]); // eslint-disable-line

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
    ;(async () => {
      try {
        await supabase.from('learning_events').insert({
          user_id:          user?.id,
          word,
          correct,
          game_type:        gameType,
          response_time_ms: responseTimeMs,
        });
      } catch {}
    })();
  }, [words, saveWordProgress, user]);

  const handleSessionEnd = useCallback(async ({ wordsCorrect, totalWords, wordsPlayed }) => {
    setSessionResult({ wordsCorrect, totalWords, wordsPlayed: wordsPlayed ?? [] });
    setGameActive(false);
    setScreen("sessionComplete");
    setQuestsCompleted(prev => ({ ...prev, session: true }));
    if (words.filter(w => w.mastery >= 80).length >= 1) {
      setQuestsCompleted(prev => ({ ...prev, words: true }));
    }
    try {
      await updateStreak();
      // Force fresh read so home screen badge reflects the new streak immediately
      const { data } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (data) { setStreak(data.current_streak ?? 0); setStreakLoaded(true); }
    } catch {}
    // Learning events from this session may not have committed yet — reload after a delay
    setWeeklyActivity(null);
    setTimeout(loadWeeklyActivity, 1500);
  }, [updateStreak, user, words, loadWeeklyActivity]);

  // ── Learn tab renderer ──
  const renderLearnTab = () => {
    if (planLoading) {
      return <GalaxyLoader message="Preparing your lesson…" />;
    }

    if (!gameActive) {
      return (
        <div style={{ minHeight: "100vh", background: tokens.cloud, paddingBottom: 80 }}>
          {/* Session goal */}
          {sessionPlan?.sessionGoal && (
            <div className="font-display" style={{
              padding: "1.5rem 1.5rem 0.5rem",
              textAlign: "center",
              color: tokens.cometTealDeep,
              fontSize: "1.1rem",
            }}>
              {sessionPlan.sessionGoal}
            </div>
          )}

          {/* Offline mode warning (non-fatal) */}
          {planError && (
            <div className="font-body" style={{
              margin: "0.5rem 1.5rem",
              padding: "0.75rem 1rem",
              background: `${tokens.sunriseCoral}15`,
              border: `1px solid ${tokens.sunriseCoral}40`,
              borderRadius: 12,
              color: tokens.sunriseCoralDeep,
              fontSize: "0.85rem",
            }}>
              ⚠️ Using offline mode — your progress still saves normally.
            </div>
          )}

          <GameTypeSelector
            onSelect={(gameType) => {
              setActiveGameType(gameType);
              setGameActive(true);
            }}
            unlockedGames={["word_match", "sound_match", "word_hunt", "rhyme_time", "flash_cards", "story_builder"]}
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
          onXP={handleXP}
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
    const [signedUpEmail, setSignedUpEmail] = useState("");

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
        else if (authMode === "sign_up") setSignedUpEmail(email);
      } finally {
        setBusy(false);
      }
    }

    if (signedUpEmail) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dawn-indigo px-5">
          <div className="w-full max-w-md bg-cloud rounded-3xl p-8 text-center">
            <div className="text-4xl mb-4" aria-hidden="true">📬</div>
            <h2 className="font-display text-dawn-indigo text-2xl font-semibold mb-3">
              Check your email
            </h2>
            <p className="font-body text-dawn-indigo/80">We sent a confirmation link to</p>
            <p className="font-body text-dawn-indigo font-bold mb-6 break-all">{signedUpEmail}</p>
            <p className="font-body text-dawn-indigo/70 text-sm mb-8">
              Click the link to verify your account, then come back here to sign in.
            </p>
            <button
              type="button"
              onClick={() => { setSignedUpEmail(""); setAuthMode("sign_in"); setAuthPassword(""); }}
              className="font-body font-bold px-6 py-3 rounded-2xl bg-sunrise-coral text-dawn-indigo hover:brightness-105 transition-all"
            >
              Back to sign in
            </button>
          </div>
        </div>
      );
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

        <div className="font-body" style={{
          background: tokens.cloud, minHeight: "100vh",
          color: tokens.dawnIndigo, position: "relative", overflow: "hidden",
        }}>
          {/* ── Star field (subtle stardust on light bg — keeps the space motif without a literal dark sky) ── */}
          <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute", borderRadius: "50%", background: tokens.dawnIndigo,
                width:   (1 + (i * 7 % 3)) + "px",
                height:  (1 + (i * 7 % 3)) + "px",
                opacity: 0.08 + (i % 5) * 0.04,
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

          {/* ── Global overlays ── */}
          {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}

          {/* XP float animations */}
          {xpFloats.map(f => (
            <div key={f.id} style={{
              position: "fixed", top: "22%", left: "50%",
              fontFamily: "'Fredoka One', sans-serif", fontSize: "1.8rem", color: "#FFE66D",
              zIndex: 9999, animation: "xp-float-up 1.4s ease forwards",
              pointerEvents: "none", textShadow: "0 0 20px rgba(255,230,109,0.8)",
              whiteSpace: "nowrap",
            }}>
              +{f.amount} XP ⭐
            </div>
          ))}

          {/* Level-up celebration — the one moment allowed to be cinematic
              (Interaction Design addendum item c). Replays a compressed
              WordRise moment using a sample of the child's own mastered
              words, scoped to level-up only. */}
          {showLevelUp && levelUpInfo && (
            <LevelUpCelebration
              levelInfo={levelUpInfo}
              words={words.filter(w => w.mastery >= 80)}
              onDismiss={() => setShowLevelUp(false)}
            />
          )}

          {/* Avatar picker modal */}
          {showAvatarPicker && (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}
              onClick={() => setShowAvatarPicker(false)}
            >
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
                <div style={{ fontFamily: "'Fredoka One', sans-serif", fontSize: "1.5rem", color: "#FFE66D", marginBottom: "1.5rem" }}>
                  Choose your space identity! 🚀
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {AVATARS.map(a => (
                    <button key={a.emoji} onClick={() => saveAvatar(a.emoji)} style={{
                      background: avatar === a.emoji ? "rgba(78,205,196,0.2)" : "rgba(255,255,255,0.06)",
                      border: avatar === a.emoji ? "2px solid #4ECDC4" : "2px solid rgba(255,255,255,0.12)",
                      boxShadow: avatar === a.emoji ? "0 0 16px rgba(78,205,196,0.5)" : "none",
                      borderRadius: 16, width: 80, height: 80, fontSize: "2.5rem", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {a.emoji}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAvatarPicker(false)} style={{
                  background: "linear-gradient(135deg, #4ECDC4, #A8E6CF)", color: "#0F0A1E",
                  border: "none", borderRadius: 50, padding: "0.75rem 2rem",
                  fontFamily: "'Fredoka One', sans-serif", fontSize: "1rem", cursor: "pointer",
                }}>
                  Done ✓
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom nav (hidden during active game) ── */}
          {!gameActive && (
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: `${tokens.cloud}f2`, backdropFilter: "blur(20px)",
              borderTop: `1px solid ${tokens.dawnIndigo}1a`,
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
                    opacity: screen === nav.id ? 1 : 0.55,
                    minWidth: 44, minHeight: 44,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 22 }}>{nav.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: screen === nav.id ? tokens.sunriseCoralDeep : tokens.dawnIndigo }}>
                    {nav.label}
                  </div>
                  {screen === nav.id && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: tokens.sunriseCoral, margin: "2px auto 0" }} />
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        {/* Nova + Welcome label */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <img
                            src={novaIdleIcon}
                            alt="Nova astronaut"
                            style={{ width: 36, height: 36, display: "inline-block", animation: "nova-wave 2s ease-in-out infinite", transformOrigin: "bottom center", cursor: "pointer" }}
                            onClick={() => speakWord(`Hi ${getChildName(user)}`)}
                          />
                          <div style={{ fontSize: 13, color: tokens.cometTealDeep, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Welcome back!</div>
                        </div>
                        {/* Avatar + name + edit button */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ position: "relative", display: "inline-flex", fontSize: 26 }}>
                            {avatar}
                            <button onClick={() => setShowAvatarPicker(true)} style={{
                              position: "absolute", bottom: -4, right: -4,
                              minWidth: 44, minHeight: 44, width: 44, height: 44,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: `${tokens.cometTeal}30`, border: `1px solid ${tokens.cometTeal}`,
                              borderRadius: "50%", cursor: "pointer", fontSize: 18, lineHeight: 1,
                            }} aria-label="Edit avatar">🖊️</button>
                          </span>
                          <div className="font-display" style={{ fontSize: 28, color: tokens.marigoldDeep }}>
                            {getChildName(user)} ⭐
                          </div>
                        </div>
                        {/* Level — primary progress metric (mastery is the reward, not XP) */}
                        {(() => {
                          const lvl = getLevelInfo(totalXP);
                          return (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${tokens.cometTeal}1f`, border: `1px solid ${tokens.cometTeal}66`, borderRadius: 20, padding: "5px 12px", marginTop: 6 }}>
                              <span style={{ fontSize: 16 }}>{lvl.emoji}</span>
                              <span style={{ fontSize: 13, color: tokens.cometTealDeep, fontWeight: 800 }}>Level {lvl.level} of {MAX_LEVEL} · {lvl.title}</span>
                            </div>
                          );
                        })()}
                        {/* Current MLC stage — what skill the child is practicing right now */}
                        {(() => {
                          const lvl = getLevelInfo(totalXP);
                          return (
                            <div style={{ marginTop: 4, fontSize: 11, color: tokens.dawnIndigo, opacity: 0.6 }}>{lvl.stage}</div>
                          );
                        })()}
                        {/* XP display — secondary, smaller */}
                        <div style={{ marginTop: 4, fontSize: 11, color: `${tokens.marigoldDeep}cc`, fontWeight: 600, opacity: 0.75 }}>⭐ {totalXP} XP</div>
                        {/* Daily contextual message */}
                        <div style={{ marginTop: 4, fontSize: 13, color: tokens.cometTealDeep, opacity: 0.85, lineHeight: 1.4 }}>
                          {getDailyMessage(streak ?? 0, words)}
                        </div>
                        {!scoresLoaded && (
                          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Syncing…</div>
                        )}
                      </div>
                      {/* Streak badge */}
                      <div style={{ background: `linear-gradient(135deg, ${tokens.sunriseCoral}, ${tokens.marigold})`, borderRadius: 20, padding: "10px 16px", textAlign: "center", boxShadow: `0 4px 20px ${tokens.sunriseCoral}33`, flexShrink: 0, minWidth: 72 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: tokens.dawnIndigo }}>
                          {streakLoaded ? `🔥 ${streak}` : <span style={{ opacity: 0.5, fontSize: 16 }}>🔥 —</span>}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, color: tokens.dawnIndigo }}>DAY STREAK</div>
                        {freezeUsed && <div style={{ fontSize: 9, color: tokens.dawnIndigo, opacity: 0.8, marginTop: 2 }}>❄️ Streak saved!</div>}
                        {!freezeUsed && freezesLeft > 0 && <div style={{ fontSize: 9, color: tokens.dawnIndigo, opacity: 0.75, marginTop: 2 }}>🧊 ×{freezesLeft}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <div className="btn-primary" onClick={signOut} style={{ background: `${tokens.dawnIndigo}0a`, border: `1px solid ${tokens.dawnIndigo}1f`, borderRadius: 14, padding: "8px 12px", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                        Log out
                      </div>
                    </div>
                  </div>

                  {/* Unit progress ring */}
                  {(() => {
                    const masteredCount = words.filter(w => w.mastery >= 80).length;
                    const masteredFraction = words.length > 0 ? masteredCount / words.length : 0;
                    return (
                      <div style={{ background: `linear-gradient(135deg, ${tokens.cometTeal}22, ${tokens.marigold}18)`, borderRadius: 24, padding: 20, marginBottom: 20, border: `1px solid ${tokens.cometTeal}4d` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                          <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                            <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="40" cy="40" r="32" fill="none" stroke={`${tokens.dawnIndigo}1a`} strokeWidth="8" />
                              <circle cx="40" cy="40" r="32" fill="none" stroke={tokens.cometTeal} strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 32 * masteredFraction} ${2 * Math.PI * 32}`}
                                strokeLinecap="round" />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ textAlign: "center" }}>
                                <div className="font-display" style={{ fontSize: 18, color: tokens.cometTealDeep }}>
                                  {masteredCount}
                                </div>
                                <div style={{ fontSize: 8, opacity: 0.7 }}>mastered</div>
                              </div>
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="font-display" style={{ fontSize: 18 }}>Unit 9: On the Move!</div>
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>run · dog · look · one · other</div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ height: 8, background: `${tokens.dawnIndigo}14`, borderRadius: 10, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${masteredFraction * 100}%`, borderRadius: 10, background: `linear-gradient(90deg, ${tokens.cometTeal}, ${tokens.marigold})` }} />
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{masteredCount} of {words.length} words mastered</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Daily magic word */}
                  <div onClick={() => setScreen("learn")} style={{ background: `linear-gradient(135deg, ${tokens.sunriseCoral}15, ${tokens.marigold}15)`, border: `1px solid ${tokens.sunriseCoral}33`, borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                    <div style={{ fontSize: 40, animation: "float 3s ease-in-out infinite", flexShrink: 0 }}>✨</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: tokens.sunriseCoralDeep, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Daily Magic Word</div>
                      <div className="font-display" style={{ fontSize: 26, color: tokens.marigoldDeep }}>look</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Tap to unlock today's lesson →</div>
                    </div>
                    <div className="btn-primary" onClick={() => setScreen("learn")} style={{ background: `linear-gradient(135deg, ${tokens.sunriseCoral}, ${tokens.marigold})`, color: tokens.dawnIndigo, borderRadius: 14, padding: "10px 16px", fontSize: 20, animation: "pulse 2s ease-in-out infinite", flexShrink: 0 }}>▶</div>
                  </div>

                  {/* Today's quest */}
                  <div style={{ marginBottom: 20 }}>
                    <div className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>Today's Quest 🗺️</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { icon: sessionQuestIcon, label: "Session", done: questsCompleted.session },
                        { icon: masterQuestIcon,  label: "Master",  done: questsCompleted.words || words.filter(w => w.mastery >= 80).length >= 1 },
                      ].map((a, i) => (
                        <div key={i} className="activity-card" onClick={() => setScreen("learn")} style={{
                          flex: 1, background: a.done ? `${tokens.cometTeal}25` : `${tokens.dawnIndigo}0a`,
                          border: `1px solid ${a.done ? tokens.cometTeal : `${tokens.dawnIndigo}1f`}`,
                          borderRadius: 14, padding: "10px 0", textAlign: "center", minHeight: 64,
                        }}>
                          <div style={{ fontSize: 18, display: "flex", justifyContent: "center" }}>
                            {a.done ? "✅" : <img src={a.icon} alt={a.label} style={{ width: 22, height: 22 }} />}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, opacity: a.done ? 0.7 : 1 }}>{a.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Word garden preview */}
                  <div style={{ background: `${tokens.dawnIndigo}0a`, border: `1px solid ${tokens.dawnIndigo}1f`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div className="font-display" style={{ fontSize: 18 }}>Word Garden 🌱</div>
                      <div className="btn-primary" onClick={() => setScreen("words")} style={{ fontSize: 11, color: tokens.cometTealDeep, fontWeight: 700 }}>See all →</div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {words.slice(0, 9).map(w => (
                        <div key={w.id} className="word-orb" onClick={() => {
                          speakWord(w.word);
                          generatePlanForWord(w.word);
                          setScreen('learn');
                        }} style={{ background: w.mastery === 0 ? `${tokens.dawnIndigo}0d` : getMasteryColor(w.mastery), color: w.mastery > 0 ? tokens.dawnIndigo : `${tokens.dawnIndigo}99`, borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <WordIcon word={w.word} emoji={w.emoji} size="1em" />
                          {w.word}
                        </div>
                      ))}
                      <div style={{ borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 700, border: `1px dashed ${tokens.dawnIndigo}33`, color: `${tokens.dawnIndigo}66` }}>
                        +{Math.max(0, words.length - 9)} more
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ LEARN ═══ */}
              {screen === "learn" && renderLearnTab()}

              {/* ═══ SESSION COMPLETE ═══ */}
              {screen === "sessionComplete" && sessionResult && (
                <SessionComplete
                  correctCount={sessionResult.wordsCorrect}
                  total={sessionResult.totalWords}
                  wordsPlayed={sessionResult.wordsPlayed}
                  encouragement={sessionPlan?.encouragements?.[0] ?? "Amazing work today! 🌟"}
                  childName={getChildName(user)}
                  onPlayAgain={() => {
                    setSessionResult(null);
                    setScreen("learn");
                  }}
                  onHome={() => {
                    setSessionResult(null);
                    setScreen("home");
                  }}
                />
              )}

              {/* ═══ MY WORDS ═══ */}
              {screen === "words" && (
                <div className="screen-padding" style={{ paddingTop: 50, paddingBottom: 20, animation: "slideUp 0.4s ease" }}>
                  <div className="font-display" style={{ fontSize: 30, marginBottom: 4 }}>My Word Galaxy 🌌</div>
                  <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 16 }}>
                    {words.filter(w => w.mastery > 0).length} of {words.length} words in your galaxy
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    {[
                      { color: "#e8e8f0", label: "Not started"  },
                      { color: tokens.marigold, label: "Learning"     },
                      { color: tokens.cometTeal, label: "Getting there"},
                      { color: tokens.sunriseCoral, label: "Mastered ⭐"  },
                    ].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, flexShrink: 0, border: `1px solid ${tokens.dawnIndigo}22` }} />
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{l.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Word Galaxy as a spatial unit map (Interaction Design addendum item b) */}
                  <WordGalaxyMap
                    words={words}
                    unitNames={UNIT_NAMES}
                    onWordClick={setActiveWord}
                    getMasteryColor={getMasteryColor}
                  />

                  {/* Word detail modal */}
                  {activeWord && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setActiveWord(null)}>
                      <div onClick={e => e.stopPropagation()} className="font-body" style={{ background: tokens.cloud, color: tokens.dawnIndigo, border: `2px solid ${getMasteryColor(activeWord.mastery)}`, borderRadius: 28, padding: 28, width: "100%", maxWidth: 360, animation: "bounceIn 0.3s ease" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 56 }}>{activeWord.emoji}</div>
                          <div className="font-display" style={{ fontSize: 40, color: tokens.marigoldDeep, marginTop: 8 }}>{activeWord.word}</div>
                          <div style={{ marginTop: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 13, opacity: 0.7 }}>Mastery</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: getMasteryColor(activeWord.mastery) }}>{activeWord.mastery}%</span>
                            </div>
                            <div style={{ height: 10, background: `${tokens.dawnIndigo}14`, borderRadius: 10, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${activeWord.mastery}%`, borderRadius: 10, background: `linear-gradient(90deg, ${getMasteryColor(activeWord.mastery)}, ${getMasteryColor(activeWord.mastery)}aa)`, transition: "width 1s ease" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <div style={{ flex: 1, background: `${tokens.dawnIndigo}0a`, borderRadius: 12, padding: 12, textAlign: "center" }}>
                              <div style={{ fontWeight: 800 }}>Unit {activeWord.unit}</div>
                              <div style={{ fontSize: 11, opacity: 0.6 }}>Level</div>
                            </div>
                            <div style={{ flex: 1, background: `${tokens.dawnIndigo}0a`, borderRadius: 12, padding: 12, textAlign: "center" }}>
                              <div style={{ fontWeight: 800, color: activeWord.type === "content" ? tokens.cometTealDeep : tokens.marigoldDeep }}>
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
                          <div className="btn-primary" onClick={() => { setActiveWord(null); setScreen("learn"); }} style={{ marginTop: 16, width: "100%", background: `linear-gradient(135deg, ${tokens.sunriseCoral}, ${tokens.marigold})`, color: tokens.dawnIndigo, borderRadius: 14, padding: "12px 0", fontWeight: 900, fontSize: 15, textAlign: "center" }}>
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
                <div className="-mx-5 font-body" style={{ background: tokens.cloud, color: tokens.dawnIndigo, minHeight: "100vh", animation: "slideUp 0.4s ease" }}>
                <div className="screen-padding" style={{ paddingTop: 50, paddingBottom: 20 }}>
                  <div style={{ fontSize: 13, color: tokens.sunriseCoralDeep, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Parent Dashboard</div>
                  <div className="font-display" style={{ fontSize: 26, marginBottom: 4 }}>
                    {getChildName(user)}'s Progress 👧
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>{user?.email}</div>

                  {/* Current level/stage — mastery is the reward, so this leads, not XP */}
                  {(() => {
                    const lvl = getLevelInfo(totalXP);
                    return (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${tokens.cometTeal}1f`, border: `1px solid ${tokens.cometTeal}66`, borderRadius: 20, padding: "5px 12px", marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>{lvl.emoji}</span>
                        <span style={{ fontSize: 13, color: tokens.cometTealDeep, fontWeight: 800 }}>Level {lvl.level} of {MAX_LEVEL}</span>
                        <span style={{ fontSize: 12, color: tokens.dawnIndigo, opacity: 0.65 }}>· {lvl.stage}</span>
                      </div>
                    );
                  })()}

                  {/* Child share code — parent gives this to another account to link */}
                  {user && (
                    <div style={{ background: `${tokens.cometTeal}15`, border: `1px solid ${tokens.cometTeal}40`, borderRadius: 14, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: tokens.cometTealDeep, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Child Share Code</div>
                        <div className="font-display" style={{ fontSize: 22, color: tokens.marigoldDeep, letterSpacing: 4 }}>
                          {user.id.substring(0, 6).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>Give this code to a parent account to link their dashboard to this child</div>
                      </div>
                      <div className="btn-primary" onClick={() => navigator.clipboard?.writeText(user.id.substring(0, 6).toUpperCase())}
                        style={{ background: tokens.cometTeal, border: `1px solid ${tokens.cometTealDeep}`, borderRadius: 10, padding: "8px 12px", fontSize: 11, fontWeight: 800, color: tokens.dawnIndigo, cursor: "pointer", flexShrink: 0 }}>
                        Copy 📋
                      </div>
                    </div>
                  )}

                  {(() => {
                    const masteredCount = words.filter(w => w.mastery >= 80).length;
                    const weekMins = weeklyActivity ? weeklyActivity.reduce((s, d) => s + d.mins, 0) : null;
                    const weekStr  = weekMins !== null ? (weekMins < 60 ? `${weekMins}m` : `${(weekMins/60).toFixed(1)}h`) : '—';
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                        {[
                          { val: masteredCount.toString(), sub: "Words mastered", color: tokens.cometTealDeep, bg: tokens.cometTeal },
                          { val: streak !== null ? `${streak}🔥` : '—🔥', sub: "Day streak", color: tokens.sunriseCoralDeep, bg: tokens.sunriseCoral },
                          { val: weekStr,                  sub: "This week",      color: tokens.marigoldDeep, bg: tokens.marigold },
                        ].map((s, i) => (
                          <div key={i} style={{ background: `${s.bg}18`, border: `1px solid ${s.bg}55`, borderRadius: 18, padding: "14px 10px", textAlign: "center" }}>
                            <div className="font-display" style={{ fontSize: 20, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4 }}>{s.sub}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* AI coaching tip from session plan */}
                  <div style={{ background: `${tokens.marigold}1f`, border: `1px solid ${tokens.marigold}66`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 28 }}>🤖</div>
                      <div>
                        <div style={{ fontWeight: 800, color: tokens.marigoldDeep, marginBottom: 4 }}>AI Insight this week</div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                          {sessionPlan?.coachingTip || "Keep practicing! Focus on words with lower mastery scores first. Short daily sessions work better than long ones for young learners."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly activity chart */}
                  <div style={{ background: `${tokens.dawnIndigo}0a`, border: `1px solid ${tokens.dawnIndigo}1f`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div className="font-display" style={{ fontSize: 18, marginBottom: 16 }}>
                      Weekly Activity ⏱️
                      {weeklyActivity === null && <span className="font-body" style={{ fontSize: 11, opacity: 0.6, marginLeft: 8 }}>loading…</span>}
                    </div>
                    {weeklyActivity !== null && weeklyActivity.length > 0 && weeklyActivity.some(d => d.mins > 0) ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
                        {weeklyActivity.map((d, i, arr) => {
                          const maxMins = Math.max(...arr.map(x => x.mins), 1);
                          const barH = Math.round((d.mins / maxMins) * 60) + 4;
                          const isToday = i === arr.length - 1;
                          return (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              {d.mins > 0 && <div style={{ fontSize: 9, opacity: 0.7 }}>{d.mins}m</div>}
                              <div style={{ width: "100%", height: barH + "px", background: isToday ? tokens.sunriseCoral : d.mins > 30 ? tokens.marigold : tokens.cometTeal, borderRadius: "4px 4px 0 0", opacity: d.mins === 0 ? 0.25 : 1 }} />
                              <div style={{ fontSize: 9, opacity: isToday ? 1 : 0.7, color: isToday ? tokens.sunriseCoralDeep : undefined }}>{d.day}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : weeklyActivity !== null ? (
                      <div className="font-body" style={{ textAlign: "center", padding: "16px 0", color: tokens.cometTealDeep, fontSize: 13, opacity: 0.85 }}>
                        No activity yet — play a session to see your chart! 🚀
                      </div>
                    ) : null}
                  </div>

                  {/* Needs attention section */}
                  {(() => {
                    const struggling = words.filter(w => w.mastery > 0 && w.mastery < 50);
                    if (!struggling.length) return null;
                    return (
                      <div style={{ background: `${tokens.sunriseCoral}15`, border: `1px solid ${tokens.sunriseCoral}40`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
                        <div className="font-display" style={{ fontSize: 18, color: tokens.sunriseCoralDeep, marginBottom: 10 }}>⚠️ Needs Attention</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {struggling.map(w => (
                            <div key={w.id} style={{ background: `${tokens.sunriseCoral}25`, border: `1px solid ${tokens.sunriseCoral}55`, borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 800, color: tokens.sunriseCoralDeep }}>
                              {w.emoji} {w.word} <span style={{ opacity: 0.75 }}>{w.mastery}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mastery heatmap — live data */}
                  <div style={{ background: `${tokens.dawnIndigo}0a`, border: `1px solid ${tokens.dawnIndigo}1f`, borderRadius: 20, padding: 16, marginBottom: 20 }}>
                    <div className="font-display" style={{ fontSize: 18, marginBottom: 12 }}>Word Mastery Heatmap 🗺️</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {words.slice(0, 40).map(w => (
                        <div key={w.id} title={`${w.word}: ${w.mastery}%`} style={{ width: 28, height: 28, borderRadius: 6, background: getMasteryColor(w.mastery), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: w.mastery > 0 ? tokens.dawnIndigo : `${tokens.dawnIndigo}55` }}>
                          {w.word.slice(0, 2)}
                        </div>
                      ))}
                      {words.length > 40 && (
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${tokens.marigold}20`, border: `1px dashed ${tokens.marigold}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: tokens.marigoldDeep }}>
                          +{words.length - 40}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upgrade CTA */}
                  <div style={{ background: `linear-gradient(135deg, ${tokens.sunriseCoral}, ${tokens.marigold})`, borderRadius: 20, padding: 20, textAlign: "center", boxShadow: `0 8px 30px ${tokens.sunriseCoral}44` }}>
                    <div className="font-display" style={{ fontSize: 22 }}>🌟 Free Plan</div>
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Units 1–5 only. Unlock all 200 words!</div>
                    <div className="btn-primary" onClick={() => setShowUpgradeModal(true)} style={{ display: "inline-block", marginTop: 12, background: tokens.cloud, color: tokens.sunriseCoralDeep, borderRadius: 14, padding: "10px 28px", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
                      Upgrade — $9.99/mo
                    </div>
                  </div>
                </div>
                </div>
              )}

              {/* ═══ TEACHER ═══ */}
              {screen === "teacher" && (
                <div className="-mx-5 font-body" style={{ background: tokens.cloud, color: tokens.dawnIndigo, minHeight: "100vh", animation: "slideUp 0.4s ease" }}>
                <div className="screen-padding" style={{ paddingTop: 50, paddingBottom: 20 }}>
                  <div style={{ fontSize: 13, color: tokens.cometTealDeep, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Teacher Dashboard</div>
                  <div className="font-display" style={{ fontSize: 24, marginBottom: 16 }}>
                    {teacherClass ? `${teacherClass.class_name} 🏫` : 'My Classroom 🏫'}
                  </div>

                  {/* Create class modal */}
                  {showCreateClass && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowCreateClass(false)}>
                      <div onClick={e => e.stopPropagation()} className="font-body" style={{ background: tokens.cloud, color: tokens.dawnIndigo, border: `2px solid ${tokens.cometTeal}`, borderRadius: 24, padding: 28, width: "100%", maxWidth: 340, animation: "bounceIn 0.3s ease" }}>
                        <div className="font-display" style={{ fontSize: 22, color: tokens.cometTealDeep, marginBottom: 16 }}>Create a Class</div>
                        <input
                          value={newClassName}
                          onChange={e => setNewClassName(e.target.value)}
                          placeholder="e.g. Ms. Kim's Kindergarten"
                          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${tokens.dawnIndigo}33`, background: `${tokens.dawnIndigo}08`, color: tokens.dawnIndigo, boxSizing: "border-box", marginBottom: 16 }}
                        />
                        <button
                          disabled={!newClassName.trim() || creatingClass}
                          onClick={async () => {
                            if (!newClassName.trim() || !user || creatingClass) return;
                            setCreatingClass(true);
                            setCreateClassError('');
                            let lastError = null;
                            // Retry a couple times in case the random class_code collides with an existing one
                            for (let attempt = 0; attempt < 3; attempt++) {
                              const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                              const { data, error } = await supabase.from('teacher_classes').insert({
                                teacher_id: user.id,
                                class_name: newClassName.trim(),
                                class_code: classCode,
                              }).select().maybeSingle();
                              if (!error && data) {
                                setTeacherClass(data);
                                setShowCreateClass(false);
                                setNewClassName('');
                                setCreateClassError('');
                                lastError = null;
                                break;
                              }
                              lastError = error;
                              if (error?.code !== '23505') break; // only retry on unique-constraint collisions
                            }
                            if (lastError) {
                              console.error('[teacher_classes insert]', lastError);
                              setCreateClassError("Couldn't create the class — please try again.");
                            }
                            setCreatingClass(false);
                          }}
                          style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: tokens.cometTeal, color: tokens.dawnIndigo, fontWeight: 900, fontSize: 15, cursor: (!newClassName.trim() || creatingClass) ? "not-allowed" : "pointer", opacity: (!newClassName.trim() || creatingClass) ? 0.6 : 1 }}
                        >
                          {creatingClass ? 'Creating…' : 'Create Class ✨'}
                        </button>
                        {createClassError && (
                          <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: tokens.sunriseCoralDeep, fontWeight: 700 }}>{createClassError}</div>
                        )}
                        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, opacity: 0.6, cursor: "pointer" }} onClick={() => { setShowCreateClass(false); setCreateClassError(''); }}>Cancel</div>
                      </div>
                    </div>
                  )}

                  {!teacherClass ? (
                    /* No class yet */
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                      <div style={{ fontSize: 64, marginBottom: 16 }}>🏫</div>
                      <div className="font-display" style={{ fontSize: 22, marginBottom: 8 }}>Create your first class</div>
                      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>Students join with a 6-character code. Track their progress in real time.</div>
                      <div className="btn-primary" onClick={() => setShowCreateClass(true)} style={{ display: "inline-block", background: tokens.cometTeal, color: tokens.dawnIndigo, borderRadius: 14, padding: "12px 28px", fontWeight: 900, fontSize: 15 }}>
                        Create Class ✨
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Join code + QR code */}
                      <div style={{ background: `${tokens.cometTeal}1a`, border: `2px solid ${tokens.cometTeal}`, borderRadius: 20, padding: 20, marginBottom: 20, textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: tokens.cometTealDeep, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Student Join Code</div>
                        <div className="font-display" style={{ fontSize: 40, color: tokens.marigoldDeep, letterSpacing: 6 }}>
                          {teacherClass.class_code}
                        </div>
                        {/* QR Code */}
                        {qrDataUrl && (
                          <div style={{ margin: "12px auto 8px", display: "inline-block", borderRadius: 12, overflow: "hidden", border: `2px solid ${tokens.cometTeal}55`, background: tokens.cloud, padding: 4 }}>
                            <img src={qrDataUrl} alt="QR code to join class" width={140} height={140} style={{ display: "block", borderRadius: 8 }} />
                          </div>
                        )}
                        {/* Shareable link */}
                        <div style={{ fontSize: 11, color: `${tokens.dawnIndigo}99`, marginTop: 4, wordBreak: "break-all", padding: "0 8px" }}>
                          200magicwordsapp.com/join/{teacherClass.class_code}
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
                          <div className="btn-primary"
                            onClick={() => navigator.clipboard?.writeText(teacherClass.class_code)}
                            style={{ display: "inline-block", background: `${tokens.cometTeal}25`, border: `1px solid ${tokens.cometTeal}`, borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, color: tokens.cometTealDeep, cursor: "pointer" }}>
                            Copy code 📋
                          </div>
                          <div className="btn-primary"
                            onClick={() => navigator.clipboard?.writeText(`https://200magicwordsapp.com/join/${teacherClass.class_code}`)}
                            style={{ display: "inline-block", background: `${tokens.marigold}25`, border: `1px solid ${tokens.marigold}`, borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, color: tokens.marigoldDeep, cursor: "pointer" }}>
                            Copy link 🔗
                          </div>
                        </div>
                      </div>

                      {/* Student list */}
                      <div className="font-display" style={{ fontSize: 18, marginBottom: 12 }}>
                        Students 📋
                        <span className="font-body" style={{ fontSize: 13, fontWeight: 700, color: tokens.cometTealDeep, marginLeft: 8 }}>
                          {classMembers.length} joined
                        </span>
                      </div>
                      {classMembers.length === 0 ? (
                        <div style={{ background: `${tokens.dawnIndigo}0a`, border: `1px solid ${tokens.dawnIndigo}1f`, borderRadius: 18, padding: "24px 16px", textAlign: "center", marginBottom: 20 }}>
                          <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>No students yet</div>
                          <div style={{ fontSize: 13, opacity: 0.7 }}>Share the join code or QR code above. Students scan or enter the code to join.</div>
                        </div>
                      ) : (
                        <div style={{ background: `${tokens.dawnIndigo}0a`, border: `1px solid ${tokens.dawnIndigo}1f`, borderRadius: 18, padding: "12px 16px", marginBottom: 20 }}>
                          {classMembers.map((m, i) => (
                            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < classMembers.length - 1 ? `1px solid ${tokens.dawnIndigo}14` : "none" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${tokens.cometTeal}25`, border: `1px solid ${tokens.cometTeal}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧑‍🎓</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>Student {i + 1}</div>
                                <div style={{ fontSize: 10, opacity: 0.6 }}>Joined {new Date(m.joined_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                        {[
                          { icon: "📤", label: "Assign Unit",    color: tokens.cometTealDeep, bg: tokens.cometTeal },
                          { icon: "📊", label: "Export Report",  color: tokens.marigoldDeep, bg: tokens.marigold },
                        ].map((a, i) => (
                          <div key={i} className="activity-card" style={{ background: `${a.bg}18`, border: `1px solid ${a.bg}55`, borderRadius: 18, padding: "16px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "not-allowed", opacity: 0.5 }}>
                            <div style={{ fontSize: 24 }}>{a.icon}</div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: a.color }}>{a.label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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
