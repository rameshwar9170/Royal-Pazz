# Royal Pazz Backend - Razorpay Payment Integration

This PHP backend provides Razorpay payment integration for the Royal Pazz e-commerce application.

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
composer install
```

### 2. Database Setup
1. Create a MySQL database named `royal_pazz`
2. Import the schema from `database/schema.sql`
```sql
mysql -u root -p royal_pazz < database/schema.sql
```

### 3. Configure Environment Variables
Add your Razorpay credentials to the `.env` file in the root directory:
```
RAZORPAY_KEY_ID=your_actual_razorpay_key_id
RAZORPAY_KEY_SECRET=your_actual_razorpay_secret_key
```

### 4. Web Server Configuration
Place the backend folder in your web server directory (e.g., `htdocs` for XAMPP or `www` for WAMP).

The API endpoints will be available at:
- `http://localhost/royal-pazz/backend/api/create_order.php`
- `http://localhost/royal-pazz/backend/api/verify_payment.php`
- `http://localhost/royal-pazz/backend/api/download_invoice.php`

## API Endpoints

### Create Order
**POST** `/api/create_order.php`

Creates a new order and Razorpay order ID.

**Request Body:**
```json
{
    "items": [
        {
            "id": 1,
            "name": "Product Name",
            "price": 5000,
            "quantity": 1
        }
    ],
    "total_amount": 5000,
    "user_id": "optional_user_id",
    "shipping_address": {
        "name": "Customer Name",
        "city": "City",
        "state": "State",
        "postal_code": "123456"
    }
}
```

**Response:**
```json
{
    "message": "Order created successfully.",
    "order_id": 1,
    "razorpay_order_id": "order_xyz123",
    "amount": 5000,
    "currency": "INR",
    "key_id": "rzp_test_xxxxx"
}
```

### Verify Payment
**POST** `/api/verify_payment.php`

Verifies payment and generates invoice.

**Request Body:**
```json
{
    "razorpay_payment_id": "pay_xyz123",
    "razorpay_order_id": "order_xyz123",
    "razorpay_signature": "signature_xyz",
    "customer_name": "Customer Name",
    "customer_email": "customer@example.com",
    "customer_phone": "9876543210"
}
```

**Response:**
```json
{
    "message": "Payment verified successfully.",
    "order_id": 1,
    "invoice_id": 1,
    "invoice_number": "INV202501130001",
    "pdf_filename": "invoice_INV202501130001.pdf",
    "status": "success"
}
```

### Download Invoice
**GET** `/api/download_invoice.php?invoice_id=1`

Downloads the generated invoice PDF.

## Database Schema

### Orders Table
- `id` - Primary key
- `user_id` - User identifier (optional)
- `total_amount` - Order total amount
- `status` - Order status (pending, paid, failed, cancelled)
- `razorpay_order_id` - Razorpay order ID
- `razorpay_payment_id` - Razorpay payment ID
- `razorpay_signature` - Payment signature
- `items` - JSON array of order items
- `shipping_address` - JSON object with shipping details
- `created_at` - Order creation timestamp

### Invoices Table
- `id` - Primary key
- `order_id` - Foreign key to orders table
- `invoice_number` - Unique invoice number
- `customer_name` - Customer name
- `customer_email` - Customer email
- `customer_phone` - Customer phone
- `billing_address` - JSON object with billing details
- `items` - JSON array of invoice items
- `subtotal` - Subtotal amount
- `tax_amount` - Tax amount (18% GST)
- `total_amount` - Total amount
- `created_at` - Invoice creation timestamp

## Features

1. **Razorpay Integration**: Complete payment gateway integration
2. **Order Management**: Create and track orders
3. **Invoice Generation**: Automatic PDF invoice generation
4. **Payment Verification**: Secure payment signature verification
5. **Database Storage**: Persistent storage of orders and invoices
6. **Error Handling**: Comprehensive error handling and logging

## Security Features

- Payment signature verification
- SQL injection protection using PDO
- CORS headers for cross-origin requests
- Environment variable configuration for sensitive data

## File Structure

```
backend/
├── api/
│   ├── create_order.php
│   ├── verify_payment.php
│   └── download_invoice.php
├── config/
│   ├── database.php
│   └── razorpay.php
├── models/
│   ├── Order.php
│   └── Invoice.php
├── database/
│   └── schema.sql
├── invoices/
│   └── (generated PDF files)
├── composer.json
└── README.md
```

## Testing

1. Ensure your web server is running
2. Configure Razorpay test credentials
3. Test the payment flow using the frontend application
4. Check generated invoices in the `invoices/` directory

## Production Deployment

1. Use production Razorpay credentials
2. Configure proper database credentials
3. Set up SSL certificates
4. Configure proper CORS origins
5. Set up proper file permissions for the invoices directory
