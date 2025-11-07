import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, db } from '../../firebase/config';

const TrainerSetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [passwordErrors, setPasswordErrors] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Get trainer info from localStorage
    const storedTrainer = localStorage.getItem('firstLoginTrainer');
    if (!storedTrainer) {
      navigate('/trainer-login');
      return;
    }
    
    try {
      const trainerData = JSON.parse(storedTrainer);
      setTrainerInfo(trainerData);
    } catch (error) {
      console.error('Error parsing trainer data:', error);
      navigate('/trainer-login');
    }
  }, [navigate]);

  const checkPasswordStrength = (password) => {
    const errors = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
      passwordsMatch: password === confirmPassword && confirmPassword !== ''
    };
    setPasswordErrors(errors);
  };

  const validatePassword = () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return false;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    setError('');
    checkPasswordStrength(password);
  };

  const handleConfirmPasswordChange = (e) => {
    const confirmPass = e.target.value;
    setConfirmPassword(confirmPass);
    setError('');
    
    setPasswordErrors(prev => ({
      ...prev,
      passwordsMatch: newPassword === confirmPass && confirmPass !== ''
    }));
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validatePassword()) {
      setLoading(false);
      return;
    }

    if (!trainerInfo) {
      setError('Trainer information not found. Please login again.');
      setLoading(false);
      return;
    }

    if (!trainerInfo.email || !trainerInfo.trainerId) {
      setError('Invalid trainer data. Please login again.');
      setLoading(false);
      return;
    }

    try {
      console.log('Creating Firebase Auth account for trainer...');
      console.log('Email:', trainerInfo.email);
      console.log('Trainer ID:', trainerInfo.trainerId);
      
      // **UPDATED: Create Firebase Auth account**
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        trainerInfo.email, 
        newPassword
      );
      
      const firebaseUid = userCredential.user.uid;
      console.log('Firebase Auth account created with UID:', firebaseUid);
      
      // **UPDATED: Update trainer record with Firebase Auth UID**
      await update(ref(db, `HTAMS/company/trainers/${trainerInfo.trainerId}`), {
        uid: firebaseUid, // Store Firebase Auth UID
        firstTime: false,
        passwordSetAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        authMethod: 'firebase' // Mark as Firebase Auth enabled
      });

      console.log('Trainer database record updated successfully');

      // Store trainer info in localStorage
      localStorage.setItem('htamsTrainer', JSON.stringify({ 
        uid: firebaseUid,
        trainerId: trainerInfo.trainerId,
        ...trainerInfo.trainerData,
        role: 'trainer'
      }));

      // Remove first login data
      localStorage.removeItem('firstLoginTrainer');

      alert('Password set successfully! Redirecting to dashboard...');
      navigate('/trainer-dashboard');

    } catch (error) {
      console.error('Error setting password:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to set password: ';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage += 'Email is already registered with Firebase Auth. Please contact support.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage += 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += 'Invalid email address format.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const PasswordStrengthIndicator = ({ errors }) => (
    <div className="password-requirements">
      <p className="requirements-title">Password Requirements:</p>
      <ul className="requirements-list">
        <li className={errors.minLength ? 'valid' : 'invalid'}>
          <span className="icon">{errors.minLength ? '✓' : '×'}</span>
          At least 8 characters
        </li>
        <li className={errors.hasUppercase ? 'valid' : 'invalid'}>
          <span className="icon">{errors.hasUppercase ? '✓' : '×'}</span>
          One uppercase letter
        </li>
        <li className={errors.hasLowercase ? 'valid' : 'invalid'}>
          <span className="icon">{errors.hasLowercase ? '✓' : '×'}</span>
          One lowercase letter
        </li>
        <li className={errors.hasNumber ? 'valid' : 'invalid'}>
          <span className="icon">{errors.hasNumber ? '✓' : '×'}</span>
          One number
        </li>
        <li className={errors.hasSpecialChar ? 'valid' : 'invalid'}>
          <span className="icon">{errors.hasSpecialChar ? '✓' : '×'}</span>
          One special character (@$!%*?&)
        </li>
      </ul>
    </div>
  );

  const isFormValid = () => {
    return passwordErrors.minLength && 
           passwordErrors.hasUppercase && 
           passwordErrors.hasLowercase && 
           passwordErrors.hasNumber && 
           passwordErrors.hasSpecialChar && 
           passwordErrors.passwordsMatch;
  };

  if (!trainerInfo) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="set-password-container">
      <div className="set-password-form">
        <h2 className="set-password-title">Set Your Password</h2>
        <p className="welcome-text">
          Welcome, <strong>{trainerInfo.trainerData.name}</strong>!<br/>
          Please set a secure password for your account.
        </p>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSetPassword}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password *</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              disabled={loading}
              required
              minLength="8"
              className={newPassword && (passwordErrors.minLength && passwordErrors.hasUppercase && 
                        passwordErrors.hasLowercase && passwordErrors.hasNumber && 
                        passwordErrors.hasSpecialChar) ? 'valid' : newPassword ? 'invalid' : ''}
            />
            {newPassword && <PasswordStrengthIndicator errors={passwordErrors} />}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm your password"
              disabled={loading}
              required
              className={confirmPassword && passwordErrors.passwordsMatch ? 'valid' : 
                        confirmPassword ? 'invalid' : ''}
            />
            {confirmPassword && (
              <div className="password-match-indicator">
                <span className={passwordErrors.passwordsMatch ? 'match-valid' : 'match-invalid'}>
                  <span className="icon">{passwordErrors.passwordsMatch ? '✓' : '×'}</span>
                  {passwordErrors.passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || !isFormValid()} 
            className="submit-button"
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>

      <style>{`
        .set-password-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
        }

        .set-password-form {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          width: 480px;
          max-width: 100%;
        }

        .set-password-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome-text {
          text-align: center;
          color: #6b7280;
          margin-bottom: 30px;
          line-height: 1.5;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input.valid {
          border-color: #10b981;
        }

        .form-group input.invalid {
          border-color: #ef4444;
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-requirements {
          margin-top: 12px;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .requirements-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0 0 10px 0;
          color: #374151;
        }

        .requirements-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .requirements-list li {
          padding: 4px 0;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
        }

        .requirements-list li.valid {
          color: #10b981;
        }

        .requirements-list li.invalid {
          color: #ef4444;
        }

        .icon {
          width: 16px;
          margin-right: 8px;
          font-weight: bold;
        }

        .password-match-indicator {
          margin-top: 8px;
        }

        .match-valid {
          color: #10b981;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
        }

        .match-invalid {
          color: #ef4444;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
        }

        .error-message {
          color: #ef4444;
          background-color: #fef2f2;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .submit-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px;
          border: none;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.2rem;
        }

        @media (max-width: 480px) {
          .set-password-form {
            width: 100%;
            padding: 30px 20px;
          }
          
          .set-password-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainerSetPassword;
