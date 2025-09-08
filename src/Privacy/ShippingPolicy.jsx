import React from "react";
import { Link } from "react-router-dom";
import PageShell from "./PageShell";

export const ShippingPolicy = () => (
  <PageShell title="Shipping Policy">
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
      <p className="text-blue-800">
        <strong>Fast & Reliable Delivery:</strong> We ensure your Ayurvedic products reach you safely and on time across India.
      </p>
    </div>

    <h2>⏳ Order Processing</h2>
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">Processing Time</h3>
        <p className="text-green-700 text-sm">Orders are processed within 1–2 business days after payment confirmation.</p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-semibold text-purple-800 mb-2">Tracking</h3>
        <p className="text-purple-700 text-sm">Tracking details are shared via email/SMS when dispatched.</p>
      </div>
    </div>

    <h2>🚚 Delivery Timelines</h2>
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">📍</span>
        <div>
          <p className="font-semibold text-gray-800">Standard Delivery within India</p>
          <p className="text-gray-600 text-sm">Typically takes 4–7 business days</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏔️</span>
        <div>
          <p className="font-semibold text-gray-800">Remote Locations</p>
          <p className="text-gray-600 text-sm">May require additional time depending on courier networks</p>
        </div>
      </div>
    </div>

    <h2>💰 Shipping Charges</h2>
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">💳</span>
        <div>
          <p className="text-amber-800">
            <strong>Transparent Pricing:</strong> Charges (if any) are shown at checkout; free shipping may apply above a threshold.
          </p>
        </div>
      </div>
    </div>

    <h2>⚠️ Delays & Liability</h2>
    <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
      <ul className="mb-0 text-red-800">
        <li>We are not responsible for delays caused by courier partners, weather, or unforeseen events.</li>
      </ul>
    </div>

    <h2>🌍 International Shipping</h2>
    <div className="bg-blue-50 p-4 rounded-lg mb-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🇮🇳</span>
        <div>
          <p className="font-semibold text-blue-800">India Only</p>
          <p className="text-blue-700 text-sm">Currently, we ship only within India.</p>
        </div>
      </div>
    </div>

    <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg text-center">
      <h3 className="font-semibold text-gray-800 mb-2">Questions about delivery?</h3>
      <p className="text-gray-600 mb-4">Our support team is here to help with all shipping inquiries</p>
      <Link to="/policies/contact" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
        📞 Contact Support
      </Link>
    </div>
  </PageShell>
);

export default ShippingPolicy;
