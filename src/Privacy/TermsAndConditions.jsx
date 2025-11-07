import React from "react";
import { Link } from "react-router-dom";
import PageShell from "./PageShell";

export const TermsAndConditions = () => (
  <PageShell title="Terms & Conditions">
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
      <p className="text-blue-800">
        <strong>Last Updated:</strong> August 2025 • Please read these terms carefully before using our services.
      </p>
    </div>

    <p className="text-lg text-gray-700 mb-6">
      Welcome to ONDO . By accessing or using our website (www.ONDO.com) and related services, you agree to these Terms & Conditions. If you do not agree, please discontinue use.
    </p>

    <h2>🔐 Eligibility & Website Use</h2>
    <ul>
      <li>Users must be 18 years of age or older to purchase.</li>
      <li>Use the site only for lawful purposes; do not engage in abuse, fraud, or security violations.</li>
      <li>We may suspend or terminate access for violations.</li>
    </ul>

    <h2>🌿 Products & Services</h2>
    <ul>
      <li>ONDO  offers Ayurvedic products, consultations, and wellness services.</li>
      <li>Descriptions and images are for general information and may be updated without notice.</li>
      <li>Availability is not guaranteed; we may modify or discontinue offerings.</li>
    </ul>

    <h2>⚕️ Medical Disclaimer</h2>
    <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
      <ul className="mb-0">
        <li>Our products support wellness and are not a substitute for professional medical advice, diagnosis, or treatment.</li>
        <li>Consult a qualified physician before use, especially if pregnant, nursing, on medication, or managing a condition.</li>
        <li>ONDO is not liable for misuse, self-medication, or adverse effects due to improper use.</li>
      </ul>
    </div>

    <h2>💳 Orders, Pricing & Payments</h2>
    <ul>
      <li>Prices are in INR and may include applicable taxes (GST/CGST/SGST) unless stated otherwise.</li>
      <li>Order confirmation occurs after successful payment authorization.</li>
      <li>We reserve the right to cancel due to stock unavailability, pricing errors, or suspected fraud.</li>
    </ul>

    <h2>↩️ Returns & Refunds</h2>
    <p>See our <Link to="/policies/refund" className="text-green-600 hover:text-green-700 font-medium underline">Refund Policy</Link> for details.</p>

    <h2>🚚 Shipping</h2>
    <p>See our <Link to="/policies/shipping" className="text-green-600 hover:text-green-700 font-medium underline">Shipping Policy</Link> for timelines, coverage, and charges.</p>

    <h2>©️ Intellectual Property</h2>
    <ul>
      <li>All content (text, images, logos, trademarks) is owned by ONDO  or its licensors.</li>
      <li>No reproduction, distribution, or modification without prior written consent.</li>
    </ul>

    <h2>⚖️ Limitation of Liability</h2>
    <ul>
      <li>We are not liable for indirect, incidental, or consequential damages arising from site use or product/service use.</li>
      <li>We do not warrant uninterrupted, error-free, or secure operation of the website.</li>
    </ul>

    <h2>🔗 Third-Party Links</h2>
    <p>External links are provided for convenience. We do not control or endorse their content or policies.</p>

    <h2>🔒 Privacy</h2>
    <p>See our <Link to="/policies/privacy" className="text-green-600 hover:text-green-700 font-medium underline">Privacy Policy</Link> to understand data practices.</p>

    <h2>📝 Changes</h2>
    <p>We may update these Terms periodically. Continued use after updates constitutes acceptance.</p>

    <h2>🏛️ Governing Law & Jurisdiction</h2>
    <p>These Terms are governed by the laws of India; disputes are subject to the courts of Kolhapur, Maharashtra.</p>
  </PageShell>
);

export default TermsAndConditions;
