import React from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';

const ForgotPasswordPage = () => (
  <div className="auth-page">
    <div className="auth-card">
      <div className="auth-card__logo">
        <span className="auth-card__logo-pb">PB</span>
        <span className="auth-card__logo-amp">&amp;</span>
        <span className="auth-card__logo-jay">Jay</span>
      </div>
      <p className="auth-card__subtitle">Password reset</p>
      <p className="auth-card__body">
        Email-based password reset is coming soon. For now, contact the site owner
        to reset your account.
      </p>
      <p className="auth-card__footer">
        <Link to="/login" className="auth-link">Back to sign in</Link>
      </p>
    </div>
  </div>
);

export default ForgotPasswordPage;
