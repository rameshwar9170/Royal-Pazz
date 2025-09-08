import React from "react";
import { Link } from "react-router-dom";
import PageShell from "./PageShell";

export const RefundPolicy = () => (
  <PageShell title="Refund Policy">
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
      <p className="text-amber-800">
        <strong>Customer Satisfaction Guarantee:</strong> We stand behind our products and want you to be completely satisfied with your purchase.
      </p>
    </div>

    <p className="text-lg text-gray-700 mb-6">
      We aim for complete satisfaction. This policy explains when refunds or returns are available.
    </p>

    <h2>✅ Eligibility</h2>
    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
      <ul className="mb-0">
        <li>Only unopened, unused products in original packaging are eligible.</li>
        <li>File a request within <strong className="text-red-600">7 days</strong> of delivery with proof of purchase and unboxing images if applicable.</li>
        <li>Opened, used, or tampered items cannot be returned due to health & safety reasons.</li>
      </ul>
    </div>

    <h2>🔄 Process</h2>
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Step 1: Contact</h3>
        <p className="text-blue-700 text-sm">Contact support with order details; we will share the return address/RMA.</p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-semibold text-purple-800 mb-2">Step 2: Refund</h3>
        <p className="text-purple-700 text-sm">Upon receipt and inspection, approved refunds are issued to the original payment method within 7–10 business days.</p>
      </div>
    </div>

    <h2>🗓️ Service Bookings</h2>
    <ul>
      <li>Consultations/therapies may be canceled up to 24 hours in advance for a full refund.</li>
      <li>No-shows or late cancellations may be ineligible.</li>
    </ul>

    <h2>❌ Non-Refundable</h2>
    <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
      <ul className="mb-0">
        <li>Customized/personalized items, gift cards, vouchers, and discounted items (unless defective).</li>
      </ul>
    </div>

    <h2>📦 Damaged or Wrong Item</h2>
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-4">
      <p className="text-yellow-800 mb-0">
        <strong>Quick Resolution:</strong> Please report within 48 hours of delivery with photos; we will arrange replacement or refund as applicable.
      </p>
    </div>

    <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
      <p className="text-gray-700 mb-2">Need help with your return?</p>
      <Link to="/policies/contact" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
        📞 Contact Support
      </Link>
    </div>
  </PageShell>
);

export default RefundPolicy;
