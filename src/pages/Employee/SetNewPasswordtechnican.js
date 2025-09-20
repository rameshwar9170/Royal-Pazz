import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase/config';
import { ref, update } from 'firebase/database';
// Remove all Firebase Auth imports
import { FaEye, FaEyeSlash, FaLock, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

const SetNewPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Get employee data from localStorage
    const storedEmployeeData = localStorage.getItem('employeeData');
    if (!storedEmployeeData) {
      setError('❌ Session data missing. Please login again.');
      setTimeout(() => navigate('/employee-login'), 3000);
      return;
    }

    try {
      const parsedData = JSON.parse(storedEmployeeData);
      
      // Check if user is logged in
      if (!parsedData.isLoggedIn) {
        setError('❌ Please login first.');
        setTimeout(() => navigate('/employee-login'), 3000);
        return;
      }
      
      setEmployeeData(parsedData);
      
      // Check if user already has custom password
      if (parsedData.passwordChanged) {
        navigate('/employee-dashboard', { replace: true });
      }
    } catch (parseError) {
      console.error('❌ Error parsing employee data:', parseError);
      setError('❌ Invalid session data. Please login again.');
      setTimeout(() => navigate('/employee-login'), 3000);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('❌ Please fill in both password fields');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('❌ Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('❌ Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (!employeeData) {
        setError('❌ Session error. Please login again.');
        setLoading(false);
        return;
      }

      console.log('🔐 Updating password for employee:', employeeData.email);

      // Update employee record in database
      await update(ref(database, `HTAMS/company/Employees/${employeeData.employeeId}`), {
        customPassword: newPassword, // In production, hash this password
        passwordChanged: true,
        passwordSetAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });

      // Update localStorage
      const updatedEmployeeData = {
        ...employeeData,
        passwordChanged: true,
        customPassword: newPassword,
        passwordSetAt: new Date().toISOString()
      };
      localStorage.setItem('employeeData', JSON.stringify(updatedEmployeeData));

      setError('✅ Password updated successfully! Redirecting to dashboard...');
      
      // Redirect to employee dashboard
      setTimeout(() => {
        navigate('/employee-dashboard', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('❌ Password update error:', error);
      setError('❌ Failed to update password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!employeeData) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FaSpinner style={styles.loadingSpinner} />
          <h3 style={styles.loadingText}>Loading...</h3>
          <p style={styles.loadingSubtext}>Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <div style={styles.header}>
          <FaLock style={styles.headerIcon} />
          <h2 style={styles.title}>Set New Password</h2>
          <p style={styles.subtitle}>
            Create a secure password for your account
            <br/><strong>{employeeData.name}</strong> ({employeeData.email})
            <br/><span style={styles.roleIndicator}>Role: {employeeData.role}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <FaLock style={styles.labelIcon} />
              New Password
            </label>
            <div style={styles.passwordInputWrapper}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.passwordInput}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
                disabled={loading}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <FaLock style={styles.labelIcon} />
              Confirm Password
            </label>
            <div style={styles.passwordInputWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.passwordInput}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                disabled={loading}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {newPassword && confirmPassword && (
              <div style={styles.matchIndicator}>
                {newPassword === confirmPassword ? (
                  <div style={styles.matchSuccess}>
                    <FaCheckCircle style={styles.matchIcon} />
                    Passwords match
                  </div>
                ) : (
                  <div style={styles.matchError}>
                    <FaExclamationTriangle style={styles.matchIcon} />
                    Passwords do not match
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            style={{
              ...styles.submitButton,
              backgroundColor: loading || !newPassword || !confirmPassword || newPassword !== confirmPassword 
                ? '#9CA3AF' : '#10B981'
            }}
          >
            {loading ? (
              <span style={styles.loadingContent}>
                <FaSpinner style={styles.spinner} />
                Updating Password...
              </span>
            ) : (
              '🔐 Set New Password'
            )}
          </button>

          {error && (
            <div style={{
              ...styles.message,
              backgroundColor: error.includes('✅') ? '#D1FAE5' : '#FEE2E2',
              borderColor: error.includes('✅') ? '#10B981' : '#EF4444',
              color: error.includes('✅') ? '#065F46' : '#B91C1C'
            }}>
              {error}
            </div>
          )}
        </form>

        <div style={styles.helpSection}>
          <h4 style={styles.helpTitle}>💡 Password Tips:</h4>
          <ul style={styles.helpList}>
            <li>Use at least 6 characters</li>
            <li>Mix letters, numbers, and symbols</li>
            <li>Avoid common words or personal info</li>
            <li>Remember this password for future logins</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    padding: '60px 40px',
    textAlign: 'center',
    maxWidth: '400px'
  },
  loadingSpinner: {
    fontSize: '3rem',
    color: '#2563EB',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  loadingSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    padding: '40px',
    width: '100%',
    maxWidth: '500px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  headerIcon: {
    fontSize: '3rem',
    color: '#10b981',
    marginBottom: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5'
  },
  roleIndicator: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: '600'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  labelIcon: {
    fontSize: '14px',
    color: '#6b7280'
  },
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  passwordInput: {
    width: '100%',
    padding: '12px 50px 12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '18px',
    padding: '4px'
  },
  matchIndicator: {
    marginTop: '8px'
  },
  matchSuccess: {
    color: '#10b981',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  matchError: {
    color: '#ef4444',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  matchIcon: {
    fontSize: '12px'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  spinner: {
    animation: 'spin 1s linear infinite'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid'
  },
  helpSection: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '24px'
  },
  helpTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0'
  },
  helpList: {
    margin: '12px 0 0 0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6'
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default SetNewPassword;
