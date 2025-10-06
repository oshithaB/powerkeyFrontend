import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, Mail, Phone, Truck } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';

interface Order {
  id: number;
  company_id: number;
  vendor_id: number | null;
  mailling_address?: string;
  email?: string;
  order_no: string;
  order_date: string;
  category: string;
  class: number | null;
  customer_id: number | null;
  shipping_address?: string;
  location: string;
  ship_via?: string;
  total_amount: number | null | string;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: number | string;
  order_id: number;
  product_id: number | null;
  name: string;
  sku: string;
  description: string;
  qty: number;
  rate: number;
  amount: number | null | string;
  class: string;
  received: boolean;
  closed: boolean;
  isEditing?: boolean;
}

interface Vendor {
  vendor_id: number;
  name: string;
  address: string;
  vendor_company_name?: string;
  email?: string;
  phone?: string;
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

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [order, setOrder] = useState<Order>({
    id: 0,
    company_id: selectedCompany?.company_id || 0,
    vendor_id: null,
    mailling_address: '',
    email: '',
    customer_id: null,
    shipping_address: '',
    order_no: '',
    order_date: new Date().toISOString().split('T')[0],
    category: '',
    class: null,
    location: '',
    ship_via: '',
    total_amount: null,
    status: 'open',
    created_at: new Date().toISOString(),
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [vendorFilter, setVendorFilter] = useState('');
  const [vendorSuggestions, setVendorSuggestions] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]); // New state for filtered products
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  
  // Vendor Modal States
  const [showVendorModal, setShowVendorModal] = useState(false);
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
  const [vendorError, setVendorError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchVendors();
      fetchEmployees();
      fetchOrderCount();
      fetchProducts();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (vendorFilter && vendorFilter !== 'new_vendor') {
      const filteredVendors = vendors.filter((vendor) =>
        vendor.name.toLowerCase().includes(vendorFilter.toLowerCase())
      );
      setVendorSuggestions(filteredVendors);
    } else {
      setVendorSuggestions([]);
    }
  }, [vendorFilter, vendors]);

  // New useEffect to filter products based on selected vendor
  useEffect(() => {
    if (order.vendor_id && products.length > 0) {
      const vendorProducts = products.filter(product => 
        product.preferred_vendor_id === order.vendor_id
      );
      setFilteredProducts(vendorProducts);
    } else {
      setFilteredProducts(products);
    }
  }, [order.vendor_id, products]);

  useEffect(() => {
    if (activeSuggestionIndex !== null) {
      const activeItem = orderItems[activeSuggestionIndex];
      if (activeItem?.name) {
        const filteredSuggestions = filteredProducts.filter(product =>
          product.name.toLowerCase().includes(activeItem.name.toLowerCase())
        );
        setProductSuggestions(filteredSuggestions);
      } else {
        setProductSuggestions(filteredProducts);
      }
    } else {
      setProductSuggestions([]);
    }
  }, [orderItems, filteredProducts, activeSuggestionIndex]);

  useEffect(() => {
    if (!vendorFormData.as_of_date) {
      const today = new Date().toISOString().split('T')[0];
      setVendorFormData((prev) => ({ ...prev, as_of_date: today }));
    }
  }, [showVendorModal]);

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get(`/api/getProducts/${selectedCompany?.company_id}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get(`/api/getVendors/${selectedCompany?.company_id}`);
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

  const fetchOrderCount = async () => {
    try {
      const response = await axiosInstance.get(`/api/orders/count/${selectedCompany?.company_id}`);
      const count = response.data.count + 1;
      setOrderCount(count);
      setOrder((prev) => ({
        ...prev,
        order_no: `ORD-${count}`,
      }));
    } catch (error) {
      console.error('Error fetching order count:', error);
      setOrder((prev) => ({
        ...prev,
        order_no: `ORD-${orderCount + 1}`,
      }));
    }
  };

  const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'vendor_id') {
      const selectedVendor = vendors.find(vendor => vendor.vendor_id === Number(value));
      setOrder((prev) => ({
        ...prev,
        vendor_id: value === '' ? null : Number(value),
        mailling_address: selectedVendor ? selectedVendor.address || '' : '',
        email: selectedVendor ? selectedVendor.email || '' : '', // Auto-populate email
      }));
    } else {
      setOrder((prev) => ({
        ...prev,
        [name]: value === '' ? null : value,
      }));
    }
  };

  const handleVendorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVendorFilter(value);
    
    if (value === '') {
      setOrder(prev => ({
        ...prev,
        vendor_id: null,
        mailling_address: '',
        email: '' // Clear email when vendor is cleared
      }));
    }
  };

  const handleVendorSelection = (vendor: Vendor | 'new_vendor') => {
    if (vendor === 'new_vendor') {
      setShowVendorModal(true);
      resetVendorForm();
    } else {
      setVendorFilter(vendor.name);
      setOrder((prev) => ({
        ...prev,
        vendor_id: vendor.vendor_id,
        mailling_address: vendor.address || '',
        email: vendor.email || '', // Auto-populate email
      }));
    }
    setVendorSuggestions([]);
  };

  // Vendor Modal Functions
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
      
      // Auto-select the newly created vendor
      const newVendor = response.data;
      setVendorFilter(vendorFormData.name);
      setOrder((prev) => ({
        ...prev,
        vendor_id: newVendor.vendor_id || newVendor.id,
        mailling_address: vendorFormData.address,
        email: vendorFormData.email, // Auto-populate email for new vendor
      }));
      
      setShowVendorModal(false);
      setVendorError(null);
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      setVendorError(error.response?.data?.message || 'Failed to save vendor');
    }
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: `temp_${Date.now()}`,
      order_id: order.id,
      product_id: null,
      name: '',
      sku: '',
      description: '',
      qty: 0,
      rate: 0,
      amount: 0,
      class: '',
      received: false,
      closed: false,
      isEditing: true,
    };
    setOrderItems([...orderItems, newItem]);
    // Use filtered products instead of all products
    setProductSuggestions(filteredProducts);
  };

  const updateItem = (id: number | string, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems];
    const index = updatedItems.findIndex(item => item.id === id);
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'product_id' && value) {
      // Use filteredProducts instead of products
      const product = filteredProducts.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index].name = product.name;
        updatedItems[index].sku = product.sku || '';
        updatedItems[index].description = product.description || '';
        updatedItems[index].rate = product.cost_price || 0;
        updatedItems[index].product_id = product.id;
      }
    }

    if (field === 'qty' || field === 'rate') {
      const item = updatedItems[index];
      item.amount = Number((item.qty * item.rate).toFixed(2));
    }

    setOrderItems(updatedItems);
  };

  const removeItem = (id: number | string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return Number(orderItems.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderData = {
        ...order,
        total_amount: calculateTotal(),
        company_id: selectedCompany?.company_id,
      };
      const response = await axiosInstance.post(`/api/orders/${selectedCompany?.company_id}`, orderData);
      const orderId = response.data.id;

      for (const item of orderItems) {
        await axiosInstance.post(`/api/order-items/${selectedCompany?.company_id}`, {
          ...item,
          order_id: orderId,
        });
      }

      navigate('/dashboard/purchases');
    } catch (error: any) {
      console.error('Error saving order:', error);
      alert(error.response?.data?.message || 'Failed to save order');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-6">
        <div className="relative top-4 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create Purchase Order</h3>
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input
                  type="text"
                  name="order_no"
                  value={order.order_no}
                  className="input"
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                <input
                  type="date"
                  name="order_date"
                  value={order.order_date}
                  onChange={handleOrderChange}
                  className="input"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <div className="relative">
                  <select
                    className="input"
                    name="vendor_id"
                    value={order.vendor_id || ''}
                    onChange={(e) => {
                      if (e.target.value === "add_new_vendor") {
                        setShowVendorModal(true);
                        resetVendorForm();
                      } else {
                        const selectedVendor = vendors.find(vendor => vendor.vendor_id === Number(e.target.value));
                        setOrder({
                          ...order,
                          vendor_id: e.target.value === '' ? null : Number(e.target.value),
                          mailling_address: selectedVendor ? selectedVendor.address || '' : '',
                          email: selectedVendor ? selectedVendor.email || '' : '', // Auto-populate email
                        });
                        setVendorFilter(selectedVendor ? selectedVendor.name : '');
                      }
                    }}
                    required
                  >
                    <option value="" disabled>Select Vendor</option>
                    <option value="add_new_vendor">Add New Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.vendor_id} value={vendor.vendor_id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                <input
                  type="text"
                  name="mailling_address"
                  value={order.mailling_address || ''}
                  onChange={handleOrderChange}
                  className="input"
                  placeholder="Enter mailing address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={order.email || ''}
                  onChange={handleOrderChange}
                  className="input"
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={order.category || ''}
                  onChange={handleOrderChange}
                  className="input"
                >
                  <option value="">Select Category</option>
                  <option value="cost_of_sales">Cost of Sales</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  name="class"
                  value={order.class || ''}
                  onChange={handleOrderChange}
                  className="input"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Ship Via</label>
                <input
                  type="text"
                  name="ship_via"
                  value={order.ship_via || ''}
                  onChange={handleOrderChange}
                  className="input"
                  placeholder="Enter shipping method"
                />
              </div>
            </div>

            {/* Display message if no vendor is selected */}
            {!order.vendor_id && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Vendor Selection Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Please select a vendor to see available products for this purchase order.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Order Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-primary btn-sm"
                  disabled={!order.vendor_id} // Disable if no vendor selected
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    updateItem(item.id, 'name', e.target.value);
                                    setActiveSuggestionIndex(index);
                                  }}
                                  onFocus={() => {
                                    setActiveSuggestionIndex(index);
                                    const filtered = filteredProducts.filter(product =>
                                      product.name.toLowerCase().includes(item.name?.toLowerCase() || '')
                                    );
                                    setProductSuggestions(filtered.length > 0 ? filtered : filteredProducts);
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (activeSuggestionIndex === index) {
                                        setProductSuggestions([]);
                                        setActiveSuggestionIndex(null);
                                      }
                                    }, 200);
                                  }}
                                  className="border rounded px-2 py-2 w-full"
                                  placeholder="Search product"
                                  required
                                />
                                {activeSuggestionIndex === index && productSuggestions.length > 0 && (
                                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                                    {productSuggestions.map(product => (
                                      <li
                                        key={product.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                        onMouseDown={() => {
                                          updateItem(item.id, 'product_id', product.id);
                                          setProductSuggestions([]);
                                          setActiveSuggestionIndex(null);
                                        }}
                                      >
                                        {product.image && (
                                          <img
                                            src={`http://localhost:3000${product.image}`}
                                            alt={product.name}
                                            className="w-8 h-8 object-cover mr-2 rounded"
                                          />
                                        )}
                                        <span>{product.name}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {activeSuggestionIndex === index && productSuggestions.length === 0 && order.vendor_id && (
                                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-4 text-center text-gray-500">
                                    No products found for this vendor
                                  </div>
                                )}
                              </>
                            ) : (
                              item.name
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="text"
                                name="sku"
                                value={item.sku}
                                onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                                className="input w-full"
                                placeholder="Product SKU"
                              />
                            ) : (
                              item.sku || '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="text"
                                name="description"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="input w-full"
                                placeholder="Product Description"
                              />
                            ) : (
                              item.description || '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="number"
                                name="qty"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                                className="input w-full"
                                min="1"
                                required
                              />
                            ) : (
                              item.qty
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="number"
                                name="rate"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="input w-full"
                                step="0.01"
                                required
                              />
                            ) : (
                              `Rs. ${Number(item.rate).toFixed(2)}`
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            Rs. {Number(item.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {item.isEditing ? (
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>Rs. {calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-md"
              >
                Save Order
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{marginTop: "-1px"}}>
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Vendor</h3>
                <button 
                  onClick={() => setShowVendorModal(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {vendorError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  {vendorError}
                </div>
              )}
              <form onSubmit={handleVendorSubmit} className="space-y-4 max-h-96 overflow-y-auto">
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

                <h4 className="text-md font-medium text-gray-900 mb-2">
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
    </motion.div>
  );
}