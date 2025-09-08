import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import bgImage from '../img/email_image_add.jpg'; // Uncomment usage if you want background

const Login = () => {
  // LocalStorage safe retrieval
  let savedFormData = {};
  try {
    savedFormData = JSON.parse(localStorage.getItem('loginFormData')) || {};
  } catch {
    savedFormData = {};
  }

  const [email, setEmail] = useState(savedFormData.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const db = getDatabase();

  // Ref to handle component unmount during async operation
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  // Update localStorage for email, never save sensitive info
  useEffect(() => {
    try {
      localStorage.setItem('loginFormData', JSON.stringify({ email }));
    } catch {}
  }, [email]);

  // Redirect user only with valid user & role, avoid loops
  useEffect(() => {
    if (!currentUser) return;
    let localUser = {};
    try {
      localUser = JSON.parse(localStorage.getItem('htamsUser')) || {};
    } catch {
      localUser = {};
    }
    if (!localUser?.role) return;
    // Only navigate if user has valid role, prevents bouncing
    if (localUser.role === 'trainer') {
      navigate('/trainer-dashboard');
    } else if (['admin', 'Admin', 'company'].includes(localUser.role)) {
      navigate('/company-dashboard');
    } else {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Clear error feedback on input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError('');
    setMessage('');
  };
  
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError('');
    setMessage('');
  };

  const validateInputs = () => {
    if (!email || !password) {
      setError('Email or PAN and password are required');
      return false;
    }
    return true;
  };

  // Enhanced forgot password handler
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first to reset password.");
      return;
    }
    
    // Email format validation (only if it looks like an email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address for password reset.");
      return;
    }

    setResetLoading(true);
    setError("");
    setMessage("");

    try {
      // Check if user exists in database first
      const dbRef = ref(db, 'HTAMS/users');
      const usersSnapshot = await get(dbRef);
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

      let userExists = false;
      let userEmail = null;

      // Find matching user by email
      for (const [uid, user] of Object.entries(usersData)) {
        if (user.email?.toLowerCase() === email.toLowerCase()) {
          userExists = true;
          userEmail = user.email;
          break;
        }
      }

      if (!userExists) {
        setError("No account found with this email address.");
        setResetLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, userEmail);
      setMessage("Password reset email sent! Please check your inbox and spam folder.");
    } catch (err) {
      console.error("Password Reset Error:", err);
      switch (err.code) {
        case 'auth/user-not-found':
          setError("No account found with this email address.");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address format.");
          break;
        case 'auth/too-many-requests':
          setError("Too many requests. Please wait before trying again.");
          break;
        case 'auth/network-request-failed':
          setError("Network error. Please check your connection and try again.");
          break;
        default:
          setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      const dbRef = ref(db, 'HTAMS/users');
      const usersSnapshot = await get(dbRef);
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

      let resolvedEmail = email;
      let uidFromDb = null;
      let userData = null;

      // Find matching user by email or PAN
      for (const [uid, user] of Object.entries(usersData)) {
        if (
          user.email?.toLowerCase() === email.toLowerCase() ||
          user.pan?.toUpperCase() === email.toUpperCase()
        ) {
          resolvedEmail = user.email;
          uidFromDb = uid;
          userData = user;
          break;
        }
      }

      if (!uidFromDb) {
        setError('Access Denied: Email or PAN not registered.');
        setLoading(false);
        return;
      }

      // First-time login with phone
      if (userData.firstTime) {
        if (userData.phone !== password) {
          setError('Invalid phone number for first-time login. Please use your registered phone number.');
          setLoading(false);
          return;
        }
        try {
          await signInWithEmailAndPassword(auth, resolvedEmail, userData.phone);
        } catch {
          // Ignore error; allow progression to password setup step
        }
        localStorage.setItem('firstLoginUser', JSON.stringify({ uid: uidFromDb, email: resolvedEmail }));
        setPassword('');
        setLoading(false);
        navigate('/set-password');
        return;
      }

      // Standard login
      try {
        const userCredential = await signInWithEmailAndPassword(auth, resolvedEmail, password);
        const user = userCredential.user;

        // Deactivated user check
        if (userData.active === false) {
          await auth.signOut();
          setError('Your account is deactivated. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // Remove firstLoginUser if exists, for safety
        localStorage.removeItem('firstLoginUser');
        localStorage.setItem('htamsUser', JSON.stringify({ uid: user.uid, ...userData }));

        // Redirect to proper dashboard
        setPassword('');
        setLoading(false);

        // Role-based navigation
        if (userData.role === 'trainer') {
          navigate('/trainer-dashboard');
        } else if (['admin', 'Admin', 'company'].includes(userData.role)) {
          navigate('/company-dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (authError) {
        let msg = '';
        switch (authError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            msg = 'Invalid credentials.';
            break;
          case 'auth/too-many-requests':
            msg = 'Too many attempts. Try again later.';
            break;
          case 'auth/network-request-failed':
            msg = 'Network error. Please check your connection.';
            break;
          case 'auth/user-disabled':
            msg = 'This account has been disabled.';
            break;
          default:
            msg = `Login failed: ${authError.message}`;
        }
        setError(msg);
        setLoading(false);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Navigate to trainer login
  const handleTrainerLogin = () => {
    navigate('/trainer-login');
  };

  // Navigate to terms page
  const handleTermsNavigation = () => {
    navigate('/policies/terms');
  };

  return (
    <>
      <style>{`
        .login-page-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 20px;
          overflow: auto;
        }

        .login-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.1);
          z-index: 0;
        }

        .login-content-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
          gap: 15px;
        }

        .login-container {
          width: 100%;
          padding: 22px 20px;
          border-radius: 16px;
          background-color: #ffffff;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          box-sizing: border-box;
        }

        .login-title {
          text-align: center;
          font-size: clamp(1.75rem, 5vw, 2rem);
          font-weight: 700;
          color: #1f2937;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 20px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          margin-bottom: 8px;
          font-size: clamp(0.85rem, 3vw, 0.9rem);
          font-weight: 600;
          color: #374151;
        }

        .form-input {
          padding: 14px 16px;
          font-size: clamp(0.95rem, 3vw, 1rem);
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          background-color: #f9fafb;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        }

        .form-input:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }

        .login-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px;
          border-radius: 10px;
          border: none;
          font-size: clamp(1rem, 3vw, 1.1rem);
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 10px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          color: #ef4444;
          font-size: clamp(0.8rem, 3vw, 0.875rem);
          text-align: center;
          font-weight: 600;
          background-color: #fef2f2;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          margin: 0;
          line-height: 1.4;
        }

        .success-message {
          color: #10b981;
          font-size: clamp(0.8rem, 3vw, 0.875rem);
          text-align: center;
          font-weight: 600;
          background-color: #ecfdf5;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #a7f3d0;
          margin: 0;
          line-height: 1.4;
        }

        .forgot-password-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }

        .forgot-password-link {
          font-size: clamp(0.8rem, 3vw, 0.9rem);
          text-decoration: none;
          transition: color 0.2s ease;
          user-select: none;
          font-weight: 500;
        }

        .trainer-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 25px;
          padding: 20px 0;
          border-top: 1px solid #e5e7eb;
          flex-wrap: wrap;
        }

        .trainer-text {
          font-size: clamp(0.8rem, 3vw, 0.9rem);
          color: #6b7280;
          font-weight: 500;
        }

        .trainer-login-link {
          font-size: clamp(0.8rem, 3vw, 0.9rem);
          color: #667eea;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s ease;
          user-select: none;
        }

        .trainer-login-link:hover {
          color: #5a67d8;
        }

        /* Simple Footer Styles */
        .simple-footer {
          width: 100%;
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .copyright-text {
          font-size: clamp(0.75rem, 2.5vw, 0.8rem);
          color: #6b7280;
          margin-bottom: 4px;
        }

        .terms-link {
          font-size: clamp(0.75rem, 2.5vw, 0.8rem);
          color: #667eea;
          text-decoration: underline;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .terms-link:hover {
          color: #5a67d8;
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .login-container {
            padding: 18px 15px;
            border-radius: 12px;
          }

          .login-title {
            margin-bottom: 15px;
          }

          .login-form {
            gap: 15px;
          }

          .form-input {
            padding: 12px 14px;
          }

          .login-button {
            padding: 12px;
          }

          .simple-footer {
            padding: 10px 12px;
          }
        }

        @media (max-width: 350px) {
          .login-container {
            padding: 15px 12px;
          }

          .trainer-section {
            flex-direction: column;
            gap: 8px;
          }
        }

        @media (max-height: 700px) and (orientation: landscape) {
          .login-page-wrapper {
            padding: 10px;
            justify-content: flex-start;
            padding-top: 20px;
          }

          .login-content-wrapper {
            gap: 10px;
          }
        }
      `}</style>

      <div className="login-page-wrapper">
        <div className="login-overlay" />
        
        <div className="login-content-wrapper">
          {/* Main Login Form */}
          <div className="login-container">
            <h2 className="login-title">User Login</h2>
            
            <form onSubmit={handleSubmit} className="login-form">
              {error && <p className="error-message">{error}</p>}
              {message && <p className="success-message">{message}</p>}
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email or PAN</label>
                <input
                  type="text"
                  id="email"
                  placeholder="Enter your email or PAN"
                  value={email}
                  onChange={handleEmailChange}
                  className="form-input"
                  disabled={loading || resetLoading}
                  autoComplete="username"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password or Phone Number (for first-time login)
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter password or phone number"
                  value={password}
                  onChange={handlePasswordChange}
                  className="form-input"
                  disabled={loading || resetLoading}
                  autoComplete="current-password"
                  required
                />
                
                <div className="forgot-password-container">
                  <span 
                    onClick={resetLoading || loading ? undefined : handleForgotPassword} 
                    className="forgot-password-link"
                    style={{
                      color: (resetLoading || loading) ? "#9ca3af" : "#4285f4",
                      cursor: (resetLoading || loading) ? "not-allowed" : "pointer",
                      pointerEvents: (resetLoading || loading) ? "none" : "auto"
                    }}
                  >
                    {resetLoading ? "Sending reset email..." : "Forgot Password?"}
                  </span>
                </div>
              </div>
              
              <button type="submit" className="login-button" disabled={loading || resetLoading}>
                {loading ? 'Processing...' : 'Login'}
              </button>
            </form>
            
            {/* Trainer Login Section */}
            <div className="trainer-section">
              <span className="trainer-text">Are you a trainer? </span>
              <span 
                onClick={handleTrainerLogin}
                className="trainer-login-link"
              >
                Trainer Login
              </span>
            </div>
          </div>

          {/* Simple Footer - Only Copyright and Terms */}
          {/* <div className="simple-footer">
            <div className="copyright-text">
              © {new Date().getFullYear()} Panchgiri Ayurveda. All rights reserved.
            </div>
            <span 
              className="terms-link"
              onClick={handleTermsNavigation}
            >
              Terms & Conditions
            </span>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default Login;
