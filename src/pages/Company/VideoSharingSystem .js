import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { ref as dbRef, push, onValue, update, remove } from 'firebase/database';
import { database } from '../../firebase/config'; 
import { 
    FaPlay, FaPlus, FaTrash, FaYoutube, FaUser
} from 'react-icons/fa';

// ====================== CONTEXT ======================
const VideoPlayerContext = createContext(null);

export const useVideoPlayer = () => {
    const context = useContext(VideoPlayerContext);
    if (!context) {
        throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
    }
    return context;
};

export const VideoPlayerProvider = ({ children }) => {
    const [currentPlayingVideo, setCurrentPlayingVideo] = useState(null);
    const videoPlayersRef = useRef({});

    const registerPlayer = (videoId, playerControls) => {
        videoPlayersRef.current[videoId] = playerControls;
    };

    const unregisterPlayer = (videoId) => {
        delete videoPlayersRef.current[videoId];
    };

    const playVideo = (videoId) => {
        // Stop previously playing video
        if (currentPlayingVideo && currentPlayingVideo !== videoId) {
            const previousPlayer = videoPlayersRef.current[currentPlayingVideo];
            if (previousPlayer && previousPlayer.stopPlayer) {
                previousPlayer.stopPlayer();
            }
        }
        setCurrentPlayingVideo(videoId);
    };
    
    const stopVideo = (videoId) => {
        if (currentPlayingVideo === videoId) {
            setCurrentPlayingVideo(null);
        }
    };

    const value = { currentPlayingVideo, registerPlayer, unregisterPlayer, playVideo, stopVideo };

    return (
        <VideoPlayerContext.Provider value={value}>
            {children}
        </VideoPlayerContext.Provider>
    );
};

// ====================== VIDEO CARD ======================
const VideoCard = ({ video, isAdmin, onDelete, onPlay }) => {
    const [showPlayer, setShowPlayer] = useState(false);
    const { currentPlayingVideo, playVideo, stopVideo, registerPlayer, unregisterPlayer } = useVideoPlayer();

    useEffect(() => {
        const playerControls = { stopPlayer: () => setShowPlayer(false) };
        registerPlayer(video.id, playerControls);
        return () => unregisterPlayer(video.id);
    }, [video.id, registerPlayer, unregisterPlayer]);

    useEffect(() => {
        if (currentPlayingVideo !== video.id && showPlayer) {
            setShowPlayer(false);
        }
    }, [currentPlayingVideo, video.id, showPlayer]);

    const handlePlay = () => {
        playVideo(video.id);
        setShowPlayer(true);
        onPlay(video.id); // increment views
    };

    const handleStop = () => {
        stopVideo(video.id);
        setShowPlayer(false);
    };

    const watchProgress = 0; // hook in progress tracking later if needed

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
                    <div className="play-overlay"><FaPlay className="play-icon" /></div>
                    {watchProgress > 0 && (
                        <div className="thumbnail-progress">
                            <div className="thumbnail-progress-bar">
                                <div 
                                    className="thumbnail-progress-fill" 
                                    style={{ width: `${watchProgress}%` }} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="video-player">
                    <div className="iframe-container">
                        <iframe
                            src={`${video.embedUrl}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0`}
                            title={video.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                    <button className="close-video-btn" onClick={handleStop}>Close Video</button>
                </div>
            )}
            <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <p className="video-description">{video.description}</p>
                <div className="video-footer">
                    <div className="shared-by">
                        <FaUser /> <span>Shared by {video.sharedByName}</span>
                    </div>
                    {isAdmin && (
                        <div className="video-actions">
                            <button className="delete-btn" onClick={() => onDelete(video.id)} title="Delete Video">
                                <FaTrash />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ====================== MAIN COMPONENT ======================
const VideoSharingSystem = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newVideo, setNewVideo] = useState({ title: '', description: '', youtubeUrl: '', category: 'General' });

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('htamsUser'));
        setUser(userData);
        if (userData && (userData.role === 'admin' || userData.role === 'superAdmin')) {
            setIsAdmin(true);
        }
        loadVideos();
    }, []);

    const loadVideos = () => {
        const videosRef = dbRef(database, 'HTAMS/trainingVideos'); // ✅ Correct path
        onValue(videosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const videosArray = Object.entries(data)
                    .map(([id, video]) => ({ id, ...video }))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setVideos(videosArray);
            } else {
                setVideos([]);
            }
        });
    };

    const extractYouTubeID = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const getYouTubeThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const getYouTubeEmbedUrl = (videoId) => `https://www.youtube.com/embed/${videoId}`;
    
    const handleInputChange = (field, value) => setNewVideo(prev => ({ ...prev, [field]: value }));

    const shareVideo = async () => {
        if (!newVideo.title || !newVideo.youtubeUrl) return alert('Title and YouTube URL are required.');
        const videoId = extractYouTubeID(newVideo.youtubeUrl);
        if (!videoId) return alert('Invalid YouTube URL.');
        
        setLoading(true);
        const videoData = {
            title: newVideo.title,
            description: newVideo.description,
            youtubeUrl: newVideo.youtubeUrl,
            videoId,
            thumbnail: getYouTubeThumbnail(videoId),
            embedUrl: getYouTubeEmbedUrl(videoId),
            category: newVideo.category,
            sharedBy: user?.uid || 'system',
            sharedByName: user?.name || 'Admin',
            createdAt: new Date().toISOString(),
            views: 0
        };
        
        try {
            await push(dbRef(database, 'HTAMS/trainingVideos'), videoData); // ✅ Correct path
            alert('Video shared successfully!');
            setShowAddForm(false);
            setNewVideo({ title: '', description: '', youtubeUrl: '', category: 'General' });
        } catch (error) {
            console.error("Error sharing video: ", error);
            alert('Failed to share video.');
        } finally {
            setLoading(false);
        }
    };

    const deleteVideo = async (videoId) => {
        if (!window.confirm('Are you sure you want to delete this video?')) return;
        await remove(dbRef(database, `HTAMS/trainingVideos/${videoId}`)); // ✅ Correct path
        alert('Video deleted.');
    };

    const incrementViews = async (videoId) => {
        const video = videos.find(v => v.id === videoId);
        if (video) {
            await update(dbRef(database, `HTAMS/trainingVideos/${videoId}`), { // ✅ Correct path
                views: (video.views || 0) + 1
            });
        }
    };
    
    const categories = ['General', 'Training', 'Product Demo', 'Company News', 'Tutorial', 'Webinar'];

    return (
        <VideoPlayerProvider>
            <div className="video-sharing-container">
                <div className="header">
                    <h1><FaYoutube className="youtube-icon" /> Shared Training Videos</h1>
                    <p>Watch training videos and tutorials shared by our team</p>
                    {isAdmin && (
                        <button className="add-video-btn" onClick={() => setShowAddForm(!showAddForm)}>
                            <FaPlus /> {showAddForm ? 'Close Form' : 'Share New Video'}
                        </button>
                    )}
                </div>

                {isAdmin && showAddForm && (
                    <div className="add-video-form">
                        <h3>Share New Video</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Video Title</label>
                                <input 
                                    type="text" 
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
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group full-width">
                                <label>YouTube URL</label>
                                <input 
                                    type="url" 
                                    value={newVideo.youtubeUrl} 
                                    onChange={(e) => handleInputChange('youtubeUrl', e.target.value)} 
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Description</label>
                                <textarea 
                                    value={newVideo.description} 
                                    onChange={(e) => handleInputChange('description', e.target.value)} 
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                            <button className="share-btn" onClick={shareVideo} disabled={loading}>
                                {loading ? 'Sharing...' : 'Share Video'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="videos-grid">
                    {videos.length > 0 ? (
                        videos.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                isAdmin={isAdmin}
                                onDelete={deleteVideo}
                                onPlay={incrementViews}
                            />
                        ))
                    ) : (
                        <div className="no-videos">
                            <FaYoutube className="no-videos-icon" />
                            <p>No videos have been shared yet.</p>
                        </div>
                    )}
                </div>

                {/* ===== Styles ===== */}
                <style jsx>{`
                    .video-sharing-container { background-color: #ffffffff; color: #010407ff; min-height: 100vh; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .youtube-icon { color: #ff0000; }
                    .add-video-btn { background: linear-gradient(135deg, #ff0000, #cc0000); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
                    .add-video-form { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
                    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .form-group.full-width { grid-column: 1 / -1; }
                    .videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; }
                    .no-videos { text-align: center; grid-column: 1 / -1; }
                    .video-card { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
                    .video-thumbnail { position: relative; cursor: pointer; }
                    .video-thumbnail img { width: 100%; height: 200px; object-fit: cover; }
                    .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
                    .video-player { }
                    .iframe-container { position: relative; padding-top: 56.25%; height: 0; }
                    .iframe-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                    .video-info { padding: 16px; }
                    .video-title { font-size: 1.1rem; margin-bottom: 8px; }
                    .video-description { font-size: 14px; color: #94a3b8; }
                    .video-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #475569; margin-top: 12px; }
                    .shared-by { font-size: 12px; color: #94a3b8; }
                    .delete-btn { background: #7f1d1d; color: #fca5a5; border: none; border-radius: 6px; cursor: pointer; }
                `}</style>
            </div>
        </VideoPlayerProvider>
    );
};

export default VideoSharingSystem;
