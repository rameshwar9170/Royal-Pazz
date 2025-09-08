// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { ref, get, update } from 'firebase/database';
// import { db, storage } from '../../firebase/config';
// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// const Technician = () => {
//   const { orderId } = useParams();
//   const [order, setOrder] = useState(null);
//   const [enteredOtp, setEnteredOtp] = useState('');
//   const [imageFile, setImageFile] = useState(null);
//   const [uploading, setUploading] = useState(false);

// useEffect(() => {
//   const fetchOrder = async () => {
//     const cachedOrder = sessionStorage.getItem(`order_${orderId}`);
//     if (cachedOrder) {
//       setOrder(JSON.parse(cachedOrder));
//       return;
//     }

//     try {
//       const orderRef = ref(db, `HTAMS/orders/${orderId}`);
//       const snapshot = await get(orderRef);
//       if (snapshot.exists()) {
//         const orderData = snapshot.val();
//         setOrder(orderData);
//         sessionStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
//       } else {
//         alert('Order not found.');
//       }
//     } catch (error) {
//       console.error('Error fetching order:', error);
//       alert('Failed to fetch order details.');
//     }
//   };

//   fetchOrder();
// }, [orderId]);


//   const handleImageChange = (e) => {
//     if (e.target.files[0]) {
//       setImageFile(e.target.files[0]);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!order) return;
//     if (enteredOtp !== order.otp) {
//       alert('❌ OTP does not match.');
//       return;
//     }

//     if (!imageFile) {
//       alert('Please upload a proof image.');
//       return;
//     }

//     try {
//       setUploading(true);
//       const imgRef = storageRef(storage, `orderProof/${orderId}_${Date.now()}.jpg`);
//       await uploadBytes(imgRef, imageFile);
//       const downloadURL = await getDownloadURL(imgRef);

//       const orderRef = ref(db, `HTAMS/orders/${orderId}`);
//       await update(orderRef, {
//         status: 'completed',
//         otpVerified: true,
//         proofImage: downloadURL,
//         completedAt: Date.now()
//       });

//       alert('✅ Order marked as completed!');
//       setUploading(false);
//     } catch (error) {
//       console.error(error);
//       alert('❌ Failed to complete order.');
//       setUploading(false);
//     }
//   };

//   if (!order) return <p>Loading...</p>;

//   return (
//     <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', background: '#f9f9f9', borderRadius: '10px' }}>
//       <h2>Technician Order Completion</h2>
//       <p><strong>Customer:</strong> {order.name}</p>
//       <p><strong>Phone:</strong> {order.phone}</p>
//       <p><strong>Address:</strong> {order.address}</p>
//       <p><strong>Product:</strong> {order.product}</p>

//       <label>Enter OTP sent to customer:</label>
//       <input
//         type="text"
//         value={enteredOtp}
//         onChange={(e) => setEnteredOtp(e.target.value)}
//         style={{ width: '100%', padding: '8px', margin: '10px 0' }}
//       />

//       <label>Upload Proof Image:</label>
//       <input type="file" accept="image/*" onChange={handleImageChange} />

//       <button
//         onClick={handleSubmit}
//         disabled={uploading}
//         style={{ marginTop: '20px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none' }}
//       >
//         {uploading ? 'Uploading...' : 'Complete Order'}
//       </button>
//     </div>
//   );
// };

// export default Technician;
