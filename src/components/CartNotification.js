import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaTimes, FaShoppingCart } from 'react-icons/fa';
import './CartNotification.css';

const CartNotification = ({ message, title, onClose, onViewCart, showViewCart = true }) => {
    const [isHiding, setIsHiding] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsHiding(true);
            setTimeout(onClose, 300); // Wait for slide out animation
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`cart-notification ${isHiding ? 'hide' : ''}`}>
            <div className="notification-icon">
                <FaCheckCircle />
            </div>
            <div className="notification-content">
                <h4 className="notification-title">{title || 'Item Added to Cart'}</h4>
                <p className="notification-message">{message}</p>
                {showViewCart && (
                    <div className="notification-actions">
                        <button className="notification-button view-cart-btn" onClick={onViewCart}>
                            <FaShoppingCart /> View Cart
                        </button>
                    </div>
                )}
            </div>
            <button className="notification-close" onClick={() => setIsHiding(true)}>
                <FaTimes />
            </button>
        </div>
    );
};

export default CartNotification;