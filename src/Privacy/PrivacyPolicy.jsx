import React from "react";
import { Link } from "react-router-dom";
import PageShell from "./PageShell";

export const PrivacyPolicy = () => (
  <PageShell title="Privacy Policy">
    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg">
      <p className="text-green-800">
        <strong>Your Privacy Matters:</strong> We are committed to protecting your personal information and being transparent about our data practices.
      </p>
    </div>

    <p className="text-lg text-gray-700 mb-6">
      We respect your privacy. This policy explains what data we collect, how we use it, and your rights.
    </p>

    <h2>📊 Information We Collect</h2>
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <ul className="mb-0">
        <li><strong>Personal details:</strong> name, email, phone, billing/shipping address.</li>
        <li><strong>Order & payment metadata</strong> (processed via secure payment gateways).</li>
        <li><strong>Usage data:</strong> device, IP, browser, and interaction logs for security and analytics.</li>
      </ul>
    </div>

    <h2>⚙️ How We Use Information</h2>
    <ul>
      <li>Process and fulfill orders; provide customer support.</li>
      <li>Send transactional updates (order, shipping) and—only with consent—marketing communications.</li>
      <li>Improve site performance, prevent fraud, and maintain security.</li>
    </ul>

    <h2>🤝 Sharing & Disclosure</h2>
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
      <ul className="mb-0">
        <li><strong>We do not sell your personal data.</strong></li>
        <li>We may share with trusted providers (payments, logistics, IT) strictly for service delivery.</li>
        <li>We may disclose when required by law or to protect rights, safety, and security.</li>
      </ul>
    </div>

    <h2>🛡️ Data Security</h2>
    <ul>
      <li>We use technical and organizational measures to protect data. No method is 100% secure.</li>
      <li>Access is restricted to authorized personnel on a need-to-know basis.</li>
    </ul>

    <h2>✋ Your Rights</h2>
    <ul>
      <li>Access, correct, or request deletion of your personal information (subject to legal/regulatory retention).</li>
      <li>Opt out of marketing at any time via the unsubscribe link or by contacting support.</li>
      <li>Withdraw consent where processing is based on consent.</li>
    </ul>

    <h2>🍪 Cookies</h2>
    <p>We use cookies and similar technologies for essential functionality and analytics. You can control cookies in your browser settings; some features may not function if disabled.</p>

    <h2>👶 Children</h2>
    <p>Our services are not directed to children under 13. We do not knowingly collect data from children.</p>

    <h2>🔄 Updates to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. Material changes will be noted on this page.</p>

    <h2>💬 Contact</h2>
    <p>Questions? See our <Link to="/policies/contact" className="text-green-600 hover:text-green-700 font-medium underline">Contact Us</Link> page.</p>
  </PageShell>
);

export default PrivacyPolicy;
