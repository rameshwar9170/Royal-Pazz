import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';

const Bill = () => {
  const { orderId } = useParams(); // assume /bill/:orderId route
  const [orderData, setOrderData] = useState(null);
  const [agencyData, setAgencyData] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const orderSnap = await get(ref(db, `HTAMS/orders/${orderId}`));
      if (orderSnap.exists()) {
        const order = orderSnap.val();
        setOrderData(order);

        // Fetch agency details
        const agencySnap = await get(ref(db, `HTAMS/users/${order.agencyId}`));
        if (agencySnap.exists()) {
          setAgencyData(agencySnap.val());
        }
      }
    };
    fetchOrder();
  }, [orderId]);

  if (!orderData || !agencyData) return <p>Loading bill...</p>;

  const subtotal = orderData.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + tax;

  return (
    <div className="bill-container" style={{ maxWidth: 600, margin: 'auto', padding: 20, background: '#fff' }}>
      <h2>HTAMS Product Invoice</h2>
      <p><strong>Bill To:</strong> {agencyData.name}</p>
      <p><strong>Email:</strong> {agencyData.email}</p>
      <p><strong>Phone:</strong> {agencyData.phone}</p>
      <hr />

      <p><strong>Order ID:</strong> {orderId}</p>
      <p><strong>Date:</strong> {new Date(orderData.createdAt).toLocaleString()}</p>

      <table style={{ width: '100%', marginTop: 20, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc' }}>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orderData.items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>₹{item.price}</td>
              <td>₹{item.qty * item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <p><strong>Subtotal:</strong> ₹{subtotal}</p>
      <p><strong>Tax (5% GST):</strong> ₹{tax.toFixed(2)}</p>
      <h3>Total: ₹{total.toFixed(2)}</h3>

      <button onClick={() => window.print()} style={{ marginTop: 20 }}>
        🖨️ Print / Save as PDF
      </button>
    </div>
  );
};

export default Bill;
