import React, { useEffect, useState } from 'react';
import { ref, get, onValue, off } from 'firebase/database';
import { db } from '../firebase/config';

// Dynamic level order - will be populated from Firebase
let LEVEL_ORDER = [];

// Helper function to determine level order based on requirements
const determineLevelOrder = (levelData) => {
  const levels = Object.keys(levelData);

  // Sort levels by discount percentage (ascending) and sales requirements
  return levels.sort((a, b) => {
    const levelA = levelData[a];
    const levelB = levelData[b];

    // First sort by sales requirement (0 sales first, then ascending)
    if (levelA.selfSale === 0 && levelB.selfSale > 0) return -1;
    if (levelA.selfSale > 0 && levelB.selfSale === 0) return 1;
    if (levelA.selfSale !== levelB.selfSale) return levelA.selfSale - levelB.selfSale;

    // Then by discount percentage
    return levelA.discount - levelB.discount;
  });
};

const ProgressState = () => {
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState('Agency');
  const [totalSales, setTotalSales] = useState(0);
  const [userTeam, setUserTeam] = useState([]);
  const [teamBreakdown, setTeamBreakdown] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextLevel, setNextLevel] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [levelRequirement, setLevelRequirement] = useState(null);
  const [animateProgress, setAnimateProgress] = useState(false);

  // Helper function to count team members by level with detailed breakdown
  const analyzeTeamStructure = (team, availableLevels = []) => {
    const breakdown = {};

    // Initialize breakdown with all available levels
    availableLevels.forEach(levelName => {
      breakdown[levelName] = 0;
    });

    // Count team members by their current level
    team.forEach(member => {
      if (member.isActive === true && member.currentLevel) {
        if (breakdown.hasOwnProperty(member.currentLevel)) {
          breakdown[member.currentLevel]++;
        } else {
          // Handle levels not in our current structure
          breakdown[member.currentLevel] = (breakdown[member.currentLevel] || 0) + 1;
        }
      }
    });

    return {
      breakdown,
      totalActive: team.filter(member => member.isActive === true).length,
      totalMembers: team.length
    };
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('htamsUser'));
    if (!storedUser?.uid) {
      setError('User authentication required');
      setLoading(false);
      return;
    }

    const uid = storedUser.uid;
    const userRef = ref(db, `HTAMS/users/${uid}`);
    const levelsRef = ref(db, `HTAMS/Levels`);
    const usersRef = ref(db, `HTAMS/users`);

    let unsubscribeUser = null;
    let unsubscribeUsers = null;

    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch levels configuration (one-time read)
        const levelsSnapshot = await get(levelsRef);
        if (!levelsSnapshot.exists()) {
          throw new Error('Level configuration not found in Firebase');
        }

        const levelData = levelsSnapshot.val();
        console.log('🔥 FIREBASE LEVELS DATA:', levelData);

        // Determine dynamic level order
        LEVEL_ORDER = determineLevelOrder(levelData);
        console.log('🎯 DYNAMIC LEVEL ORDER:', LEVEL_ORDER);

        // Create levels array with proper structure
        const levelsArray = LEVEL_ORDER.map(name => ({
          name,
          ...levelData[name]
        })).filter(level => level.discount !== undefined);

        if (levelsArray.length === 0) {
          throw new Error('No valid levels found in Firebase configuration');
        }

        console.log('✅ Processed levels array:', levelsArray);
        setLevels(levelsArray);

        // ✅ REAL-TIME LISTENER: Listen to user's own data changes
        unsubscribeUser = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const userTotalSales = userData?.analytics?.totalSales || 0;
            const userCurrentLevel = userData?.currentLevel || 'Agency';

            console.log('👤 User data updated:', {
              level: userCurrentLevel,
              sales: userTotalSales
            });

            setTotalSales(parseInt(userTotalSales));
            setCurrentLevel(userCurrentLevel); // ✅ Accept backend level changes
          }
        }, (error) => {
          console.error('Error listening to user data:', error);
        });

        // ✅ REAL-TIME LISTENER: Listen to all users for team updates
        unsubscribeUsers = onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const allUsers = snapshot.val();
            // Find direct team members (users referred by current user)
            const teamMembers = Object.entries(allUsers)
              .map(([id, user]) => ({ id, ...user }))
              .filter(user =>
                user.referredBy === uid &&
                user.id !== uid &&
                user.hasOwnProperty('isActive')
              );

            console.log('👥 Team members updated:', teamMembers.length);
            setUserTeam(teamMembers);

            // Analyze team structure
            const teamAnalysis = analyzeTeamStructure(teamMembers, LEVEL_ORDER);
            setTeamBreakdown(teamAnalysis);

            console.log('📊 Team breakdown:', teamAnalysis.breakdown);
          }
        }, (error) => {
          console.error('Error listening to users data:', error);
        });

        setLoading(false);
        // Trigger progress animation after loading
        setTimeout(() => setAnimateProgress(true), 500);

      } catch (error) {
        console.error('Error initializing data:', error);
        setError(error.message || 'System temporarily unavailable');
        setLoading(false);
      }
    };

    initializeData();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeUser) off(userRef);
      if (unsubscribeUsers) off(usersRef);
    };
  }, []);

  // Calculate next level requirements and progress
  useEffect(() => {
    if (levels.length > 0 && teamBreakdown.breakdown) {
      const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
      const nextLevelIndex = currentIndex + 1;

      if (nextLevelIndex < LEVEL_ORDER.length) {
        const nextLevelName = LEVEL_ORDER[nextLevelIndex];
        const nextLevelData = levels.find(level => level.name === nextLevelName);

        setNextLevel(nextLevelName);

        if (nextLevelData) {
          let progress = 0;
          let requirement = null;

          // ✅ Calculate progress for DISPLAY ONLY (not for upgrading)
          if (nextLevelData.selfSale > 0) {
            progress = Math.min((totalSales / nextLevelData.selfSale) * 100, 100);
            requirement = {
              type: 'sales',
              needed: nextLevelData.selfSale,
              current: totalSales,
              remaining: Math.max(0, nextLevelData.selfSale - totalSales)
            };
          }

          // Check if BOTH conditions need to be met
          if (nextLevelData.teamRequirement > 0 && nextLevelData.teamRole) {
            const currentCount = teamBreakdown.breakdown[nextLevelData.teamRole] || 0;
            const teamProgress = Math.min((currentCount / nextLevelData.teamRequirement) * 100, 100);

            // If both conditions required, use minimum progress
            if (nextLevelData.selfSale > 0) {
              progress = Math.min(progress, teamProgress);
            } else {
              progress = teamProgress;
            }

            requirement = {
              type: 'both',
              sales: nextLevelData.selfSale > 0 ? {
                needed: nextLevelData.selfSale,
                current: totalSales,
                remaining: Math.max(0, nextLevelData.selfSale - totalSales)
              } : null,
              team: {
                role: nextLevelData.teamRole,
                needed: nextLevelData.teamRequirement,
                current: currentCount,
                remaining: Math.max(0, nextLevelData.teamRequirement - currentCount)
              }
            };
          }

          setProgressPercentage(progress);
          setLevelRequirement(requirement);
        }
      } else {
        setNextLevel('');
        setProgressPercentage(100);
        setLevelRequirement(null);
      }
    }
  }, [levels, currentLevel, totalSales, teamBreakdown]);

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '24px',
        padding: '24px',
        margin: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '120px',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background particles */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="11" cy="11" r="2"%3E%3Canimate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/%3E%3C/circle%3E%3Ccircle cx="49" cy="11" r="2"%3E%3Canimate attributeName="r" values="2;4;2" dur="2s" begin="0.5s" repeatCount="indefinite"/%3E%3C/circle%3E%3Ccircle cx="11" cy="49" r="2"%3E%3Canimate attributeName="r" values="2;4;2" dur="2s" begin="1s" repeatCount="indefinite"/%3E%3C/circle%3E%3Ccircle cx="49" cy="49" r="2"%3E%3Canimate attributeName="r" values="2;4;2" dur="2s" begin="1.5s" repeatCount="indefinite"/%3E%3C/circle%3E%3C/g%3E%3C/svg%3E")'
        }}></div>

        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(255,255,255,0.2)',
          borderTop: '4px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '20px',
          position: 'relative',
          zIndex: 2
        }}></div>
        <div style={{
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            color: '#fff',
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '4px'
          }}>
            Loading Your Journey
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            animation: 'pulse 2s infinite'
          }}>
            Analyzing progress & team structure...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
        borderRadius: '24px',
        padding: '20px',
        margin: '12px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        minHeight: '90px',
        boxShadow: '0 15px 45px rgba(255,107,107,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M0 0h20v20H0z"/%3E%3C/g%3E%3C/svg%3E")'
        }}></div>

        <div style={{ fontSize: '32px', marginRight: '16px', zIndex: 2 }}>⚠️</div>
        <div style={{ zIndex: 2 }}>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
            Unable to Load Progress
          </div>
          <div style={{ fontSize: '13px', opacity: '0.9' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  const currentLevelData = levels.find(level => level.name === currentLevel);
  const nextLevelData = nextLevel ? levels.find(level => level.name === nextLevel) : null;
  const isMaxLevel = currentLevel === LEVEL_ORDER[LEVEL_ORDER.length - 1];

  return (
    <div className="progress-state-container" style={{
      background: '#002B5C',
      borderRadius: '12px',
      padding: '8px',
      margin: '2px',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      maxWidth: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Enhanced Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)
        `,
        animation: 'float 6s ease-in-out infinite'
      }}></div>

      {/* Glassmorphism overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backdropFilter: 'blur(20px)',
        background: 'rgba(255,255,255,0.05)'
      }}></div>

      {/* Rest of your JSX remains the same... */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        zIndex: 3
      }}>
        {/* Top Row - Current Level and Team Power */}
        <div className="dashboard-top-row" style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '4px',
          marginBottom: '6px',
          width: '100%',
          overflow: 'hidden'
        }}>
          {/* Current Level Section */}
          <div className="current-level-section" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '1',
            minWidth: '0',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '8px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFD700, #FF9800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3), inset 0 2px 4px rgba(255,255,255,0.3)',
              flexShrink: 0,
              position: 'relative',
              border: '2px solid rgba(255,255,255,0.3)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '20px',
                height: '20px',
                background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#fff',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(76,175,80,0.4)'
              }}>
                ✓
              </div>
              👑
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: '#FFD700',
                fontSize: '11px',
                fontWeight: '700',
                marginBottom: '4px',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                🏆 CURRENT LEVEL
              </div>
              <div style={{
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                marginBottom: '4px',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                {currentLevel}
              </div>
              <div style={{
                display: 'flex',
                gap: '6px',
                color: 'rgba(255,255,255,0.9)',
                fontSize: '12px'
              }}>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}>
                  {currentLevelData?.discount}% Discount
                </span>
                <span>₹{totalSales.toLocaleString()} Tot. Comm.</span>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="team-section" style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '8px',
            flex: '1',
            minWidth: '0',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              color: '#fff',
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              👥 TEAM POWER
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: teamBreakdown.totalActive > 0 ? '#4CAF50' : '#FF9800',
                animation: 'pulse 2s infinite',
                boxShadow: `0 0 10px ${teamBreakdown.totalActive > 0 ? '#4CAF50' : '#FF9800'}`
              }}></div>
            </div>

            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <div style={{
                color: '#fff',
                fontSize: '24px',
                fontWeight: '900',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                {teamBreakdown.totalActive || 0}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '11px',
                lineHeight: '1.3',
                flex: 1
              }}>
                Active Members
                {teamBreakdown.totalMembers > teamBreakdown.totalActive && (
                  <div style={{ opacity: 0.7 }}>
                    ({teamBreakdown.totalMembers} total)
                  </div>
                )}
              </div>
            </div>

            {/* Team Level Breakdown */}
            {Object.entries(teamBreakdown.breakdown || {}).some(([_, count]) => count > 0) && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '8px'
              }}>
                {Object.entries(teamBreakdown.breakdown || {})
                  .filter(([_, count]) => count > 0)
                  .slice(0, 4)
                  .map(([level, count], index) => (
                    <div key={level} style={{
                      background: `linear-gradient(45deg, ${['rgba(76,175,80,0.8)', 'rgba(33,150,243,0.8)', 'rgba(255,193,7,0.8)', 'rgba(156,39,176,0.8)'][index % 4]
                        }, rgba(255,255,255,0.2))`,
                      borderRadius: '12px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      color: '#fff',
                      fontWeight: '700',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {count} {level.split(' ')[level.split(' ').length - 1]}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Next Level Progress Section */}
        {!isMaxLevel && nextLevelData && levelRequirement && (
          <div className="next-level-section" style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '14px',
            width: '100%',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 6px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '10px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                flex: '1',
                minWidth: '200px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '8px'
              }}>
                <div style={{
                  color: '#90CAF9',
                  fontSize: '11px',
                  fontWeight: '700',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  🎯 NEXT MILESTONE
                  <div style={{
                    background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                    borderRadius: '8px',
                    padding: '1px 6px',
                    fontSize: '8px',
                    color: '#fff',
                    fontWeight: '800'
                  }}>
                    UPGRADE
                  </div>
                </div>
                <div style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '4px'
                }}>
                  {nextLevel}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    background: 'linear-gradient(45deg, #FFD700, #FFA000)',
                    borderRadius: '8px',
                    padding: '2px 6px',
                    fontSize: '9px',
                    color: '#fff',
                    fontWeight: '700'
                  }}>
                    {nextLevelData.discount}% Discount
                  </div>
                  {nextLevelData.selfSale > 0 && (
                    <div style={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '1px 4px'
                    }}>
                      ₹{nextLevelData.selfSale.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                flex: '1',
                minWidth: '200px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                borderRadius: '12px',
                padding: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  marginBottom: '6px',
                  textAlign: 'center'
                }}>
                  📋 LEVEL REQUIREMENTS
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {nextLevelData.selfSale > 0 && (
                    <div style={{
                      fontSize: '9px',
                      color: '#f4f4f4ff',
                      textAlign: 'center'
                    }}>
                      💰 ₹{nextLevelData.selfSale.toLocaleString()} Sales
                    </div>
                  )}
                  {nextLevelData.teamRequirement > 0 && nextLevelData.teamRole && (
                    <div style={{
                      fontSize: '9px',
                      color: '#ffffffff',
                      textAlign: 'center'
                    }}>
                      👥 {nextLevelData.teamRequirement} {nextLevelData.teamRole}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '15px',
              height: '10px',
              overflow: 'hidden',
              marginBottom: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                width: animateProgress ? `${Math.min(progressPercentage, 100)}%` : '0%',
                height: '100%',
                background: progressPercentage >= 100
                  ? 'linear-gradient(90deg, #4CAF50, #8BC34A, #4CAF50)'
                  : 'linear-gradient(90deg, #667eea, #764ba2, #667eea)',
                borderRadius: '15px',
                transition: 'width 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: progressPercentage >= 100
                  ? '0 0 25px rgba(76,175,80,0.7)'
                  : '0 0 25px rgba(102,126,234,0.7)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s linear infinite'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                  borderRadius: '15px',
                  animation: 'slide 2s linear infinite'
                }}></div>
              </div>
            </div>

            {/* Progress Status */}
            <div style={{
              textAlign: 'center',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {progressPercentage >= 100 ? (
                <div style={{
                  background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  display: 'inline-block',
                  boxShadow: '0 4px 15px rgba(76,175,80,0.4)',
                  animation: 'celebrate 2s infinite'
                }}>
                  🎉 READY TO UPGRADE!
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{Math.round(progressPercentage)}% Complete</span>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#90CAF9',
                    animation: 'pulse 2s infinite'
                  }}></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Max Level Achievement */}
        {isMaxLevel && (
          <div style={{
            background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))',
            borderRadius: '20px',
            padding: '20px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255,215,0,0.4)',
            boxShadow: '0 8px 32px rgba(255,215,0,0.3)'
          }}>
            <div style={{
              fontSize: '36px',
              animation: 'rotate 4s linear infinite'
            }}>
              🏆
            </div>
            <div>
              <div style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: '900',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                MAXIMUM LEVEL!
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                🌟 Ultimate Achievement Unlocked
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressState;
