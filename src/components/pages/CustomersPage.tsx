import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance'
import { Plus, Search, Edit, Trash2, Mail, Phone, Truck } from 'lucide-react';

interface Customer {
  id: number;
  company_id: number;
  name: string;
  email: string;
  is_taxable: boolean;
  tax_number: string;
  phone: string;
  vehicle_number: string;
  credit_limit: number;
  current_balance: number;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
  billing_country: string;
  shipping_same_as_billing: boolean;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  shipping_country: string;
  primary_payment_method: string;
  terms: string;
  delivery_option: string;
  invoice_language: string;
  sales_tax_registration: string;
  opening_balance: number;
  as_of_date: string;
  created_at: string;
}

export default function CustomersPage() {
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    is_taxable: false,
    tax_number: '',
    phone: '',
    vehicle_number: '',
    credit_limit: 0,
    current_balance: 0,
    billing_address: '',
    billing_city: '',
    billing_province: '',
    billing_postal_code: '',
    billing_country: '',
    shipping_same_as_billing: true,
    shipping_address: '',
    shipping_city: '',
    shipping_province: '',
    shipping_postal_code: '',
    shipping_country: '',
    primary_payment_method: '',
    terms: '',
    delivery_option: '',
    invoice_language: '',
    sales_tax_registration: '',
    opening_balance: 0,
    as_of_date: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [selectedCompany]);

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get(`/api/getCustomers/${selectedCompany?.company_id}`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        shipping_address: formData.shipping_same_as_billing ? formData.billing_address : formData.shipping_address,
        shipping_city: formData.shipping_same_as_billing ? formData.billing_city : formData.shipping_city,
        shipping_province: formData.shipping_same_as_billing ? formData.billing_province : formData.shipping_province,
        shipping_postal_code: formData.shipping_same_as_billing ? formData.billing_postal_code : formData.shipping_postal_code,
        shipping_country: formData.shipping_same_as_billing ? formData.billing_country : formData.shipping_country
      };

      if (editingCustomer) {
        console.log('Updating customer:', editingCustomer.id);
        console.log('Updated data:', submitData);
        await axiosInstance.put(`/api/updateCustomers/${selectedCompany?.company_id}/${editingCustomer.id}`, submitData);
      } else {
        await axiosInstance.post(`/api/createCustomers/${selectedCompany?.company_id}`, submitData);
      }
      fetchCustomers();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      is_taxable: customer.is_taxable || false,
      tax_number: customer.tax_number || '',
      phone: customer.phone || '',
      vehicle_number: customer.vehicle_number || '',
      credit_limit: customer.credit_limit || 0,
      current_balance: customer.current_balance || 0,
      billing_address: customer.billing_address || '',
      billing_city: customer.billing_city || '',
      billing_province: customer.billing_province || '',
      billing_postal_code: customer.billing_postal_code || '',
      billing_country: customer.billing_country || '',
      shipping_same_as_billing: customer.shipping_same_as_billing || true,
      shipping_address: customer.shipping_address || '',
      shipping_city: customer.shipping_city || '',
      shipping_province: customer.shipping_province || '',
      shipping_postal_code: customer.shipping_postal_code || '',
      shipping_country: customer.shipping_country || '',
      primary_payment_method: customer.primary_payment_method || '',
      terms: customer.terms || '',
      delivery_option: customer.delivery_option || '',
      invoice_language: customer.invoice_language || '',
      sales_tax_registration: customer.sales_tax_registration || '',
      opening_balance: customer.opening_balance || 0,
      as_of_date: customer.as_of_date || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axiosInstance.put(`/api/deleteCustomers/${selectedCompany?.company_id}/${id}`);
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      is_taxable: false,
      tax_number: '',
      phone: '',
      vehicle_number: '',
      credit_limit: 0,
      current_balance: 0,
      billing_address: '',
      billing_city: '',
      billing_province: '',
      billing_postal_code: '',
      billing_country: '',
      shipping_same_as_billing: true,
      shipping_address: '',
      shipping_city: '',
      shipping_province: '',
      shipping_postal_code: '',
      shipping_country: '',
      primary_payment_method: '',
      terms: '',
      delivery_option: '',
      invoice_language: '',
      sales_tax_registration: '',
      opening_balance: 0,
      as_of_date: ''
    });
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAddress = (address: {
    address: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  }) => {
    return Object.values(address).filter(Boolean).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search customers..."
          className="input pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.tax_number || '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.billing_city && customer.billing_province
                        ? `${customer.billing_city}, ${customer.billing_province}`
                        : customer.billing_city || customer.billing_province || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {customer.billing_country || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rs. {customer.credit_limit?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rs. {customer.current_balance?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{marginTop: "-1px"}}>
            <div className="relative mt-20 mb-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
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
                      placeholder='Enter Customer Name'
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

                  <div className="col-span-2 md:col-span-1">
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Is Taxable
                    </label>
                    <select
                      className="input"
                      value={formData.is_taxable ? 'Yes' : 'No'}
                      onChange={(e) => setFormData({ ...formData, is_taxable: e.target.value === 'Yes' })}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter Tax Number"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      disabled={!formData.is_taxable}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter Vehicle Number"
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.current_balance}
                      onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <hr />

                <h3 className='text-lg font-medium text-gray-900 mb-4'>Addresses - Billing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billing_address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      id="billing_address"
                      className="input"
                      placeholder='Enter Billing Address'
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="billing_city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      id="billing_city"
                      className="input"
                      placeholder='Enter City'
                      value={formData.billing_city}
                      onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="billing_province" className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <select
                      id="billing_province"
                      className="input"
                      value={formData.billing_province}
                      onChange={(e) => setFormData({ ...formData, billing_province: e.target.value })}
                      required
                    >
                      <option value="">Select Province</option>
                      <option value="Central">Central Province</option>
                      <option value="Eastern">Eastern Province</option>
                      <option value="Northern">Northern Province</option>
                      <option value="Southern">Southern Province</option>
                      <option value="Western">Western Province</option>
                      <option value="North Western">North Western Province</option>
                      <option value="North Central">North Central Province</option>
                      <option value="Uva">Uva Province</option>
                      <option value="Sabaragamuwa">Sabaragamuwa Province</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="billing_postal_code" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      id="billing_postal_code"
                      className="input"
                      placeholder='Enter Postal Code'
                      value={formData.billing_postal_code}
                      onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="billing_country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      id="billing_country"
                      className="input"
                      placeholder='Enter Country'
                      value={formData.billing_country}
                      onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="col-12">
                  <p className="mt-3">
                    <strong>Entered Billing Address:</strong>{' '}
                    {renderAddress({
                      address: formData.billing_address,
                      city: formData.billing_city,
                      province: formData.billing_province,
                      postal_code: formData.billing_postal_code,
                      country: formData.billing_country
                    })}
                  </p>
                </div>

                <h3 className='text-lg font-medium text-gray-900 mb-4'>Addresses - Shipping</h3>
                <div className="col-12 mb-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="sameAsBilling"
                      checked={formData.shipping_same_as_billing}
                      onChange={(e) => setFormData({ ...formData, shipping_same_as_billing: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="sameAsBilling">
                      &nbsp;&nbsp;Shipping address same as billing address
                    </label>
                  </div>
                </div>

                {!formData.shipping_same_as_billing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        id="shipping_address"
                        className="input"
                        placeholder='Enter Shipping Address'
                        value={formData.shipping_address}
                        onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="shipping_city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        id="shipping_city"
                        className="input"
                        placeholder='Enter City'
                        value={formData.shipping_city}
                        onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="shipping_province" className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      <select
                        id="shipping_province"
                        className="input"
                        value={formData.shipping_province}
                        onChange={(e) => setFormData({ ...formData, shipping_province: e.target.value })}
                      >
                        <option value="">Select Province</option>
                        <option value="Central">Central Province</option>
                        <option value="Eastern">Eastern Province</option>
                        <option value="Northern">Northern Province</option>
                        <option value="Southern">Southern Province</option>
                        <option value="Western">Western Province</option>
                        <option value="North Western">North Western Province</option>
                        <option value="North Central">North Central Province</option>
                        <option value="Uva">Uva Province</option>
                        <option value="Sabaragamuwa">Sabaragamuwa Province</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="shipping_postal_code" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        id="shipping_postal_code"
                        className="input"
                        placeholder='Enter Postal Code'
                        value={formData.shipping_postal_code}
                        onChange={(e) => setFormData({ ...formData, shipping_postal_code: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="shipping_country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        id="shipping_country"
                        className="input"
                        placeholder='Enter Country'
                        value={formData.shipping_country}
                        onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {!formData.shipping_same_as_billing && (
                  <div className="col-12">
                    <p className="mt-3">
                      <strong>Entered Shipping Address:</strong>{' '}
                      {renderAddress({
                        address: formData.shipping_address,
                        city: formData.shipping_city,
                        province: formData.shipping_province,
                        postal_code: formData.shipping_postal_code,
                        country: formData.shipping_country
                      })}
                    </p>
                  </div>
                )}

                <hr />

                <h3 className='text-lg font-medium text-gray-900 mb-4'>Payments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="primary_payment_method" className="block text-sm font-medium text-gray-700 mb-1">Primary Payment Method</label>
                    <select
                      id="primary_payment_method"
                      className="input"
                      value={formData.primary_payment_method}
                      onChange={(e) => setFormData({ ...formData, primary_payment_method: e.target.value })}
                      required
                    >
                      <option value="">Select Payment Method</option>
                      <option value="cash">Cash</option>
                      <option value="cashdeposit">Cash Deposit</option>
                      <option value="cheque">Cheque</option>
                      <option value="creditcard">Credit Card</option>
                      <option value="creditnote">Credit Note</option>
                      <option value="debitcard">Debit Card</option>
                      <option value="directdebit">Direct Debit</option>
                      <option value="other">Other</option>
                      <option value="salesreturn">Sales Return</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor='terms' className='block text-sm font-medium text-gray-700 mb-1'>Terms</label>
                    <select
                      id="terms"
                      className="input"
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      required
                    >
                      <option value="">Select Terms</option>
                      <option value="dueonreceipt">Due on Receipt</option>
                      <option value="net15">Net 15</option>
                      <option value="net30">Net 30</option>
                      <option value="net60">Net 60</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor='delivery_option' className='block text-sm font-medium text-gray-700 mb-1'>Delivery Option</label>
                    <select
                      id="delivery_option"
                      className="input"
                      value={formData.delivery_option}
                      onChange={(e) => setFormData({ ...formData, delivery_option: e.target.value })}
                      required
                    >
                      <option value="">Select Delivery Option</option>
                      <option value="printLater">Print Later</option>
                      <option value="sendLater">Send Later</option>
                      <option value="none">None</option>
                      <option value="useCompanyDefault">Use Company Default</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor='invoice_language' className='block text-sm font-medium text-gray-700 mb-1'>Invoice Language</label>
                    <select
                      id="invoice_language"
                      className="input"
                      value={formData.invoice_language}
                      onChange={(e) => setFormData({ ...formData, invoice_language: e.target.value })}
                      required
                    >
                      <option value="">Select Language</option>
                      <option value="english">English</option>
                      <option value="spanish">Spanish</option>
                      <option value="french">French</option>
                      <option value="italian">Italian</option>
                      <option value="chinese">Chinese (Traditional)</option>
                      <option value="portuguese">Portuguese (Brazil)</option>
                    </select>
                  </div>
                </div>

                <hr />

                <h3 className='text-lg font-medium text-gray-900 mb-4'>Additional Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor='sales_tax_registration' className='block text-sm font-medium text-gray-700 mb-1'>Sales Tax Registration</label>
                    <input
                      type="text"
                      id="sales_tax_registration"
                      className="input"
                      placeholder="Enter Sales Tax Registration"
                      value={formData.sales_tax_registration}
                      onChange={(e) => setFormData({ ...formData, sales_tax_registration: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor='opening_balance' className='block text-sm font-medium text-gray-700 mb-1'>Opening Balance</label>
                    <input
                      type="number"
                      id="opening_balance"
                      className="input"
                      placeholder="Enter Opening Balance"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor='as_of_date' className='block text-sm font-medium text-gray-700 mb-1'>As of Date</label>
                    <input
                      type="date"
                      id="as_of_date"
                      className="input"
                      value={formData.as_of_date}
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
                    {editingCustomer ? 'Update' : 'Create'} Customer
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