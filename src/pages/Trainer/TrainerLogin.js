import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { auth, db } from "../../firebase/config";
import { FaEye, FaEyeSlash } from 'react-icons/fa';


const TrainerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isMounted = useRef(true);
  const isProcessingRef = useRef(false);
  const lastClickTime = useRef(0);
  
  useEffect(() => {
    // Check existing session without flash
    const checkExistingSession = async () => {
      const existingTrainer = localStorage.getItem('htamsTrainer');
      if (existingTrainer) {
        try {
          const trainerData = JSON.parse(existingTrainer);
          if (trainerData && trainerData.trainerId) {
            console.log('Existing session found, redirecting...');
            setIsNavigating(true);
            setProgress(100);
            setTimeout(() => {
              navigate('/trainer-dashboard', { replace: true });
            }, 100);
            return;
          }
        } catch (err) {
          console.error('Invalid stored trainer data, clearing localStorage');
          localStorage.removeItem('htamsTrainer');
        }
      }
    };

    checkExistingSession();
    
    return () => { 
      isMounted.current = false; 
    };
  }, [navigate]);

  // Smooth progress animation
  useEffect(() => {
    if (loading || isNavigating) {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress >= 90) {
          currentProgress = 90;
          clearInterval(interval);
        }
        setProgress(currentProgress);
      }, 200);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [loading, isNavigating]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value.trim());
    setError('');
    setMessage('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value.trim());
    setError('');
    setMessage('');
  };

  const validateInputs = () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password/phone number are required');
      return false;
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email first to reset password.");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    setError("");
    setMessage("");

    try {
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
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent! Please check your inbox and spam folder.");
    } catch (err) {
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
      if (isMounted.current) {
        setResetLoading(false);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    const currentTime = Date.now();
    if (currentTime - lastClickTime.current < 1000) {
      console.log('Double click prevented');
      return;
    }
    lastClickTime.current = currentTime;
    
    if (loading || isProcessingRef.current || isNavigating) {
      console.log('Login already in progress');
      return;
    }

    if (!validateInputs()) {
      return;
    }

    console.log('Starting login process...');
    isProcessingRef.current = true;
    setLoading(true);
    setError("");
    setMessage("");
    setProgress(10);

    try {
      setProgress(30);
      console.log('Fetching trainers data...');
      const trainersSnapshot = await get(ref(db, "HTAMS/company/trainers"));

      if (!trainersSnapshot.exists()) {
        throw new Error("No trainers found in database.");
      }

      let trainerId = null;
      let trainerData = null;

      setProgress(50);
      trainersSnapshot.forEach((child) => {
        const data = child.val();
        if (data.email?.toLowerCase() === email.trim().toLowerCase()) {
          trainerId = child.key;
          trainerData = data;
          return true;
        }
      });

      if (!trainerId) {
        throw new Error("Trainer email not registered.");
      }

      if (trainerData.active === false) {
        throw new Error('Your account is deactivated. Please contact the administrator.');
      }

      console.log('Trainer found:', trainerId);
      setProgress(70);

      // First-time login
      if (trainerData.firstTime === true || trainerData.firstTime === undefined) {
        if (trainerData.phone !== password.trim()) {
          throw new Error("Invalid phone number for first-time login. Please use your registered phone number as password.");
        }

        console.log('First-time login detected, preparing navigation...');
        
        localStorage.setItem('firstLoginTrainer', JSON.stringify({ 
          trainerId: trainerId, 
          email: email.trim(),
          trainerData: trainerData
        }));
        
        setProgress(100);
        setIsNavigating(true);
        setTimeout(() => {
          navigate('/trainer-set-password', { replace: true });
        }, 300);
        return;
      }

      // Regular login
      if (trainerData.uid) {
        console.log('Regular login with Firebase Auth...');
        setProgress(80);
        
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        
        console.log('Firebase authentication successful');
        setProgress(90);
        
        const userData = { 
          uid: userCredential.user.uid,
          trainerId: trainerId,
          ...trainerData,
          role: 'trainer',
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('htamsTrainer', JSON.stringify(userData));
        
        console.log('Trainer data stored, preparing navigation...');
        
        // Update last login (don't wait)
        update(ref(db, `HTAMS/company/trainers/${trainerId}`), {
          lastLoginAt: new Date().toISOString(),
        }).catch(err => console.error('Failed to update last login:', err));

        console.log('Navigating to dashboard...');
        setProgress(100);
        setIsNavigating(true);
        
        setTimeout(() => {
          navigate("/trainer-dashboard", { replace: true });
        }, 300);
        
      } else {
        throw new Error("Please complete your password setup first. Use your phone number as password for first-time login.");
      }

    } catch (err) {
      console.error('Login error:', err);
      
      let errorMessage = '';
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many login attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email format.';
            break;
          case 'auth/missing-password':
            errorMessage = 'Password is required.';
            break;
          default:
            errorMessage = `Authentication failed: ${err.message}`;
        }
      } else {
        errorMessage = err.message || "An error occurred. Please try again.";
      }
      
      setError(errorMessage);
      setProgress(0);
    } finally {
      if (isMounted.current && !isNavigating) {
        console.log('Login process completed');
        setLoading(false);
        isProcessingRef.current = false;
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && !isNavigating) {
      handleLogin(e);
    }
  };

  // Show loading overlay during navigation - NO BLINK
  if (isNavigating) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        flexDirection: 'column',
        gap: '1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 9999
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '5px solid rgba(255,255,255,0.3)',
          borderTop: '5px solid white',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <p style={{ 
          fontSize: '1.2rem', 
          fontWeight: '600',
          textAlign: 'center',
          margin: 0
        }}>
          Logging in...
        </p>
        <div style={{
          width: '200px',
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'white',
            transition: 'width 0.3s ease',
            borderRadius: '2px'
          }}></div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            overflow-x: hidden;
          }
          
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
            position: relative;
            width: 100%;
          }

          /* Progress Bar at Top */
          .login-progress-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            z-index: 10000;
            overflow: hidden;
          }

          .login-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
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
            position: relative;
            transform: none;
            transition: none;
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
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
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

          .forgot-password-link {
            color: #667eea;
            cursor: pointer;
            font-size: 0.9rem;
            margin-top: 8px;
            text-decoration: none;
            transition: color 0.15s ease;
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
            transition: opacity 0.15s ease, transform 0.15s ease;
            margin-bottom: 20px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }

          .trainer-login-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          }

          .trainer-login-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
            pointer-events: none;
          }

          .button-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
            transition: color 0.15s ease;
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
          }

          .trainer-login-button:focus,
          .trainer-login-input:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
          }
        `}
      </style>

      {/* Top Progress Bar */}
      {(loading || progress > 0) && (
        <div className="login-progress-bar">
          <div 
            className="login-progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <div className="trainer-login-wrapper">
        <div className="trainer-login-container">
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
                onKeyDown={handleKeyDown}
                disabled={loading || resetLoading || isNavigating}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password or Phone Number (for first-time login)
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter password or phone number"
                  className="trainer-login-input"
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading || resetLoading || isNavigating}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || resetLoading || isNavigating}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
              
              <p 
                onClick={(resetLoading || loading || isNavigating) ? undefined : handleForgotPassword} 
                className={`forgot-password-link ${(resetLoading || loading || isNavigating) ? 'disabled' : ''}`}
              >
                {resetLoading ? "Sending reset email..." : "Forgot Password?"}
              </p>
            </div>

            <button
              type="submit"
              className="trainer-login-button"
              disabled={loading || resetLoading || isNavigating}
            >
              {loading && <div className="button-spinner"></div>}
              {loading ? 'Processing...' : isNavigating ? 'Redirecting...' : 'Login'}
            </button>

            <p className="switch-login">
              Want to login as another user?{" "}
              <span
                onClick={() => !loading && !isNavigating && navigate("/login")}
                className={`switch-login-link ${(loading || isNavigating) ? 'disabled' : ''}`}
              >
                Go to Login
              </span>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default TrainerLogin;
