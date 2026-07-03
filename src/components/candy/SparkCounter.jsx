import { motion, AnimatePresence } from 'motion/react';
import { colors, fonts } from '../../theme/tokens';
import { IconSpark } from '../icons';

// Persistent Sparks balance readout, with a floating "+N" burst when
// balance increases (mirrors the earn-only economy — Sparks are never
// purchasable, see 200MW_Product_Blueprint.md 2.3).
export default function SparkCounter({ balance, floatAmount, size = '1.3rem' }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: size, color: colors.mintDeep, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <IconSpark size={16} color={colors.mintDeep} /> {balance}
      </span>
      <AnimatePresence>
        {floatAmount != null && (
          <motion.span
            key={floatAmount + '-' + Date.now()}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: '100%',
              marginLeft: 4,
              fontFamily: fonts.display,
              fontWeight: 800,
              color: colors.mint,
              whiteSpace: 'nowrap',
            }}
          >
            +{floatAmount}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
