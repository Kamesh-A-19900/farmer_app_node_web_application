import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './ForgotPassword.module.css';

// No OTP — just redirect to login and contact admin
export default function ForgotPassword() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <button className={styles.backBtn} onClick={() => navigate('/login')}>← Back to Login</button>
        <h2 className={styles.title}>🔑 Forgot Password?</h2>
        <div className={styles.content}>
          <p>If you've forgotten your password, please contact the platform administrator to reset it.</p>
          <p style={{ marginTop: 12 }}>
            <strong>Farmers:</strong> Note your Farmer ID when you register — it's shown on your dashboard.
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>Customers:</strong> Your username is shown in your profile.
          </p>
        </div>
        <Link to="/login">
          <button className={styles.submitBtn}>Back to Login</button>
        </Link>
      </div>
    </div>
  );
}
