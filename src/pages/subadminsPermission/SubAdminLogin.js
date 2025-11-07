import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser, FiArrowLeft } from "react-icons/fi";

const SubAdminLogin = () => {
  const [emailOrPan, setEmailOrPan] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPan, setIsPan] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate inputs
    if (!emailOrPan.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);

    try {
      const auth = getAuth();
      const db = getDatabase();

      let loginEmail = emailOrPan;

      // 🔑 Support login with PAN number
      if (!emailOrPan.includes("@")) {
        setIsPan(true);
        const usersRef = ref(db, "HTAMS/users");
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          let foundEmail = null;
          let foundUser = null;
          
          snapshot.forEach((child) => {
            const userData = child.val();
            if (userData.pan === emailOrPan) {
              foundEmail = userData.email;
              foundUser = userData;
            }
          });
          
          if (!foundEmail) throw new Error("PAN number not found");
          if (foundUser && foundUser.status === "inactive") {
            throw new Error("Account is deactivated. Please contact administrator.");
          }
          
          loginEmail = foundEmail;
        } else {
          throw new Error("PAN number not found");
        }
      }

      // 🔐 Sign in
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        password
      );

      const uid = userCredential.user.uid;
      const userRef = ref(db, `HTAMS/users/${uid}`);
      const userSnap = await get(userRef);

      if (!userSnap.exists()) throw new Error("User data not found");
      const userData = userSnap.val();

      // Check if account is active
      if (userData.status === "inactive") {
        throw new Error("Account is deactivated. Please contact administrator.");
      }

      if (userData.role !== "subadmin") {
        throw new Error("Access denied! Only SubAdmins can login here.");
      }

      // ✅ Redirect to SubAdmin Dashboard
      navigate("/subadmin");
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", "").replace("Error", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Navigate to terms page
  const handleTermsNavigation = () => {
    navigate('/policies/terms');
  };

  return (
    <>
      <style jsx>{`
        .login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

        .login-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #4a5568;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
          margin-top: 10px;
        }

        .login-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: white;
          font-size: 24px;
        }

        .login-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 8px;
        }

        .login-header p {
          color: #718096;
          margin: 0;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .error-message {
          background: #fef2f2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          border: 1px solid #fecaca;
        }

        .error-icon {
          background: #ef4444;
          color: white;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: #a0aec0;
          font-size: 18px;
          z-index: 1;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .input-wrapper input.error {
          border-color: #ef4444;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .password-toggle:hover {
          color: #4a5568;
        }

        .login-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
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

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .login-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .login-footer p {
          color: #718096;
          font-size: 14px;
          margin: 0;
        }

        .help-link {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          text-decoration: underline;
          font-size: 14px;
        }

        .help-link:hover {
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .login-wrapper {
            padding: 10px;
          }

          .login-card {
            padding: 24px;
            margin: 10px;
          }

          .login-header h2 {
            font-size: 20px;
          }

          .input-wrapper input {
            padding: 10px 10px 10px 36px;
            font-size: 14px;
          }

          .input-icon {
            font-size: 16px;
            left: 10px;
          }

          .login-button {
            padding: 12px;
            font-size: 14px;
          }

          .back-button {
            top: 15px;
            left: 15px;
            padding: 6px 10px;
            font-size: 12px;
          }

          .simple-footer {
            padding: 10px 12px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .login-button, .back-button {
            transition: none;
          }

          .spinner {
            animation: none;
          }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-container">
          {/* Main Login Form */}
          <div className="login-card">
            <div className="login-header">
              <div className="login-icon">
                <FiUser />
              </div>
              <h2>SubAdmin Login</h2>
              <p>Access your administrator dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              {error && (
                <div className="error-message" role="alert">
                  <span className="error-icon">!</span>
                  {error}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="emailOrPan">
                  {isPan ? "PAN Number" : "Email or PAN Number"}
                </label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    id="emailOrPan"
                    type="text"
                    placeholder={isPan ? "Enter PAN number" : "Enter email or PAN number"}
                    value={emailOrPan}
                    onChange={(e) => {
                      setEmailOrPan(e.target.value);
                      setIsPan(!e.target.value.includes("@"));
                    }}
                    className={error ? "error" : ""}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={error ? "error" : ""}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>

          {/* Simple Footer - Only Copyright and Terms
          <div className="simple-footer">
            <div className="copyright-text">
              © {new Date().getFullYear()} ONDO . All rights reserved.
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

export default SubAdminLogin;
