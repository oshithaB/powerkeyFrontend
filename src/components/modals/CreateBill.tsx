import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { X, Plus, Trash2, Lock, Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BillModalProps {
  expense?: any;
  onSave?: () => void;
}

interface BillItem {
  product_id: number;
  product_name: string;
  description: string;
  quantity: number;
  cost_price: number;
  actual_unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
}

interface Role {
  role_id: number;
  name: string;
}

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, accountType?: string, description?: string) => Promise<void>;
  existingMethods: string[];
  title: string;
  label: string;
}

interface paymentMethod {
  id: number;
  name: string;
}

interface TaxRate {
  tax_rate_id: number;
  company_id: number;
  name: string;
  rate: string;
  is_default: number;
  created_at: string;
}

export default function BillModal({ expense, onSave }: BillModalProps) {
  const { selectedCompany } = useCompany();
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<paymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<any[]>([]);
  const [activeVendorSuggestion, setActiveVendorSuggestion] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [isCreatePaymentMethodModalOpen, setIsCreatePaymentMethodModalOpen] = useState(false);
  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = useState(false);
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const initialFormData = {
    bill_number: `BILL-${Date.now()}`,
    vendor_name: '',
    vendor_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    employee_id: '',
    due_date: '',
    notes: '',
    terms: '',
  };

  const [formData, setFormData] = useState(expense ? {
    ...initialFormData,
    ...expense,
    bill_date: expense.bill_date.split('T')[0],
  } : initialFormData);

  const initialItems = [{
    product_id: 0,
    product_name: '',
    description: '',
    quantity: 0,
    cost_price: 0,
    actual_unit_price: 0,
    tax_rate: 0,
    tax_amount: 0,
    total_price: 0,
  }];

  const [items, setItems] = useState<BillItem[]>(expense?.items || initialItems);

  useEffect(() => {
    if (selectedCompany) {
      const fetchTaxRates = async () => {
        try {
          const response = await axiosInstance.get(`/api/tax-rates/${selectedCompany?.company_id}`);
          const taxRatesData = Array.isArray(response.data) && Array.isArray(response.data[0]) 
            ? response.data[0] 
            : Array.isArray(response.data) 
              ? response.data 
              : [];
          setTaxRates(taxRatesData);
          
          const defaultTaxRate = taxRatesData.find((tax: TaxRate) => tax.is_default === 1);
          if (defaultTaxRate) {
            setItems(prevItems => prevItems.map(item => ({
              ...item,
              tax_rate: item.tax_rate === 0 ? parseFloat(defaultTaxRate.rate) : item.tax_rate
            })));
          }
        } catch (error) {
          console.error('Error fetching tax rates:', error);
          setTaxRates([]);
          setError('Failed to fetch tax rates');
        }
      };
      fetchTaxRates();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany && location.state?.orderId) {
      loadOrderData(location.state.orderId.toString());
    }
  }, [selectedCompany, location.state]);

  const loadOrderData = async (orderId: string) => {
    if (!orderId) return;
    try {
      const [orderRes, itemsRes] = await Promise.all([
        axiosInstance.get(`/api/getOrders/${selectedCompany?.company_id}`),
        axiosInstance.get(`/api/order-items/${selectedCompany?.company_id}/${orderId}`)
      ]);

      const order = orderRes.data.find((e: any) => e.id === parseInt(orderId));
      if (!order) {
        throw new Error('Selected order not found');
      }

      setFormData({
        ...formData,
        bill_number: `BILL-${order.order_no}-${Date.now()}`,
        order_id: orderId, 
        employee_id: order.class ? order.class.toString() : '',
        vendor_name: order.supplier,
        vendor_id: order.vendor_id ? order.vendor_id.toString() : '',
      });

      setItems(itemsRes.data.map((item: any) => ({
        product_id: item.product_id || 0,
        product_name: item.name || '',
        description: item.description || '',
        quantity: Number(item.qty) || 1,
        cost_price: Number(item.rate) || 0,
        actual_unit_price: Number((Number(item.rate) / (1 + (item.tax_rate || 0) / 100)).toFixed(2)) || 0,
        tax_rate: Number(item.tax_rate) || 0,
        tax_amount: Number(((Number(item.rate) / (1 + (item.tax_rate || 0) / 100)) * (item.tax_rate || 0) / 100).toFixed(2)) || 0,
        total_price: Number(item.amount) || 0
      })));
    } catch (error) {
      console.error('Error loading order data:', error);
      setError('Failed to load order data');
    }
  };  

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get(`/api/getVendors/${selectedCompany?.company_id}`);
      setVendors(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to fetch vendors');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get(`/api/getProducts/${selectedCompany?.company_id}`);
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await axiosInstance.get(`/api/getPaymentMethods`);
      setPaymentMethods(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setError('Failed to fetch payment methods');
      setPaymentMethods([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get(`/api/employees`);
      setEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchVendors();
      fetchProducts();
      fetchPaymentMethods();
      fetchEmployees();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (activeSuggestionIndex !== null) {
      const activeItem = items[activeSuggestionIndex];
      if (activeItem?.product_name) {
        const filteredSuggestions = products.filter(product =>
          product.name.toLowerCase().includes(activeItem.product_name.toLowerCase())
        );
        setProductSuggestions(filteredSuggestions);
      } else {
        setProductSuggestions(products);
      }
    } else {
      setProductSuggestions([]);
    }
  }, [items, products, activeSuggestionIndex]);

  useEffect(() => {
    if (activeVendorSuggestion !== false) {
      const activeVendor = formData.vendor_name || '';
      if (activeVendor) {
        const filteredVendors = vendors.filter(vendor =>
          vendor.name.toLowerCase().includes(activeVendor.toLowerCase())
        );
        setVendorSuggestions(filteredVendors);
      } else {
        setVendorSuggestions(vendors);
      }
    } else {
      setVendorSuggestions([]);
    } 
  }, [formData.vendor_name, vendors, activeVendorSuggestion]); 

  useEffect(() => {
    if (formData.terms === 'due_on_receipt') {
      setFormData((prev: typeof initialFormData) => ({ ...prev, due_date: formData.bill_date }));
    } else if (formData.terms === 'net_15') {
      const due = new Date(formData.bill_date);
      due.setDate(due.getDate() + 15);
      setFormData((prev: typeof initialFormData) => ({ ...prev, due_date: due.toISOString().split('T')[0] }));
    } else if (formData.terms === 'net_30') {
      const due = new Date(formData.bill_date);
      due.setDate(due.getDate() + 30);
      setFormData((prev: typeof initialFormData) => ({ ...prev, due_date: due.toISOString().split('T')[0] }));
    } else if (formData.terms === 'net_60') {
      const due = new Date(formData.bill_date);
      due.setDate(due.getDate() + 60);
      setFormData((prev: typeof initialFormData) => ({ ...prev, due_date: due.toISOString().split('T')[0] }));
    } else {
      setFormData((prev: typeof initialFormData) => ({ ...prev, due_date: '' }));
    }
  }, [formData.bill_date, formData.terms, formData.vendor_id]);

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
  
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index].product_name = product.name;
        updatedItems[index].description = product.description || '';
        updatedItems[index].cost_price = product.cost_price || 0;
        updatedItems[index].product_id = product.id;
      }
    }
  
    if (field === 'quantity' || field === 'cost_price' || field === 'tax_rate') {
      const item = updatedItems[index];
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.cost_price) || 0;
      const taxRate = Number(item.tax_rate) || 0;
  
      const subtotal = quantity * unitPrice;
      item.actual_unit_price = Number((unitPrice / (1 + taxRate / 100)).toFixed(2));
      item.tax_amount = Number((item.actual_unit_price * taxRate / 100).toFixed(2));
      item.total_price = Number((subtotal).toFixed(2));
    }
  
    setItems(updatedItems);
  };

  const addItem = () => {
    const defaultTaxRate = taxRates.find(tax => tax.is_default === 1);
    setItems([...items, {
      product_id: 0,
      product_name: '',
      description: '',
      quantity: 0,
      cost_price: 0,
      actual_unit_price: 0,
      tax_rate: defaultTaxRate ? parseFloat(defaultTaxRate.rate) : 0,
      tax_amount: 0,
      total_price: 0,
    }]);
    setProductSuggestions(products);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = Number(items.reduce((sum, item) => sum + (item.quantity * item.actual_unit_price), 0).toFixed(2));
    const totalTax = Number(items.reduce((sum, item) => sum + (item.quantity * item.tax_amount), 0).toFixed(2));
    const total = Number((subtotal + totalTax).toFixed(2));
    return { subtotal, totalTax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      if (!formData.bill_number) {
        throw new Error('Bill number is required');
      }
      if (!formData.bill_date) {
        throw new Error('Bill date is required');
      }
      if (!items.some(item => item.product_id !== 0)) {
        throw new Error('At least one valid item is required');
      }
  
      const { subtotal, totalTax, total } = calculateTotals();
  
      const submitData = {
        ...formData,
        company_id: selectedCompany?.company_id,
        subtotal: Number(subtotal),
        tax_amount: Number(totalTax),
        total_amount: Number(total),
        items: items.map(item => ({
          ...item,
          product_id: parseInt(item.product_id as any) || null,
          quantity: Number(item.quantity),
          cost_price: Number(item.cost_price),
          actual_unit_price: Number(item.actual_unit_price),
          tax_rate: Number(item.tax_rate),
          tax_amount: Number(item.tax_amount),
          total_price: Number(item.total_price),
        })),
      };
  
      if (expense) {
        await axiosInstance.put(`/api/createBill/${selectedCompany?.company_id}/${expense.id}`, submitData);
      } else {
        await axiosInstance.post(`/api/createBill/${selectedCompany?.company_id}`, submitData);
      }
  
      setFormData(initialFormData);
      setItems(initialItems);
  
      if (onSave && typeof onSave === 'function') {
        onSave();
      } else {
        navigate("/dashboard/expenses", { state: { activeTab: 'bills' } });
      }
    } catch (error: any) {
      console.error('Error saving expense:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save expense';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentMethod = async (name: string) => {
    try {
      const response = await axiosInstance.post('/api/createPaymentMethod', {
        name,
      });
      const newMethod = response.data;
      setPaymentMethods((prev) => [...prev, newMethod]);
      setFormData({ ...formData, payment_method: newMethod.id });
      setIsCreatePaymentMethodModalOpen(false);
      alert('Payment method created successfully.');
      navigate(0);
    } catch (error) {
      console.error('Error creating payment method:', error);
      alert('Failed to create payment method.');
    }
  };

  const CreatePaymentMethodModal: React.FC<CreateModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    existingMethods,
    title,
    label,
  }) => {
    const [newName, setNewName] = useState('');
  
    const handleCreate = async () => {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        alert(`${label} name is required.`);
        return;
      }
      if (existingMethods.includes(trimmedName.toLowerCase())) {
        alert(`${label} already exists.`);
        return;
      }
      await onCreate(trimmedName);
      setNewName('');
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label} Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input w-full"
              placeholder={`Enter ${label.toLowerCase()} name`}
              maxLength={50}
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
              Cancel
            </button>
            <button type="button" onClick={handleCreate} className="btn btn-primary btn-md">
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CreateVendorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
  }> = ({ isOpen, onClose, title }) => {
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
      as_of_date: new Date().toISOString().split('T')[0]
    });

    const resetVendorForm = () => {
      const today = new Date().toISOString().split('T')[0];
      setVendorFormData({
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
        as_of_date: today
      });
    };

    const handleVendorSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (isNaN(vendorFormData.balance) || isNaN(vendorFormData.billing_rate)) {
        setError('Please enter valid numbers for balance and billing rate.');
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

        await axiosInstance.post(`/api/createVendors/${selectedCompany?.company_id}`, payload);

        setIsCreateVendorModalOpen(false);
        fetchVendors();
        resetVendorForm();
        setError(null);
      } catch (error: any) {
        console.error('Error saving vendor:', error);
        setError(error.response?.data?.message || 'Failed to save vendor');
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{ marginTop: "-1px" }}>
        <div className="relative mt-20 mb-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>
            )}
            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter Company Name"
                    value={vendorFormData.company_name}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter Email"
                    value={vendorFormData.email}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="Enter Phone Number"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Number</label>
                  <input
                    type="text"
                    className="input"
                    value={vendorFormData.tax_number || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, tax_number: e.target.value })}
                    placeholder="Enter Tax Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fax Number</label>
                  <input
                    type="text"
                    className="input"
                    value={vendorFormData.fax_number || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, fax_number: e.target.value })}
                    placeholder="Enter Fax Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    className="input"
                    value={vendorFormData.website || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, website: e.target.value })}
                    placeholder="Enter Website URL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter City"
                    value={vendorFormData.city}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter State"
                    value={vendorFormData.state}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter ZIP Code"
                    value={vendorFormData.zip_code}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, zip_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
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

              <h3 className="text-lg font-medium text-gray-900 mb-2">Additional Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default expense category</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Rate</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Account Number"
                    value={vendorFormData.account_number || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, account_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
                  <input
                    type="date"
                    className="input"
                    value={vendorFormData.as_of_date || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, as_of_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Cancel</button>
                <button type="submit" className="btn btn-primary btn-md">Create Vendor</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const CreateEmployeeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
  }> = ({ isOpen, onClose, title }) => {
    const [employeeFormData, setEmployeeFormData] = useState({
      name: '',
      email: '',
      phone: '',
      address: '',
      hire_date: '',
      role_id: '',
      username: '',
      password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);

    const resetEmployeeForm = () => {
      setEmployeeFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        hire_date: '',
        role_id: '',
        username: '',
        password: '',
      });
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (employeeFormData.hire_date && isNaN(new Date(employeeFormData.hire_date).getTime())) {
        setError('Invalid hire date');
        return;
      }
    
      if ((employeeFormData.username || employeeFormData.password) && !employeeFormData.role_id) {
        setError('Role is required when username or password is provided');
        return;
      }
    
      if ((employeeFormData.username || employeeFormData.password) && (!employeeFormData.username || !employeeFormData.password)) {
        setError('Both username and password are required if one is provided');
        return;
      }
    
      const employeePayload = {
        name: employeeFormData.name,
        email: employeeFormData.email || null,
        phone: employeeFormData.phone || null,
        address: employeeFormData.address || null,
        hire_date: employeeFormData.hire_date || null,
      };
    
      try {
        const newEmployeePayload: any = { ...employeePayload };
        if (employeeFormData.username && employeeFormData.password && employeeFormData.role_id) {
          newEmployeePayload.username = employeeFormData.username;
          newEmployeePayload.password = employeeFormData.password;
          newEmployeePayload.role_id = parseInt(employeeFormData.role_id);
        }
        
        await axiosInstance.post('/api/employees', newEmployeePayload);
        fetchEmployees();
        setIsCreateEmployeeModalOpen(false);
        resetEmployeeForm();
      } catch (error: any) {
        console.error('Error saving employee:', error);
        if (error.response?.status === 400) {
          setError(error.response.data.message || 'Invalid input data');
        } else {
          setError('An unexpected error occurred');
        }
      }
    };

    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get('/api/roles');
        setRoles(response.data);
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    useEffect(() => {
      if (selectedCompany) {
        fetchRoles();
      }
    }, [selectedCompany]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style={{ marginTop: '-1px' }}>
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter Employee Name"
                    value={employeeFormData.name}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    className="input"
                    value={employeeFormData.hire_date}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, hire_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter Employee Email"
                    value={employeeFormData.email}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="Enter Employee Phone"
                    value={employeeFormData.phone}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter Employee Address"
                  value={employeeFormData.address}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                />
              </div>

              <hr />

              <h4 className="text-sm font-medium text-gray-700 mb-2">Login Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role {(employeeFormData.username || employeeFormData.password) && '*'}</label>
                  <select
                    className="input"
                    value={employeeFormData.role_id}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, role_id: e.target.value })}
                    required={!!employeeFormData.username || !!employeeFormData.password}
                  >
                    <option value="" disabled>Select Role</option>
                    {roles.map((role) => (
                      <option key={role.role_id} value={role.role_id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username {(employeeFormData.password || employeeFormData.role_id) && '*'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter Username"
                    value={employeeFormData.username}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, username: e.target.value })}
                    disabled={!employeeFormData.role_id}
                    autoComplete="off"
                    required={!!employeeFormData.password || !!employeeFormData.role_id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password {(employeeFormData.username || employeeFormData.role_id) && '*'}</label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required={!!employeeFormData.username || !!employeeFormData.role_id}
                      className="input"
                      disabled={!employeeFormData.role_id}
                      placeholder="Enter your password"
                      value={employeeFormData.password}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => onClose()} className="btn btn-secondary btn-md">Cancel</button>
                <button type="submit" className="btn btn-primary btn-md">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="relative top-4 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create New Bill</h3>
            <button
              onClick={() => navigate("/dashboard/expenses", { state: { activeTab: 'bills' } })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.bill_number}
                  onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                  placeholder="Enter Bill number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.vendor_name || !!formData.vendor_id ? formData.vendor_name : ''}
                  onChange={(e) => {
                    setFormData({ ...formData, vendor_name: e.target.value });
                    setActiveVendorSuggestion(true);
                  }}
                  onFocus={() => setActiveVendorSuggestion(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setActiveVendorSuggestion(false);
                      setVendorSuggestions([]);
                    }, 200);
                  }}
                  placeholder="Enter vendor name"
                />
                {activeVendorSuggestion && (
                  <ul
                    className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1"
                    style={{ maxHeight: '240px', maxWidth: '420px', minWidth: '220px', overflowY: 'auto', overflowX: 'auto', width: '420px' }}
                  >
                    <li
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t"
                      onMouseDown={() => {
                        setIsCreateVendorModalOpen(true);
                        setVendorSuggestions([]);
                        setActiveVendorSuggestion(false);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create New Vendor
                    </li>
                    {vendorSuggestions.map((vendor, index) => (
                      <li
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onMouseDown={() => {
                          setFormData({ ...formData, vendor_name: vendor.name, vendor_id: vendor.vendor_id.toString(), terms: vendor.terms || '' });
                          setVendorSuggestions([]);
                          setActiveVendorSuggestion(false);
                        }}
                      >
                        <span>{vendor.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.bill_date}
                  onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.due_date}
                  disabled
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => {
                    if (e.target.value === 'create_new') {
                      setIsCreatePaymentMethodModalOpen(true);
                    } else {
                      setFormData({ ...formData, payment_method: e.target.value });
                    }
                  }}
                  className="input w-full"
                  required
                >
                  <option value="" disabled>Select Payment Method</option>
                  <option value="create_new" className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t">+ Create New Payment Method</option>
                  {paymentMethods.map((method, index) => (
                    <option key={index} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  name="employee"
                  value={formData.employee_id || ''}
                  onChange={(e) => {
                    if (e.target.value === 'create_new') {
                      setIsCreateEmployeeModalOpen(true);
                    } else {
                      setFormData({ ...formData, employee_id: e.target.value });
                    }
                  }}
                  className="input"
                  disabled={!!formData.order_id}
                >
                  <option value="" disabled>Select Employee</option>
                  <option value="create_new" className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 font-semibold flex items-center border-t">+ Create New Employee</option>
                  {employees.map((employee, index) => (
                    <option key={index} value={employee.id}>{employee.name}</option>
                  ))}
                </select>
              </div>

            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!!formData.order_id}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className={`border-t ${formData.order_id ? 'opacity-60 pointer-events-none' : ''}`}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.product_name || ''}
                            onChange={(e) => {
                              updateItem(index, 'product_name', e.target.value);
                              setActiveSuggestionIndex(index);
                            }}
                            onFocus={() => setActiveSuggestionIndex(index)}
                            onBlur={() => {
                              setTimeout(() => {
                                if (activeSuggestionIndex === index) {
                                  setProductSuggestions([]);
                                  setActiveSuggestionIndex(null);
                                }
                              }, 200);
                            }}
                            placeholder="Search product"
                            className="border rounded px-2 py-1 w-full"
                            disabled={!!formData.order_id}
                          />
                          {activeSuggestionIndex === index && productSuggestions.length > 0 && !formData.order_id && (
                            <ul
                              className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1"
                              style={{ maxHeight: '240px', maxWidth: '420px', minWidth: '220px', overflowY: 'auto', overflowX: 'auto', width: '420px' }}
                            >
                              {productSuggestions.map(product => (
                                <li
                                  key={product.id}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                  onMouseDown={() => {
                                    const updatedItems = [...items];
                                    const quantity = 1;
                                    const costPrice = Number(product.cost_price) || 0;
                                    const taxRate = Number(updatedItems[index].tax_rate) || 0;
                                    const actualUnitPrice = Number((costPrice / (1 + taxRate / 100)).toFixed(2)) || 0;
                                    const taxAmount = Number((actualUnitPrice * taxRate / 100).toFixed(2)) || 0;
                                    const totalPrice = Number((quantity * costPrice).toFixed(2)) || 0;

                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      product_id: product.id,
                                      product_name: product.name,
                                      description: product.description || '',
                                      quantity,
                                      cost_price: costPrice,
                                      actual_unit_price: actualUnitPrice,
                                      tax_amount: taxAmount,
                                      total_price: totalPrice,
                                    };
                                    setItems(updatedItems);
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
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="input"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0"
                            min="0"
                            className="input w-20"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input w-24"
                            value={item.cost_price}
                            onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </td>
                        <td className="px-4 py-2 text-center">Rs. {(item.actual_unit_price ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <select
                            className="input w-20"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                          >
                            {taxRates.length > 0 ? (
                              <>
                                {taxRates.map((tax) => (
                                  <option key={tax.tax_rate_id} value={parseFloat(tax.rate)}>{tax.name} ({tax.rate}%)</option>
                                ))}
                                <option value={0}>0% No Tax</option>
                              </>
                            ) : (
                              <option value={0} disabled>No tax rates available</option>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center border border-gray-200">Rs. {(item.total_price ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                            disabled={!!formData.order_id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      style={{ resize: 'none' }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {(() => {
                        const { subtotal, totalTax, total } = calculateTotals();
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>Rs. {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax:</span>
                              <span>Rs. {totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                              <span>Total:</span>
                              <span>Rs. {total.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard/expenses", { state: { activeTab: 'bills' } })}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-md"
              >
                {loading ? 'Saving...' : expense ? 'Update Bill' : 'Create Bill'}
              </button>
            </div>
          </form>

          <CreatePaymentMethodModal
            isOpen={isCreatePaymentMethodModalOpen}
            onClose={() => setIsCreatePaymentMethodModalOpen(false)}
            onCreate={handleCreatePaymentMethod}
            existingMethods={paymentMethods.filter(m => m && m.name).map(m => m.name.toLowerCase())}
            title="Create New Payment Method"
            label="Payment Method"
          />

          <CreateVendorModal
            isOpen={isCreateVendorModalOpen}
            onClose={() => setIsCreateVendorModalOpen(false)}
            title="Add New Vendor"
          />

          <CreateEmployeeModal
            isOpen={isCreateEmployeeModalOpen}
            onClose={() => setIsCreateEmployeeModalOpen(false)}
            title="Add New Employee"
          />
        </div>
      </div>
    </motion.div>
  );
}