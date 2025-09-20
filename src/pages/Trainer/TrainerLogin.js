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
  const isProcessingRef = useRef(false);
  
  useEffect(() => () => { 
    isMounted.current = false; 
  }, []);

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
    
    if (loading || isProcessingRef.current) {
      return;
    }

    if (!validateInputs()) {
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Batch operations to reduce database calls
      const [trainersSnapshot] = await Promise.all([
        get(ref(db, "HTAMS/company/trainers"))
      ]);

      if (!trainersSnapshot.exists()) {
        throw new Error("No trainers found in database.");
      }

      let trainerId = null;
      let trainerData = null;

      // More efficient lookup
      trainersSnapshot.forEach((child) => {
        const data = child.val();
        if (data.email?.toLowerCase() === email.trim().toLowerCase()) {
          trainerId = child.key;
          trainerData = data;
          return true; // Exit early when found
        }
      });

      if (!trainerId) {
        throw new Error("Trainer email not registered.");
      }

      // First-time login logic
      if (trainerData.firstTime === undefined || trainerData.firstTime === true) {
        if (trainerData.phone !== password.trim()) {
          throw new Error("Invalid phone number for first-time login. Please use your registered phone number.");
        }

        localStorage.setItem('firstLoginTrainer', JSON.stringify({ 
          trainerId: trainerId, 
          email: email.trim(),
          trainerData: trainerData
        }));
        
        navigate('/trainer-set-password');
        return;
      }

      // Parallel execution for Firebase auth and data preparation
      const [userCredential] = await Promise.all([
        signInWithEmailAndPassword(auth, email.trim(), password.trim())
      ]);
      
      const user = userCredential.user;

      if (trainerData.active === false) {
        await auth.signOut();
        throw new Error('Your account is deactivated. Please contact the administrator.');
      }

      // Prepare user data and update login timestamp in parallel
      const userData = { 
        uid: user.uid, 
        trainerId: trainerId,
        ...trainerData,
        role: 'trainer'
      };
      
      // Execute storage operations and database update in parallel
      await Promise.all([
        // Store trainer data in localStorage (synchronous but wrapped for consistency)
        Promise.resolve(localStorage.setItem('ONDOTrainer', JSON.stringify(userData))),
        Promise.resolve(localStorage.removeItem('firstLoginTrainer')),
        // Update last login timestamp
        update(ref(db, `HTAMS/company/trainers/${trainerId}`), {
          lastLoginAt: new Date().toISOString(),
        })
      ]);

      // Immediate navigation without timeout
      navigate("/trainer-dashboard", { replace: true });

    } catch (err) {
      let errorMessage = '';
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
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
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isProcessingRef.current = false;
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e);
    }
  };

  return (
    <>
      <style>
        {`
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
            position: relative;
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
            position: relative;
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
                disabled={loading || resetLoading}
                required
                autoComplete="email"
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
                onKeyDown={handleKeyDown}
                disabled={loading || resetLoading}
                required
                autoComplete="current-password"
              />
              
              <p 
                onClick={(resetLoading || loading) ? undefined : handleForgotPassword} 
                className={`forgot-password-link ${(resetLoading || loading) ? 'disabled' : ''}`}
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
                onClick={() => !loading && navigate("/login")}
                className={`switch-login-link ${loading ? 'disabled' : ''}`}
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
