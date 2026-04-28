import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MagazineIntro from './MagazineIntro';
import '../styles/TransitionWrapper.css';

/**
 * Seamless Transition Wrapper
 * 
 * Integrates the WebGL magazine animation with dashboard reveal.
 * Creates a cinematic morphing effect from loading to final UI.
 * 
 * First-time visitor flow:
 * - Check sessionStorage for hasVisited flag
 * - If not set: show WebGL magazine animation
 * - Set flag and transition to dashboard
 * - On refresh/navigation: skip magazine, show dashboard directly
 */
const TransitionWrapper = ({ children, onTransitionComplete }) => {
  const [transitionPhase, setTransitionPhase] = useState('checking'); // 'checking' → 'magazine' → 'morphing' → 'complete'
  const wrapperRef = useRef(null);
  const [shouldShowMagazine, setShouldShowMagazine] = useState(false);

  useEffect(() => {
    // Check if user has already visited in this session
    const hasVisited = sessionStorage.getItem('hasVisited');
    
    if (hasVisited) {
      // User has visited, skip magazine and go directly to content
      setTransitionPhase('complete');
    } else {
      // First time visitor, show magazine
      sessionStorage.setItem('hasVisited', 'true');
      setShouldShowMagazine(true);
      setTransitionPhase('magazine');
    }
  }, []);

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
      {/* Magazine Intro - Integrated Phase (First-time visitors only) */}
      {shouldShowMagazine && transitionPhase !== 'complete' && (
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
        initial={{ opacity: shouldShowMagazine ? 0 : 1, y: shouldShowMagazine ? 40 : 0 }}
        animate={
          transitionPhase === 'morphing' || transitionPhase === 'complete'
            ? { opacity: 1, y: 0 }
            : { opacity: shouldShowMagazine ? 0 : 1, y: shouldShowMagazine ? 40 : 0 }
        }
        transition={{ duration: 1.2, ease: 'easeOut', delay: transitionPhase === 'morphing' ? 0.2 : 0 }}
      >
        {children}
      </motion.div>

      {/* Morphing Overlay - Smooth Transition Effect */}
      {shouldShowMagazine && transitionPhase === 'morphing' && (
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
