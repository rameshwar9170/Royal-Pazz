# Cheque Payment Approval System

## Overview
The Cheque Approval system allows company administrators to verify and approve cheque payments uploaded by sellers. Upon approval, commissions are automatically distributed to the seller and their upline according to the configured commission structure.

## Location
- **File**: `src/pages/Company/ChequeApproval.js`
- **Route**: `/company-dashboard/cheque-approval`
- **Access**: Company Admin only

## Features

### 1. Real-time Dashboard
- **Pending Verification**: Shows number of cheques awaiting approval
- **Approved**: Count of verified cheque payments
- **Rejected**: Count of rejected cheque payments
- **Total Pending Amount**: Sum of all pending cheque payments

### 2. Order Filtering
- Filter by status: All, Pending, Approved, Rejected
- Search by customer name, phone number, or order ID
- Real-time updates from Firebase

### 3. Cheque Verification
- View uploaded cheque images in full screen
- Download cheque images for record keeping
- See customer details and order information
- View product items in the order

### 4. Approval Workflow

#### When Approving:
1. Review the uploaded cheque image
2. Verify customer and order details
3. Click "Approve & Distribute" button
4. System automatically:
   - Calls commission distribution API for each product
   - Updates order status to "Confirmed"
   - Marks payment status as "verified"
   - Records commission distribution results
   - Shows success message with distribution summary

#### When Rejecting:
1. Click "Reject" button
2. Enter rejection reason
3. System automatically:
   - Updates order status to "Cancelled"
   - Marks payment status as "rejected"
   - Saves rejection reason
   - Prevents commission distribution

### 5. Commission Distribution
- Uses the same `processsale` API endpoint as online payments
- Distributes commission to seller and upline
- Handles partial distribution if some products fail
- Shows detailed results: X/Y items distributed successfully
- Records all distribution attempts in Firebase

## Firebase Data Structure

### Order Document
```javascript
{
  orderId: "order_123",
  customerName: "John Doe",
  customerPhone: "9876543210",
  totalAmount: 5000,
  items: [...],
  
  // Cheque Payment Details
  paymentDetails: {
    payment_method: "Cheque",
    payment_status: "awaiting_verification" | "verified" | "rejected",
    chequeImageUrl: "https://...",
    verifiedAt: "2024-11-08T10:30:00.000Z",
    verifiedBy: "admin",
    rejectedAt: "2024-11-08T10:30:00.000Z",
    rejectionReason: "Invalid cheque"
  },
  
  // Cheque Details
  chequeDetails: {
    imageUrl: "https://...",
    storagePath: "HTAMS/chequePayments/...",
    uploadedAt: "2024-11-08T10:00:00.000Z",
    uploadedBy: "seller_uid",
    status: "pending_verification"
  },
  
  // Commission Status
  commissionStatus: "awaiting_admin_approval" | "distributed" | "partially_distributed" | "cancelled",
  
  // Commission Summary
  commissionSummary: {
    distributed: 2,
    totalItems: 3,
    lastUpdated: "2024-11-08T10:30:00.000Z",
    results: [
      { productId: "p1", productName: "Product 1", result: { ok: true } },
      { productId: "p2", productName: "Product 2", result: { ok: false, error: "..." } }
    ],
    distributionStatus: "partially_distributed"
  }
}
```

## API Integration

### Commission Distribution Endpoint
- **URL**: `https://processsale-udqmpp6qhq-uc.a.run.app`
- **Method**: POST
- **Payload**:
```javascript
{
  sellerId: "user_uid",
  amount: 1500,
  product: {
    id: "product_123",
    name: "Product Name"
  },
  orderId: "order_123_product_123",
  idempotencyKey: "cheque_order_123_product_123_timestamp"
}
```

## Status Flow

### Cheque Payment Lifecycle:
1. **Uploaded** → `awaiting_verification`
2. **Admin Reviews** → View cheque image and details
3. **Admin Decision**:
   - **Approve** → `verified` + Commission distributed + Order confirmed
   - **Reject** → `rejected` + Order cancelled

## Error Handling

### Commission Distribution Failures:
- If all products fail: Order approved but commission status marked as "failed"
- If some products fail: Order approved with "partially_distributed" status
- Admin receives detailed failure information in UI
- Can choose to proceed with approval even if commission fails

## Navigation

### From Company Dashboard:
1. Click "Cheque Approval" in the sidebar (icon: 🧾)
2. Or navigate to: `/company-dashboard/cheque-approval`

## Styling
- **CSS File**: `ChequeApproval.css`
- **Design**: Modern gradient UI with card-based layout
- **Responsive**: Fully mobile responsive
- **Icons**: React Icons (react-icons/fi)

## Best Practices

### Before Approving:
1. ✅ Verify cheque image is clear and readable
2. ✅ Check cheque date and amount match order
3. ✅ Verify customer details
4. ✅ Ensure bank details are visible
5. ✅ Download cheque image for records

### After Approval:
- Commission is automatically distributed
- Order status changes to "Confirmed"
- Seller can see the payment in their wallet
- Customer receives order confirmation

### When Rejecting:
- Always provide clear rejection reason
- Customer will need to re-upload valid cheque
- Order remains in system but marked as cancelled

## Security Considerations
- Only admin users can access this page
- All actions are logged with timestamp and admin ID
- Cheque images stored securely in Firebase Storage
- Commission distribution uses idempotency keys to prevent duplicates

## Future Enhancements
- Bulk approval feature
- OCR for automatic cheque verification
- Email notifications to seller on approval/rejection
- SMS notifications to customers
- Export cheque approval reports

## Support
For issues or questions, contact the development team.
