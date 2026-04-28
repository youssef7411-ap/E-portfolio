import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BrainIdeaLoader from './BrainIdeaLoader';
import '../styles/TransitionWrapper.css';

/**
 * Seamless Transition Wrapper
 *
 * Integrates the Brain/Idea Build animation with dashboard reveal.
 * Creates a cinematic morphing effect from loading to final UI.
 *
 * First-time visitor flow:
 * - Check sessionStorage for hasVisited flag
 * - If not set: show Brain/Idea Build animation
 * - Set flag and transition to dashboard
 * - On refresh/navigation: skip animation, show dashboard directly
 */
const TransitionWrapper = ({ children, onTransitionComplete }) => {
  const [transitionPhase, setTransitionPhase] = useState('checking'); // 'checking' → 'brain' → 'morphing' → 'complete'
  const wrapperRef = useRef(null);
  const [shouldShowBrainLoader, setShouldShowBrainLoader] = useState(false);

  useEffect(() => {
    // Check if user has already visited in this session
    const hasVisited = sessionStorage.getItem('hasVisited');

    if (hasVisited) {
      // User has visited, skip brain loader and go directly to content
      setTransitionPhase('complete');
    } else {
      // First time visitor, show brain loader
      sessionStorage.setItem('hasVisited', 'true');
      setShouldShowBrainLoader(true);
      setTransitionPhase('brain');
    }
  }, []);

  const handleBrainLoaderComplete = () => {
    setTransitionPhase('morphing');

    // After brief morphing animation, complete transition
    setTimeout(() => {
      setTransitionPhase('complete');
      if (onTransitionComplete) onTransitionComplete();
    }, 800);
  };

  return (
    <div className="transition-wrapper" ref={wrapperRef}>
      {/* Brain/Idea Loader - Integrated Phase (First-time visitors only) */}
      {shouldShowBrainLoader && transitionPhase !== 'complete' && (
        <motion.div
          className="brain-loader-container"
          initial={{ opacity: 1, scale: 1 }}
          animate={
            transitionPhase === 'brain'
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.98 }
          }
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <BrainIdeaLoader onComplete={handleBrainLoaderComplete} />
        </motion.div>
      )}

      {/* Dashboard Content - Reveal Phase */}
      <motion.div
        className="content-container"
        initial={{ opacity: shouldShowBrainLoader ? 0 : 1, y: shouldShowBrainLoader ? 30 : 0 }}
        animate={
          transitionPhase === 'morphing' || transitionPhase === 'complete'
            ? { opacity: 1, y: 0 }
            : { opacity: shouldShowBrainLoader ? 0 : 1, y: shouldShowBrainLoader ? 30 : 0 }
        }
        transition={{ duration: 0.8, ease: 'easeOut', delay: transitionPhase === 'morphing' ? 0.2 : 0 }}
      >
        {children}
      </motion.div>

      {/* Morphing Overlay - Smooth Transition Effect */}
      {shouldShowBrainLoader && transitionPhase === 'morphing' && (
        <motion.div
          className="morphing-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}
    </div>
  );
};

export default TransitionWrapper;
