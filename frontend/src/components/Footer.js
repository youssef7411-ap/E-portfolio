import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = ({ isAdminRoute = false }) => {
  return (
    <footer className={`global-footer ${isAdminRoute ? 'global-footer-admin' : 'global-footer-user'}`}>
      <div className="container footer-container">
        <div className="footer-left">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Youssef's Portfolio.
          </p>
        </div>

        <div className="footer-right">
          <nav className="footer-nav">
            <Link to="/admin/login">Admin</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
