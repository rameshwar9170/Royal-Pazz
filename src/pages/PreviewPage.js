import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get, push, set, serverTimestamp } from 'firebase/database';
import { db } from '../firebase/config';
import {
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaGlobe,
    FaLinkedin,
    FaTwitter,
    FaInstagram,
    FaFacebook,
    FaYoutube,
    FaStar,
    FaEdit,
    FaArrowLeft,
    FaShoppingCart,
    FaHeart,
    FaShare,
    FaBoxOpen,
    FaRocket,
    FaCheckCircle,
    FaWhatsapp,
    FaTelegram,
    FaTimes
} from 'react-icons/fa';
import '../styles/PreviewPage.css';

export default function PreviewPage() {
    const { uid } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(0);
    const [isInquiryOpen, setIsInquiryOpen] = useState(false);
    const [inquiryData, setInquiryData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        productName: '',
        quantity: 1
    });
    const [isSending, setIsSending] = useState(false);
    const [toast, setToast] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchUserData = async () => {
            if (!uid) {
                setError('No user ID provided');
                setLoading(false);
                return;
            }

            try {
                // Updated path: HTAMS/users/uid/webBuilder
                const userRef = ref(db, `HTAMS/users/${uid}/webBuilder`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const data = snapshot.val();

                    // Handle backward compatibility for single product to multiple products
                    if (data.product && !data.products) {
                        data.products = [data.product];
                        delete data.product;
                    }

                    // Ensure products is always an array
                    if (!data.products || !Array.isArray(data.products)) {
                        data.products = [];
                    }

                    // Debug: Log the loaded user data
                    console.log('Loaded user data from Firebase:', data);
                    if (data.products) {
                        console.log('Products in user data:', data.products);
                        data.products.forEach((product, index) => {
                            console.log(`Preview Product ${index + 1}:`, {
                                title: product.title,
                                imageUrl: product.imageUrl,
                                imageUrls: product.imageUrls,
                                image: product.image,
                                productImage: product.productImage,
                                img: product.img,
                                selectedCompanyProduct: product.selectedCompanyProduct,
                                companyProductData: product.companyProductData,
                                allFields: Object.keys(product)
                            });
                        });
                    }
                    
                    setUserData(data);
                } else {
                    setError('No profile data found for this user');
                }
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError('Failed to load profile data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [uid]);

    const handleContactClick = (type, value) => {
        if (type === 'phone') {
            window.open(`tel:${value}`, '_self');
        } else if (type === 'email') {
            window.open(`mailto:${value}?subject=Inquiry about your products`, '_self');
        } else if (type === 'whatsapp') {
            window.open(`https://wa.me/${value.replace(/[^0-9]/g, '')}`, '_blank');
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${userData?.owner?.name || 'Professional Profile'}`,
                    text: `Check out ${userData?.owner?.name || 'this amazing profile'} and their products!`,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            showToast('success', 'Profile link copied to clipboard!');
        }
    };

    const openInquiry = (productIndex) => {
        const product = userData.products[productIndex];
        const fullAddress = [
            userData?.address?.line1,
            userData?.address?.line2,
            userData?.address?.city,
            userData?.address?.state,
            userData?.address?.pincode,
            userData?.address?.country
        ].filter(Boolean).join(', ');

        setInquiryData({
            name: '',
            phone: '',
            email: '',
            address: fullAddress,
            productName: product?.title || '',
            quantity: 1
        });
        setIsInquiryOpen(true);
    };

    const sendInquiry = async () => {
        if (!inquiryData.name || !inquiryData.phone || !inquiryData.productName) {
            showToast('error', 'Please fill all required fields');
            return;
        }

        setIsSending(true);
        try {
            const inquiriesRef = ref(db, `HTAMS/users/${uid}/inquiries`);
            const newInquiryRef = push(inquiriesRef);
            await set(newInquiryRef, {
                ...inquiryData,
                timestamp: serverTimestamp(),
                inquiryDate: new Date().toISOString()
            });
            showToast('success', 'Inquiry sent successfully!');
            setIsInquiryOpen(false);
            // Reset form
            setInquiryData({
                name: '',
                phone: '',
                email: '',
                address: '',
                productName: '',
                quantity: 1
            });
        } catch (err) {
            console.error('Error sending inquiry:', err);
            showToast('error', 'Failed to send inquiry. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast({ type: '', message: '' }), 4000);
    };

    const handleInquiryChange = (field, value) => {
        setInquiryData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="preview-loading">
                <div className="preview-loading-content">
                    <div className="preview-spinner"></div>
                    <h3>Loading Profile</h3>
                    <p>Preparing the professional showcase...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="preview-error">
                <div className="preview-error-content">
                    <div className="preview-error-icon">⚠️</div>
                    <h2>Unable to Load Profile</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate(-1)} className="preview-btn preview-btn--primary">
                        <FaArrowLeft /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="preview-error">
                <div className="preview-error-content">
                    <div className="preview-error-icon">🔍</div>
                    <h2>Profile Not Found</h2>
                    <p>This profile doesn't exist or hasn't been published yet.</p>
                    <button onClick={() => navigate(-1)} className="preview-btn preview-btn--primary">
                        <FaArrowLeft /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const {
        owner = {},
        products = [],
        contact = {},
        address = {},
        appearance = { themeColor: '#6366f1', accentColor: '#10b981' },
        socials = {}
    } = userData;

    const socialLinks = [
        { icon: FaGlobe, url: socials.website, label: 'Website', color: '#6366f1' },
        { icon: FaLinkedin, url: socials.linkedin, label: 'LinkedIn', color: '#0077b5' },
        { icon: FaTwitter, url: socials.twitter, label: 'Twitter', color: '#1da1f2' },
        { icon: FaInstagram, url: socials.instagram, label: 'Instagram', color: '#e4405f' },
        { icon: FaFacebook, url: socials.facebook, label: 'Facebook', color: '#1877f2' },
        { icon: FaYoutube, url: socials.youtube, label: 'YouTube', color: '#ff0000' }
    ].filter(link => link.url && link.url.trim());

    return (
        <div
            className="preview-page"
            style={{
                '--theme-color': appearance.themeColor || '#6366f1',
                '--accent-color': appearance.accentColor || '#10b981'
            }}
        >
            {/* Toast Notification */}
            {toast.message && (
                <div className={`preview-toast preview-toast--${toast.type}`}>
                    <span>{toast.message}</span>
                    <button onClick={() => setToast({ type: '', message: '' })}>
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Enhanced Navigation Bar */}
            <nav className="preview-nav">
                <div className="preview-nav__container">
                    <div className="preview-nav__brand">
                        <div className="preview-nav__logo">
                            {owner.name ? owner.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div className="preview-nav__info">
                            <span className="preview-nav__name">{owner.name || 'Professional Profile'}</span>
                            <span className="preview-nav__tagline">{owner.tagline || 'Building Success'}</span>
                        </div>
                    </div>
                    <div className="preview-nav__actions">
                        <button onClick={handleShare} className="preview-nav__btn preview-nav__btn--share">
                            <FaShare />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Enhanced Hero Section */}
            <section className="preview-hero">
                <div className="preview-hero__container">
                    <div className="preview-hero__content">
                        <div className="preview-hero__avatar">
                            <span>{owner.name ? owner.name.charAt(0).toUpperCase() : 'P'}</span>
                        </div>
                        <h1 className="preview-hero__name">{owner.name || 'Your Name'}</h1>
                        <p className="preview-hero__tagline">
                            {owner.tagline || 'Professional • Entrepreneur • Success Builder'}
                        </p>

                        {/* Enhanced Contact Info */}
                        <div className="preview-hero__contact">
                            {contact.phone && (
                                <>
                                    <button
                                        onClick={() => handleContactClick('phone', contact.phone)}
                                        className="preview-hero__contact-item"
                                    >
                                        <FaPhone /> Call Now
                                    </button>
                                    <button
                                        onClick={() => handleContactClick('whatsapp', contact.phone)}
                                        className="preview-hero__contact-item preview-hero__contact-item--whatsapp"
                                    >
                                        <FaWhatsapp /> WhatsApp
                                    </button>
                                </>
                            )}
                            {contact.email && (
                                <button
                                    onClick={() => handleContactClick('email', contact.email)}
                                    className="preview-hero__contact-item"
                                >
                                    <FaEnvelope /> Email
                                </button>
                            )}
                        </div>

                        {/* Enhanced Social Links */}
                        {socialLinks.length > 0 && (
                            <div className="preview-hero__social">
                                {socialLinks.map((social, index) => {
                                    const Icon = social.icon;
                                    return (
                                        <a
                                            key={index}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="preview-hero__social-link"
                                            title={social.label}
                                            style={{ '--social-color': social.color }}
                                        >
                                            <Icon />
                                        </a>
                                    );
                                })}
                            </div>
                        )}

                        {/* Stats */}
                        <div className="preview-hero__stats">
                            <div className="preview-stat">
                                <span className="preview-stat__number">{products.length}</span>
                                <span className="preview-stat__label">Products</span>
                            </div>
                            <div className="preview-stat">
                                <span className="preview-stat__number">100+</span>
                                <span className="preview-stat__label">Happy Clients</span>
                            </div>
                            <div className="preview-stat">
                                <span className="preview-stat__number">5★</span>
                                <span className="preview-stat__label">Rating</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Enhanced Products Section */}
            {products.length > 0 && (
                <section className="preview-section">
                    <div className="preview-container">
                        <div className="preview-section__header">
                            <h2 className="preview-section__title">Our Product Portfolio</h2>
                            <p className="preview-section__subtitle">
                                Discover our premium selection of {products.length} carefully curated products
                            </p>
                        </div>

                        {/* Product Navigation */}
                        {products.length > 1 && (
                            <div className="preview-product-nav">
                                {products.map((product, index) => (
                                    <button
                                        key={index}
                                        className={`preview-product-nav__item ${selectedProduct === index ? 'active' : ''}`}
                                        onClick={() => setSelectedProduct(index)}
                                    >
                                        <FaBoxOpen />
                                        <span>Product {index + 1}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Product Display */}
                        <div className="preview-products-grid">
                            {products.map((product, index) => (
                                <div
                                    key={index}
                                    className={`preview-product ${products.length === 1 || selectedProduct === index ? 'active' : ''}`}
                                    style={{ display: products.length > 1 && selectedProduct !== index ? 'none' : 'block' }}
                                >
                                    <div className="preview-product__content">
                                        <div className="preview-product__info">
                                            <div className="preview-product__badge">
                                                <FaStar /> Premium Product
                                            </div>
                                            <h3 className="preview-product__title">{product.title}</h3>
                                            {product.price && (
                                                <div className="preview-product__price">
                                                    <span className="preview-product__currency">₹</span>
                                                    <span className="preview-product__amount">
                                                        {Number(product.price).toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                            )}
                                            {product.description && (
                                                <p className="preview-product__description">{product.description}</p>
                                            )}

                                            <div className="preview-product__features">
                                                <div className="preview-feature">
                                                    <FaCheckCircle className="preview-feature__icon" />
                                                    <span>Premium Quality Guaranteed</span>
                                                </div>
                                                <div className="preview-feature">
                                                    <FaCheckCircle className="preview-feature__icon" />
                                                    <span>Proven Results & Effectiveness</span>
                                                </div>
                                                <div className="preview-feature">
                                                    <FaCheckCircle className="preview-feature__icon" />
                                                    <span>Expert Support Included</span>
                                                </div>
                                                <div className="preview-feature">
                                                    <FaCheckCircle className="preview-feature__icon" />
                                                    <span>Money Back Guarantee</span>
                                                </div>
                                            </div>

                                            <div className="preview-product__actions">
                                                <button
                                                    className="preview-btn preview-btn--primary"
                                                    onClick={() => openInquiry(index)}
                                                >
                                                    <FaShoppingCart /> Order Now
                                                </button>
                                                <button
                                                    className="preview-btn preview-btn--secondary"
                                                    onClick={handleShare}
                                                >
                                                    <FaShare /> Share Product
                                                </button>
                                            </div>
                                        </div>

                                        {/* Debug: Always show image section for debugging */}
                                        <div className="preview-product__image">
                                            {product.imageUrl ? (
                                                <img 
                                                    src={product.imageUrl} 
                                                    alt={product.title} 
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        console.error('Failed to load product image:', product.imageUrl);
                                                        console.error('Product data:', product);
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = '<div class="preview-product__image-placeholder"><span>📷</span><p>Image failed to load</p><small>' + product.imageUrl + '</small></div>';
                                                    }}
                                                    onLoad={() => {
                                                        console.log('Product image loaded successfully:', product.imageUrl);
                                                    }}
                                                />
                                            ) : (
                                                <div className="preview-product__image-placeholder">
                                                    <span>📷</span>
                                                    <p>No image URL found</p>
                                                    <small>Debug: {JSON.stringify({
                                                        imageUrl: product.imageUrl,
                                                        imageUrls: product.imageUrls,
                                                        image: product.image,
                                                        productImage: product.productImage,
                                                        img: product.img,
                                                        selectedProduct: product.selectedCompanyProduct,
                                                        companyData: product.companyProductData ? 'exists' : 'missing',
                                                        extractedUrl: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : 'none'
                                                    })}</small>
                                                </div>
                                            )}
                                            <div className="preview-product__image-overlay">
                                                <button className="preview-product__zoom">🔍</button>
                                            </div>
                                        </div>
                                    </div>

                                    {product.about && (
                                        <div className="preview-product__about">
                                            <h4>
                                                <FaRocket /> About This Product
                                            </h4>
                                            <p>{product.about}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Product Grid for Multiple Products - Updated without "View Details" */}
                        {products.length > 1 && (
                            <div className="preview-all-products">
                                <h3>All Products Overview</h3>
                                <div className="preview-products-overview">
                                    {products.map((product, index) => (
                                        <div key={index} className="preview-product-card">
                                            <div className="preview-product-card__image">
                                                {product.imageUrl ? (
                                                    <img 
                                                        src={product.imageUrl} 
                                                        alt={product.title} 
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            console.error('Failed to load product card image:', product.imageUrl);
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerHTML = '<div class="preview-image-placeholder"><span>📷</span><p>Failed</p></div>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="preview-image-placeholder">
                                                        <span>📷</span>
                                                        <p>No Image</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="preview-product-card__content">
                                                <h4>{product.title}</h4>
                                                {product.price && (
                                                    <span className="preview-product-card__price">
                                                        ₹{Number(product.price).toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                                <p>{product.description}</p>
                                                <div className="preview-product-card__actions">
                                                    <button
                                                        className="preview-product-card__btn preview-product-card__btn--order"
                                                        onClick={() => openInquiry(index)}
                                                    >
                                                        <FaShoppingCart /> Order Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Inquiry Modal */}
            {isInquiryOpen && (
                <div className="preview-modal-overlay" onClick={() => setIsInquiryOpen(false)}>
                    <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-modal-header">
                            <h2>Place Your Order</h2>
                            <button
                                className="preview-modal-close"
                                onClick={() => setIsInquiryOpen(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="preview-modal-body">
                            <div className="preview-form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    value={inquiryData.name}
                                    onChange={(e) => handleInquiryChange('name', e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div className="preview-form-group">
                                <label>Phone Number *</label>
                                <input
                                    type="tel"
                                    value={inquiryData.phone}
                                    onChange={(e) => handleInquiryChange('phone', e.target.value)}
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </div>

                            <div className="preview-form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={inquiryData.email}
                                    onChange={(e) => handleInquiryChange('email', e.target.value)}
                                    placeholder="Enter your email address"
                                />
                            </div>

                            <div className="preview-form-group">
                                <label>Delivery Address</label>
                                <textarea
                                    value={inquiryData.address}
                                    onChange={(e) => handleInquiryChange('address', e.target.value)}
                                    placeholder="Enter your complete address"
                                    rows="3"
                                />
                            </div>

                            <div className="preview-form-group">
                                <label>Product Name</label>
                                <input
                                    type="text"
                                    value={inquiryData.productName}
                                    readOnly
                                    className="preview-form-readonly"
                                />
                            </div>

                            <div className="preview-form-group">
                                <label>Quantity *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={inquiryData.quantity}
                                    onChange={(e) => handleInquiryChange('quantity', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="preview-modal-footer">
                            <button
                                className="preview-btn preview-btn--secondary"
                                onClick={() => setIsInquiryOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="preview-btn preview-btn--primary"
                                onClick={sendInquiry}
                                disabled={isSending}
                            >
                                {isSending ? 'Sending...' : 'Send Inquiry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Contact & Address Section */}
            <section className="preview-section preview-section--contact">
                <div className="preview-container">
                    <div className="preview-section__header">
                        <h2 className="preview-section__title">Get In Touch</h2>
                        <p className="preview-section__subtitle">Ready to start your success journey? Contact us today!</p>
                    </div>

                    <div className="preview-contact-grid">
                        <div className="preview-contact-card">
                            <div className="preview-contact-card__header">
                                <FaPhone className="preview-contact-card__icon" />
                                <h3>Contact Information</h3>
                            </div>
                            <div className="preview-contact-list">
                                {contact.phone && (
                                    <div className="preview-contact-item">
                                        <FaPhone className="preview-contact-icon" />
                                        <div className="preview-contact-info">
                                            <label>Phone Number</label>
                                            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                                        </div>
                                    </div>
                                )}
                                {contact.email && (
                                    <div className="preview-contact-item">
                                        <FaEnvelope className="preview-contact-icon" />
                                        <div className="preview-contact-info">
                                            <label>Email Address</label>
                                            <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="preview-contact-actions">
                                <button
                                    className="preview-contact-btn preview-contact-btn--whatsapp"
                                    onClick={() => handleContactClick('whatsapp', contact.phone)}
                                >
                                    <FaWhatsapp /> WhatsApp
                                </button>
                                <button
                                    className="preview-contact-btn preview-contact-btn--call"
                                    onClick={() => handleContactClick('phone', contact.phone)}
                                >
                                    <FaPhone /> Call Now
                                </button>
                            </div>
                        </div>

                        {(address.city || address.country) && (
                            <div className="preview-contact-card">
                                <div className="preview-contact-card__header">
                                    <FaMapMarkerAlt className="preview-contact-card__icon" />
                                    <h3>Location</h3>
                                </div>
                                <div className="preview-contact-item">
                                    <FaMapMarkerAlt className="preview-contact-icon" />
                                    <div className="preview-contact-info">
                                        <label>Business Address</label>
                                        <address className="preview-address">
                                            {address.line1 && <div>{address.line1}</div>}
                                            {address.line2 && <div>{address.line2}</div>}
                                            <div>
                                                {address.city && address.city}
                                                {address.state && `, ${address.state}`}
                                                {address.pincode && ` ${address.pincode}`}
                                            </div>
                                            {address.country && <div>{address.country}</div>}
                                        </address>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Enhanced Footer */}
            <footer className="preview-footer">
                <div className="preview-container">
                    <div className="preview-footer__content">
                        <div className="preview-footer__info">
                            <div className="preview-footer__brand">
                                <div className="preview-footer__logo">
                                    {owner.name ? owner.name.charAt(0).toUpperCase() : 'P'}
                                </div>
                                <div>
                                    <h4>{owner.name || 'Professional Profile'}</h4>
                                    <p>{owner.tagline || 'Building success through innovation'}</p>
                                </div>
                            </div>

                            {socialLinks.length > 0 && (
                                <div className="preview-footer__social">
                                    <span>Follow Us:</span>
                                    <div className="preview-footer__social-links">
                                        {socialLinks.map((social, index) => {
                                            const Icon = social.icon;
                                            return (
                                                <a
                                                    key={index}
                                                    href={social.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="preview-footer__social-link"
                                                    title={social.label}
                                                    style={{ '--social-color': social.color }}
                                                >
                                                    <Icon />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="preview-footer__bottom">
                            <p>&copy; 2025 {owner.name || 'Professional Profile'}. All rights reserved.</p>
                            <p>Powered by <strong>HTAMS</strong> - Professional Site Creator</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
