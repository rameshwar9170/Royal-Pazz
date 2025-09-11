import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { ref, get, set, update } from 'firebase/database';
import { Eye, EyeOff, Lock, Shield, Users, TrendingUp } from 'lucide-react';

const LevelsManager = () => {
  const [levels, setLevels] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingLevel, setEditingLevel] = useState(null);
  
  // Security states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Statistics
  const [totalLevels, setTotalLevels] = useState(0);
  const [highestDiscount, setHighestDiscount] = useState(0);
  const [avgDiscount, setAvgDiscount] = useState(0);

  // Master password (in production, this should be env variable or Firebase Auth)
  const MASTER_PASSWORD = "12345678";

  // Default levels structure
  const defaultLevels = {
    "Agency": {
      "discount": 20,
      "selfSale": 10000,
      "teamRequirement": 0,
      "teamRole": ""
    },
    "Dealer": {
      "discount": 34,
      "selfSale": 0,
      "teamRequirement": 5,
      "teamRole": "Mega Agency"
    },
    "Diamond Agency": {
      "discount": 30,
      "selfSale": 300000,
      "teamRequirement": 0,
      "teamRole": "Diamond Agency"
    },
    "Diamond Distributor": {
      "discount": 44,
      "selfSale": 0,
      "teamRequirement": 10,
      "teamRole": "Dealer"
    },
    "Diamond Wholesaler": {
      "discount": 50,
      "selfSale": 0,
      "teamRequirement": 7,
      "teamRole": "Distributor"
    },
    "Distributor": {
      "discount": 40,
      "selfSale": 0,
      "teamRequirement": 5,
      "teamRole": "Dealer"
    },
    "Mega Agency": {
      "discount": 25,
      "selfSale": 200000,
      "teamRequirement": 0,
      "teamRole": ""
    },
    "Mega Dealer": {
      "discount": 37,
      "selfSale": 0,
      "teamRequirement": 10,
      "teamRole": "Mega Agency"
    },
    "Mega Distributor": {
      "discount": 42,
      "selfSale": 0,
      "teamRequirement": 7,
      "teamRole": "Dealer"
    },
    "Mega Wholesaler": {
      "discount": 48,
      "selfSale": 0,
      "teamRequirement": 5,
      "teamRole": "Distributor"
    },
    "Wholesaler": {
      "discount": 46,
      "selfSale": 0,
      "teamRequirement": 3,
      "teamRole": "Distributor"
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLevels();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    calculateStatistics();
  }, [levels]);

  // Authentication handler
  const handleAuthentication = (e) => {
    e.preventDefault();
    if (password === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
      setPassword('');
    } else {
      setAuthError('Invalid password. Access denied.');
      setPassword('');
    }
  };

  // Calculate statistics
  const calculateStatistics = () => {
    const levelCount = Object.keys(levels).length;
    setTotalLevels(levelCount);

    if (levelCount > 0) {
      const discounts = Object.values(levels).map(level => level.discount);
      const highest = Math.max(...discounts);
      const average = discounts.reduce((sum, discount) => sum + discount, 0) / discounts.length;
      
      setHighestDiscount(highest);
      setAvgDiscount(Math.round(average * 100) / 100);
    }
  };

  // Fetch levels from Firebase
  const fetchLevels = async () => {
    try {
      setLoading(true);
      const levelsRef = ref(db, 'HTAMS/Levels');
      const snapshot = await get(levelsRef);
      
      if (snapshot.exists()) {
        setLevels(snapshot.val());
      } else {
        setLevels(defaultLevels);
        await set(levelsRef, defaultLevels);
      }
    } catch (error) {
      console.error('Error fetching levels:', error);
      setMessage('Error fetching levels data');
    } finally {
      setLoading(false);
    }
  };

  // Update level
  const updateLevel = async (levelName, updatedData) => {
    try {
      setSaving(true);
      const levelRef = ref(db, `HTAMS/Levels/${levelName}`);
      await update(levelRef, updatedData);
      
      setLevels(prev => ({
        ...prev,
        [levelName]: { ...prev[levelName], ...updatedData }
      }));
      
      setMessage(`✅ ${levelName} updated successfully!`);
      setEditingLevel(null);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating level:', error);
      setMessage('❌ Error updating level');
    } finally {
      setSaving(false);
    }
  };

  // Add new level
  const addNewLevel = async (levelName, levelData) => {
    try {
      setSaving(true);
      const levelRef = ref(db, `HTAMS/Levels/${levelName}`);
      await set(levelRef, levelData);
      
      setLevels(prev => ({
        ...prev,
        [levelName]: levelData
      }));
      
      setMessage(`✅ ${levelName} added successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding level:', error);
      setMessage('❌ Error adding new level');
    } finally {
      setSaving(false);
    }
  };

  // Delete level
  const deleteLevel = async (levelName) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ${levelName}? This action cannot be undone.`)) {
      try {
        setSaving(true);
        const levelRef = ref(db, `HTAMS/Levels/${levelName}`);
        await set(levelRef, null);
        
        const newLevels = { ...levels };
        delete newLevels[levelName];
        setLevels(newLevels);
        
        setMessage(`✅ ${levelName} deleted successfully!`);
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('Error deleting level:', error);
        setMessage('❌ Error deleting level');
      } finally {
        setSaving(false);
      }
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setLevels({});
    setMessage('');
    setEditingLevel(null);
  };

  // Authentication UI
  if (!isAuthenticated) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          
          :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            --warning-gradient: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            --danger-gradient: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            
            --primary-color: #667eea;
            --secondary-color: #764ba2;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #3b82f6;
            
            --text-primary: #1a202c;
            --text-secondary: #4a5568;
            --text-muted: #718096;
            
            --bg-primary: #ffffff;
            --bg-secondary: #f7fafc;
            --bg-muted: #edf2f7;
            
            --border-color: #e2e8f0;
            --border-radius: 12px;
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background-color: var(--bg-secondary);
          }

          .auth-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--primary-gradient);
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .auth-container::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.03)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            animation: grain 20s linear infinite;
          }

          @keyframes grain {
            0% { transform: translate(0, 0); }
            10% { transform: translate(-5%, -5%); }
            20% { transform: translate(-10%, 5%); }
            30% { transform: translate(5%, -10%); }
            40% { transform: translate(-5%, 15%); }
            50% { transform: translate(-10%, 5%); }
            60% { transform: translate(15%, 0); }
            70% { transform: translate(0, 10%); }
            80% { transform: translate(-15%, 0); }
            90% { transform: translate(10%, 5%); }
            100% { transform: translate(5%, 0); }
          }

          .auth-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: var(--shadow-xl);
            max-width: 420px;
            width: 100%;
            text-align: center;
            position: relative;
            z-index: 1;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .auth-header {
            margin-bottom: 35px;
          }

          .auth-icon {
            width: 60px;
            height: 60px;
            color: var(--primary-color);
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3));
          }

          .auth-header h2 {
            color: var(--text-primary);
            margin-bottom: 8px;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }

          .auth-header p {
            color: var(--text-secondary);
            font-size: 16px;
            font-weight: 400;
          }

          .password-input-group {
            position: relative;
            margin-bottom: 25px;
          }

          .input-icon {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            width: 22px;
            height: 22px;
            color: var(--text-muted);
            z-index: 2;
          }

          .password-input-group input {
            width: 100%;
            padding: 18px 18px 18px 55px;
            border: 2px solid var(--border-color);
            border-radius: var(--border-radius);
            font-size: 16px;
            font-weight: 500;
            background: var(--bg-primary);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-primary);
          }

          .password-input-group input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            transform: translateY(-1px);
          }

          .password-input-group input::placeholder {
            color: var(--text-muted);
            font-weight: 400;
          }

          .password-toggle {
            position: absolute;
            right: 18px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .password-toggle:hover {
            color: var(--primary-color);
            background: rgba(102, 126, 234, 0.1);
          }

          .auth-error {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #dc2626;
            padding: 14px 20px;
            border-radius: var(--border-radius);
            margin-bottom: 25px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid #fca5a5;
            animation: shake 0.5s ease-in-out;
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }

          .auth-submit {
            width: 100%;
            padding: 18px;
            background: var(--primary-gradient);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .auth-submit::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s ease;
          }

          .auth-submit:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
          }

          .auth-submit:hover::before {
            left: 100%;
          }

          .auth-submit:active {
            transform: translateY(0);
          }

          .auth-footer {
            margin-top: 35px;
            padding-top: 25px;
            border-top: 1px solid var(--border-color);
          }

          .auth-footer p {
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 500;
          }
        `}</style>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <Shield className="auth-icon" />
              <h2>ONDO Levels Manager</h2>
              <p>Secure Access Required</p>
            </div>
            
            <form onSubmit={handleAuthentication} className="auth-form">
              <div className="password-input-group">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter master password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              
              {authError && <div className="auth-error">{authError}</div>}
              
              <button type="submit" className="auth-submit">
                Access System
              </button>
            </form>
            
            <div className="auth-footer">
              <p>🔒 This system is protected and monitored</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Edit Form Component
  const LevelEditForm = ({ levelName, levelData, onSave, onCancel }) => {
    const [formData, setFormData] = useState(levelData);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(levelName, formData);
    };

    return (
      <div className="level-edit-modal">
        <div className="modal-content">
          <h3>✏️ Edit {levelName}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: parseInt(e.target.value)})}
                  required
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="form-group">
                <label>Self Sale Requirement (₹)</label>
                <input
                  type="number"
                  value={formData.selfSale}
                  onChange={(e) => setFormData({...formData, selfSale: parseInt(e.target.value)})}
                  required
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Team Requirement</label>
                <input
                  type="number"
                  value={formData.teamRequirement}
                  onChange={(e) => setFormData({...formData, teamRequirement: parseInt(e.target.value)})}
                  required
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label>Team Role</label>
                <input
                  type="text"
                  value={formData.teamRole}
                  onChange={(e) => setFormData({...formData, teamRole: e.target.value})}
                  placeholder="Required team role"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" disabled={saving} className="save-btn">
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button type="button" onClick={onCancel} className="cancel-btn">
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // New Level Form Component
  const NewLevelForm = ({ onAdd, onCancel }) => {
    const [levelName, setLevelName] = useState('');
    const [formData, setFormData] = useState({
      discount: 0,
      selfSale: 0,
      teamRequirement: 0,
      teamRole: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (levelName.trim()) {
        onAdd(levelName.trim(), formData);
        setLevelName('');
        setFormData({
          discount: 0,
          selfSale: 0,
          teamRequirement: 0,
          teamRole: ''
        });
      }
    };

    return (
      <div className="level-edit-modal">
        <div className="modal-content">
          <h3>➕ Add New Level</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Level Name</label>
              <input
                type="text"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                placeholder="Enter level name"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: parseInt(e.target.value)})}
                  required
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="form-group">
                <label>Self Sale Requirement (₹)</label>
                <input
                  type="number"
                  value={formData.selfSale}
                  onChange={(e) => setFormData({...formData, selfSale: parseInt(e.target.value)})}
                  required
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Team Requirement</label>
                <input
                  type="number"
                  value={formData.teamRequirement}
                  onChange={(e) => setFormData({...formData, teamRequirement: parseInt(e.target.value)})}
                  required
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label>Team Role</label>
                <input
                  type="text"
                  value={formData.teamRole}
                  onChange={(e) => setFormData({...formData, teamRole: e.target.value})}
                  placeholder="Required team role"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" disabled={saving} className="save-btn">
                {saving ? 'Adding...' : '➕ Add Level'}
              </button>
              <button type="button" onClick={onCancel} className="cancel-btn">
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <style>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
          }

          .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 25px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-container p {
            color: var(--text-secondary);
            font-size: 18px;
            font-weight: 500;
          }
        `}</style>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading ONDO Levels...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        :root {
          --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          --warning-gradient: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          --danger-gradient: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          
          --primary-color: #667eea;
          --secondary-color: #764ba2;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --danger-color: #ef4444;
          --info-color: #3b82f6;
          
          --text-primary: #1a202c;
          --text-secondary: #4a5568;
          --text-muted: #718096;
          
          --bg-primary: #ffffff;
          --bg-secondary: #f7fafc;
          --bg-muted: #edf2f7;
          
          --border-color: #e2e8f0;
          --border-radius: 12px;
          --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: var(--text-primary);
          background-color: var(--bg-secondary);
        }

        .secure-levels-manager {
          min-height: 100vh;
          background: var(--bg-secondary);
        }

        .header {
          background: var(--primary-gradient);
          color: white;
          padding: 20px 0;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
        }

        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100"><polygon fill="rgba(255,255,255,0.05)" points="0,0 1000,0 1000,60 0,100"/></svg>');
          pointer-events: none;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
          flex-wrap: wrap;
          gap: 15px;
        }

        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.8px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          flex: 1 1 auto;
          min-width: 280px;
        }

        .logout-btn {
          background: rgba(255,255,255,0.15);
          color: white;
          border: 2px solid rgba(255,255,255,0.25);
          padding: 8px 16px;
          border-radius: var(--border-radius);
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          flex-shrink: 0;
          white-space: nowrap;
        }

        .logout-btn:hover {
          background: rgba(255,255,255,0.25);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .message-banner {
          max-width: 1200px;
          margin: 20px auto 0;
          padding: 0 25px;
        }

        .message-banner > div {
          background: rgba(255,255,255,0.15);
          color: white;
          padding: 16px 25px;
          border-radius: var(--border-radius);
          text-align: center;
          font-weight: 500;
          font-size: 15px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .stats-dashboard {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 25px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
        }

        .stat-card {
          background: var(--bg-primary);
          border-radius: 16px;
          padding: 30px;
          display: flex;
          align-items: center;
          box-shadow: var(--shadow-md);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--border-color);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--primary-gradient);
          transform: scaleY(0);
          transition: transform 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-xl);
        }

        .stat-card:hover::before {
          transform: scaleY(1);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          margin-right: 25px;
          padding: 12px;
          border-radius: 14px;
          background: rgba(102, 126, 234, 0.1);
        }

        .total-levels .stat-icon {
          color: var(--success-color);
          background: rgba(16, 185, 129, 0.1);
        }

        .highest-discount .stat-icon {
          color: var(--warning-color);
          background: rgba(245, 158, 11, 0.1);
        }

        .avg-discount .stat-icon {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }

        .stat-content h3 {
          margin: 0;
          font-size: 36px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
          letter-spacing: -1px;
        }

        .stat-content p {
          margin: 8px 0 0;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .levels-container {
          max-width: 1200px;
          margin: 0 auto 50px;
          padding: 0 25px;
        }

        .levels-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 35px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .levels-header h2 {
          color: var(--text-primary);
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .add-level-btn {
          background: var(--success-gradient);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: var(--border-radius);
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }

        .add-level-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .add-level-btn:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
        }

        .add-level-btn:hover::before {
          left: 100%;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 25px;
        }

        .level-card {
          background: var(--bg-primary);
          border-radius: 16px;
          padding: 25px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-color);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .level-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--primary-gradient);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .level-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-xl);
        }

        .level-card:hover::before {
          transform: scaleX(1);
        }

        .level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--bg-muted);
        }

        .level-header h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .discount-badge {
          background: var(--primary-gradient);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 15px;
          box-shadow: var(--shadow-sm);
          position: relative;
        }

        .level-details {
          margin-bottom: 25px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.5);
        }

        .detail-row:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }

        .label {
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .value {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 15px;
        }

        .level-actions {
          display: flex;
          gap: 12px;
        }

        .edit-btn {
          flex: 1;
          background: var(--info-color);
          color: white;
          border: none;
          padding: 12px;
          border-radius: var(--border-radius);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .delete-btn {
          flex: 1;
          background: var(--danger-color);
          color: white;
          border: none;
          padding: 12px;
          border-radius: var(--border-radius);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .edit-btn:hover,
        .delete-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .level-edit-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: var(--bg-primary);
          border-radius: 20px;
          padding: 35px;
          max-width: 650px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 30px;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-group label {
          display: block;
          margin-bottom: 10px;
          color: var(--text-primary);
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.3px;
        }

        .form-group input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          font-size: 16px;
          font-weight: 500;
          background: var(--bg-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-primary);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          transform: translateY(-1px);
        }

        .form-group input::placeholder {
          color: var(--text-muted);
          font-weight: 400;
        }

        .form-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 35px;
          padding-top: 25px;
          border-top: 1px solid var(--border-color);
        }

        .save-btn {
          background: var(--success-gradient);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: var(--border-radius);
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cancel-btn {
          background: var(--text-muted);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: var(--border-radius);
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .save-btn:hover,
        .cancel-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .rotate {
          transform: rotate(180deg);
        }

        @media (max-width: 1024px) {
          .header-content {
            padding: 0 20px;
          }
          
          .stats-dashboard,
          .levels-container {
            padding: 0 20px;
          }
        }

        @media (max-width: 768px) {
          .header h1 {
            font-size: 22px;
            min-width: auto;
          }
          
          .header-content {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          
          .logout-btn {
            font-size: 12px;
            padding: 6px 14px;
          }
          
          .stats-dashboard {
            grid-template-columns: 1fr;
            margin: 30px auto;
          }
          
          .levels-header {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          
          .levels-grid {
            grid-template-columns: 1fr;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
          }
          
          .level-actions {
            flex-direction: column;
          }
          
          .modal-content {
            margin: 10px;
            padding: 25px;
          }
        }

        @media (max-width: 480px) {
          .header h1 {
            font-size: 20px;
            text-align: center;
          }
          
          .logout-btn {
            font-size: 11px;
            padding: 5px 12px;
          }
        }
      `}</style>
      <div className="secure-levels-manager">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <h1>🏢 ONDO Levels Management System</h1>
            {/* <button onClick={handleLogout} className="logout-btn">
              🔒 Logout
            </button> */}
          </div>
          
          {message && (
            <div className="message-banner">
              <div>{message}</div>
            </div>
          )}
        </div>

        {/* Statistics Dashboard */}
        <div className="stats-dashboard">
          <div className="stat-card total-levels">
            <Users className="stat-icon" />
            <div className="stat-content">
              <h3>{totalLevels}</h3>
              <p>Total Levels</p>
            </div>
          </div>
          
          <div className="stat-card highest-discount">
            <TrendingUp className="stat-icon" />
            <div className="stat-content">
              <h3>{highestDiscount}%</h3>
              <p>Highest Discount</p>
            </div>
          </div>
          
          <div className="stat-card avg-discount">
            <TrendingUp className="stat-icon rotate" />
            <div className="stat-content">
              <h3>{avgDiscount}%</h3>
              <p>Average Discount</p>
            </div>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="levels-container">
          <div className="levels-header">
            <h2>📊 Current Levels ({totalLevels})</h2>
            <button 
              onClick={() => setEditingLevel('NEW')}
              className="add-level-btn"
            >
              ➕ Add New Level
            </button>
          </div>

          <div className="levels-grid">
            {Object.entries(levels).map(([levelName, levelData]) => (
              <div key={levelName} className="level-card">
                <div className="level-header">
                  <h3>{levelName}</h3>
                  <div className="discount-badge">
                    {levelData.discount}%
                  </div>
                </div>
                
                <div className="level-details">
                  <div className="detail-row">
                    <span className="label">💰 Self Sale:</span>
                    <span className="value">₹{levelData.selfSale?.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">👥 Team Req:</span>
                    <span className="value">{levelData.teamRequirement}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">🎯 Team Role:</span>
                    <span className="value">{levelData.teamRole || 'None'}</span>
                  </div>
                </div>
                
                <div className="level-actions">
                  <button 
                    onClick={() => setEditingLevel(levelName)}
                    className="edit-btn"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => deleteLevel(levelName)}
                    className="delete-btn"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modals */}
        {editingLevel && editingLevel !== 'NEW' && (
          <LevelEditForm
            levelName={editingLevel}
            levelData={levels[editingLevel]}
            onSave={updateLevel}
            onCancel={() => setEditingLevel(null)}
          />
        )}

        {editingLevel === 'NEW' && (
          <NewLevelForm
            onAdd={addNewLevel}
            onCancel={() => setEditingLevel(null)}
          />
        )}
      </div>
    </>
  );
};

export default LevelsManager;
