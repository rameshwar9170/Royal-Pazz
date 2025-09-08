import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { auth, db } from '../firebase/config';
import {
    FaUser,
    FaBoxOpen,
    FaPhone,
    FaMapMarkerAlt,
    FaPalette,
    FaShareAlt,
    FaSave,
    FaEye,
    FaTimes,
    FaPlusCircle,
    FaTrashAlt,
    FaRocket,
    FaImage,
    FaCheck,
    FaStar,
    FaGlobe,
    FaHeart,
    FaExternalLinkAlt,
    FaChartLine,
    FaAward,
    FaShieldAlt
} from 'react-icons/fa';
import "../styles/DemoPage.css";

const initialProduct = {
    title: '',
    description: '',
    imageUrl: '',
    price: '',
    about: '',
};

const initialForm = {
    owner: {
        name: '',
        tagline: '',
    },
    products: [{ ...initialProduct }],
    contact: {
        phone: '',
        email: '',
    },
    address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: '',
    },
    appearance: {
        themeColor: '#2563eb',
        accentColor: '#059669',
    },
    socials: {
        website: '',
        linkedin: '',
        twitter: '',
        instagram: '',
        facebook: '',
        youtube: '',
    },
};

const DemoPage = () => {
    const navigate = useNavigate();
    const [uid, setUid] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(initialForm);
    const [toast, setToast] = useState({ type: '', message: '' });
    const [completedSections, setCompletedSections] = useState(new Set());
    const [isDataSaved, setIsDataSaved] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate('/login');
                return;
            }
            setUid(user.uid);
            setPreviewUrl(`/preview/${user.uid}`);
            try {
                const snap = await get(ref(db, `HTAMS/WebBuilder/${user.uid}`));
                if (snap.exists()) {
                    const existing = snap.val();
                    if (existing.product && !existing.products) {
                        existing.products = [existing.product];
                        delete existing.product;
                    }
                    setFormData((prev) => deepMerge(initialForm, existing));
                    setIsDataSaved(true);
                }
            } catch (e) {
                console.error('Failed to load existing data:', e);
                showToast('error', 'Failed to load your data');
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, [navigate]);

    // Check completed sections
    useEffect(() => {
        const completed = new Set();

        if (formData.owner.name.trim()) completed.add('personal');

        if (formData.products.length > 0 && formData.products.every(p =>
            p.title.trim() && p.price.trim() && p.description.trim()
        )) completed.add('products');

        if (formData.contact.phone.trim() && formData.contact.email.trim()) completed.add('contact');

        if (formData.address.city.trim() && formData.address.country.trim()) completed.add('address');

        setCompletedSections(completed);
    }, [formData]);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast({ type: '', message: '' }), 5000);
    };

    const handleChange = (path, value) => {
        setFormData(prev => setByPath(prev, path, value));
    };

    const handleProductChange = (index, field, value) => {
        const newProducts = [...formData.products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        setFormData(prev => ({ ...prev, products: newProducts }));
    };

    const addProduct = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, { ...initialProduct }]
        }));
        showToast('success', '✨ New product slot added successfully');
    };

    const removeProduct = (index) => {
        if (formData.products.length === 1) {
            showToast('error', 'At least one product is required for your business site');
            return;
        }
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
        showToast('success', 'Product removed successfully');
    };

    const handlePreview = () => {
        if (!isDataSaved) {
            showToast('error', 'Please save your data first to preview your site');
            return;
        }

        if (uid) {
            const newWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
            if (newWindow) {
                showToast('success', 'Opening your professional site preview...');
            } else {
                showToast('error', 'Please allow popups to preview your site');
            }
        }
    };

    const validateForm = () => {
        if (!formData.owner.name.trim()) {
            showToast('error', 'Please enter your name');
            return false;
        }

        if (formData.products.length === 0) {
            showToast('error', 'Please add at least one product');
            return false;
        }

        const hasInvalidProduct = formData.products.some(p =>
            !p.title.trim() || !p.price.trim() || !p.description.trim()
        );
        if (hasInvalidProduct) {
            showToast('error', 'Please complete all required fields for each product');
            return false;
        }

        if (!formData.contact.phone.trim() || !formData.contact.email.trim()) {
            showToast('error', 'Please provide your contact information');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!uid) return;

        if (!validateForm()) return;

        setSaving(true);
        try {
            const payload = {
                ...formData,
                meta: {
                    updatedAt: Date.now(),
                    updatedAtServer: serverTimestamp(),
                    version: 1,
                    createdAt: Date.now(),
                    isPublished: true,
                },
            };
            await set(ref(db, `HTAMS/WebBuilder/${uid}`), payload);
            setIsDataSaved(true);
            showToast('success', '🎉 Your professional business site has been created successfully!');
        } catch (e) {
            console.error(e);
            showToast('error', 'Failed to save. Please check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="demo-container">
                <div className="demo-loading">
                    <div className="demo-loading-animation">
                        <div className="demo-spinner"></div>
                        <div className="demo-loading-progress">
                            <div className="demo-loading-bar"></div>
                        </div>
                    </div>
                    <h3>Loading Business Builder</h3>
                    <p>Preparing your professional workspace...</p>
                </div>
            </div>
        );
    }

    const completionPercentage = Math.round((completedSections.size / 4) * 100);

    return (
        <div className="demo-container">
            {/* Toast Notifications */}
            {toast.message && (
                <div className={`demo-toast demo-toast--${toast.type}`}>
                    <div className="demo-toast-content">
                        <div className="demo-toast-icon">
                            {toast.type === 'success' ? <FaCheck /> : <FaTimes />}
                        </div>
                        <span>{toast.message}</span>
                        <button onClick={() => setToast({ type: '', message: '' })}>
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            {/* Professional Header */}
            <div className="demo-header">
                <div className="demo-header-pattern"></div>
                <div className="demo-header-content">
                    <div className="demo-brand">
                        <div className="demo-logo-container">
                            <div className="demo-logo-bg"></div>
                            <FaChartLine className="demo-logo" />
                        </div>
                        <div className="demo-brand-info">
                            <h1>Business Website Builder</h1>
                            <p>Create your professional MLM presence</p>
                            <div className="demo-brand-badges">
                                <span className="demo-badge demo-badge--pro">
                                    <FaAward />
                                    Professional
                                </span>
                                <span className="demo-badge demo-badge--secure">
                                    <FaShieldAlt />
                                    Secure
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="demo-header-actions">
                        <div className="demo-completion-widget">
                            <div className="demo-completion-circle">
                                <svg viewBox="0 0 36 36">
                                    <path
                                        className="demo-completion-bg"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="demo-completion-progress"
                                        strokeDasharray={`${completionPercentage}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="demo-completion-text">{completionPercentage}%</div>
                            </div>
                            <div className="demo-completion-info">
                                <span className="demo-completion-label">Setup Complete</span>
                                <span className="demo-completion-status">
                                    {completionPercentage === 100 ? 'Ready to Launch' : 'In Progress'}
                                </span>
                            </div>
                        </div>

                        <button
                            className={`demo-preview-btn ${isDataSaved ? 'demo-preview-btn--active' : 'demo-preview-btn--disabled'}`}
                            onClick={handlePreview}
                            disabled={!uid}
                            type="button"
                        >
                            <FaExternalLinkAlt />
                            <span>{isDataSaved ? 'Preview Site' : 'Save to Preview'}</span>
                            {isDataSaved && <div className="demo-btn-pulse"></div>}
                        </button>
                    </div>
                </div>
            </div>

            <form className="demo-form" onSubmit={handleSubmit}>
                {/* Personal Information */}
                <div className={`demo-section ${completedSections.has('personal') ? 'demo-section--completed' : ''}`}>
                    <div className="demo-section-header">
                        <div className="demo-section-icon-container">
                            <FaUser className="demo-section-icon" />
                            {completedSections.has('personal') && (
                                <div className="demo-section-check">
                                    <FaCheck />
                                </div>
                            )}
                        </div>
                        <div className="demo-section-info">
                            <h3>Business Identity</h3>
                            <p>Your professional brand and business identity</p>
                        </div>
                        <div className="demo-section-status">
                            {completedSections.has('personal') ? (
                                <span className="demo-status demo-status--complete">Complete</span>
                            ) : (
                                <span className="demo-status demo-status--pending">Required</span>
                            )}
                        </div>
                    </div>
                    <div className="demo-section-content">
                        <div className="demo-row">
                            <div className="demo-input-group">
                                <label>Full Business Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter your full business name"
                                    value={formData.owner.name}
                                    onChange={(e) => handleChange(['owner', 'name'], e.target.value)}
                                    required
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Business Tagline</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Empowering Financial Freedom"
                                    value={formData.owner.tagline}
                                    onChange={(e) => handleChange(['owner', 'tagline'], e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Section */}
                <div className={`demo-section ${completedSections.has('products') ? 'demo-section--completed' : ''}`}>
                    <div className="demo-section-header">
                        <div className="demo-section-icon-container">
                            <FaBoxOpen className="demo-section-icon" />
                            {completedSections.has('products') && (
                                <div className="demo-section-check">
                                    <FaCheck />
                                </div>
                            )}
                        </div>
                        <div className="demo-section-info">
                            <h3>Product Portfolio</h3>
                            <p>Showcase your business offerings and services</p>
                        </div>
                        <div className="demo-section-status">
                            {completedSections.has('products') ? (
                                <span className="demo-status demo-status--complete">Complete</span>
                            ) : (
                                <span className="demo-status demo-status--pending">Required</span>
                            )}
                        </div>
                    </div>

                    <div className="demo-section-content">
                        <div className="demo-products-grid">
                            {formData.products.map((product, index) => (
                                <div className="demo-product-card" key={index}>
                                    <div className="demo-product-header">
                                        <div className="demo-product-number">
                                            <FaBoxOpen />
                                            <span>Product #{index + 1}</span>
                                        </div>
                                        {formData.products.length > 1 && (
                                            <button
                                                type="button"
                                                className="demo-remove-btn"
                                                onClick={() => removeProduct(index)}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        )}
                                    </div>

                                    <div className="demo-product-content">
                                        <div className="demo-row">
                                            <div className="demo-input-group">
                                                <label>Product/Service Name *</label>
                                                <input
                                                    type="text"
                                                    placeholder="Professional Product Name"
                                                    value={product.title}
                                                    onChange={(e) => handleProductChange(index, 'title', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="demo-input-group">
                                                <label>Price (₹) *</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={product.price}
                                                    onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="demo-input-group">
                                            <label>Product Image URL</label>
                                            <div className="demo-input-with-icon">
                                                <FaImage className="demo-input-icon" />
                                                <input
                                                    type="url"
                                                    placeholder="https://example.com/product-image.jpg"
                                                    value={product.imageUrl}
                                                    onChange={(e) => handleProductChange(index, 'imageUrl', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="demo-input-group">
                                            <label>Product Description *</label>
                                            <textarea
                                                placeholder="Write a compelling description that highlights key benefits and features"
                                                value={product.description}
                                                onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                                                required
                                                rows="3"
                                            />
                                        </div>

                                        <div className="demo-input-group">
                                            <label>Detailed Information</label>
                                            <textarea
                                                placeholder="Provide comprehensive details, specifications, benefits, and additional information"
                                                value={product.about}
                                                onChange={(e) => handleProductChange(index, 'about', e.target.value)}
                                                rows="4"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="demo-add-btn"
                            onClick={addProduct}
                        >
                            <FaPlusCircle />
                            <span>Add Another Product</span>
                        </button>
                    </div>
                </div>

                {/* Contact Information */}
                <div className={`demo-section ${completedSections.has('contact') ? 'demo-section--completed' : ''}`}>
                    <div className="demo-section-header">
                        <div className="demo-section-icon-container">
                            <FaPhone className="demo-section-icon" />
                            {completedSections.has('contact') && (
                                <div className="demo-section-check">
                                    <FaCheck />
                                </div>
                            )}
                        </div>
                        <div className="demo-section-info">
                            <h3>Business Contact</h3>
                            <p>How customers and partners can reach you</p>
                        </div>
                        <div className="demo-section-status">
                            {completedSections.has('contact') ? (
                                <span className="demo-status demo-status--complete">Complete</span>
                            ) : (
                                <span className="demo-status demo-status--pending">Required</span>
                            )}
                        </div>
                    </div>
                    <div className="demo-section-content">
                        <div className="demo-row">
                            <div className="demo-input-group">
                                <label>Business Phone *</label>
                                <input
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={formData.contact.phone}
                                    onChange={(e) => handleChange(['contact', 'phone'], e.target.value)}
                                    required
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Business Email *</label>
                                <input
                                    type="email"
                                    placeholder="business@yourdomain.com"
                                    value={formData.contact.email}
                                    onChange={(e) => handleChange(['contact', 'email'], e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div className={`demo-section ${completedSections.has('address') ? 'demo-section--completed' : ''}`}>
                    <div className="demo-section-header">
                        <div className="demo-section-icon-container">
                            <FaMapMarkerAlt className="demo-section-icon" />
                            {completedSections.has('address') && (
                                <div className="demo-section-check">
                                    <FaCheck />
                                </div>
                            )}
                        </div>
                        <div className="demo-section-info">
                            <h3>Business Location</h3>
                            <p>Your business address and operational base</p>
                        </div>
                        <div className="demo-section-status">
                            {completedSections.has('address') ? (
                                <span className="demo-status demo-status--complete">Complete</span>
                            ) : (
                                <span className="demo-status demo-status--pending">Required</span>
                            )}
                        </div>
                    </div>
                    <div className="demo-section-content">
                        <div className="demo-row">
                            <div className="demo-input-group">
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    placeholder="Building, House No., Street"
                                    value={formData.address.line1}
                                    onChange={(e) => handleChange(['address', 'line1'], e.target.value)}
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Area/Locality</label>
                                <input
                                    type="text"
                                    placeholder="Area, Locality, Landmark"
                                    value={formData.address.line2}
                                    onChange={(e) => handleChange(['address', 'line2'], e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="demo-row">
                            <div className="demo-input-group">
                                <label>City *</label>
                                <input
                                    type="text"
                                    placeholder="Your city"
                                    value={formData.address.city}
                                    onChange={(e) => handleChange(['address', 'city'], e.target.value)}
                                    required
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>State/Province</label>
                                <input
                                    type="text"
                                    placeholder="Your state"
                                    value={formData.address.state}
                                    onChange={(e) => handleChange(['address', 'state'], e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="demo-row">
                            <div className="demo-input-group">
                                <label>Postal Code</label>
                                <input
                                    type="text"
                                    placeholder="PIN/ZIP Code"
                                    value={formData.address.pincode}
                                    onChange={(e) => handleChange(['address', 'pincode'], e.target.value)}
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Country *</label>
                                <input
                                    type="text"
                                    placeholder="Your country"
                                    value={formData.address.country}
                                    onChange={(e) => handleChange(['address', 'country'], e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Brand Colors */}
                <div className="demo-section">
                    <div className="demo-section-header">
                        <div className="demo-section-icon-container">
                            <FaPalette className="demo-section-icon" />
                        </div>
                        <div className="demo-section-info">
                            <h3>Brand Colors</h3>
                            <p>Define your business brand identity colors</p>
                        </div>
                        <div className="demo-section-status">
                            <span className="demo-status demo-status--optional">Optional</span>
                        </div>
                    </div>
                    <div className="demo-section-content">
                        <div className="demo-color-grid">
                            <div className="demo-color-field">
                                <label>Primary Brand Color</label>
                                <div className="demo-color-input-container">
                                    <input
                                        type="color"
                                        value={formData.appearance.themeColor}
                                        onChange={(e) => handleChange(['appearance', 'themeColor'], e.target.value)}
                                    />
                                    <div
                                        className="demo-color-preview"
                                        style={{ backgroundColor: formData.appearance.themeColor }}
                                    >
                                        <span>Primary</span>
                                    </div>
                                </div>
                            </div>
                            <div className="demo-color-field">
                                <label>Accent Color</label>
                                <div className="demo-color-input-container">
                                    <input
                                        type="color"
                                        value={formData.appearance.accentColor}
                                        onChange={(e) => handleChange(['appearance', 'accentColor'], e.target.value)}
                                    />
                                    <div
                                        className="demo-color-preview"
                                        style={{ backgroundColor: formData.appearance.accentColor }}
                                    >
                                        <span>Accent</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="demo-section">
                    <div className="demo-section-header">
                        <div className="demo-section-icon-container">
                            <FaShareAlt className="demo-section-icon" />
                        </div>
                        <div className="demo-section-info">
                            <h3>Social Media Presence</h3>
                            <p>Connect your business social profiles</p>
                        </div>
                        <div className="demo-section-status">
                            <span className="demo-status demo-status--optional">Optional</span>
                        </div>
                    </div>
                    <div className="demo-section-content">
                        <div className="demo-social-grid">
                            <div className="demo-input-group">
                                <label>Business Website</label>
                                <div className="demo-input-with-icon">
                                    <FaGlobe className="demo-input-icon" />
                                    <input
                                        type="url"
                                        placeholder="https://yourbusiness.com"
                                        value={formData.socials.website}
                                        onChange={(e) => handleChange(['socials', 'website'], e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="demo-input-group">
                                <label>LinkedIn Business Page</label>
                                <input
                                    type="url"
                                    placeholder="https://linkedin.com/company/yourcompany"
                                    value={formData.socials.linkedin}
                                    onChange={(e) => handleChange(['socials', 'linkedin'], e.target.value)}
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Twitter/X Business</label>
                                <input
                                    type="url"
                                    placeholder="https://twitter.com/yourbusiness"
                                    value={formData.socials.twitter}
                                    onChange={(e) => handleChange(['socials', 'twitter'], e.target.value)}
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Instagram Business</label>
                                <input
                                    type="url"
                                    placeholder="https://instagram.com/yourbusiness"
                                    value={formData.socials.instagram}
                                    onChange={(e) => handleChange(['socials', 'instagram'], e.target.value)}
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>Facebook Business Page</label>
                                <input
                                    type="url"
                                    placeholder="https://facebook.com/yourbusiness"
                                    value={formData.socials.facebook}
                                    onChange={(e) => handleChange(['socials', 'facebook'], e.target.value)}
                                />
                            </div>
                            <div className="demo-input-group">
                                <label>YouTube Channel</label>
                                <input
                                    type="url"
                                    placeholder="https://youtube.com/@yourbusiness"
                                    value={formData.socials.youtube}
                                    onChange={(e) => handleChange(['socials', 'youtube'], e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Section */}
                <div className="demo-submit-section">
                    <button type="submit" className="demo-submit-btn" disabled={saving}>
                        <div className="demo-submit-icon">
                            {saving ? (
                                <div className="demo-submit-spinner"></div>
                            ) : (
                                <FaRocket />
                            )}
                        </div>
                        <div className="demo-submit-content">
                            <span className="demo-submit-text">
                                {saving ? 'Publishing Your Site...' : 'Publish Business Website'}
                            </span>
                            <span className="demo-submit-subtext">
                                {saving ? 'Please wait while we create your site' : 'Launch your professional MLM presence'}
                            </span>
                        </div>
                    </button>

                    {isDataSaved && (
                        <div className="demo-success-actions">
                            <div className="demo-success-message">
                                <FaCheck className="demo-success-icon" />
                                <span>Your business website is ready!</span>
                            </div>
                            <button
                                type="button"
                                className="demo-preview-link-btn"
                                onClick={handlePreview}
                            >
                                <FaExternalLinkAlt />
                                Launch Live Preview
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

// Utility functions
function setByPath(obj, path, value) {
    const next = structuredClone(obj);
    let cur = next;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (typeof cur[key] !== 'object' || cur[key] === null) cur[key] = {};
        cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return next;
}

function deepMerge(target, source) {
    if (typeof target !== 'object' || target === null) return source;
    const out = Array.isArray(target) ? [...target] : { ...target };
    for (const k of Object.keys(source || {})) {
        if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
            out[k] = deepMerge(target[k] || {}, source[k]);
        } else {
            out[k] = source[k];
        }
    }
    return out;
}

export default DemoPage;
