import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Building2, Plus, LogOut, Users, Calendar, Edit, Trash2, X } from 'lucide-react';

// Define the Company type
interface Company {
  company_id: number;
  name: string;
  is_taxable: boolean;
  tax_number: string;
  company_logo: string;
  address: string;
  contact_number: string;
  email_address: string;
  registration_number: string;
  terms_and_conditions: string;
  notes: string;
}

// Define the TaxRate type
interface TaxRate {
  id: number;
  name: string;
  rate: number;
  is_default: boolean;
}

export default function CompanySelection() {
  const { user, logout } = useAuth();
  const { companies, setCompanies, setSelectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_number: '',
    email_address: '',
    registration_number: '',
    is_taxable: 'Not Taxable',
    tax_number: '',
    notes: '',
    terms_and_conditions: '',
    tax_rates: [] as TaxRate[]
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axiosInstance.get('/api/companies');
      console.log('Companies response:', response.data);
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxRates = async (companyId: number) => {
    try {
      const response = await axiosInstance.get(`/api/tax-rates/${companyId}`);
      console.log('Tax rates response:', response.data);
      return response.data[0] || [];
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      return [];
    }
  };

  const handleCompanySelect = async (company: any) => {
    try {
      console.log('Selecting company:', company);
      
      const response = await axiosInstance.get(`/api/selectCompany/${company.company_id}`);
      
      if (response.data.success) {
        const mappedCompany: Company = {
          company_id: company.company_id,
          name: company.name,
          is_taxable: company.is_taxable,
          tax_number: company.tax_number,
          company_logo: company.company_logo,
          address: company.address,
          contact_number: company.contact_number,
          email_address: company.email_address,
          registration_number: company.registration_number,
          terms_and_conditions: company.terms_and_conditions,
          notes: company.notes,
        };
        
        setSelectedCompany(mappedCompany);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error selecting company:', error);
      alert('Failed to select company. Please try again.');
    }
  };

  const handleEditCompany = async (company: any) => {
    const taxRates = await fetchTaxRates(company.company_id);
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      address: company.address || '',
      contact_number: company.contact_number || '',
      email_address: company.email_address || '',
      registration_number: company.registration_number || '',
      is_taxable: company.is_taxable ? 'Taxable' : 'Not Taxable',
      tax_number: company.tax_number || '',
      notes: company.notes || '',
      terms_and_conditions: company.terms_and_conditions || '',
      tax_rates: taxRates
    });
    setLogoPreview(company.company_logo ? `http://localhost:3000${company.company_logo}` : '');
    setShowEditModal(true);
  };

  const handleDeleteCompany = async (companyId: number) => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        await axiosInstance.delete(`/api/companies/${companyId}`);
        fetchCompanies();
        alert('Company deleted successfully');
      } catch (error: any) {
        console.error('Error deleting company:', error);
        alert(error.response?.data?.message || 'Failed to delete company');
      }
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tax_rates') {
          submitData.append(key, JSON.stringify(value));
        } else {
          submitData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      if (logo) {
        submitData.append('logo', logo);
      }

      await axiosInstance.put(`/api/companies/${editingCompany.company_id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowEditModal(false);
      setEditingCompany(null);
      setLogo(null);
      setLogoPreview('');
      fetchCompanies();
      alert('Company updated successfully');
    } catch (error: any) {
      console.error('Error updating company:', error);
      alert(error.response?.data?.message || 'Failed to update company');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTaxRateChange = (index: number, field: keyof TaxRate, value: string | number | boolean) => {
    const updatedTaxRates = [...formData.tax_rates];
    updatedTaxRates[index] = { ...updatedTaxRates[index], [field]: value };
    setFormData({ ...formData, tax_rates: updatedTaxRates });
  };

  const addTaxRate = () => {
    setFormData({
      ...formData,
      tax_rates: [...formData.tax_rates, { id: 0, name: '', rate: 0, is_default: false }]
    });
  };

  const removeTaxRate = (index: number) => {
    setFormData({
      ...formData,
      tax_rates: formData.tax_rates.filter((_, i) => i !== index)
    });
  };

  const resetEditForm = () => {
    setShowEditModal(false);
    setEditingCompany(null);
    setLogo(null);
    setLogoPreview('');
    setFormData({
      name: '',
      address: '',
      contact_number: '',
      email_address: '',
      registration_number: '',
      is_taxable: 'Not Taxable',
      tax_number: '',
      notes: '',
      terms_and_conditions: '',
      tax_rates: []
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {user?.fullname}!
            </h1>
            <p className="text-gray-600 mt-2">
              Select a company to access your ERP dashboard
            </p>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            key="create-new-company"
            to="/create-company"
            className="card hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-primary-400"
          >
            <div className="card-content flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create New Company
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Set up a new company with all the necessary details
              </p>
            </div>
          </Link>

          {companies.map((company) => (
            <div
              key={`company-${company.company_id}`}
              className="card hover:shadow-lg transition-shadow duration-200 relative group"
            >
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCompany(company);
                  }}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 text-blue-600"
                  title="Edit Company"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCompany(company.company_id);
                  }}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 text-red-600"
                  title="Delete Company"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div
                onClick={() => handleCompanySelect(company)}
                className="card-content p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {company.company_logo ? (
                      <img
                        src={`http://localhost:3000${company.company_logo}`}
                        alt={company.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary-600" />
                      </div>
                    )}
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {company.name}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        Owner
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {company.address && (
                    <p className="truncate">{company.address}</p>
                  )}
                  {company.contact_number && (
                    <p>{company.contact_number}</p>
                  )}
                  {company.registration_number && (
                    <p className="truncate">Reg: {company.registration_number}</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      <span>Multi-user</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No companies</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first company.
            </p>
            <div className="mt-6">
              <Link
                to="/create-company"
                className="btn btn-primary btn-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Company
              </Link>
            </div>
          </div>
        )}
      </div>

      {showEditModal && editingCompany && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{marginTop: "-1px"}}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Company
              </h3>
              <button onClick={resetEditForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="Enter registration number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    placeholder="Enter phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email_address}
                    onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Is Taxable?
                  </label>
                  <select
                    className="input"
                    value={formData.is_taxable}
                    onChange={(e) => {
                      const isTaxable = e.target.value;
                      setFormData({
                        ...formData,
                        is_taxable: isTaxable,
                        tax_number: isTaxable === 'Not Taxable' ? '' : formData.tax_number,
                        tax_rates: isTaxable === 'Not Taxable' ? [] : formData.tax_rates
                      });
                    }}
                  >
                    <option value="Not Taxable">Not Taxable</option>
                    <option value="Taxable">Taxable</option>
                  </select>
                </div>

                {formData.is_taxable === 'Taxable' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      placeholder="Enter tax number"
                    />
                  </div>
                )}
              </div>

              {formData.is_taxable === 'Taxable' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rates
                  </label>
                  {formData.tax_rates.map((taxRate, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={taxRate.name}
                        onChange={(e) => handleTaxRateChange(index, 'name', e.target.value)}
                        placeholder="Tax name (e.g., VAT)"
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="input w-24"
                        value={taxRate.rate}
                        onChange={(e) => handleTaxRateChange(index, 'rate', parseFloat(e.target.value))}
                        placeholder="Rate (%)"
                      />
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary-600"
                        checked={taxRate.is_default}
                        onChange={(e) => handleTaxRateChange(index, 'is_default', e.target.checked)}
                      />
                      <label className="text-sm text-gray-600">Default</label>
                      <button
                        type="button"
                        onClick={() => removeTaxRate(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTaxRate}
                    className="btn btn-secondary btn-sm mt-2"
                  >
                    Add Tax Rate
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="input"
                  />
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-12 w-12 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter any additional notes"
                    style={{ height: '80px' }}
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    className="input"
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    placeholder="Enter terms and conditions"
                    style={{ height: '80px' }}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetEditForm}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                >
                  Update Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}