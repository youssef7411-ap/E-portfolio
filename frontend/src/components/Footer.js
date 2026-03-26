import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../styles/Footer.css';

const Footer = ({ darkMode }) => {
  const prefersReducedMotion = useReducedMotion();

  const signatureVariants = {
    hidden: { strokeDashoffset: 4500, fill: 'transparent' },
    draw: { 
      strokeDashoffset: 0, 
      transition: { 
        duration: 1.2, 
        ease: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        times: [0, 1]
      } 
    },
    fill: { 
      fill: 'currentColor', 
      transition: { duration: 0.4, ease: "easeOut" } 
    }
  };

  return (
    <motion.footer 
      className="global-footer" 
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.45, ease: "easeOut" }}
    >
      <div className="container">
        <div className="footer-content">
          <motion.div 
            className="footer-signature"
            variants={signatureVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'fill'}
          >
            <svg viewBox="0 0 500 100" className="cursive-svg">
              <text
                x="50%"
                y="70%"
                textAnchor="middle"
                fontFamily="var(--font-cursive)"
                fontSize="70"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4500"
                strokeDashoffset="4500"
              >
                Curated by Youssef
              </text>
            </svg>
          </motion.div>
          
          <p className="footer-copy">
            Curated by Youssef · &copy; {new Date().getFullYear()} E-Portfolio
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
