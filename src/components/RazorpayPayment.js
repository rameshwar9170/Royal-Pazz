import React, { useState } from 'react';

const RazorpayPayment = ({ 
  amount, 
  items, 
  userId, 
  onSuccess, 
  onFailure, 
  onClose,
  buttonText = "Pay Now",
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createOrder = async (orderData) => {
    try {
      const response = await fetch('http://localhost:8000/api/create_order.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const response = await fetch('http://localhost:8000/api/verify_payment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Payment verification failed');
      }

      return data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order
      const orderData = {
        items: items,
        total_amount: amount,
        user_id: userId
      };

      const orderResponse = await createOrder(orderData);

      // Configure Razorpay options
      const options = {
        key: orderResponse.key_id,
        amount: orderResponse.amount * 100, // Amount in paise
        currency: orderResponse.currency,
        name: 'Royal Pazz',
        description: `Purchase of ${items.length} item(s)`,
        order_id: orderResponse.razorpay_order_id,
        handler: async function (response) {
          try {
            // Verify payment
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };

            const verificationResponse = await verifyPayment(verificationData);
            
            if (verificationResponse.success) {
              onSuccess({
                ...verificationResponse,
                items: items,
                amount: amount
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            onFailure(error.message);
          }
        },
        prefill: {
          name: userId || 'Customer',
          email: '',
          contact: ''
        },
        notes: {
          user_id: userId,
          items_count: items.length
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            if (onClose) onClose();
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      onFailure(error.message);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading || !items || items.length === 0}
      className="razorpay-payment-btn"
      style={{
        backgroundColor: loading ? '#ccc' : '#3399cc',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        minWidth: '120px'
      }}
    >
      {loading ? 'Processing...' : buttonText}
    </button>
  );
};

export default RazorpayPayment;
