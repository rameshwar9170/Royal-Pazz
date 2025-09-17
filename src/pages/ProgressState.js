import React, { useEffect, useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase/config';

// Dynamic level order - will be fetched from Firebase HTAMS/Levels
let LEVEL_ORDER = [];

const ProgressState = () => {
  const [levels, setLevels] = useState([]);
  const [levelOrder, setLevelOrder] = useState([]); // Dynamic level order from Firebase
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

  // Enhanced function to count team members with cumulative level counting
  const analyzeTeamStructure = (team, currentLevelOrder) => {
    const breakdown = {};
    const cumulativeBreakdown = {};
    
    // Use dynamic level order or fallback to default
    const levelsToUse = currentLevelOrder.length > 0 ? currentLevelOrder : ['Agency'];
    
    // Initialize counts
    levelsToUse.forEach(level => {
      breakdown[level] = team.filter(member => 
        member.currentLevel === level && member.isActive === true
      ).length;
    });
    
    // Calculate cumulative counts (includes higher levels)
    // For example: Agency count includes Agency + Agency 24% + Agency 27% + Premium Agency + all higher levels
    levelsToUse.forEach((level, index) => {
      cumulativeBreakdown[level] = 0;
      
      // Count members at this level and all higher levels
      for (let i = index; i < levelsToUse.length; i++) {
        cumulativeBreakdown[level] += breakdown[levelsToUse[i]];
      }
    });
    
    console.log('Team structure analysis:', {
      exactBreakdown: breakdown,
      cumulativeBreakdown: cumulativeBreakdown,
      totalActive: team.filter(member => member.isActive === true).length,
      levelOrder: levelsToUse
    });
    
    return {
      breakdown, // Exact level counts
      cumulativeBreakdown, // Cumulative counts (includes higher levels)
      totalActive: team.filter(member => member.isActive === true).length,
      totalMembers: team.length
    };
  };

  // Enhanced function to calculate level based on comprehensive criteria checking
  const calculateLevel = (sales, teamAnalysis, levels, joinedTrainees = 0, currentLevelOrder) => {
    let qualifiedLevel = 'Agency'; // Default starting level
    
    // Use dynamic level order
    const levelsToUse = currentLevelOrder.length > 0 ? currentLevelOrder : ['Agency'];
    
    // Sort levels by progression order to ensure proper checking
    const sortedLevels = levels.sort((a, b) => {
      const aIndex = levelsToUse.indexOf(a.name);
      const bIndex = levelsToUse.indexOf(b.name);
      return aIndex - bIndex;
    });
    
    for (const level of sortedLevels) {
      const levelData = level;
      let qualified = false;
      
      console.log(`Checking level: ${levelData.name}`, {
        selfSale: levelData.selfSale,
        teamRequirement: levelData.teamRequirement,
        teamRole: levelData.teamRole,
        joinedTraineesRequirement: levelData.joinedTraineesRequirement,
        currentSales: sales,
        currentJoinedTrainees: joinedTrainees,
        teamAnalysis: teamAnalysis.breakdown
      });
      
      // Check multiple criteria - ALL must be met for qualification
      let criteriaChecks = [];
      
      // 1. Self Sales Requirement
      if (levelData.selfSale && levelData.selfSale > 0) {
        const salesMet = sales >= levelData.selfSale;
        criteriaChecks.push({
          type: 'sales',
          required: levelData.selfSale,
          current: sales,
          met: salesMet
        });
      }
      
      // 2. Team Requirement (specific level members) - Use cumulative counting
      if (levelData.teamRequirement && levelData.teamRequirement > 0 && levelData.teamRole) {
        // Use cumulative count which includes members at this level AND higher levels
        const currentCount = teamAnalysis.cumulativeBreakdown[levelData.teamRole] || 0;
        const teamMet = currentCount >= levelData.teamRequirement;
        criteriaChecks.push({
          type: 'team',
          role: levelData.teamRole,
          required: levelData.teamRequirement,
          current: currentCount,
          met: teamMet
        });
      }
      
      // 3. Joined Trainees Requirement
      if (levelData.joinedTraineesRequirement && levelData.joinedTraineesRequirement > 0) {
        const traineesMet = joinedTrainees >= levelData.joinedTraineesRequirement;
        criteriaChecks.push({
          type: 'trainees',
          required: levelData.joinedTraineesRequirement,
          current: joinedTrainees,
          met: traineesMet
        });
      }
      
      // 4. Default level (Agency) - always qualified
      if (levelData.name === 'Agency') {
        qualified = true;
      } else {
        // All criteria must be met for higher levels
        qualified = criteriaChecks.length > 0 && criteriaChecks.every(check => check.met);
      }
      
      console.log(`Level ${levelData.name} qualification:`, {
        qualified,
        criteriaChecks
      });
      
      if (qualified) {
        qualifiedLevel = levelData.name;
      }
    }
    
    console.log(`Final qualified level: ${qualifiedLevel}`);
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

        // Fetch user data with comprehensive analytics
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists()) {
          throw new Error('User profile not found');
        }

        const userData = userSnapshot.val();
        const userTotalSales = userData?.analytics?.totalSales || 0;
        const userCurrentLevel = userData?.currentLevel || 'Agency';
        
        // Fetch joined trainees count from HTAMS/JoinedTrainees
        const joinedTraineesRef = ref(db, 'HTAMS/JoinedTrainees');
        const joinedTraineesSnapshot = await get(joinedTraineesRef);
        let userJoinedTrainees = 0;
        
        if (joinedTraineesSnapshot.exists()) {
          const allTrainees = joinedTraineesSnapshot.val();
          // Count trainees referred by current user
          userJoinedTrainees = Object.values(allTrainees).filter(trainee => 
            trainee.referredBy === uid || trainee.referrer === uid
          ).length;
        }
        
        console.log('User data loaded:', {
          uid,
          totalSales: userTotalSales,
          currentLevel: userCurrentLevel,
          joinedTrainees: userJoinedTrainees
        });
        
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
        
        // Fetch levels configuration from Firebase first
        const levelsSnapshot = await get(levelsRef);
        if (!levelsSnapshot.exists()) {
          throw new Error('System configuration error');
        }

        const levelData = levelsSnapshot.val();
        
        // Extract level names dynamically from Firebase and create progression order
        const availableLevels = Object.keys(levelData);
        
        // Define the logical progression order based on your business logic
        const progressionOrder = [
          'Agency',
          'Agency 24%',
          'Agency 27%', 
          'Premium Agency',
          'Dealer',
          'Premium Dealer',
          'Distributor',
          'Premium Distributor',
          'Wholesaler',
          'Premium Wholesaler'
        ];
        
        // Filter to only include levels that exist in Firebase
        const dynamicLevelOrder = progressionOrder.filter(level => availableLevels.includes(level));
        
        // Add any Firebase levels not in our predefined order (at the end)
        const additionalLevels = availableLevels.filter(level => !progressionOrder.includes(level));
        const finalLevelOrder = [...dynamicLevelOrder, ...additionalLevels];

        setUserTeam(teamMembers);
        
        // Analyze team structure with dynamic level order (now finalLevelOrder is available)
        const teamAnalysis = analyzeTeamStructure(teamMembers, finalLevelOrder);
        setTeamBreakdown(teamAnalysis);
        
        // Update global LEVEL_ORDER and state
        LEVEL_ORDER = finalLevelOrder;
        setLevelOrder(finalLevelOrder);
        
        console.log('Dynamic level order loaded from Firebase:', {
          availableLevels,
          finalLevelOrder,
          totalLevels: finalLevelOrder.length
        });
        
        // Create levels array with Firebase data
        const levelsArray = finalLevelOrder.map(name => ({
          name,
          ...levelData[name]
        })).filter(level => level.discount !== undefined);
        
        if (levelsArray.length === 0) {
          throw new Error('Invalid system configuration');
        }
        
        setLevels(levelsArray);

        // Calculate and update level if needed with comprehensive checking
        const calculatedLevel = calculateLevel(userTotalSales, teamAnalysis, levelsArray, userJoinedTrainees, finalLevelOrder);
        
        console.log('Level calculation result:', {
          current: userCurrentLevel,
          calculated: calculatedLevel,
          shouldUpdate: calculatedLevel !== userCurrentLevel
        });
        
        if (calculatedLevel !== userCurrentLevel) {
          console.log(`Updating user level from ${userCurrentLevel} to ${calculatedLevel}`);
          
          // Update level in database with detailed tracking
          await update(userRef, { 
            currentLevel: calculatedLevel,
            previousLevel: userCurrentLevel,
            lastLevelUpdate: Date.now(),
            levelUpdatedBy: 'system-auto',
            levelUpdateReason: 'criteria-met',
            levelUpdateData: {
              sales: userTotalSales,
              teamSize: teamAnalysis.totalActive,
              joinedTrainees: userJoinedTrainees,
              timestamp: new Date().toISOString()
            }
          });
          setCurrentLevel(calculatedLevel);
          
          // Log level change for debugging
          console.log('✅ Level updated successfully:', {
            from: userCurrentLevel,
            to: calculatedLevel,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('No level update needed - user already at correct level');
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
    if (levels.length > 0 && teamBreakdown.breakdown && levelOrder.length > 0) {
      const currentIndex = levelOrder.indexOf(currentLevel);
      const nextLevelIndex = currentIndex + 1;
      
      if (nextLevelIndex < levelOrder.length) {
        const nextLevelName = levelOrder[nextLevelIndex];
        const nextLevelData = levels.find(level => level.name === nextLevelName);
        
        setNextLevel(nextLevelName);
        
        if (nextLevelData) {
          let progress = 0;
          let requirement = null;
          
          // Calculate progress based on comprehensive criteria
          let progressComponents = [];
          let requirements = [];
          
          // Sales requirement
          if (nextLevelData.selfSale && nextLevelData.selfSale > 0) {
            const salesProgress = Math.min((totalSales / nextLevelData.selfSale) * 100, 100);
            progressComponents.push(salesProgress);
            requirements.push({
              type: 'sales',
              needed: nextLevelData.selfSale,
              current: totalSales,
              remaining: Math.max(0, nextLevelData.selfSale - totalSales),
              progress: salesProgress,
              met: totalSales >= nextLevelData.selfSale
            });
          }
          
          // Team requirement - Use cumulative counting for progress display too
          if (nextLevelData.teamRequirement && nextLevelData.teamRequirement > 0 && nextLevelData.teamRole) {
            const currentCount = teamBreakdown.cumulativeBreakdown[nextLevelData.teamRole] || 0;
            const teamProgress = Math.min((currentCount / nextLevelData.teamRequirement) * 100, 100);
            progressComponents.push(teamProgress);
            requirements.push({
              type: 'team',
              role: nextLevelData.teamRole,
              needed: nextLevelData.teamRequirement,
              current: currentCount,
              remaining: Math.max(0, nextLevelData.teamRequirement - currentCount),
              progress: teamProgress,
              met: currentCount >= nextLevelData.teamRequirement
            });
          }
          
          // Joined trainees requirement
          if (nextLevelData.joinedTraineesRequirement && nextLevelData.joinedTraineesRequirement > 0) {
            // Get joined trainees count from state or fetch it
            const userJoinedTrainees = 0; // This should be fetched from HTAMS/JoinedTrainees
            const traineesProgress = Math.min((userJoinedTrainees / nextLevelData.joinedTraineesRequirement) * 100, 100);
            progressComponents.push(traineesProgress);
            requirements.push({
              type: 'trainees',
              needed: nextLevelData.joinedTraineesRequirement,
              current: userJoinedTrainees,
              remaining: Math.max(0, nextLevelData.joinedTraineesRequirement - userJoinedTrainees),
              progress: traineesProgress,
              met: userJoinedTrainees >= nextLevelData.joinedTraineesRequirement
            });
          }
          
          // Calculate overall progress (minimum of all requirements)
          progress = progressComponents.length > 0 ? Math.min(...progressComponents) : 0;
          
          // Set the primary requirement for display (first unmet requirement or first requirement)
          const unmetRequirement = requirements.find(req => !req.met);
          requirement = unmetRequirement || requirements[0] || null;
          
          setProgressPercentage(progress);
          setLevelRequirement(requirement);
        }
      } else {
        setNextLevel('');
        setProgressPercentage(100);
        setLevelRequirement(null);
      }
    }
  }, [levels, currentLevel, totalSales, teamBreakdown, levelOrder]);

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
          
          {/* Enhanced Team Level Breakdown - Show both exact and cumulative counts */}
          {Object.entries(teamBreakdown.breakdown || {}).some(([_, count]) => count > 0) && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '8px'
            }}>
              {/* Exact level counts */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px'
              }}>
                {Object.entries(teamBreakdown.breakdown || {})
                  .filter(([_, count]) => count > 0)
                  .slice(0, 4)
                  .map(([level, count], index) => (
                    <div key={level} style={{
                      background: `linear-gradient(45deg, ${
                        ['rgba(76,175,80,0.8)', 'rgba(33,150,243,0.8)', 'rgba(255,193,7,0.8)', 'rgba(156,39,176,0.8)'][index % 4]
                      }, rgba(255,255,255,0.2))`,
                      borderRadius: '10px',
                      padding: '3px 6px',
                      fontSize: '9px',
                      color: '#fff',
                      fontWeight: '700',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {count} {level.split(' ')[0]}
                    </div>
                  ))}
              </div>
              
              {/* Show cumulative counts for team requirements */}
              {teamBreakdown.cumulativeBreakdown && (
                <div style={{
                  fontSize: '8px',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: '500'
                }}>
                  Team Power: Agency+ {teamBreakdown.cumulativeBreakdown['Agency'] || 0} | 
                  Dealer+ {teamBreakdown.cumulativeBreakdown['Dealer'] || 0} | 
                  Distributor+ {teamBreakdown.cumulativeBreakdown['Distributor'] || 0}
                </div>
              )}
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
  