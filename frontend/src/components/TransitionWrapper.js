import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MagazineIntro from './MagazineIntro';
import '../styles/TransitionWrapper.css';

/**
 * Seamless Transition Wrapper
 * 
 * Integrates the WebGL magazine animation with dashboard reveal.
 * Creates a cinematic morphing effect from loading to final UI.
 */
const TransitionWrapper = ({ children, onTransitionComplete }) => {
  const [transitionPhase, setTransitionPhase] = useState('magazine'); // 'magazine' → 'morphing' → 'complete'
  const wrapperRef = useRef(null);

  const handleMagazineComplete = () => {
    setTransitionPhase('morphing');
    
    // After brief morphing animation, complete transition
    setTimeout(() => {
      setTransitionPhase('complete');
      if (onTransitionComplete) onTransitionComplete();
    }, 1200);
  };

  return (
    <div className="transition-wrapper" ref={wrapperRef}>
      {/* Magazine Intro - Integrated Phase */}
      {transitionPhase !== 'complete' && (
        <motion.div 
          className="magazine-container"
          initial={{ opacity: 1, scale: 1 }}
          animate={
            transitionPhase === 'magazine' 
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.95 }
          }
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <MagazineIntro onComplete={handleMagazineComplete} />
        </motion.div>
      )}

      {/* Dashboard Content - Reveal Phase */}
      <motion.div 
        className="content-container"
        initial={{ opacity: 0, y: 40 }}
        animate={
          transitionPhase === 'morphing' || transitionPhase === 'complete'
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 40 }
        }
        transition={{ duration: 1.2, ease: 'easeOut', delay: transitionPhase === 'morphing' ? 0.2 : 0 }}
      >
        {children}
      </motion.div>

      {/* Morphing Overlay - Smooth Transition Effect */}
      {transitionPhase === 'morphing' && (
        <motion.div 
          className="morphing-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}
    </div>
  );
};

export default TransitionWrapper;
