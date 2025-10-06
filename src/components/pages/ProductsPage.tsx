import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axios from 'axios';
import axiosInstance from '../../axiosInstance';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, X } from 'lucide-react';

interface Product {
  id: number;
  sku: string;
  name: string;
  image?: string;
  description: string;
  category_id?: number;
  category_name?: string;
  preferred_vendor_id?: number;
  vendor_name?: string;
  added_employee_id?: number;
  employee_name?: string;
  unit_price: number;
  cost_price: number;
  quantity_on_hand: number;
  manual_count: number;
  reorder_level: number;
  order_quantity: number;
  commission: number;
  commission_type: 'fixed' | 'percentage';
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Vendor {
  vendor_id: number;
  name: string;
  vendor_company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_number?: string;
  vehicle_number?: string;
  fax_number?: string;
  website?: string;
  default_expense_category?: string;
  billing_rate?: number;
  terms?: string;
  account_number?: string;
  balance?: number;
  as_of_date?: string;
}

interface Employee {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [vendorSuggestions, setVendorSuggestions] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  
  const [productFormData, setProductFormData] = useState({
    sku: '',
    name: '',
    image: '',
    description: '',
    category_id: '',
    preferred_vendor_id: '',
    added_employee_id: '',
    unit_price: 0,
    cost_price: 0,
    quantity_on_hand: 0,
    manual_count: 0,
    reorder_level: 0,
    order_quantity: 0,
    commission: 0,
    commission_type: 'fixed',
  });
  
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
  });
  
  const [vendorFormData, setVendorFormData] = useState({
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
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany?.company_id) {
      fetchProducts();
      fetchCategories();
      fetchVendors();
      fetchEmployees();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (vendorFilter && vendorFilter !== 'add_new_vendor') {
      const filteredVendors = vendors.filter((vendor) =>
        vendor.name.toLowerCase().includes(vendorFilter.toLowerCase())
      );
      setVendorSuggestions(filteredVendors);
    } else {
      setVendorSuggestions([]);
    }
  }, [vendorFilter, vendors]);

  useEffect(() => {
    if (!vendorFormData.as_of_date) {
      const today = new Date().toISOString().split('T')[0];
      setVendorFormData((prev) => ({ ...prev, as_of_date: today }));
    }
  }, [showVendorModal]);

  // Sync manual_count with quantity_on_hand for new products
  useEffect(() => {
    if (!editingProduct) {
      setProductFormData(prev => ({
        ...prev,
        manual_count: prev.quantity_on_hand
      }));
    }
  }, [productFormData.quantity_on_hand, editingProduct]);

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get(`/api/getProducts/${selectedCompany?.company_id}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get(`/api/getCategories/${selectedCompany?.company_id}`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get(`/api/products/${selectedCompany?.company_id}/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get(`/api/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNaN(vendorFormData.balance) || isNaN(vendorFormData.billing_rate)) {
      setVendorError('Please enter valid numbers for balance and billing rate.');
      return;
    }

    try {
      const payload = {
        ...vendorFormData,
        vendor_company_name: vendorFormData.company_name,
        taxes: vendorFormData.default_expense_category,
        expense_rates: vendorFormData.billing_rate,
        asOfDate: vendorFormData.as_of_date
      };

      const response = await axiosInstance.post(`/api/createVendors/${selectedCompany?.company_id}`, payload);
      
      // Refresh vendors list
      await fetchVendors();
      
      // Set the newly created vendor as selected
      if (response.data && response.data.vendor_id) {
        setSelectedVendorId(response.data.vendor_id.toString());
        setProductFormData({ 
          ...productFormData, 
          preferred_vendor_id: response.data.vendor_id.toString() 
        });
        setVendorFilter(vendorFormData.name);
      }
      
      setShowVendorModal(false);
      resetVendorForm();
      setVendorError(null);
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      setVendorError(error.response?.data?.message || 'Failed to save vendor');
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('sku', productFormData.sku);
      data.append('name', productFormData.name);
      if (imageFile) {
        data.append('image', imageFile);
      }
      data.append('description', productFormData.description);
      if (productFormData.category_id) {
        data.append('category_id', productFormData.category_id);
      }
      if (selectedVendorId) {
        data.append('preferred_vendor_id', selectedVendorId);
      }
      if (productFormData.added_employee_id) {
        data.append('added_employee_id', productFormData.added_employee_id);
      }
      data.append('unit_price', productFormData.unit_price.toString());
      data.append('cost_price', productFormData.cost_price.toString());
      data.append('quantity_on_hand', productFormData.quantity_on_hand.toString());
      data.append('manual_count', productFormData.manual_count.toString());
      data.append('reorder_level', productFormData.reorder_level.toString());
      data.append('order_quantity', productFormData.order_quantity.toString());
      
      // Calculate the final commission value based on type
      const finalCommissionValue = productFormData.commission_type === 'percentage' 
        ? (productFormData.unit_price * productFormData.commission) / 100 
        : productFormData.commission;
      
      data.append('commission', finalCommissionValue.toString());
      data.append('commission_type', productFormData.commission_type);
      data.append('commission_input', productFormData.commission.toString()); // Store original input for editing
  
      if (editingProduct) {
        await axiosInstance.put(`/api/products/${selectedCompany?.company_id}/${editingProduct.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axiosInstance.post(`/api/products/${selectedCompany?.company_id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      fetchProducts();
      setShowProductModal(false);
      resetProductForm();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axiosInstance.put(`/api/categories/${selectedCompany?.company_id}/${editingCategory.id}`, {
          name: categoryFormData.name,
        });
      } else {
        await axiosInstance.post(`/api/createCategory/${selectedCompany?.company_id}`, {
          name: categoryFormData.name,
        });
      }
      fetchCategories();
      setShowCategoryModal(false);
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleVendorSelection = (vendor: Vendor) => {
    setVendorFilter(vendor.name);
    setSelectedVendorId(vendor.vendor_id.toString());
    setProductFormData({ 
      ...productFormData, 
      preferred_vendor_id: vendor.vendor_id.toString() 
    });
    setVendorSuggestions([]);
  };

  const handleAddNewVendor = () => {
    setShowVendorModal(true);
    setVendorSuggestions([]);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);

    // Calculate original input value based on commission type
    let originalCommissionInput = product.commission || 0;
    if (product.commission_type === 'percentage' && product.unit_price > 0 && product.commission > 0) {
      // Reverse calculate the percentage from the stored commission value
      originalCommissionInput = (product.commission * 100) / product.unit_price;
    }

    setProductFormData({
      sku: product.sku || '',
      name: product.name,
      image: product.image || '',
      description: product.description || '',
      category_id: product.category_id ? product.category_id.toString() : '',
      preferred_vendor_id: product.preferred_vendor_id ? product.preferred_vendor_id.toString() : '',
      added_employee_id: product.added_employee_id ? product.added_employee_id.toString() : '',
      unit_price: product.unit_price || 0,
      cost_price: product.cost_price || 0,
      quantity_on_hand: product.quantity_on_hand || 0,
      manual_count: product.manual_count || 0,
      reorder_level: product.reorder_level || 0,
      order_quantity: product.order_quantity || 0,
      commission: originalCommissionInput, // Use calculated original input
      commission_type: product.commission_type || 'fixed',
    });
    
    // Set vendor filter and selected vendor for editing
    if (product.preferred_vendor_id) {
      const vendor = vendors.find(v => v.vendor_id === product.preferred_vendor_id);
      if (vendor) {
        setVendorFilter(vendor.name);
        setSelectedVendorId(vendor.vendor_id.toString());
      }
    }
    
    setImageFile(null);
    setShowProductModal(true);
  };

  const calculateCommissionValue = () => {
    if (productFormData.commission_type === 'percentage') {
      return (productFormData.unit_price * productFormData.commission) / 100;
    }
    return productFormData.commission;
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
    });
    setShowCategoryModal(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axiosInstance.delete(`/api/products/${selectedCompany?.company_id}/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await axios.delete(`/api/categories/${selectedCompany?.company_id}/${id}`);
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const resetProductForm = () => {
    setProductFormData({
      sku: '',
      name: '',
      image: '',
      description: '',
      category_id: '',
      preferred_vendor_id: '',
      added_employee_id: '',
      unit_price: 0,
      cost_price: 0,
      quantity_on_hand: 0,
      manual_count: 0,
      reorder_level: 0,
      order_quantity: 0,
      commission: 0,
      commission_type: 'fixed',
    });
    setImageFile(null);
    setEditingProduct(null);
    setVendorFilter('');
    setSelectedVendorId('');
    setVendorSuggestions([]);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
    });
    setEditingCategory(null);
  };

  const resetVendorForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setVendorFormData({
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
    setVendorError(null);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter(
    (product) => product.quantity_on_hand <= product.reorder_level
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="space-x-2">
          <button
            onClick={() => {
              resetCategoryForm();
              setShowCategoryModal(true);
            }}
            className="btn btn-secondary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
          <button
            onClick={() => {
              resetProductForm();
              setShowProductModal(true);
            }}
            className="btn btn-primary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">
              Low Stock Alert
            </h3>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            {lowStockProducts.length} product(s) are running low on stock and need to be restocked.
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search products..."
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
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
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
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {product.image ? (
                          <img
                            src={`http://localhost:3000${product.image}`}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.commission ? (
                      <>
                        <div>Rs. {Number(product.commission).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {product.commission_type === 'percentage' ? 'Percentage-based' : 'Fixed amount'}
                        </div>
                      </>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Sale: Rs. {Number(product.unit_price).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Cost: Rs. {Number(product.cost_price).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      On Hand: {product.quantity_on_hand || 0}
                    </div>
                    <div className="text-sm text-gray-500">
                      Reorder: {product.reorder_level || 0}
                    </div>
                    {product.quantity_on_hand <= product.reorder_level && (
                      <div className="flex items-center text-xs text-yellow-600 mt-1">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
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

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{ marginTop: '-1px' }}>
          <div className="relative mt-20 mb-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      className="input"
                      value={productFormData.sku}
                      onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                      placeholder="Product SKU"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Product name"
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                      }
                    }}
                  />
                  {productFormData.image && (
                    <div className="mt-2">
                      <img src={`http://localhost:3000${productFormData.image}`} alt="Product preview" className="h-20 w-20 object-cover rounded" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="input min-h-[80px]"
                    style={{ resize: 'none' }}
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    placeholder="Product description"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <div className="relative">
                      <select
                        className="input"
                        value={productFormData.category_id}
                        onChange={(e) => {
                          if (e.target.value === "add_new_category") {
                            setShowCategoryModal(true);
                          } else {
                            setProductFormData({ ...productFormData, category_id: e.target.value });
                          }
                        }}
                      >
                        <option value="" disabled>Select Category</option>
                        <option value="add_new_category" className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t">
                          + Add New Category
                        </option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <div className="relative">
                      <select
                        className="input"
                        value={selectedVendorId}
                        onChange={(e) => {
                          if (e.target.value === "add_new_vendor") {
                            setShowVendorModal(true);
                          } else {
                            setSelectedVendorId(e.target.value);
                            setProductFormData({ ...productFormData, preferred_vendor_id: e.target.value });
                            const selectedVendor = vendors.find(v => v.vendor_id.toString() === e.target.value);
                            setVendorFilter(selectedVendor ? selectedVendor.name : '');
                          }
                        }}
                        required
                      >
                        <option value="" disabled>Select Vendor</option>
                        <option value="add_new_vendor" className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t">+ Add New Vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.vendor_id} value={vendor.vendor_id}>
                            {vendor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Added Employee</label>
                    <select
                      className="input"
                      value={productFormData.added_employee_id}
                      onChange={(e) => setProductFormData({ ...productFormData, added_employee_id: e.target.value })}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={productFormData.unit_price}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, unit_price: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={productFormData.cost_price}
                      disabled
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, cost_price: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity on Hand</label>
                    <input
                      type="number"
                      className="input"
                      value={productFormData.quantity_on_hand}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, quantity_on_hand: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Reorder Level</label>
                    <input
                      type="number"
                      className="input"
                      value={productFormData.order_quantity}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, order_quantity: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                    <input
                      type="number"
                      className="input"
                      value={productFormData.reorder_level}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, reorder_level: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Commission Type</label>
                    <select
                      className="input"
                      value={productFormData.commission_type}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, commission_type: e.target.value })
                      }
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Commission {productFormData.commission_type === 'percentage' ? '(%)' : '(Rs.)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder={productFormData.commission_type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                      value={productFormData.commission || 0}
                      onChange={(e) =>
                        setProductFormData({ ...productFormData, commission: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  {productFormData.commission_type === 'percentage' && (
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Calculated Amount</label>
                      <input
                        type="text"
                        className="input bg-gray-50"
                        value={`Rs. ${calculateCommissionValue().toFixed(2)}`}
                        readOnly
                      />
                    </div>
                  )}
                </div>
                {productFormData.commission_type === 'percentage' && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Calculated Amount</label>
                    <input
                      type="text"
                      className="input bg-gray-50"
                      value={`Rs. ${calculateCommissionValue().toFixed(2)}`}
                      readOnly
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="btn btn-secondary btn-md"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-md">
                    {editingProduct ? 'Update' : 'Create'} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{ marginTop: '-1px' }}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Category name"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  />
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Categories</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category Name
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categories.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {category.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="btn btn-secondary btn-md"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-md">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{marginTop: "-1px"}}>
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Vendor
                </h3>
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {vendorError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  {vendorError}
                </div>
              )}
              <form onSubmit={handleVendorSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter Name"
                      value={vendorFormData.name}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
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
                      value={vendorFormData.company_name}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, company_name: e.target.value })}
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
                      value={vendorFormData.email}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
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
                      value={vendorFormData.phone}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={vendorFormData.tax_number || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, tax_number: e.target.value })}
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
                      value={vendorFormData.address}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
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
                      value={vendorFormData.fax_number || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, fax_number: e.target.value })}
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
                      value={vendorFormData.website || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, website: e.target.value })}
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
                      value={vendorFormData.vehicle_number || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, vehicle_number: e.target.value })}
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
                      value={vendorFormData.city}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, city: e.target.value })}
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
                      value={vendorFormData.state}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, state: e.target.value })}
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
                      value={vendorFormData.zip_code}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, zip_code: e.target.value })}
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
                      value={vendorFormData.country}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, country: e.target.value })}
                    />
                  </div>
                </div>

                <hr />

                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Additional Information
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default expense category
                  </label>
                  <select
                    className="input"
                    value={vendorFormData.default_expense_category}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, default_expense_category: e.target.value })}
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
                      value={vendorFormData.billing_rate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVendorFormData({ ...vendorFormData, billing_rate: isNaN(val) ? 0 : val });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terms
                    </label>
                    <select
                      className="input"
                      value={vendorFormData.terms || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, terms: e.target.value })}
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
                      value={vendorFormData.account_number || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, account_number: e.target.value })}
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
                      value={vendorFormData.balance}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVendorFormData({ ...vendorFormData, balance: isNaN(val) ? 0 : val });
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
                      value={vendorFormData.as_of_date || ''}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, as_of_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVendorModal(false)}
                    className="btn btn-secondary btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                  >
                    Create Vendor
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