import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase/config'; // Remove auth import
import { ref, get, update } from 'firebase/database';
// Remove all Firebase Auth imports
import { FaUser, FaLock, FaEye, FaEyeSlash, FaBuilding, FaSpinner } from 'react-icons/fa';

const LoginPageEmployee = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // Remove Firebase Auth state listener - use localStorage instead
  useEffect(() => {
    // Check if user is already logged in via localStorage
    const employeeData = localStorage.getItem('employeeData');
    if (employeeData) {
      try {
        const parsedData = JSON.parse(employeeData);
        if (parsedData.isLoggedIn) {
          navigate('/employee-dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error parsing stored employee data:', error);
        localStorage.removeItem('employeeData');
      }
    }
  }, [navigate]);

  // SIMPLIFIED login handler - NO Firebase Authentication
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Validation
    if (!cleanEmail || !cleanPassword) {
      setError('❌ Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Searching for employee in HTAMS/company/Employees...');
      
      // Step 1: Get employee data from database
      const employeeRef = ref(database, 'HTAMS/company/Employees');
      const snapshot = await get(employeeRef);
      
      if (!snapshot.exists()) {
        setError('❌ Company database not accessible. Contact admin.');
        setLoading(false);
        return;
      }

      const employeesData = snapshot.val();
      console.log('📊 Employees data loaded:', Object.keys(employeesData).length, 'employees');
      
      // Find employee by email
      const employeeEntry = Object.entries(employeesData).find(
        ([, emp]) => emp.email?.toLowerCase().trim() === cleanEmail
      );

      if (!employeeEntry) {
        setError('❌ Email not found in company records. Please contact HR.');
        setLoading(false);
        return;
      }

      const [employeeId, employeeData] = employeeEntry;
      console.log('✅ Employee found:', employeeData.name, 'ID:', employeeId);

      // Step 2: Check if login is enabled
      if (!employeeData.loginEnabled) {
        setError('❌ Your account login is disabled. Contact admin.');
        setLoading(false);
        return;
      }

      // Step 3: Verify password
      let passwordCorrect = false;
      
      if (employeeData.passwordChanged) {
        // User has set custom password - check against stored password
        // Note: In production, you should hash passwords
        passwordCorrect = cleanPassword === employeeData.customPassword;
      } else {
        // First time login or default password - check against mobile number
        passwordCorrect = cleanPassword === employeeData.mobile || cleanPassword === employeeData.defaultPassword;
      }

      if (!passwordCorrect) {
        if (!employeeData.passwordChanged) {
          setError(`❌ For first-time login, use your mobile number (${employeeData.mobile}) as password`);
        } else {
          setError('❌ Incorrect password. Contact admin if you forgot your password.');
        }
        setLoading(false);
        return;
      }

      // Step 4: Successful login
      console.log('✅ Login successful');

      // Update last login time in database
      await update(ref(database, `HTAMS/company/Employees/${employeeId}`), {
        lastLoginAt: new Date().toISOString(),
        loginCount: (employeeData.loginCount || 0) + 1
      });

      // Store employee data in localStorage (session management)
      const sessionData = {
        ...employeeData,
        employeeId,
        isLoggedIn: true,
        loginTimestamp: new Date().toISOString()
      };
      
      localStorage.setItem('employeeData', JSON.stringify(sessionData));
      
      setError('✅ Login successful! Redirecting...');
      
      // Check if user needs to set new password (first time with mobile)
      if (!employeeData.passwordChanged && cleanPassword === employeeData.mobile) {
        // Redirect to set new password
        setTimeout(() => {
          navigate('/set-new-password');
        }, 1000);
      } else {
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/employee-dashboard', { replace: true });
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('❌ System error. Please try again or contact IT support.');
    }

    setLoading(false);
  };

  // Reset password function - simplified for database-only approach
  const resetPassword = async () => {
    if (!email.trim()) {
      setError('❌ Please enter your email first.');
      return;
    }

    setLoading(true);
    
    try {
      // Find employee in database
      const employeeRef = ref(database, 'HTAMS/company/Employees');
      const snapshot = await get(employeeRef);
      
      if (snapshot.exists()) {
        const employeesData = snapshot.val();
        const employeeEntry = Object.entries(employeesData).find(
          ([, emp]) => emp.email?.toLowerCase().trim() === email.trim().toLowerCase()
        );

        if (!employeeEntry) {
          setError('❌ Email not found in company records.');
          setLoading(false);
          return;
        }

        const [employeeId, employeeData] = employeeEntry;
        
        // Reset to default password (mobile number)
        await update(ref(database, `HTAMS/company/Employees/${employeeId}`), {
          passwordChanged: false,
          customPassword: null,
          passwordResetAt: new Date().toISOString()
        });
        
        setError(`✅ Password reset! Use your mobile number: ${employeeData.mobile}`);
        
      } else {
        setError('❌ Database not accessible. Contact admin.');
      }
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setError('❌ Reset failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <FaBuilding style={styles.headerIcon} />
          <h2 style={styles.title}>🏢 Employee Login</h2>
          <p style={styles.subtitle}>Access your employee dashboard</p>
        </div>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <FaUser style={styles.labelIcon} />
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your company email"
              value={email}
              required
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <FaLock style={styles.labelIcon} />
              Password
            </label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (mobile number for first-time)"
                value={password}
                required
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                style={styles.passwordInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <small style={styles.helpText}>
              🔑 First-time users: Use mobile number | Existing users: Use your password
            </small>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? '#9CA3AF' : '#2563EB'
            }}
          >
            {loading ? (
              <span style={styles.loadingContent}>
                <FaSpinner style={styles.spinner} />
                Processing...
              </span>
            ) : '🚀 Login'}
          </button>
          
          <div style={styles.actionButtons}>
            <button 
              type="button" 
              onClick={resetPassword}
              style={styles.resetButton}
              disabled={loading}
            >
              🔑 Reset Password
            </button>
          </div>
          
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
          <h4 style={styles.helpTitle}>🆘 Quick Help:</h4>
          <div style={styles.quickFixes}>
            <p><strong>🆕 New Employee?</strong> Use your mobile number as password</p>
            <p><strong>👤 Existing User?</strong> Use your email and set password</p>
            <p><strong>🔐 First Login?</strong> Password = Your mobile number</p>
            <p><strong>❓ Need Help?</strong> Contact HR department</p>
          </div>
        </div>

        <div style={styles.footerSection}>
          <p style={styles.footerText}>
            Having trouble? Contact your HR department or IT support.
          </p>
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
  loginBox: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    position: 'relative'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  headerIcon: {
    fontSize: '3rem',
    color: '#2563EB',
    marginBottom: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: 0,
    lineHeight: '1.5'
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
    color: '#6B7280'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  passwordInput: {
    width: '100%',
    padding: '12px 50px 12px 16px',
    border: '2px solid #E5E7EB',
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
    color: '#6B7280',
    fontSize: '18px',
    padding: '4px'
  },
  helpText: {
    fontSize: '12px',
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: '4px'
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
  actionButtons: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '8px'
  },
  resetButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '2px solid #F59E0B',
    backgroundColor: 'white',
    color: '#F59E0B',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid',
    marginTop: '16px',
    lineHeight: '1.4'
  },
  helpSection: {
    backgroundColor: '#F8FAFC',
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
  quickFixes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#4B5563'
  },
  footerSection: {
    textAlign: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  },
  footerText: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0
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

export default LoginPageEmployee;
