import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  ref as dbRef, 
  push, 
  onValue, 
  update, 
  remove 
} from 'firebase/database';
import { database } from '../../firebase/config';
import {
  FaPlay,
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaYoutube,
  FaCalendarAlt,
  FaUser,
  FaClock
} from 'react-icons/fa';

// Create context for managing video players globally
const VideoPlayerContext = createContext();

// Provider component to manage all video players
const VideoPlayerProvider = ({ children }) => {
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState(null);
  const [videoPlayers, setVideoPlayers] = useState({});

  const registerPlayer = (videoId, playerControls) => {
    setVideoPlayers(prev => ({
      ...prev,
      [videoId]: playerControls
    }));
  };

  const unregisterPlayer = (videoId) => {
    setVideoPlayers(prev => {
      const newPlayers = { ...prev };
      delete newPlayers[videoId];
      return newPlayers;
    });
  };

  const playVideo = (videoId) => {
    // Stop/close all other videos first
    if (currentPlayingVideo && currentPlayingVideo !== videoId) {
      const previousPlayer = videoPlayers[currentPlayingVideo];
      if (previousPlayer && previousPlayer.stopPlayer) {
        previousPlayer.stopPlayer();
      }
    }
    
    // Set the new playing video
    setCurrentPlayingVideo(videoId);
  };

  const stopVideo = (videoId) => {
    if (currentPlayingVideo === videoId) {
      setCurrentPlayingVideo(null);
    }
  };

  return (
    <VideoPlayerContext.Provider value={{
      currentPlayingVideo,
      registerPlayer,
      unregisterPlayer,
      playVideo,
      stopVideo,
      videoPlayers
    }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

// Hook to use video player context
const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
};

const VideoSharingSystem = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    category: 'General'
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('htamsUser'));
    setUser(userData);
    
    // Check if user is admin
    if (userData && (userData.role === 'admin' || userData.role === 'superAdmin')) {
      setIsAdmin(true);
    }
    
    loadVideos();
  }, []);

  const loadVideos = () => {
    const videosRef = dbRef(database, 'HTAMS/trainingVideos');
    onValue(videosRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const videosArray = Object.entries(data)
          .map(([id, video]) => ({ id, ...video }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setVideos(videosArray);
      } else {
        setVideos([]);
      }
    });
  };

  // Extract YouTube video ID from URL
  const extractYouTubeID = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[22].length === 11 ? match[22] : null;
  };

  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const handleInputChange = (field, value) => {
    setNewVideo(prev => ({ ...prev, [field]: value }));
  };

  const validateYouTubeUrl = (url) => {
    const videoId = extractYouTubeID(url);
    return videoId !== null;
  };

  const shareVideo = async () => {
    if (!newVideo.title || !newVideo.youtubeUrl) {
      alert('Please fill in title and YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(newVideo.youtubeUrl)) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const videoId = extractYouTubeID(newVideo.youtubeUrl);
      const videoData = {
        title: newVideo.title,
        description: newVideo.description,
        youtubeUrl: newVideo.youtubeUrl,
        videoId: videoId,
        thumbnail: getYouTubeThumbnail(videoId),
        embedUrl: getYouTubeEmbedUrl(videoId),
        category: newVideo.category,
        sharedBy: user.uid,
        sharedByName: user.name,
        createdAt: new Date().toISOString(),
        views: 0,
        likes: {},
        totalLikes: 0
      };

      const videosRef = dbRef(database, 'HTAMS/trainingVideos');
      await push(videosRef, videoData);

      // Reset form
      setNewVideo({
        title: '',
        description: '',
        youtubeUrl: '',
        category: 'General'
      });
      
      setShowAddForm(false);
      alert('Video shared successfully!');
    } catch (error) {
      console.error('Error sharing video:', error);
      alert('Failed to share video');
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      const videoRef = dbRef(database, `HTAMS/trainingVideos/${videoId}`);
      await remove(videoRef);
      alert('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const incrementViews = async (videoId) => {
    try {
      const videoRef = dbRef(database, `HTAMS/trainingVideos/${videoId}/views`);
      const video = videos.find(v => v.id === videoId);
      if (video) {
        await update(dbRef(database, `HTAMS/trainingVideos/${videoId}`), {
          views: (video.views || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error updating views:', error);
    }
  };

  const categories = ['General', 'Training', 'Product Demo', 'Company News', 'Tutorial', 'Webinar'];

  return (
    <VideoPlayerProvider>
      <div className="video-sharing-container">
        {/* Header */}
        <div className="header">
          <h1>
            <FaYoutube className="youtube-icon" />
            Shared Training Videos
          </h1>
          <p>Watch training videos and tutorials shared by our team</p>
          
          {isAdmin && (
            <button 
              className="add-video-btn"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <FaPlus /> Share New Video
            </button>
          )}
        </div>

        {/* Add Video Form (Admin Only) */}
        {isAdmin && showAddForm && (
          <div className="add-video-form">
            <h3>Share New Video</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Video Title *</label>
                <input
                  type="text"
                  placeholder="Enter video title"
                  value={newVideo.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newVideo.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>YouTube URL *</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newVideo.youtubeUrl}
                  onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  placeholder="Enter video description"
                  value={newVideo.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button 
                className="share-btn" 
                onClick={shareVideo}
                disabled={loading}
              >
                {loading ? 'Sharing...' : 'Share Video'}
              </button>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="videos-grid">
          {videos.length === 0 ? (
            <div className="no-videos">
              <FaYoutube className="no-videos-icon" />
              <p>No videos shared yet</p>
              {isAdmin && (
                <button 
                  className="share-first-btn"
                  onClick={() => setShowAddForm(true)}
                >
                  Share First Video
                </button>
              )}
            </div>
          ) : (
            videos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                isAdmin={isAdmin}
                onDelete={deleteVideo}
                onPlay={incrementViews}
              />
            ))
          )}
        </div>

        <style jsx>{`
          .video-sharing-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Inter', sans-serif;
            background-color: #0f172a;
            min-height: 100vh;
            color: #e2e8f0;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
          }

          .header h1 {
            color: #e2e8f0;
            font-size: 2.5rem;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
          }

          .youtube-icon {
            color: #ff0000;
            font-size: 2.5rem;
          }

          .header p {
            color: #94a3b8;
            font-size: 1.1rem;
            margin-bottom: 20px;
          }

          .add-video-btn {
            background: linear-gradient(135deg, #ff0000, #cc0000);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 auto;
            transition: all 0.3s ease;
          }

          .add-video-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
          }

          .add-video-form {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .add-video-form h3 {
            color: #e2e8f0;
            margin-bottom: 20px;
            font-size: 1.5rem;
          }

          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
          }

          .form-group.full-width {
            grid-column: 1 / -1;
          }

          .form-group label {
            color: #cbd5e1;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 12px 16px;
            border: 2px solid #475569;
            border-radius: 8px;
            font-size: 16px;
            background: #334155;
            color: #e2e8f0;
            transition: all 0.3s ease;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #ff0000;
            box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
          }

          .form-group input::placeholder,
          .form-group textarea::placeholder {
            color: #94a3b8;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          .cancel-btn,
          .share-btn {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .cancel-btn {
            background: #475569;
            color: #e2e8f0;
            border: 1px solid #64748b;
          }

          .cancel-btn:hover {
            background: #64748b;
          }

          .share-btn {
            background: linear-gradient(135deg, #ff0000, #cc0000);
            color: white;
            border: none;
          }

          .share-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(255, 0, 0, 0.3);
          }

          .share-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .videos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 24px;
          }

          .no-videos {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
            color: #94a3b8;
          }

          .no-videos-icon {
            font-size: 4rem;
            color: #ff0000;
            margin-bottom: 16px;
          }

          .no-videos p {
            font-size: 1.2rem;
            margin-bottom: 20px;
          }

          .share-first-btn {
            background: linear-gradient(135deg, #ff0000, #cc0000);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          }

          @media (max-width: 768px) {
            .form-grid {
              grid-template-columns: 1fr;
            }
            
            .videos-grid {
              grid-template-columns: 1fr;
            }
            
            .header h1 {
              font-size: 2rem;
              flex-direction: column;
              gap: 10px;
            }
          }
        `}</style>
      </div>
    </VideoPlayerProvider>
  );
};

// Alternative approach using YouTube Data API for video duration
const VideoCard = ({ video, isAdmin, onDelete, onPlay }) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [watchedTime, setWatchedTime] = useState(0);
  const [user, setUser] = useState(null);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Use video player context
  const { 
    currentPlayingVideo, 
    registerPlayer, 
    unregisterPlayer, 
    playVideo, 
    stopVideo 
  } = useVideoPlayer();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('htamsUser'));
    setUser(userData);
    
    // Load progress from database for this user and video
    if (userData?.uid) {
      const progressRef = dbRef(database, `HTAMS/trainingVideos/${video.id}/progress/${userData.uid}`);
      onValue(progressRef, (snapshot) => {
        if (snapshot.exists()) {
          const progressData = snapshot.val();
          setWatchProgress(progressData.watchProgress || 0);
          setVideoDuration(progressData.videoDuration || 0);
          setWatchedTime(progressData.watchedTime || 0);
          setIsCompleted(progressData.isCompleted || false);
        } else {
          setWatchProgress(0);
          setWatchedTime(0);
          setIsCompleted(false);
        }
      });
    }
  }, [video.id]);

  // Fetch video duration from YouTube Data API or use estimated duration
  useEffect(() => {
    if (showPlayer && videoDuration === 0) {
      // Try to fetch duration from YouTube Data API (if available)
      // Or use a reasonable estimate based on video type
      const estimatedDuration = getEstimatedDuration(video.category);
      setVideoDuration(estimatedDuration);
    }
  }, [showPlayer, videoDuration, video.category]);

  const getEstimatedDuration = (category) => {
    // Provide reasonable estimates based on video category
    const durations = {
      'Training': 15 * 60, // 15 minutes
      'Tutorial': 10 * 60, // 10 minutes
      'Product Demo': 8 * 60, // 8 minutes
      'Webinar': 45 * 60, // 45 minutes
      'Company News': 5 * 60, // 5 minutes
      'General': 12 * 60 // 12 minutes
    };
    return durations[category] || durations['General'];
  };

  // Register player controls
  useEffect(() => {
    const playerControls = {
      stopPlayer: () => {
        setShowPlayer(false);
        setIsVideoPlaying(false);
        setStartTime(null);
        
        if (trackingInterval) {
          clearInterval(trackingInterval);
          setTrackingInterval(null);
        }
      }
    };

    registerPlayer(video.id, playerControls);

    return () => {
      unregisterPlayer(video.id);
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [video.id, registerPlayer, unregisterPlayer, trackingInterval]);

  // Listen for changes in currently playing video
  useEffect(() => {
    if (currentPlayingVideo !== video.id && showPlayer) {
      setShowPlayer(false);
      setIsVideoPlaying(false);
      setStartTime(null);
      
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }
    }
  }, [currentPlayingVideo, video.id, showPlayer, trackingInterval]);

  const handlePlay = () => {
    // Reset progress for incomplete videos
    if (!isCompleted) {
      setWatchProgress(0);
      setWatchedTime(0);
      setCurrentTime(0);
    }
    
    playVideo(video.id);
    setShowPlayer(true);
    setStartTime(Date.now());
    setIsVideoPlaying(true);
    onPlay(video.id);
    
    // Start simple time-based tracking
    startTimeBasedTracking();
  };

  const handleStop = () => {
    stopVideo(video.id);
    setShowPlayer(false);
    setIsVideoPlaying(false);
    setStartTime(null);
    
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  };

  const startTimeBasedTracking = () => {
    if (trackingInterval) return;
    
    const interval = setInterval(() => {
      if (isVideoPlaying && startTime && !document.hidden) {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const progressPercent = Math.min((elapsedTime / videoDuration) * 100, 100);
        
        setCurrentTime(elapsedTime);
        setWatchProgress(Math.round(progressPercent));
        setWatchedTime(elapsedTime);
        
        console.log(`Time tracking: ${elapsedTime}s / ${videoDuration}s (${Math.round(progressPercent)}%)`);
        
        // Save progress every 10 seconds
        if (elapsedTime % 10 === 0) {
          saveProgress(Math.round(progressPercent), videoDuration, elapsedTime, false);
        }
        
        // Auto-complete when 75% watched
        if (progressPercent >= 75 && !isCompleted && user?.uid) {
          clearInterval(interval);
          setTrackingInterval(null);
          markAsCompleted(true);
        }
        
        // Auto-complete when video duration reached
        if (elapsedTime >= videoDuration) {
          clearInterval(interval);
          setTrackingInterval(null);
          markAsCompleted(true);
        }
      }
    }, 1000); // Update every second
    
    setTrackingInterval(interval);
  };

  const saveProgress = async (progress, duration, actualWatchedTime, completed) => {
    if (!user?.uid) return;
    
    try {
      const progressRef = dbRef(database, `HTAMS/trainingVideos/${video.id}/progress/${user.uid}`);
      await update(progressRef, {
        watchProgress: progress,
        videoDuration: duration,
        watchedTime: actualWatchedTime,
        currentTime: currentTime,
        isCompleted: completed,
        lastWatched: new Date().toISOString(),
        userId: user.uid,
        userName: user.name
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const markAsCompleted = async (isAutomatic = false) => {
    if (!user?.uid || isCompleted) return;
    
    try {
      const completionRef = dbRef(database, `HTAMS/trainingVideos/${video.id}/completions/${user.uid}`);
      await update(completionRef, {
        completedAt: new Date().toISOString(),
        userId: user.uid,
        userName: user.name,
        watchProgress: Math.round(watchProgress),
        finalWatchedTime: watchedTime,
        completionType: isAutomatic ? 'automatic' : 'manual'
      });
      
      await saveProgress(Math.round(watchProgress), videoDuration, watchedTime, true);
      setIsCompleted(true);
      
      if (isAutomatic) {
        alert('🎉 Training completed! You watched 75% of the video.');
      }
    } catch (error) {
      console.error('Error marking completion:', error);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle video focus/visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVideoPlaying(false);
      } else if (showPlayer && startTime) {
        setIsVideoPlaying(true);
        // Adjust start time for the pause duration
        const pauseDuration = Date.now() - (startTime + currentTime * 1000);
        setStartTime(Date.now() - currentTime * 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showPlayer, startTime, currentTime]);

  return (
    <div className="video-card">
      {!showPlayer ? (
        <div className="video-thumbnail" onClick={handlePlay}>
          <img 
            src={video.thumbnail} 
            alt={video.title}
            onError={(e) => {
              e.target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
            }}
          />
          <div className="play-overlay">
            <FaPlay className="play-icon" />
          </div>
          
          {/* Progress indicator on thumbnail */}
          {watchProgress > 0 && (
            <div className="thumbnail-progress">
              <div className="thumbnail-progress-bar">
                <div 
                  className="thumbnail-progress-fill" 
                  style={{ width: `${watchProgress}%` }}
                ></div>
              </div>
              <span className="thumbnail-progress-text">
                {Math.round(watchProgress)}% watched
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="video-player">
          <div className="video-header">
            <div className="video-time-info">
              <FaClock />
              <span>
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
              <span className="video-status">
                {isVideoPlaying ? '▶️ Playing' : '⏸️ Paused'}
              </span>
            </div>
            <button className="close-video-btn" onClick={handleStop}>
              ✕ Close Video
            </button>
          </div>
          
          <div className="iframe-container">
            <iframe
              src={`${video.embedUrl}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                console.log('Iframe loaded');
                setIsVideoPlaying(true);
              }}
            />
            
            {/* Play/Pause overlay controls */}
            <div className="video-controls-overlay">
              <button 
                className="play-pause-btn"
                onClick={() => setIsVideoPlaying(!isVideoPlaying)}
              >
                {isVideoPlaying ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
          
          {/* Detailed Progress Bar */}
          <div className="progress-container">
            <div className="progress-info">
              <div className="progress-stats">
                <span className="current-progress">
                  Progress: {Math.round(watchProgress)}%
                </span>
                <span className="watch-time">
                  Watched: {formatTime(watchedTime)}
                </span>
                {videoDuration > 0 && (
                  <span className="total-time">
                    Total: {formatTime(videoDuration)} (estimated)
                  </span>
                )}
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.round(watchProgress)}%` }}
              ></div>
              <div className="progress-markers">
                <div className="marker marker-25" style={{ left: '25%' }}>25%</div>
                <div className="marker marker-50" style={{ left: '50%' }}>50%</div>
                <div className="marker marker-75" style={{ left: '75%' }}>75%</div>
              </div>
            </div>
            
            <div className="progress-status">
              {watchProgress >= 75 && !isCompleted && (
                <span className="ready-complete">🎯 Ready to complete!</span>
              )}
              {isCompleted && (
                <span className="completed-status">✅ Training Completed</span>
              )}
              {watchProgress < 75 && (
                <span className="in-progress">
                  📺 {75 - Math.round(watchProgress)}% more to complete
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        {video.description && (
          <p className="video-description">{video.description}</p>
        )}
        
        <div className="video-meta">
          <span className="category">{video.category}</span>
          <div className="stats">
            <span><FaEye /> {video.views || 0} views</span>
            <span><FaCalendarAlt /> {formatDate(video.createdAt)}</span>
          </div>
        </div>

        <div className="video-footer">
          <div className="shared-by">
            <FaUser />
            <span>Shared by {video.sharedByName}</span>
          </div>
          
          <div className="video-actions">
            {isCompleted && (
              <div className="completed-badge">
                ✅ Completed
              </div>
            )}
            
            {!isCompleted && watchProgress > 0 && (
              <div className="progress-badge">
                📊 {Math.round(watchProgress)}%
              </div>
            )}
            
            {isAdmin && (
              <button 
                className="delete-btn"
                onClick={() => onDelete(video.id)}
                title="Delete Video"
              >
                <FaTrash />
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .video-card {
          background: #1e293b;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid #334155;
        }

        .video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .video-thumbnail {
          position: relative;
          width: 100%;
          height: 200px;
          cursor: pointer;
          overflow: hidden;
        }

        .video-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .video-thumbnail:hover img {
          transform: scale(1.05);
        }

        .play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .video-thumbnail:hover .play-overlay {
          background: rgba(255, 0, 0, 0.9);
          transform: translate(-50%, -50%) scale(1.1);
        }

        .play-icon {
          color: white;
          font-size: 24px;
          margin-left: 3px;
        }

        .thumbnail-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.8);
          padding: 8px;
        }

        .thumbnail-progress-bar {
          width: 100%;
          height: 4px;
          background: #475569;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .thumbnail-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s ease;
        }

        .thumbnail-progress-text {
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .video-player {
          position: relative;
          width: 100%;
        }

        .video-header {
          background: #334155;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .video-time-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 500;
        }

        .video-status {
          background: #059669;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }

        .close-video-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .close-video-btn:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        .iframe-container {
          position: relative;
          width: 100%;
          height: 200px;
        }

        .iframe-container iframe {
          width: 100%;
          height: 100%;
        }

        .video-controls-overlay {
          position: absolute;
          bottom: 10px;
          right: 10px;
          z-index: 10;
        }

        .play-pause-btn {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .play-pause-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .progress-container {
          background: #334155;
          padding: 15px;
        }

        .progress-info {
          margin-bottom: 10px;
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #cbd5e1;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .current-progress {
          color: #10b981;
          font-weight: 600;
        }

        .progress-bar {
          position: relative;
          width: 100%;
          height: 8px;
          background: #475569;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-markers {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          pointer-events: none;
        }

        .marker {
          position: absolute;
          top: -20px;
          font-size: 10px;
          color: #94a3b8;
          transform: translateX(-50%);
        }

        .marker::after {
          content: '';
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 8px;
          background: #64748b;
        }

        .progress-status {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
        }

        .ready-complete {
          color: #f59e0b;
        }

        .completed-status {
          color: #10b981;
        }

        .in-progress {
          color: #94a3b8;
        }

        .video-info {
          padding: 16px;
        }

        .video-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .video-description {
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 12px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .video-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .category {
          background: linear-gradient(135deg, #ff0000, #cc0000);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .stats {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #94a3b8;
        }

        .stats span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .video-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #475569;
        }

        .shared-by {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 12px;
        }

        .video-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .completed-badge {
          background: #064e3b;
          color: #6ee7b7;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #10b981;
        }

        .progress-badge {
          background: #1e40af;
          color: #93c5fd;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #3b82f6;
        }

        .delete-btn {
          background: #7f1d1d;
          color: #fca5a5;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .delete-btn:hover {
          background: #991b1b;
          transform: scale(1.05);
        }

        @media (max-width: 768px) {
          .progress-stats {
            font-size: 11px;
            justify-content: space-around;
          }
          
          .video-time-info {
            flex-direction: column;
            gap: 4px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoSharingSystem;
