import React from 'react';
import { Lock, Bell, Truck, CreditCard, DollarSign, Store } from 'lucide-react';

interface SettingSection {
  name: string;
  icon: React.ReactNode;
  description: string;
}

const AdminSettings: React.FC = () => {
  const sections: SettingSection[] = [
    {
      name: 'General Settings',
      icon: <Store className="w-6 h-6" />,
      description: 'Store name, logo, contact info',
    },
    {
      name: 'Shipping Settings',
      icon: <Truck className="w-6 h-6" />,
      description: 'Shipping rates and carriers',
    },
    {
      name: 'Payment Settings',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Payment gateways and methods',
    },
    {
      name: 'Tax Settings',
      icon: <DollarSign className="w-6 h-6" />,
      description: 'Tax rates and GST configuration',
    },
    {
      name: 'Notifications',
      icon: <Bell className="w-6 h-6" />,
      description: 'Email and SMS notifications',
    },
    {
      name: 'Security',
      icon: <Lock className="w-6 h-6" />,
      description: 'Access control and permissions',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <button
            key={section.name}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-blue-600 group-hover:text-blue-700">{section.icon}</div>
              <div className="text-gray-400 group-hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.name}</h3>
            <p className="text-sm text-gray-600">{section.description}</p>
          </button>
        ))}
      </div>

      {/* General Settings Form (Example) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>

        <div className="space-y-6">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Name
            </label>
            <input
              type="text"
              defaultValue="CapCrew Store"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              defaultValue="support@capcrew.local"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              defaultValue="+91-XX-XXXX-XXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Address
            </label>
            <textarea
              defaultValue="123 Market Street, Mumbai, India"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>₹ Indian Rupee (INR)</option>
              <option>$ US Dollar (USD)</option>
              <option>€ Euro (EUR)</option>
              <option>£ British Pound (GBP)</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Language
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>English</option>
              <option>Hindi</option>
              <option>Marathi</option>
              <option>Tamil</option>
            </select>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Save Changes
            </button>
            <button className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Tax Configuration</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">GST (Goods & Services Tax)</p>
              <p className="text-sm text-gray-600">Standard rate for apparel and accessories</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue="18"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-right"
              />
              <span className="text-gray-600 font-medium">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">SGST (State GST)</p>
              <p className="text-sm text-gray-600">State-level tax</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue="9"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-right"
              />
              <span className="text-gray-600 font-medium">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">CGST (Central GST)</p>
              <p className="text-sm text-gray-600">Central-level tax</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue="9"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-right"
              />
              <span className="text-gray-600 font-medium">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
