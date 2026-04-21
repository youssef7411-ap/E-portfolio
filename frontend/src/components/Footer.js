import React from 'react';
import '../styles/Footer.css';

const Footer = ({ darkMode, content, isAdminRoute = false }) => {
  const footerContent = {
    signature: "Youssef's Portfolio",
    copy: isAdminRoute ? 'Admin Workspace' : 'Learning Showcase',
    ...content
  };

  return (
    <footer className={`global-footer ${isAdminRoute ? 'global-footer-admin' : 'global-footer-user'}`}>
      <div className="container">
        <div className="footer-content">
          <strong className="footer-brand">{footerContent.signature}</strong>
          <p className="footer-copy">&copy; {new Date().getFullYear()} {footerContent.copy}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
