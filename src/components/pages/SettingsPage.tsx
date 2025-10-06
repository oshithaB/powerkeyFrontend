import React from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { Settings, Building2, Users, CreditCard, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { selectedCompany } = useCompany();

  const settingsSections = [
    {
      title: 'Company Settings',
      description: 'Manage company information and preferences',
      icon: Building2,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Users,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Billing & Subscription',
      description: 'Manage your subscription and billing',
      icon: CreditCard,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Notifications',
      description: 'Configure notification preferences',
      icon: Bell,
      color: 'bg-yellow-100 text-yellow-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Company Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Company Information</h2>
        </div>
        <div className="card-content">
          <div className="flex items-center space-x-4">
            {selectedCompany?.company_logo ? (
              <img
                src={`http://localhost:3000${selectedCompany.company_logo}`}
                alt={selectedCompany.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 bg-primary-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary-600" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedCompany?.name}
              </h3>
              <p className="text-gray-600">
                {selectedCompany?.address || 'No address provided'}
              </p>
              <p className="text-sm text-gray-500">
                Contact Number: {selectedCompany?.contact_number}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section) => (
          <div key={section.title} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="card-content p-6">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${section.color}`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {section.title}
                  </h3>
                </div>
              </div>
              <p className="text-gray-600">
                {section.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* System Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">System Settings</h2>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-600">Receive email notifications for important updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">Auto-save</h4>
                <p className="text-sm text-gray-600">Automatically save changes as you work</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="card">
        <div className="card-content p-12 text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Settings Coming Soon</h3>
          <p className="text-gray-600">
            More configuration options, integrations, and customization features will be available in future updates.
          </p>
        </div>
      </div>
    </div>
  );
}