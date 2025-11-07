import React, { useState, useEffect, useContext, useRef } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get, getDatabase } from 'firebase/database';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

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
  const [showPassword, setShowPassword] = useState(false);

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
      for (const [, user] of Object.entries(usersData)) {
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

  const handleTermsNavigation = () => {
    navigate('/policies/terms');
  };

  return (
    <>
      <style>
        {`
          .login-wrapper {
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

          .login-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 420px;
            gap: 20px;
          }

          .login-form {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            width: 100%;
            box-sizing: border-box;
            position: relative;
          }

          .login-title {
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

          .login-error {
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

          .login-success {
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

          .login-input {
            box-sizing: border-box;
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
            background-color: #f9fafb;
          }

          .login-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            background-color: #ffffff;
          }

          .login-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .password-input-wrapper {
            position: relative;
            width: 100%;
          }

          .password-toggle-btn {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: #6b7280;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
          }

          .password-toggle-btn:hover {
            color: #667eea;
          }

          .password-toggle-btn:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .forgot-password-link {
            color: #667eea;
            cursor: pointer;
            font-size: 0.9rem;
            margin-top: 8px;
            text-decoration: none;
            transition: color 0.2s ease;
            user-select: none;
            display: block;
          }

          .forgot-password-link:hover:not(.disabled) {
            color: #4f46e5;
            text-decoration: underline;
          }

          .forgot-password-link.disabled {
            color: #9ca3af;
            cursor: not-allowed;
          }

          .login-button {
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
            position: relative;
          }

          .login-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          }

          .login-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .switch-login {
            font-size: 0.9rem;
            text-align: center;
            color: #374151;
            margin: 0;
          }

          .switch-login-link {
            color: #667eea;
            cursor: pointer;
            font-weight: 600;
            transition: color 0.2s ease;
            user-select: none;
          }

          .switch-login-link:hover:not(.disabled) {
            color: #4f46e5;
            text-decoration: underline;
          }

          .switch-login-link.disabled {
            color: #9ca3af;
            cursor: not-allowed;
          }

          /* Simple Footer Styles */
          .simple-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            width: 100%;
            max-width: 420px;
            text-align: center;
          }

          .copyright-text {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 400;
            letter-spacing: 0.3px;
          }

          .terms-link {
            color: rgba(255, 255, 255, 0.95);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
            padding: 8px 16px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .terms-link:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.4);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .terms-link:active {
            transform: translateY(0);
          }

          @media (max-width: 480px) {
            .login-wrapper {
              padding: 10px;
            }
            
            .login-form {
              padding: 30px 20px;
              width: 100%;
            }
            
            .login-title {
              font-size: 1.7rem;
            }

            .simple-footer {
              padding: 16px 10px;
              gap: 10px;
            }

            .copyright-text {
              font-size: 0.8rem;
            }

            .terms-link {
              font-size: 0.8rem;
              padding: 6px 12px;
            }
          }

          .login-button:focus,
          .login-input:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
          }
        `}
      </style>

      <div className="login-wrapper">
        <div className="login-container">
          <form onSubmit={handleSubmit} className="login-form">
            <h2 className="login-title">User Login</h2>
            
            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email or PAN</label>
              <input
                type="text"
                id="email"
                placeholder="Enter your email or PAN"
                className="login-input"
                value={email}
                onChange={handleEmailChange}
                disabled={loading || resetLoading}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password or Phone Number (for first-time login)
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter password or phone number"
                  className="login-input"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading || resetLoading}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || resetLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
              
              <p 
                onClick={(resetLoading || loading) ? undefined : handleForgotPassword} 
                className={`forgot-password-link ${(resetLoading || loading) ? 'disabled' : ''}`}
              >
                {resetLoading ? "Sending reset email..." : "Forgot Password?"}
              </p>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading || resetLoading}
            >
              {loading ? 'Processing...' : 'Login'}
            </button>

            <p className="switch-login">
              Are you a trainer?{" "}
              <span
                onClick={handleTrainerLogin}
                className={`switch-login-link ${loading ? 'disabled' : ''}`}
              >
                Trainer Login
              </span>
            </p>
          </form>
        </div>

        {/* Professional Footer Design */}
        <div className="simple-footer">
          <div className="copyright-text">
            © {new Date().getFullYear()} ONDO. All rights reserved.
          </div>
          <span 
            className="terms-link"
            onClick={handleTermsNavigation}
          >
            Terms & Conditions
          </span>
        </div>
      </div>
    </>
  );
};

export default Login;
