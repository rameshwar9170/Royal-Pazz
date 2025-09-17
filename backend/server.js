const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order API
app.post('/api/create_order.php', async (req, res) => {
  try {
    const { items, total_amount, user_id } = req.body;

    if (!items || !total_amount) {
      return res.status(400).json({
        success: false,
        message: "Unable to create order. Data is incomplete."
      });
    }

    // Create Razorpay order
    const options = {
      amount: total_amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order_id: order.id,
      razorpay_order_id: order.id,
      amount: total_amount,
      currency: "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
      items: items,
      user_id: user_id
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: "Error creating Razorpay order.",
      error: error.message
    });
  }
});

// Verify Payment API
app.post('/api/verify_payment.php', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Missing required data."
      });
    }

    // Verify payment signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        status: "completed",
        verified_at: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature."
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(400).json({
      success: false,
      message: "Payment verification failed.",
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Missing'}`);
});
