import { useState } from 'react';
import { colors } from '../../theme/tokens';

// Nova, CSS-built per mockup D's `.nova`/`.n-core`/`.n-eye`/`.n-smile`/
// `.n-tail` structure. Swap-in slot: if a Higgsfield render exists at
// /nova/<state>.png it's used instead — falls back to the CSS sprite via
// onError since we can't reliably probe public/ contents at build time.
// state: 'idle' | 'fly' | 'correct' | 'wrong' | 'sleepy'.
export default function NovaSprite({ state = 'idle', size = 88 }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!imgFailed) {
    return (
      <img
        src={`/nova/${state}.png`}
        alt="Nova"
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        style={{ display: 'block' }}
      />
    );
  }

  const animByState = {
    idle: 'candy-nova-float 2.4s ease-in-out infinite',
    fly: 'candy-nova-float 1.2s ease-in-out infinite',
    correct: 'candy-nova-bounce .5s ease',
    wrong: 'candy-nova-shake .4s ease',
    sleepy: 'candy-nova-float 4s ease-in-out infinite',
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, animation: animByState[state] ?? animByState.idle }}>
      <div style={{
        position: 'absolute', right: '-26%', top: '38%', width: '60%', height: '22%', borderRadius: 60,
        background: `linear-gradient(90deg, ${colors.sun}F2, ${colors.sun}00)`, filter: 'blur(2px)', transform: 'rotate(-14deg)',
      }} />
      <div style={{
        position: 'absolute', inset: '14%', borderRadius: '50% 50% 46% 54%/56% 50% 50% 44%',
        background: `radial-gradient(circle at 36% 30%, #FFF6D8, ${colors.sun} 55%, #F09A12 100%)`,
        boxShadow: `0 6px 0 rgba(0,0,0,.16), 0 0 ${size * 0.38}px rgba(255,197,49,.85)`,
        opacity: state === 'sleepy' ? 0.55 : 1,
      }} />
      <div style={{ position: 'absolute', top: '36%', left: '32%', width: '10%', height: '15%', borderRadius: '50%', background: colors.ink }} />
      <div style={{ position: 'absolute', top: '36%', right: '32%', width: '10%', height: '15%', borderRadius: '50%', background: colors.ink }} />
      <div style={{
        position: 'absolute', top: '56%', left: '50%', transform: 'translateX(-50%)', width: '20%', height: '10%',
        borderRadius: '0 0 40px 40px', background: colors.ink,
      }} />
    </div>
  );
}
