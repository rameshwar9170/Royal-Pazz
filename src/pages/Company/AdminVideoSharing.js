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
  FaPlus,
  FaTrash,
  FaEdit,
  FaYoutube,
  FaSave,
  FaTimes,
  FaEye,
  FaUsers
} from 'react-icons/fa';

const AdminVideoSharing = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [user, setUser] = useState(null);

  // Form state for adding new video
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    category: 'Training',
    level: 'Beginner',
    duration: '',
    tags: ''
  });

  // Form state for editing existing video
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('htamsUser'));
    setUser(userData);
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
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Get YouTube thumbnail
  const getYouTubeThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  };

  const validateYouTubeUrl = (url) => {
    return extractYouTubeID(url) !== null;
  };

  const handleAddVideo = async () => {
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
        level: newVideo.level,
        duration: newVideo.duration,
        tags: newVideo.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        addedBy: user.uid,
        addedByName: user.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        isActive: true
      };

      const videosRef = dbRef(database, 'HTAMS/trainingVideos');
      await push(videosRef, videoData);

      // Reset form
      setNewVideo({
        title: '',
        description: '',
        youtubeUrl: '',
        category: 'Training',
        level: 'Beginner',
        duration: '',
        tags: ''
      });

      alert('Video added successfully!');
    } catch (error) {
      console.error('Error adding video:', error);
      alert('Failed to add video');
    } finally {
      setLoading(false);
    }
  };

  const handleEditVideo = async (videoId) => {
    if (!editForm.title || !editForm.youtubeUrl) {
      alert('Please fill in required fields');
      return;
    }

    if (!validateYouTubeUrl(editForm.youtubeUrl)) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const videoId_new = extractYouTubeID(editForm.youtubeUrl);
      const updatedData = {
        ...editForm,
        videoId: videoId_new,
        thumbnail: getYouTubeThumbnail(videoId_new),
        embedUrl: getYouTubeEmbedUrl(videoId_new),
        tags: typeof editForm.tags === 'string' 
          ? editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          : editForm.tags,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
        updatedByName: user.name
      };

      const videoRef = dbRef(database, `HTAMS/trainingVideos/${videoId}`);
      await update(videoRef, updatedData);

      setEditingId(null);
      setEditForm({});
      alert('Video updated successfully!');
    } catch (error) {
      console.error('Error updating video:', error);
      alert('Failed to update video');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
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

  const startEdit = (video) => {
    setEditingId(video.id);
    setEditForm({
      ...video,
      tags: Array.isArray(video.tags) ? video.tags.join(', ') : video.tags || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const categories = ['Training', 'Tutorial', 'Product Demo', 'Company Update', 'Webinar', 'General'];
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  return (
    <div className="admin-video-sharing">
      <div className="header">
        <h1>
          <FaYoutube className="youtube-icon" />
          Admin - Video Management
        </h1>
        <p>Manage training videos for your team</p>
      </div>

      {/* Add New Video Form */}
      <div className="add-video-section">
        <h2><FaPlus /> Add New Training Video</h2>
        <div className="video-form">
          <div className="form-row">
            <div className="form-group">
              <label>Video Title *</label>
              <input
                type="text"
                placeholder="Enter video title"
                value={newVideo.title}
                onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>YouTube URL *</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={newVideo.youtubeUrl}
                onChange={(e) => setNewVideo({...newVideo, youtubeUrl: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={newVideo.category}
                onChange={(e) => setNewVideo({...newVideo, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Level</label>
              <select
                value={newVideo.level}
                onChange={(e) => setNewVideo({...newVideo, level: e.target.value})}
              >
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Duration (e.g., 15 min)</label>
              <input
                type="text"
                placeholder="15 min"
                value={newVideo.duration}
                onChange={(e) => setNewVideo({...newVideo, duration: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                placeholder="Enter video description"
                value={newVideo.description}
                onChange={(e) => setNewVideo({...newVideo, description: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Tags (comma separated)</label>
              <input
                type="text"
                placeholder="react, firebase, tutorial"
                value={newVideo.tags}
                onChange={(e) => setNewVideo({...newVideo, tags: e.target.value})}
              />
            </div>
          </div>

          <button 
            className="add-btn"
            onClick={handleAddVideo}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Video'}
          </button>
        </div>
      </div>

      {/* Videos List */}
      <div className="videos-list">
        <h2>Shared Videos ({videos.length})</h2>
        
        {videos.length === 0 ? (
          <div className="no-videos">
            <FaYoutube />
            <p>No videos added yet. Add your first training video above.</p>
          </div>
        ) : (
          <div className="videos-grid">
            {videos.map((video) => (
              <div key={video.id} className="video-item">
                {editingId === video.id ? (
                  // Edit Mode
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>YouTube URL</label>
                      <input
                        type="url"
                        value={editForm.youtubeUrl || ''}
                        onChange={(e) => setEditForm({...editForm, youtubeUrl: e.target.value})}
                      />
                    </div>
                    <div className="form-row">
                      <select
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <select
                        value={editForm.level || ''}
                        onChange={(e) => setEditForm({...editForm, level: e.target.value})}
                      >
                        {levels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        rows={2}
                      />
                    </div>
                    <div className="edit-actions">
                      <button className="save-btn" onClick={() => handleEditVideo(video.id)}>
                        <FaSave /> Save
                      </button>
                      <button className="cancel-btn" onClick={cancelEdit}>
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="video-thumbnail">
                      <img src={video.thumbnail} alt={video.title} />
                      <div className="video-overlay">
                        <FaYoutube />
                      </div>
                    </div>
                    <div className="video-info">
                      <h3>{video.title}</h3>
                      <p className="description">{video.description}</p>
                      <div className="video-meta">
                        <span className="category">{video.category}</span>
                        <span className="level">{video.level}</span>
                        {video.duration && <span className="duration">{video.duration}</span>}
                      </div>
                      <div className="video-stats">
                        <span><FaEye /> {video.views || 0} views</span>
                        <span><FaUsers /> Added by {video.addedByName}</span>
                      </div>
                      <div className="video-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => startEdit(video)}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteVideo(video.id)}
                        >
                          <FaTrash /> Delete
                        </button>
                        <a 
                          href={video.youtubeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-btn"
                        >
                          <FaYoutube /> View on YouTube
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-video-sharing {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
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
        }

        .header p {
          color: #6b7280;
          font-size: 1.1rem;
        }

        .add-video-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 40px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .add-video-section h2 {
          color: #1f2937;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .video-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
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
          margin-bottom: 6px;
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

        .add-btn {
          background: linear-gradient(135deg, #ff0000, #cc0000);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          align-self: flex-start;
        }

        .add-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
        }

        .add-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .videos-list h2 {
          color: #1f2937;
          margin-bottom: 24px;
        }

        .no-videos {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .no-videos svg {
          font-size: 3rem;
          color: #ff0000;
          margin-bottom: 16px;
        }

        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .video-item {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .video-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .video-thumbnail {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .video-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 0, 0, 0.9);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .video-info {
          padding: 16px;
        }

        .video-info h3 {
          color: #1f2937;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .description {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .video-meta {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .video-meta span {
          background: #f3f4f6;
          color: #374151;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .video-meta .category {
          background: linear-gradient(135deg, #ff0000, #cc0000);
          color: white;
        }

        .video-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 12px;
          color: #6b7280;
        }

        .video-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .video-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .edit-btn,
        .delete-btn,
        .view-btn {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .edit-btn {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #2563eb;
        }

        .delete-btn {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #dc2626;
        }

        .view-btn {
          background: #fee2e2;
          color: #ff0000;
          border: 1px solid #ff0000;
        }

        .edit-btn:hover,
        .delete-btn:hover,
        .view-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .edit-form {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .save-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .videos-grid {
            grid-template-columns: 1fr;
          }
          
          .video-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminVideoSharing;
