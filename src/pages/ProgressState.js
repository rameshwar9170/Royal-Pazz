import React, { useEffect, useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase/config';

// Explicit level order
const LEVEL_ORDER = [
  'Agency', 'Mega Agency', 'Diamond Agency', 'Dealer', 'Mega Dealer',
  'Distributor', 'Mega Distributor', 'Diamond Distributor', 'Wholesaler',
  'Mega Wholesaler', 'Diamond Wholesaler'
];

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
  const analyzeTeamStructure = (team) => {
    const breakdown = {};
    LEVEL_ORDER.forEach(level => {
      breakdown[level] = team.filter(member => 
        member.currentLevel === level && member.isActive === true
      ).length;
    });
    
    return {
      breakdown,
      totalActive: team.filter(member => member.isActive === true).length,
      totalMembers: team.length
    };
  };

  // Helper function to calculate level based on criteria with detailed checking
  const calculateLevel = (sales, teamAnalysis, levels) => {
    let qualifiedLevel = 'Agency';
    
    for (const level of levels) {
      const levelData = level;
      let qualified = false;
      
      // Check sales criteria first (higher priority)
      if (levelData.selfSale > 0) {
        qualified = sales >= levelData.selfSale;
      }
      // Check team requirements (only if no sales requirement)
      else if (levelData.teamRequirement > 0 && levelData.teamRole) {
        const requiredCount = levelData.teamRequirement;
        const currentCount = teamAnalysis.breakdown[levelData.teamRole] || 0;
        qualified = currentCount >= requiredCount;
      }
      // Default level (Agency)
      else if (levelData.name === 'Agency') {
        qualified = true;
      }
      
      if (qualified) {
        qualifiedLevel = levelData.name;
      }
    }
    
    return qualifiedLevel;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const storedUser = JSON.parse(localStorage.getItem('htamsUser'));
        if (!storedUser?.uid) {
          throw new Error('User authentication required');
        }

        const uid = storedUser.uid;
        const userRef = ref(db, `HTAMS/users/${uid}`);
        const levelsRef = ref(db, `HTAMS/Levels`);
        const usersRef = ref(db, `HTAMS/users`);

        // Fetch user data
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists()) {
          throw new Error('User profile not found');
        }

        const userData = userSnapshot.val();
        const userTotalSales = userData?.analytics?.totalSales || 0;
        const userCurrentLevel = userData?.currentLevel || 'Agency';
        
        setTotalSales(parseInt(userTotalSales));
        setCurrentLevel(userCurrentLevel);

        // Fetch all users to build comprehensive team structure
        const usersSnapshot = await get(usersRef);
        let teamMembers = [];
        
        if (usersSnapshot.exists()) {
          const allUsers = usersSnapshot.val();
          // Find direct team members (users referred by current user)
          teamMembers = Object.entries(allUsers)
            .map(([id, user]) => ({ id, ...user }))
            .filter(user => 
              user.referredBy === uid && 
              user.id !== uid && // Exclude self
              user.hasOwnProperty('isActive') // Must have active status
            );
        }
        
        setUserTeam(teamMembers);
        
        // Analyze team structure
        const teamAnalysis = analyzeTeamStructure(teamMembers);
        setTeamBreakdown(teamAnalysis);

        // Fetch levels configuration
        const levelsSnapshot = await get(levelsRef);
        if (!levelsSnapshot.exists()) {
          throw new Error('System configuration error');
        }

        const levelData = levelsSnapshot.val();
        const levelsArray = LEVEL_ORDER.map(name => ({
          name,
          ...levelData[name]
        })).filter(level => level.discount !== undefined);
        
        if (levelsArray.length === 0) {
          throw new Error('Invalid system configuration');
        }
        
        setLevels(levelsArray);

        // Calculate and update level if needed
        const calculatedLevel = calculateLevel(userTotalSales, teamAnalysis, levelsArray);
        
        if (calculatedLevel !== userCurrentLevel) {
          // Update level in database
          await update(userRef, { 
            currentLevel: calculatedLevel,
            lastLevelUpdate: Date.now(),
            levelUpdatedBy: 'system'
          });
          setCurrentLevel(calculatedLevel);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'System temporarily unavailable');
      } finally {
        setLoading(false);
        // Trigger progress animation after loading
        setTimeout(() => setAnimateProgress(true), 500);
      }
    };
    
    fetchData();
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
          
          // Calculate progress based on criteria
          if (nextLevelData.selfSale > 0) {
            progress = Math.min((totalSales / nextLevelData.selfSale) * 100, 100);
            requirement = {
              type: 'sales',
              needed: nextLevelData.selfSale,
              current: totalSales,
              remaining: Math.max(0, nextLevelData.selfSale - totalSales)
            };
          } else if (nextLevelData.teamRequirement > 0 && nextLevelData.teamRole) {
            const currentCount = teamBreakdown.breakdown[nextLevelData.teamRole] || 0;
            progress = Math.min((currentCount / nextLevelData.teamRequirement) * 100, 100);
            requirement = {
              type: 'team',
              role: nextLevelData.teamRole,
              needed: nextLevelData.teamRequirement,
              current: currentCount,
              remaining: Math.max(0, nextLevelData.teamRequirement - currentCount)
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
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '28px',
      padding: '20px',
      margin: '12px',
      boxShadow: '0 25px 80px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)'
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

      {/* Enhanced Horizontal Compact Layout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
        zIndex: 3,
        flexWrap: 'wrap'
      }}>
        {/* Enhanced Current Level Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          minWidth: '240px',
          flex: '1',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '16px',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FFD700, #FF9800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 8px 25px rgba(255, 215, 0, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
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
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '4px',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              🏆 CURRENT LEVEL
            </div>
            <div style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: '900',
              marginBottom: '4px',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {currentLevel}
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
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
              <span>₹{totalSales.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Team Section with Detailed Analytics */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '16px',
          minWidth: '180px',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            color: '#fff',
            fontSize: '13px',
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
          
          {/* Enhanced Team Level Breakdown */}
          {Object.entries(teamBreakdown.breakdown || {}).some(([_, count]) => count > 0) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: '8px'
            }}>
              {Object.entries(teamBreakdown.breakdown || {})
                .filter(([_, count]) => count > 0)
                .slice(0, 4) // Show top 4 levels
                .map(([level, count], index) => (
                  <div key={level} style={{
                    background: `linear-gradient(45deg, ${
                      ['rgba(76,175,80,0.8)', 'rgba(33,150,243,0.8)', 'rgba(255,193,7,0.8)', 'rgba(156,39,176,0.8)'][index % 4]
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

        {/* Enhanced Next Level Progress Section */}
        {!isMaxLevel && nextLevelData && levelRequirement && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '16px',
            minWidth: '260px',
            flex: '1',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{
                  color: '#90CAF9',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '4px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  🎯 NEXT MILESTONE
                </div>
                <div style={{
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '800',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  {nextLevel}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '11px'
                }}>
                  {nextLevelData.discount}% Discount
                </div>
              </div>
              <div style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                background: progressPercentage >= 100 
                  ? 'radial-gradient(circle, #4CAF50, #2E7D32)'
                  : 'rgba(144, 202, 249, 0.2)',
                border: progressPercentage < 100 ? '2px dashed #90CAF9' : '2px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                boxShadow: progressPercentage >= 100 
                  ? '0 4px 20px rgba(76,175,80,0.4)'
                  : '0 4px 20px rgba(144,202,249,0.3)',
                animation: progressPercentage >= 100 ? 'celebrate 2s infinite' : 'none'
              }}>
                {progressPercentage >= 100 ? '🎉' : '🚀'}
              </div>
            </div>

            {/* Enhanced Requirement Details */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '10px',
              marginBottom: '12px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.9)',
              lineHeight: '1.4'
            }}>
              {levelRequirement.type === 'sales' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <strong>Target:</strong><br/>
                    ₹{levelRequirement.needed.toLocaleString()}
                  </div>
                  <div>
                    <strong>Remaining:</strong><br/>
                    <span style={{ 
                      color: levelRequirement.remaining === 0 ? '#4CAF50' : '#FFD700',
                      fontWeight: 'bold' 
                    }}>
                      ₹{levelRequirement.remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <strong>Need:</strong><br/>
                    {levelRequirement.needed} {levelRequirement.role}s
                  </div>
                  <div>
                    <strong>Have:</strong><br/>
                    {levelRequirement.current}
                  </div>
                  <div>
                    <strong>Missing:</strong><br/>
                    <span style={{ 
                      color: levelRequirement.remaining === 0 ? '#4CAF50' : '#FFD700',
                      fontWeight: 'bold' 
                    }}>
                      {levelRequirement.remaining}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Animated Progress Bar */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '15px',
              height: '12px',
              overflow: 'hidden',
              marginBottom: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                width: animateProgress ? `${Math.min(progressPercentage, 100)}%` : '0%',
                height: '100%',
                background: progressPercentage >= 100 
                  ? 'linear-gradient(90deg, #4CAF50, #8BC34A, #4CAF50)'
                  : 'linear-gradient(90deg, #2196F3, #21CBF3, #03DAC6)',
                borderRadius: '15px',
                transition: 'width 2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: progressPercentage >= 100 
                  ? '0 0 20px rgba(76,175,80,0.6)'
                  : '0 0 20px rgba(33,150,243,0.6)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s linear infinite'
              }}>
                {/* Animated glow effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  borderRadius: '15px',
                  animation: 'slide 2s linear infinite'
                }}></div>
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {progressPercentage >= 100 ? (
                <span style={{ color: '#4CAF50' }}>
                  🎉 READY TO UPGRADE!
                </span>
              ) : (
                `${Math.round(progressPercentage)}% Complete`
              )}
            </div>
          </div>
        )}

        {/* Enhanced Max Level Achievement */}
        {isMaxLevel && (
          <div style={{
            background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))',
            borderRadius: '20px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
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

      {/* Enhanced Animation Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        
        @keyframes celebrate {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(10deg); }
        }
        
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        /* Enhanced Responsive Design */
        @media (max-width: 900px) {
          div[gap="20px"] {
            gap: 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          div[min-width="240px"], div[min-width="180px"], div[min-width="260px"] {
            min-width: auto !important;
          }
        }
        
        @media (max-width: 768px) {
          div[font-size="18px"] {
            font-size: 16px !important;
          }
          div[font-size="24px"] {
            font-size: 20px !important;
          }
          div[width="60px"] {
            width: 50px !important;
            height: 50px !important;
          }
          div[width="45px"] {
            width: 35px !important;
            height: 35px !important;
          }
          div[padding="16px"] {
            padding: 12px !important;
          }
        }
        
        @media (max-width: 480px) {
          div[padding="20px"] {
            padding: 16px !important;
          }
          div[font-size="16px"] {
            font-size: 14px !important;
          }
          div[font-size="14px"] {
            font-size: 12px !important;
          }
          div[font-size="13px"] {
            font-size: 11px !important;
          }
          div[width="50px"] {
            width: 40px !important;
            height: 40px !important;
          }
          div[width="35px"] {
            width: 30px !important;
            height: 30px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressState;
