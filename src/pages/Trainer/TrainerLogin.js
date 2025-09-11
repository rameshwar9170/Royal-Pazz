import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { auth, db } from "../../firebase/config";

const TrainerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

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
      setError('Email and password/phone number are required');
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
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    setError("");
    setMessage("");

    try {
      // Check if trainer exists in database first
      const trainersRef = ref(db, "HTAMS/company/trainers");
      const snapshot = await get(trainersRef);
      
      let trainerExists = false;
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val();
          if (data.email?.toLowerCase() === email.toLowerCase()) {
            trainerExists = true;
          }
        });
      }

      if (!trainerExists) {
        setError("No trainer account found with this email address.");
        setResetLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      const trainersRef = ref(db, "HTAMS/company/trainers");
      const snapshot = await get(trainersRef);

      if (!snapshot.exists()) {
        setError("No trainers found.");
        setLoading(false);
        return;
      }

      let trainerId = null;
      let trainerData = null;

      snapshot.forEach((child) => {
        const data = child.val();
        if (data.email?.toLowerCase() === email.toLowerCase()) {
          trainerId = child.key;
          trainerData = data;
        }
      });

      if (!trainerId) {
        setError("Trainer email not registered.");
        setLoading(false);
        return;
      }

      // First-time login logic
      if (trainerData.firstTime === undefined || trainerData.firstTime === true) {
        if (trainerData.phone !== password) {
          setError("Invalid phone number for first-time login. Please use your registered phone number.");
          setLoading(false);
          return;
        }

        localStorage.setItem('firstLoginTrainer', JSON.stringify({ 
          trainerId: trainerId, 
          email: email,
          trainerData: trainerData
        }));
        
        setPassword('');
        setLoading(false);
        navigate('/trainer-set-password');
        return;
      }

      // Regular login with Firebase Auth
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (trainerData.active === false) {
          await auth.signOut();
          setError('Your account is deactivated. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // Update last login timestamp
        await update(ref(db, `HTAMS/company/trainers/${trainerId}`), {
          lastLoginAt: new Date().toISOString(),
        });

        // Store trainer data in localStorage
        localStorage.setItem('htamsTrainer', JSON.stringify({ 
          uid: user.uid, 
          trainerId: trainerId,
          ...trainerData,
          role: 'trainer'
        }));

        localStorage.removeItem('firstLoginTrainer');

        setPassword('');
        setLoading(false);
        navigate("/trainer-dashboard");

      } catch (authError) {
        let msg = '';
        switch (authError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            msg = 'Invalid email or password.';
            break;
          case 'auth/too-many-requests':
            msg = 'Too many login attempts. Please try again later.';
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

    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login Error:", err);
      setLoading(false);
    }
  };

  // Navigate to terms page
  const handleTermsNavigation = () => {
    navigate('/policies/terms');
  };

  return (
    <>
      <style>{`
        .trainer-login-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 20px;
          flex-direction: column;
          gap: 20px;
        }

        .trainer-login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
          gap: 20px;
        }

        .trainer-login-form {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          width: 100%;
          box-sizing: border-box;
        }

        .trainer-login-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 30px;
          text-align: center;
          color: #1f2937;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
        }

        .trainer-login-error {
          color: #ef4444;
          margin-bottom: 20px;
          text-align: center;
          font-size: 0.875rem;
          background-color: #fef2f2;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          line-height: 1.4;
        }

        .trainer-login-success {
          color: #10b981;
          margin-bottom: 20px;
          text-align: center;
          font-size: 0.875rem;
          background-color: #ecfdf5;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #a7f3d0;
          line-height: 1.4;
        }

        .trainer-login-input {
          box-sizing: border-box;
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          background-color: #f9fafb;
        }

        .trainer-login-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          background-color: #ffffff;
        }

        .trainer-login-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .forgot-password-link:hover:not([style*="not-allowed"]) {
          color: #4f46e5 !important;
          text-decoration: underline;
        }

        .trainer-login-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px;
          border-radius: 10px;
          border: none;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-bottom: 20px;
        }

        .trainer-login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .trainer-login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .help-text {
          font-size: 0.85rem;
          color: #6b7280;
          text-align: center;
          line-height: 1.5;
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 0 0 20px 0;
        }

        .switch-login {
          font-size: 0.9rem;
          text-align: center;
          color: #374151;
          margin: 0;
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

        @media (max-width: 480px) {
          .trainer-login-wrapper {
            padding: 10px;
          }
          
          .trainer-login-form {
            padding: 30px 20px;
            width: 100%;
          }
          
          .trainer-login-title {
            font-size: 1.7rem;
          }
          
          .help-text {
            font-size: 0.8rem;
            padding: 12px;
          }

          .simple-footer {
            padding: 10px 12px;
          }
        }
      `}</style>

      <div className="trainer-login-wrapper">
        <div className="trainer-login-container">
          {/* Main Login Form */}
          <form onSubmit={handleLogin} className="trainer-login-form">
            <h2 className="trainer-login-title">Trainer Login</h2>
            
            {error && <p className="trainer-login-error">{error}</p>}
            {message && <p className="trainer-login-success">{message}</p>}
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                className="trainer-login-input"
                value={email}
                onChange={handleEmailChange}
                disabled={loading || resetLoading}
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
                className="trainer-login-input"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading || resetLoading}
                required
              />
              
              {/* Enhanced Forgot Password link */}
              <p 
                onClick={resetLoading || loading ? undefined : handleForgotPassword} 
                className="forgot-password-link"
                style={{ 
                  color: (resetLoading || loading) ? "#9ca3af" : "#667eea", 
                  cursor: (resetLoading || loading) ? "not-allowed" : "pointer", 
                  fontSize: "0.9rem", 
                  marginTop: "8px",
                  textDecoration: "none",
                  transition: "color 0.2s ease"
                }}
              >
                {resetLoading ? "Sending reset email..." : "Forgot Password?"}
              </p>
            </div>

            <button
              type="submit"
              className="trainer-login-button"
              disabled={loading || resetLoading}
            >
              {loading ? 'Processing...' : 'Login'}
            </button>

            <p className="switch-login">
              Want to login as another user?{" "}
              <span
                onClick={() => navigate("/login")}
                style={{ color: "#667eea", cursor: "pointer", fontWeight: "600" }}
              >
                Go to Login
              </span>
            </p>
          </form>

          {/* Simple Footer - Only Copyright and Terms */}
          {/* <div className="simple-footer">
            <div className="copyright-text">
              © {new Date().getFullYear()}ONDO. All rights reserved.
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

export default TrainerLogin;
