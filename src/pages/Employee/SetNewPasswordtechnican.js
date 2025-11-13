import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ref, update, get } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaEye, FaEyeSlash, FaLock, FaUser, FaCheckCircle, FaMobile, FaEnvelope } from 'react-icons/fa';

const SetNewPasswordtechnican = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [technicianData, setTechnicianData] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get employee ID from URL params or session storage
  const employeeId = new URLSearchParams(location.search).get('id') || 
                     sessionStorage.getItem('employeeId') || 
                     location.state?.employeeId;

  useEffect(() => {
    // Check if user has temporary authentication
    const tempAuth = sessionStorage.getItem('tempAuth');
    if (!tempAuth || !employeeId) {
      setError('Unauthorized access. Please login first.');
      setTimeout(() => navigate('/employee-login'), 2000);
      return;
    }
    
    // Fetch employee data from both nodes
    const fetchEmployeeData = async () => {
      try {
        // Check technicians node first
        const technicianRef = ref(database, `HTAMS/technicians/${employeeId}`);
        const techSnapshot = await get(technicianRef);
        
        if (techSnapshot.exists()) {
          const techData = techSnapshot.val();
          setTechnicianData(techData);
          
          // Also get employee data for display
          const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
          const empSnapshot = await get(employeeRef);
          
          if (empSnapshot.exists()) {
            setEmployeeData(empSnapshot.val());
          }
        } else {
          // Fallback to employees node
          const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
          const empSnapshot = await get(employeeRef);
          
          if (empSnapshot.exists()) {
            setEmployeeData(empSnapshot.val());
          } else {
            setError('Employee record not found.');
          }
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setError('Failed to load employee information.');
      }
    };

    fetchEmployeeData();
  }, [employeeId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate passwords
      const passwordError = validatePassword(formData.newPassword);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Check if password is same as mobile number (not allowed)
      if (formData.newPassword === employeeId) {
        setError('New password cannot be the same as your mobile number');
        setLoading(false);
        return;
      }

      // Update password in both nodes
      const updates = {
        password: formData.newPassword,
        passwordChanged: true,
        firstTime: false,
        lastPasswordUpdate: new Date().toISOString()
      };

      // Update technician node if exists
      if (technicianData) {
        const technicianRef = ref(database, `HTAMS/technicians/${employeeId}`);
        await update(technicianRef, updates);
      }

      // Update employee node
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      await update(employeeRef, updates);

      setSuccess('Password set successfully! Redirecting to dashboard...');
      
      // Clear temporary authentication and set proper session
      sessionStorage.removeItem('tempAuth');
      localStorage.setItem('employeeId', employeeId);
      localStorage.setItem('employeeToken', 'authenticated');
      sessionStorage.setItem('employeeId', employeeId);
      
      // Redirect to employee dashboard after 2 seconds
      setTimeout(() => {
        navigate('/employee-dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error setting password:', error);
      setError('Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!employeeId) {
    return (
      <div className="set-password-container">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>Invalid access. Please use the proper link to set your password.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="set-password-container">
      <div className="set-password-card">
        <div className="card-header">
          <div className="logo-section">
            <FaUser className="logo-icon" />
            <h1>Set New Password</h1>
          </div>
          {(employeeData || technicianData) && (
            <div className="employee-info">
              <p>Welcome, <strong>{employeeData?.name || technicianData?.name}</strong></p>
              <div className="employee-details">
                <div className="detail-item">
                  <FaMobile className="detail-icon" />
                  <span>{employeeId}</span>
                </div>
                <div className="detail-item">
                  <FaEnvelope className="detail-icon" />
                  <span>{employeeData?.email || technicianData?.email}</span>
                </div>
                <div className="detail-item">
                  <FaUser className="detail-icon" />
                  <span>{employeeData?.role || technicianData?.role}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="password-form">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <FaCheckCircle className="success-icon" />
              <span>{success}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              <FaLock className="label-icon" />
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter your new password"
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
            <div className="password-requirements">
              <p>Password must contain:</p>
              <ul>
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              <FaLock className="label-icon" />
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                required
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .set-password-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }

        .set-password-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 450px;
          overflow: hidden;
        }

        .card-header {
          background: linear-gradient(135deg, #002B5C, #F36F21);
          color: white;
          padding: 2rem;
          text-align: center;
        }

        .logo-section {
          margin-bottom: 1rem;
        }

        .logo-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #F36F21;
        }

        .card-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .employee-info {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .employee-info p {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
        }

        .employee-details {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .detail-icon {
          color: #F36F21;
        }

        .password-form {
          padding: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .label-icon {
          color: #6b7280;
        }

        .password-input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 1.1rem;
        }

        .password-toggle:hover {
          color: #374151;
        }

        .password-requirements {
          margin-top: 0.75rem;
          padding: 1rem;
          background-color: #f8fafc;
          border-radius: 6px;
          border-left: 4px solid #3b82f6;
        }

        .password-requirements p {
          margin: 0 0 0.5rem 0;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .password-requirements ul {
          margin: 0;
          padding-left: 1.25rem;
          list-style-type: disc;
        }

        .password-requirements li {
          color: #6b7280;
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          padding: 0.875rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .alert-error {
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background-color: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .success-icon {
          color: #16a34a;
        }

        .error-message {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .error-message h2 {
          color: #dc2626;
          margin-bottom: 1rem;
        }

        @media (max-width: 480px) {
          .set-password-container {
            padding: 0.5rem;
          }

          .card-header {
            padding: 1.5rem;
          }

          .password-form {
            padding: 1.5rem;
          }

          .logo-icon {
            font-size: 2.5rem;
          }

          .card-header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SetNewPasswordtechnican;
