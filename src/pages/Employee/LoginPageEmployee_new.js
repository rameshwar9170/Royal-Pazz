import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase/config';
import { ref, get, update } from 'firebase/database';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginPageEmployee = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Validation
    if (!cleanEmail || !cleanPassword) {
      setError('Please fill out this field.');
      setLoading(false);
      return;
    }

    try {
      // Find employee by email
      let employeeData = null;
      let employeeId = null;

      // Search in employees node
      const employeesRef = ref(database, 'HTAMS/company/Employees');
      const employeesSnapshot = await get(employeesRef);
      
      if (employeesSnapshot.exists()) {
        const employees = employeesSnapshot.val();
        
        // Search for employee by email
        for (const [mobile, empData] of Object.entries(employees)) {
          if (empData.email && empData.email.toLowerCase() === cleanEmail) {
            employeeData = empData;
            employeeId = mobile;
            break;
          }
        }
      }

      if (!employeeData) {
        setError('Email not found in company records. Please contact HR.');
        setLoading(false);
        return;
      }

      // Check if account is verified
      if (!employeeData.mobileVerified) {
        setError('Account not verified. Please contact admin.');
        setLoading(false);
        return;
      }

      // Check password
      const hasCustomPassword = employeeData.passwordChanged && employeeData.password;
      const defaultPassword = employeeData.defaultPassword || employeeData.mobile || employeeId;
      
      if (hasCustomPassword) {
        // User has set a custom password
        if (cleanPassword === employeeData.password) {
          setSuccess('Login successful! Redirecting to dashboard...');
          await loginSuccess(employeeId);
        } else {
          setError('Incorrect password');
        }
      } else {
        // First time login - use mobile number as password
        if (cleanPassword === defaultPassword) {
          // Redirect to set new password
          sessionStorage.setItem('employeeId', employeeId);
          sessionStorage.setItem('tempAuth', 'true');
          setSuccess('First time login detected. Redirecting to set new password...');
          setTimeout(() => {
            navigate(`/set-new-password?id=${employeeId}`);
          }, 1500);
        } else {
          setError('For first-time login, use your mobile number as password');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    }

    setLoading(false);
  };

  const loginSuccess = async (employeeId) => {
    try {
      // Update last login time
      const updateRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      await update(updateRef, {
        lastLoginAt: new Date().toISOString()
      });

      // Store session data
      localStorage.setItem('employeeId', employeeId);
      localStorage.setItem('employeeToken', 'authenticated');
      sessionStorage.setItem('employeeId', employeeId);

      setTimeout(() => {
        navigate('/employee-dashboard');
      }, 1500);
    } catch (error) {
      console.error('Login success error:', error);
      setError('Login completed but failed to update records.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Employee Login</h1>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email or PAN</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ramshinde9370@gmail.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password or Phone Number (for first-time login)</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="forgot-password-link">
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="trainer-link">
            Are you a trainer? <a href="/trainer-login">Trainer Login</a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }

        .login-card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .login-title {
          text-align: center;
          color: #667eea;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 30px;
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

        .form-group label {
          color: #374151;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-input {
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 16px;
          background: #f8fafc;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .password-input-container {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle:hover {
          color: #374151;
        }

        .forgot-password-link {
          text-align: left;
          margin-top: -10px;
        }

        .forgot-password {
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
        }

        .forgot-password:hover {
          text-decoration: underline;
        }

        .login-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 15px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          font-size: 14px;
          text-align: center;
        }

        .success-message {
          background: #f0fdf4;
          color: #16a34a;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
          font-size: 14px;
          text-align: center;
        }

        .login-footer {
          text-align: center;
          margin-top: 30px;
        }

        .trainer-link {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .trainer-link a {
          color: #667eea;
          text-decoration: none;
        }

        .trainer-link a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 30px 20px;
            margin: 10px;
          }

          .login-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPageEmployee;
