import React, { useState, useEffect } from 'react';
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
  FaUser
} from 'react-icons/fa';

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
    const videosRef = dbRef(database, 'HTAMS/sharedVideos');
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
    return match && match[2].length === 11 ? match[2] : null;
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

      const videosRef = dbRef(database, 'HTAMS/sharedVideos');
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
      const videoRef = dbRef(database, `HTAMS/sharedVideos/${videoId}`);
      await remove(videoRef);
      alert('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const incrementViews = async (videoId) => {
    try {
      const videoRef = dbRef(database, `HTAMS/sharedVideos/${videoId}/views`);
      const video = videos.find(v => v.id === videoId);
      if (video) {
        await update(dbRef(database, `HTAMS/sharedVideos/${videoId}`), {
          views: (video.views || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error updating views:', error);
    }
  };

  const categories = ['General', 'Training', 'Product Demo', 'Company News', 'Tutorial', 'Webinar'];

  return (
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
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header h1 {
          color: #1f2937;
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
          color: #6b7280;
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
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .add-video-form h3 {
          color: #1f2937;
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
          color: #374151;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #ff0000;
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
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
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
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
          color: #6b7280;
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
  );
};

// Video Card Component
const VideoCard = ({ video, isAdmin, onDelete, onPlay }) => {
  const [showPlayer, setShowPlayer] = useState(false);

  const handlePlay = () => {
    setShowPlayer(true);
    onPlay(video.id);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
          <div className="video-duration">
            <FaYoutube />
          </div>
        </div>
      ) : (
        <div className="video-player">
          <iframe
            src={video.embedUrl}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
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
          
          {isAdmin && (
            <div className="admin-actions">
              <button 
                className="delete-btn"
                onClick={() => onDelete(video.id)}
                title="Delete Video"
              >
                <FaTrash />
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .video-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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

        .video-duration {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
        }

        .video-player {
          position: relative;
          width: 100%;
          height: 200px;
        }

        .video-player iframe {
          width: 100%;
          height: 100%;
        }

        .video-info {
          padding: 16px;
        }

        .video-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .video-description {
          color: #6b7280;
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
          color: #6b7280;
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
          border-top: 1px solid #f3f4f6;
        }

        .shared-by {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 12px;
        }

        .admin-actions {
          display: flex;
          gap: 8px;
        }

        .delete-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .delete-btn:hover {
          background: #fecaca;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default VideoSharingSystem;
