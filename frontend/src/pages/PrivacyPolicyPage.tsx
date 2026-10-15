import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { usePageMeta } from '../utils/usePageMeta'
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  usePageMeta('Privacy Policy', 'How CapCrew collects, uses and protects your personal information.')
  const cfg = useSelector((state: RootState) => state.config)
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              CapCrew ("we", "us", "our", or "Company") operates the website. This page informs you of our policies
              regarding the collection, use, and disclosure of personal data when you use our website and the choices you
              have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information Collection and Use</h2>
            <p className="mb-3">We collect several different types of information for various purposes to provide and improve
              our Service to you.</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Personal Data:</strong> While using our website, we may ask you to provide us with certain personally
                identifiable information that can be used to contact or identify you ("Personal Data"). This may include:
                <ul className="list-circle list-inside ml-4 mt-2 space-y-1">
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Phone number</li>
                  <li>Address, State, Province, ZIP/Postal code, City</li>
                  <li>Cookies and Usage Data</li>
                </ul>
              </li>
              <li><strong>Usage Data:</strong> We may also collect information on how the website is accessed and used ("Usage Data").
                This may include:
                <ul className="list-circle list-inside ml-4 mt-2 space-y-1">
                  <li>Your IP address</li>
                  <li>Browser type and version</li>
                  <li>Pages visited</li>
                  <li>Time and date of your visit</li>
                  <li>Device identifiers</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Use of Data</h2>
            <p>CapCrew uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>To provide and maintain the Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve the Service</li>
              <li>To monitor the usage of the Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Security of Data</h2>
            <p>
              The security of your data is important to us, but remember that no method of transmission over the Internet
              or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect
              your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded">
              <p><strong>Email:</strong> <a href={`mailto:${cfg.support_email}`} className="text-blue-600 hover:underline">{cfg.support_email}</a></p>
              <p><strong>Address:</strong> {cfg.store_address}</p>
            </div>
          </section>

          <p className="text-sm text-gray-500 mt-8">Last updated: October 1, 2026</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
