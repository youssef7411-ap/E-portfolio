import React from 'react';
import '../styles/Footer.css';

const Footer = ({ darkMode, content }) => {
  const footerContent = {
    signature: 'Curated by Youssef',
    copy: 'E-Portfolio',
    ...content
  };

  return (
    <footer className="global-footer">
      <div className="container">
        <div className="footer-content">
          <p className="footer-copy">
            {footerContent.signature} · &copy; {new Date().getFullYear()} {footerContent.copy}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
