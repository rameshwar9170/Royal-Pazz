import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { ref, get } from 'firebase/database';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';

const LoginPageEmployee = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  const navigate = useNavigate();

  // Enhanced employee verification and auth flow
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

    if (cleanPassword.length < 6) {
      setError('❌ Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Verify employee exists in database
      const employeeRef = ref(db, 'HTAMS/company/Employees');
      const snapshot = await get(employeeRef);
      
      if (!snapshot.exists()) {
        setError('❌ Company database not accessible. Contact admin.');
        setLoading(false);
        return;
      }

      const employeesData = snapshot.val();
      const employeeEntry = Object.entries(employeesData).find(
        ([, emp]) => emp.email?.toLowerCase().trim() === cleanEmail
      );

      if (!employeeEntry) {
        setError('❌ Email not found in company records. Please contact HR.');
        setLoading(false);
        return;
      }

      const [employeeId, employeeData] = employeeEntry;
      console.log('✅ Employee verified:', employeeData.name);

      // Step 2: Check if this is first time setup
      if (!isFirstTimeSetup) {
        // Try login first
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            employeeData.email.trim(), 
            cleanPassword
          );
          
          // Success - store data and redirect
          localStorage.setItem('employeeData', JSON.stringify({
            ...employeeData,
            employeeId,
            uid: userCredential.user.uid
          }));
          
          setError('✅ Login successful!');
          setTimeout(() => navigate('/employee-dashboard'), 1000);
          setLoading(false);
          return;
          
        } catch (loginError) {
          console.log('Login failed, trying registration...', loginError.code);
          
          if (loginError.code === 'auth/user-not-found' || 
              loginError.code === 'auth/invalid-credential') {
            // User doesn't exist in Firebase Auth - create account
            setIsFirstTimeSetup(true);
          } else {
            throw loginError; // Re-throw other errors
          }
        }
      }

      // Step 3: First time setup - create Firebase Auth account
      if (isFirstTimeSetup || error.includes('first time')) {
        try {
          console.log('Creating new Firebase Auth account...');
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            employeeData.email.trim(),
            cleanPassword
          );

          // Update profile
          await updateProfile(userCredential.user, {
            displayName: employeeData.name || 'Employee',
          });

          // Store employee data
          localStorage.setItem('employeeData', JSON.stringify({
            ...employeeData,
            employeeId,
            uid: userCredential.user.uid
          }));

          setError('✅ Account created successfully!');
          setTimeout(() => navigate('/employee-dashboard'), 1000);
          
        } catch (registerError) {
          console.error('Registration error:', registerError);
          
          if (registerError.code === 'auth/email-already-in-use') {
            setError('❌ Account exists but password incorrect. Try "Reset Password" or contact admin.');
          } else if (registerError.code === 'auth/weak-password') {
            setError('❌ Password too weak. Use at least 6 characters with numbers/symbols.');
          } else if (registerError.code === 'auth/operation-not-allowed') {
            setError('❌ Email/password authentication not enabled. Contact admin.');
          } else {
            setError('❌ Setup failed: ' + registerError.message);
          }
        }
      }

    } catch (error) {
      console.error('Overall error:', error);
      setError('❌ System error. Please try again or contact support.');
    }

    setLoading(false);
  };

  // Force first-time setup mode
  const forceFirstTimeSetup = () => {
    setIsFirstTimeSetup(true);
    setError('🔄 Switched to first-time setup mode. Enter your email and choose a password (6+ chars).');
  };

  // Reset password function
  const resetPassword = async () => {
    if (!email.trim()) {
      setError('❌ Please enter your email first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError('📧 Password reset email sent! Check your inbox.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('❌ No account found with this email. Try "First Time Setup" instead.');
      } else {
        setError('❌ Reset failed: ' + error.message);
      }
    }
  };

  // Check Firebase configuration
  const checkFirebaseConfig = () => {
    console.log('Firebase Config:', {
      apiKey: auth.app.options.apiKey?.substring(0, 10) + '...',
      authDomain: auth.app.options.authDomain,
      projectId: auth.app.options.projectId,
      currentUser: auth.currentUser
    });
    
    if (!auth.app.options.apiKey || !auth.app.options.authDomain) {
      setError('❌ Firebase configuration missing. Check your firebase/config.js file.');
    } else {
      setError('✅ Firebase configuration looks good.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h2 style={styles.title}>
          {isFirstTimeSetup ? '🆕 First Time Setup' : '🏢 Employee Login'}
        </h2>
        <p style={styles.subtitle}>
          {isFirstTimeSetup 
            ? 'Create your account with company email' 
            : 'Access your employee dashboard'
          }
        </p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="Enter your company email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {isFirstTimeSetup ? 'Choose Password' : 'Password'}
            </label>
            <input
              type="password"
              placeholder={isFirstTimeSetup 
                ? "Create a password (6+ characters)" 
                : "Enter your password"
              }
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? '#9CA3AF' : 
                isFirstTimeSetup ? '#10B981' : '#2563EB'
            }}
          >
            {loading ? '⏳ Processing...' : 
             isFirstTimeSetup ? '🆕 Create Account' : '🚀 Login'}
          </button>
          
          <div style={styles.actionButtons}>
            {!isFirstTimeSetup && (
              <button 
                type="button" 
                onClick={forceFirstTimeSetup}
                style={styles.setupButton}
                disabled={loading}
              >
                🆕 First Time Setup
              </button>
            )}
            
            <button 
              type="button" 
              onClick={resetPassword}
              style={styles.resetButton}
              disabled={loading}
            >
              🔑 Reset Password
            </button>
            
            <button 
              type="button" 
              onClick={checkFirebaseConfig}
              style={styles.configButton}
              disabled={loading}
            >
              🔧 Check Config
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
          <h4>🆘 Quick Fixes:</h4>
          <div style={styles.quickFixes}>
            <p><strong>New Employee?</strong> Click "First Time Setup"</p>
            <p><strong>Existing User?</strong> Use your exact email from HR records</p>
            <p><strong>Forgot Password?</strong> Click "Reset Password"</p>
            <p><strong>Still Issues?</strong> Click "Check Config" then contact IT</p>
          </div>
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
    fontFamily: 'Inter, sans-serif'
  },
  loginBox: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    padding: '32px',
    width: '100%',
    maxWidth: '500px'
  },
  title: {
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: '8px',
    fontSize: '28px',
    fontWeight: '700'
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: '24px',
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginTop: '8px'
  },
  setupButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '2px solid #10B981',
    backgroundColor: 'white',
    color: '#10B981',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  resetButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '2px solid #F59E0B',
    backgroundColor: 'white',
    color: '#F59E0B',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  configButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '2px solid #6366F1',
    backgroundColor: 'white',
    color: '#6366F1',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid',
    marginTop: '16px'
  },
  helpSection: {
    backgroundColor: '#F8FAFC',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '20px'
  },
  quickFixes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  }
};

export default LoginPageEmployee;
