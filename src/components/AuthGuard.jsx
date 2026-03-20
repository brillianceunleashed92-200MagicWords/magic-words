// src/components/AuthGuard.jsx
// Wraps any screen/component that requires login.
// Shows a beautiful loading state during the initial session check,
// then either renders children (logged in) or the login screen (logged out).
//
// Usage:
//   <AuthGuard user={user} isLoading={isLoading} fallback={<LoginScreen />}>
//     <HomeScreen />
//   </AuthGuard>

import { useEffect, useRef } from 'react';

// Animated star field for the loading screen — pure CSS, no libraries
function StarField() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(60px); }
          to   { transform: rotate(360deg) translateX(60px); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        .star {
          position: absolute;
          border-radius: 50%;
          background: white;
          animation: twinkle var(--dur, 2s) ease-in-out infinite var(--delay, 0s);
        }
      `}</style>
      {/* Static star field */}
      {STAR_POSITIONS.map((s, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: s.x + '%',
            top:  s.y + '%',
            width:  s.size + 'px',
            height: s.size + 'px',
            '--dur':   s.dur + 's',
            '--delay': s.delay + 's',
            opacity: 0.3,
          }}
        />
      ))}
    </div>
  );
}

// Pre-computed star positions (deterministic, no random on render)
const STAR_POSITIONS = [
  { x: 10, y: 15, size: 2, dur: 2.1, delay: 0    },
  { x: 22, y: 40, size: 3, dur: 3.2, delay: 0.4  },
  { x: 35, y: 8,  size: 1, dur: 2.8, delay: 0.8  },
  { x: 48, y: 62, size: 2, dur: 2.4, delay: 0.2  },
  { x: 61, y: 25, size: 3, dur: 3.0, delay: 1.0  },
  { x: 75, y: 78, size: 1, dur: 2.6, delay: 0.6  },
  { x: 88, y: 45, size: 2, dur: 2.2, delay: 1.4  },
  { x: 15, y: 85, size: 3, dur: 3.4, delay: 0.3  },
  { x: 55, y: 90, size: 1, dur: 2.0, delay: 0.9  },
  { x: 92, y: 12, size: 2, dur: 2.9, delay: 0.5  },
  { x: 30, y: 55, size: 2, dur: 2.7, delay: 1.2  },
  { x: 70, y: 35, size: 1, dur: 3.1, delay: 0.7  },
  { x: 5,  y: 60, size: 3, dur: 2.3, delay: 1.6  },
  { x: 82, y: 88, size: 2, dur: 2.5, delay: 0.1  },
  { x: 44, y: 18, size: 1, dur: 3.3, delay: 1.3  },
];

function GalaxyLoader({ message = "Loading your galaxy…" }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0A1E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Nunito", sans-serif',
      position: 'relative',
    }}>
      <StarField />

      {/* Cosmo orbiting animation */}
      <div style={{ position: 'relative', width: '140px', height: '140px', marginBottom: '2rem' }}>
        {/* Pulse rings */}
        {[0, 0.5, 1].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: '10px',
            borderRadius: '50%',
            border: '2px solid rgba(78,205,196,0.4)',
            animation: `pulseRing 2s ease-out infinite ${delay}s`,
          }} />
        ))}
        {/* Center star */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '56px',
          animation: 'float 3s ease-in-out infinite',
        }}>⭐</div>
        {/* Orbiting dot */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '14px',
          height: '14px',
          marginTop: '-7px',
          marginLeft: '-7px',
          transformOrigin: 'center',
          animation: 'orbit 1.8s linear infinite',
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#FFE66D',
            boxShadow: '0 0 8px rgba(255,230,109,0.8)',
          }} />
        </div>
      </div>

      <p style={{
        fontFamily: '"Fredoka One", cursive',
        fontSize: '1.4rem',
        color: '#4ECDC4',
        margin: 0,
        letterSpacing: '0.5px',
      }}>
        {message}
      </p>
    </div>
  );
}

// ─── Main AuthGuard ───────────────────────────────────────────────────────────

function AuthGuard({ user, isLoading, fallback, children, loadingMessage }) {
  // isLoading = true during the initial Supabase session check (usually < 500ms)
  if (isLoading) {
    return <GalaxyLoader message={loadingMessage ?? "Loading your galaxy…"} />;
  }

  // Not logged in — show login/signup screen
  if (!user) {
    return fallback ?? null;
  }

  // Logged in — render the protected content
  return children;
}

export { AuthGuard, GalaxyLoader };
export default AuthGuard;
