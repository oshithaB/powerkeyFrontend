import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { Settings, Building2, Users, CreditCard, Bell, Edit2, Save, X } from 'lucide-react';
import axiosInstance from '../../axiosInstance';

export default function SettingsPage() {
  const { selectedCompany, refreshCompany } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    invoice_prefix: '',
    current_invoice_number: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      setFormData({
        invoice_prefix: selectedCompany.invoice_prefix || '',
        current_invoice_number: selectedCompany.current_invoice_number?.toString() || ''
      });
    }
  }, [selectedCompany]);

  const handleSave = async () => {
    if (!selectedCompany) return;

    try {
      // The endpoint expects a FormData object or JSON? The user example used FormData.
      // "const formData = new FormData(); ... await axios.put(..., formData);"
      // Depending on the backend, JSON might also work, but I will stick to the user's example or standard JSON if unsure.
      // Given the `ProductsPage` uses FormData for file uploads, but `company/update` often takes JSON unless there's a logo.
      // I'll try JSON first if I'm not uploading a file, or check if the backend handles both.
      // Actually, looking at the user prompt: "const formData = new FormData(); ... formData.append('invoice_prefix', 'PWK');"
      // I will use FormData to be safe and consistent with the user guide.

      const data = new FormData();
      data.append('invoice_prefix', formData.invoice_prefix);
      data.append('current_invoice_number', formData.current_invoice_number);
      // We are only updating these two for now, but the endpoint might expect other fields or just update what's present.
      // To avoid overwriting other fields with nulls if the backend is strict, I should act carefully.
      // But typically PUT updates provided fields.

      await axiosInstance.put(`http://147.79.115.89:3000/api/company/update/${selectedCompany.company_id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' } // Optional explicitly, axios sets it for FormData
      });

      setIsEditing(false);
      // Refresh company context to show new values
      if (refreshCompany) refreshCompany();
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings');
    }
  };

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
        <div className="card-header flex justify-between items-center">
          <h2 className="text-lg font-semibold">Company Information</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            >
              <Edit2 size={20} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Save"
              >
                <Save size={20} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Cancel"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>
        <div className="card-content">
          <div className="flex items-start space-x-6">
            {selectedCompany?.company_logo ? (
              <img
                src={`http://147.79.115.89:3000${selectedCompany.company_logo}`}
                alt={selectedCompany.name}
                className="h-24 w-24 rounded-lg object-contain bg-gray-50"
              />
            ) : (
              <div className="h-24 w-24 bg-primary-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-12 w-12 text-primary-600" />
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedCompany?.name}
                </h3>
                <div className="space-y-1 text-gray-600">
                  <p>{selectedCompany?.address || 'No address provided'}</p>
                  <p>Contact: {selectedCompany?.contact_number}</p>
                  <p>Email: {selectedCompany?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Invoice Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Prefix</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.invoice_prefix}
                          onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. INV-"
                        />
                      ) : (
                        <span className="text-sm font-medium">{selectedCompany?.invoice_prefix || '-'}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Current Number</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.current_invoice_number}
                          onChange={(e) => setFormData({ ...formData, current_invoice_number: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. 100"
                        />
                      ) : (
                        <span className="text-sm font-medium">{selectedCompany?.current_invoice_number || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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