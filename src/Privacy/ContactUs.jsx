import React, { useState } from "react";
import PageShell from "./PageShell";

export const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
  };

  return (
    <PageShell title="Contact Us">
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-lg">
        <p className="text-green-800">
          <strong>We're Here to Help:</strong> Whether you have questions about our products, need support with your order, or want wellness guidance, we're just a message away.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Contact Information */}
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📧</span>
              <h3 className="text-xl font-semibold text-gray-800">Email Us</h3>
            </div>
            <p className="text-gray-600 mb-2">For general inquiries and support</p>
            <a href="mailto:support@panchgiri.com" className="text-green-600 font-medium hover:text-green-700">
              panchgiri@gmail.com
            </a>
          </div>

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📞</span>
              <h3 className="text-xl font-semibold text-gray-800">Call Us</h3>
            </div>
            <p className="text-gray-600 mb-2">Speak directly with our team</p>
            <p className="text-green-600 font-medium">+91-8390784001</p>
            <p className="text-sm text-gray-500 mt-2">Mon–Sat, 10:00 AM – 6:00 PM (IST)</p>
          </div>

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📍</span>
              <h3 className="text-xl font-semibold text-gray-800">Visit Us</h3>
            </div>
            <div className="text-gray-600">
              <p className="font-medium">Panchgiri Ayurveda</p>
              <p>Kolhapur, Maharashtra, India</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 border rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <p>🔄 <a href="/policies/refund" className="text-green-600 hover:text-green-700">Return & Refund Status</a></p>
              <p>📦 <a href="/policies/shipping" className="text-green-600 hover:text-green-700">Track Your Order</a></p>
              <p>📋 <a href="/policies/terms" className="text-green-600 hover:text-green-700">Terms & Conditions</a></p>
              <p>🔒 <a href="/policies/privacy" className="text-green-600 hover:text-green-700">Privacy Policy</a></p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
       
      </div>
    </PageShell>
  );
};

export default ContactUs;
