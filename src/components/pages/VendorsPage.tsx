import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Search, Edit, Trash2, Mail, Phone, Building, Truck } from 'lucide-react';

interface Vendor {
  vendor_id: number;
  vendor_company_name: string; // Updated to match backend database field
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_active: boolean;
  created_at: string;
  tax_number: string;
  vehicle_number: string;
  fax_number: string;
  website: string;
  default_expense_category: string;
  billing_rate: number;
  terms: string;
  account_number: string;
  balance: number;
  as_of_date: string;
}

export default function VendorsPage() {
  const { selectedCompany } = useCompany();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    tax_number: '',
    fax_number: '',
    vehicle_number: '',
    website: '',
    default_expense_category: '',
    billing_rate: 0,
    terms: '',
    account_number: '',
    balance: 0,
    as_of_date: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
  }, [selectedCompany]);

  useEffect(() => {
    if (!formData.as_of_date) {
      const today = new Date().toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, as_of_date: today }));
    }
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get(`/api/getVendors/${selectedCompany?.company_id}`);
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNaN(formData.balance) || isNaN(formData.billing_rate)) {
      setError('Please enter valid numbers for balance and billing rate.');
      return;
    }

    try {
      const payload = {
        ...formData,
        vendor_company_name: formData.company_name,
        taxes: formData.default_expense_category,
        expense_rates: formData.billing_rate,
        asOfDate: formData.as_of_date
      };

      if (editingVendor) {
        await axiosInstance.put(`/api/updateVendors/${selectedCompany?.company_id}/${editingVendor.vendor_id}`, payload);
      } else {
        await axiosInstance.post(`/api/createVendors/${selectedCompany?.company_id}`, payload);
      }
      setShowModal(false);
      resetForm();
      fetchVendors();
      setError(null);
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      setError(error.response?.data?.message || 'Failed to save vendor');
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      company_name: vendor.vendor_company_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      country: vendor.country || '',
      tax_number: vendor.tax_number || '',
      vehicle_number: vendor.vehicle_number || '',
      fax_number: vendor.fax_number || '',
      website: vendor.website || '',
      default_expense_category: vendor.default_expense_category || '',
      billing_rate: vendor.billing_rate || 0,
      terms: vendor.terms || '',
      account_number: vendor.account_number || '',
      balance: vendor.balance || 0,
      as_of_date: vendor.as_of_date || ''
    });
    setShowModal(true);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await axiosInstance.put(`/api/deleteVendors/${selectedCompany?.company_id}/${id}`);
        fetchVendors();
        setError(null);
      } catch (error: any) {
        console.error('Error deleting vendor:', error);
        setError(error.response?.data?.message || 'Failed to delete vendor');
      }
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      company_name: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      tax_number: '',
      fax_number: '',
      vehicle_number: '',
      website: '',
      default_expense_category: '',
      billing_rate: 0,
      terms: '',
      account_number: '',
      balance: 0,
      as_of_date: today
    });
    setEditingVendor(null);
    setError(null);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search vendors..."
          className="input pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Vendors Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Truck className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {vendor.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {vendor.email}
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {vendor.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vendor.city && vendor.state
                        ? `${vendor.city}, ${vendor.state}`
                        : vendor.city || vendor.state || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {vendor.country || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rs. {vendor.balance?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vendor.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.vendor_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{marginTop: "-1px"}}>
          <div className="relative mt-20 mb-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter Company Name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="Enter Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Enter Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.tax_number || ''}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      placeholder="Enter Tax Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter Address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fax Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.fax_number || ''}
                      onChange={(e) => setFormData({ ...formData, fax_number: e.target.value })}
                      placeholder="Enter Fax Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      className="input"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="Enter Website URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.vehicle_number || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      placeholder="Enter Vehicle Number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter ZIP Code"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter Country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <hr />

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Additional Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default expense category
                  </label>
                  <select
                    className="input"
                    value={formData.default_expense_category}
                    onChange={(e) => setFormData({ ...formData, default_expense_category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    <option value="amorization expense">Amortization Expense</option>
                    <option value="bad debts">Bad Debts</option>
                    <option value="bank charges">Bank Charges</option>
                    <option value="commissions and fees">Commissions and Fees</option>
                    <option value="dues and subscriptions">Dues and Subscriptions</option>
                    <option value="equipment rental">Equipment Rental</option>
                    <option value="income tax expense">Income Tax Expense</option>
                    <option value="insurance-disability">Insurance - Disability</option>
                    <option value="insurance-general">Insurance - General</option>
                    <option value="insurance-liability">Insurance - Liability</option>
                    <option value="interest expense">Interest Expense</option>
                    <option value="legal and professional fees">Legal and Professional Fees</option>
                    <option value="loss on discontinued operations">Loss on Discontinued Operations</option>
                    <option value="management compensation">Management Compensation</option>
                    <option value="meals and entertainment">Meals and Entertainment</option>
                    <option value="office expenses">Office Expenses</option>
                    <option value="other expenses">Other Expenses</option>
                    <option value="payroll expenses">Payroll Expenses</option>
                    <option value="purchases">Purchases</option>
                    <option value="rent or lease payments">Rent or Lease Payments</option>
                    <option value="repairs and maintenance">Repairs and Maintenance</option>
                    <option value="salary">Salary</option>
                    <option value="shipping and delivery">Shipping and Delivery</option>
                    <option value="stationery and printing">Stationery and Printing</option>
                    <option value="supplies">Supplies</option>
                    <option value="travel expenses - general and admin">Travel Expenses - General and Admin Expenses</option>
                    <option value="travel expenses - selling">Travel Expenses - Selling Expenses</option>
                    <option value="unapplied cash payment expense">Unapplied Cash Payment Expense</option>
                    <option value="uncategorized expense">Uncategorized Expense</option>
                    <option value="utilities">Utilities</option>
                    <option value="wage expense">Wage Expense</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Rate
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Billing Rate (/hr)"
                      value={formData.billing_rate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, billing_rate: isNaN(val) ? 0 : val });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terms
                    </label>
                    <select
                      className="input"
                      value={formData.terms || ''}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    >
                      <option value="">Select Terms</option>
                      <option value="due_on_receipt">Due on Receipt</option>
                      <option value="net_15">Net 15</option>
                      <option value="net_30">Net 30</option>
                      <option value="net_60">Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Account Number"
                      value={formData.account_number || ''}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Balance
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Balance"
                      value={formData.balance}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, balance: isNaN(val) ? 0 : val });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      As of Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.as_of_date || ''}
                      onChange={(e) => setFormData({ ...formData, as_of_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                  >
                    {editingVendor ? 'Update' : 'Create'} Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}