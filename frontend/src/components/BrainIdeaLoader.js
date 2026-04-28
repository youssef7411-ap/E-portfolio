import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import '../styles/BrainIdeaLoader.css';

/**
 * Brain / Idea Build – Single Loading Animation (Final Version)
 *
 * Academic-themed loading animation that visualizes the "building of an academic space"
 * through connected dots forming a knowledge structure that transforms into subject cards.
 *
 * Animation Phases:
 * 1. Start State - Dark overlay with academic header text
 * 2. Dot Formation - 5-10 glowing dots appear with calm floating motion
 * 3. Connection Phase - Thin elegant lines connect dots gradually
 * 4. Structure Formation - Dots reshape into Subjects/Projects/Skills layout
 * 5. Transformation into UI - Subject cards with images appear
 * 6. Header & Layout Reveal - Header and sections appear
 * 7. Final Reveal - All elements finalize with smooth fade-in
 *
 * Total duration: 2.5 – 3.5 seconds max
 */
const BrainIdeaLoader = ({ onComplete }) => {
  const [phase, setPhase] = useState('start'); // 'start' → 'dots' → 'connecting' → 'structuring' → 'transforming' → 'revealing' → 'complete'
  const [dots, setDots] = useState([]);
  const [connections, setConnections] = useState([]);
  const [mindMapStructure, setMindMapStructure] = useState(null);
  const [subjectCards, setSubjectCards] = useState([]);

  const { subjects } = useSelector((state) => state.portfolio);

  // Initialize dots with calm positions
  useEffect(() => {
    const initialDots = Array.from({ length: 7 }, (_, i) => ({
      id: i,
      x: 40 + Math.sin(i * 0.9) * 25, // Calm circular distribution
      y: 40 + Math.cos(i * 0.9) * 20,
      connected: false,
      glow: false
    }));
    setDots(initialDots);

    // Start animation sequence with academic timing
    const sequence = async () => {
      // Phase 1: Start (400ms)
      setPhase('start');
      await new Promise(resolve => setTimeout(resolve, 400));

      // Phase 2: Dots appear (600ms)
      setPhase('dots');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Phase 3: Connection phase (800ms)
      setPhase('connecting');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Phase 4: Structure formation (700ms)
      setPhase('structuring');
      setMindMapStructure({
        subjects: { x: 25, y: 40, label: 'Subjects' },
        projects: { x: 75, y: 40, label: 'Projects' },
        skills: { x: 50, y: 75, label: 'Skills' }
      });
      await new Promise(resolve => setTimeout(resolve, 700));

      // Phase 5: Transform into subject cards (600ms)
      setPhase('transforming');
      // Prepare subject cards for display
      const cards = subjects.slice(0, 5).map((subject, index) => ({
        ...subject,
        displayX: 20 + (index * 15), // Spread across screen
        displayY: 50
      }));
      setSubjectCards(cards);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Phase 6: Header & Layout reveal (500ms)
      setPhase('revealing');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Phase 7: Complete
      setPhase('complete');
      if (onComplete) onComplete();
    };

    sequence();
  }, [onComplete, subjects]);

  // Handle connections during connecting phase with academic timing
  useEffect(() => {
    if (phase === 'connecting') {
      const connectionSequence = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], // Outer connections
        [0, 3], [1, 4], [2, 5], [3, 6], [4, 0], [5, 1], [6, 2]  // Inner connections
      ];

      connectionSequence.forEach(([from, to], index) => {
        setTimeout(() => {
          setConnections(prev => [...prev, { from, to }]);
          setDots(prev => prev.map(dot =>
            dot.id === from || dot.id === to
              ? { ...dot, connected: true, glow: true }
              : dot
          ));
        }, index * 100); // Slower, more elegant timing
      });
    }
  }, [phase]);

  return (
    <motion.div
      className="brain-idea-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background Blur Overlay */}
      <motion.div
        className="loader-background"
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{
          opacity: phase !== 'complete' ? 1 : 0,
          backdropFilter: phase !== 'complete' ? 'blur(12px)' : 'blur(0px)'
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Academic Header Text */}
      <AnimatePresence>
        {phase === 'start' && (
          <motion.div
            className="academic-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="academic-title">Building your academic space...</h1>
            <p className="academic-subtitle">Structuring your learning dashboard...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Dots */}
      <AnimatePresence>
        {(phase === 'dots' || phase === 'connecting' || phase === 'structuring') && (
          <div className="dots-container">
            {dots.map((dot, index) => (
              <motion.div
                key={dot.id}
                className={`floating-dot ${dot.glow ? 'glowing' : ''} ${dot.connected ? 'connected' : ''}`}
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: phase === 'structuring' && mindMapStructure ? 0 : 1,
                  opacity: phase === 'structuring' && mindMapStructure ? 0 : 1,
                  x: phase === 'structuring' && mindMapStructure ?
                    (dot.id < 2 ? mindMapStructure.subjects.x - dot.x :
                     dot.id < 4 ? mindMapStructure.projects.x - dot.x :
                     mindMapStructure.skills.x - dot.x) : 0,
                  y: phase === 'structuring' && mindMapStructure ?
                    (dot.id < 2 ? mindMapStructure.subjects.y - dot.y :
                     dot.id < 4 ? mindMapStructure.projects.y - dot.y :
                     mindMapStructure.skills.y - dot.y) : 0,
                }}
                transition={{
                  duration: phase === 'structuring' ? 0.8 : 0.4,
                  delay: phase === 'dots' ? index * 0.15 : 0,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Connection Lines */}
      <AnimatePresence>
        {phase === 'connecting' && (
          <svg className="connections-container" viewBox="0 0 100 100">
            {connections.map(({ from, to }, index) => {
              const fromDot = dots[from];
              const toDot = dots[to];
              if (!fromDot || !toDot) return null;

              return (
                <motion.line
                  key={`${from}-${to}`}
                  x1={`${fromDot.x}%`}
                  y1={`${fromDot.y}%`}
                  x2={`${toDot.x}%`}
                  y2={`${toDot.y}%`}
                  stroke="#3b82f6"
                  strokeWidth="0.15"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.7 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              );
            })}
          </svg>
        )}
      </AnimatePresence>

      {/* Mind Map Structure Labels */}
      <AnimatePresence>
        {phase === 'structuring' && mindMapStructure && (
          <div className="mind-map-labels">
            {Object.entries(mindMapStructure).map(([key, data], index) => (
              <motion.div
                key={key}
                className="mind-map-node"
                style={{
                  left: `${data.x}%`,
                  top: `${data.y}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className="node-circle" />
                <span className="node-label">{data.label}</span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Subject Cards Transformation */}
      <AnimatePresence>
        {(phase === 'transforming' || phase === 'revealing') && subjectCards.length > 0 && (
          <div className="subject-cards-container">
            {subjectCards.map((subject, index) => (
              <motion.div
                key={subject._id || index}
                className="subject-card"
                style={{
                  left: `${subject.displayX}%`,
                  top: `${subject.displayY}%`,
                }}
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{
                  scale: phase === 'revealing' ? 0.8 : 1,
                  opacity: phase === 'revealing' ? 0.7 : 1,
                  y: phase === 'revealing' ? 0 : 0
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: 'easeOut'
                }}
              >
                <div className="subject-card-image">
                  {subject.image ? (
                    <img src={subject.image} alt={subject.name} />
                  ) : (
                    <div className="subject-card-placeholder">
                      <span>{subject.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="subject-card-overlay" />
                </div>
                <div className="subject-card-title">
                  {subject.name}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Loading Text */}
      <AnimatePresence>
        {phase !== 'complete' && (
          <motion.div
            className="loading-text-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.h2
              className="loading-text"
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              {phase === 'start' && 'Initializing academic space...'}
              {phase === 'dots' && 'Gathering knowledge points...'}
              {phase === 'connecting' && 'Building connections...'}
              {phase === 'structuring' && 'Organizing subjects...'}
              {phase === 'transforming' && 'Creating subject cards...'}
              {phase === 'revealing' && 'Finalizing dashboard...'}
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout Preview (during revealing phase) */}
      <AnimatePresence>
        {phase === 'revealing' && (
          <motion.div
            className="layout-preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.2, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="preview-header" />
            <div className="preview-content">
              <div className="preview-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="preview-card" />
                ))}
              </div>
            </div>
            <div className="preview-footer" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BrainIdeaLoader;