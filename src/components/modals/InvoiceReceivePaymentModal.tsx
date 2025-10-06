import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name: string;
  description: string;
  quantity: string;
  unit_price: string;
  actual_unit_price: string;
  tax_rate: string;
  tax_amount: string;
  total_price: string;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  customer_credit_limit? : number | String,
  company_id: number;
  employee_id: number;
  employee_name?: string;
  estimate_id: number | null;
  invoice_date: string;
  due_date: string;
  shipping_date: string;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'proforma';
  computed_status?: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: string;
  discount_amount: string;
  subtotal: string;
  tax_amount: string;
  notes: string;
  terms: string;
  shipping_address: string;
  billing_address: string;
  ship_via: string;
  tracking_number: string;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

interface Payment {
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  deposit_to: string | number | null;
  notes?: string | undefined;
  [key: number]: number | string;
}

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  existingMethods: string[];
  title: string;
  label: string;
}

const CreateModal: React.FC<CreateModalProps> = ({
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
      // alert(${label} name is required.);
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
          <label className="block text-sm font-medium text-gray-700 mb-1">{label} Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input w-full"
            placeholder={`Enter ${label.toLowerCase()} name`}
            maxLength={50}
            autoFocus
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

const InvoiceReceivePaymentModal: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>({
    payment_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    deposit_to: null,
    notes: '',
  });
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);
  const [isCreateDepositModalOpen, setIsCreateDepositModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!selectedCompany?.company_id) {
        setError('No company selected. Please select a company first.');
        setLoading(false);
        return;
      }

      const customerId = state?.invoice?.customer_id || null;

      if (!customerId || isNaN(customerId)) {
        setError('Invalid or missing Customer ID');
        setLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get(
          `/api/getInvoicesByCustomer/${selectedCompany.company_id}/${customerId}`
        );
        setInvoices(response.data);
      } catch (error: any) {
        setError('Failed to fetch invoices. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [selectedCompany, state]);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!selectedCompany?.company_id) return;
      setPaymentMethodsLoading(true);
      try {
        const response = await axiosInstance.get('/api/getPaymentMethods');
        const methods = response.data.map((method: { name: string }) => method.name);
        setPaymentMethods(methods);
        if (methods.length > 0 && !payment.payment_method) {
          setPayment((prev) => ({ ...prev, payment_method: methods[0] }));
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        setPaymentMethods([]);
        alert('Failed to fetch payment methods.');
      } finally {
        setPaymentMethodsLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [selectedCompany]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    if (newSelectAll) {
      const newSelected = invoices.filter((invoice) => invoice.status !== 'paid').map((invoice) => invoice.id);
      setSelectedInvoices(newSelected);
      const updatedPayments = invoices.reduce(
        (acc, invoice) => ({
          ...acc,
          [invoice.id]: invoice.status === 'paid' ? 0 : Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0),
        }),
        {}
      );
      const total = invoices.reduce((sum, invoice) => sum + (invoice.status === 'paid' ? 0 : Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0)), 0);
      setPayment((prev) => ({ ...prev, ...updatedPayments, payment_amount: total }));
    } else {
      setSelectedInvoices([]);
      setPayment((prev) => ({ ...prev, payment_amount: 0 }));
    }
  };
  
  const handleSelectInvoice = (invoiceId: number, totalAmount: number | string | null) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (invoice?.status === 'paid') return;
  
    const newSelected = selectedInvoices.includes(invoiceId)
      ? selectedInvoices.filter((id) => id !== invoiceId)
      : [...selectedInvoices, invoiceId];
  
    setSelectedInvoices(newSelected);
  
    const balanceDue = invoice ? Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0) : 0;
  
    const total = newSelected.reduce((sum, id) => {
      const inv = invoices.find((inv) => inv.id === id);
      return sum + (inv ? (Number(payment[id]) || (inv.status === 'paid' ? 0 : Number(inv.total_amount) - (Number(inv.paid_amount) || 0))) : 0);
    }, 0);
  
    setPayment((prev) => ({
      ...prev,
      [invoiceId]: newSelected.includes(invoiceId) ? balanceDue : '',
      payment_amount: total,
    }));
    setSelectAll(newSelected.length === invoices.filter((invoice) => invoice.status !== 'paid').length);
  };

  const handlePaymentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    invoiceId?: number
  ) => {
    const { name, value } = e.target;
    if (invoiceId) {
      setPayment((prev) => {
        const updatedPayments = { ...prev, [invoiceId]: value };
        const total = selectedInvoices.reduce((sum, id) => {
          const inv = invoices.find((inv) => inv.id === id);
          return sum + (inv ? (Number(updatedPayments[id]) || 0) : 0);
        }, 0);
        return { ...updatedPayments, payment_amount: total };
      });
    } else {
      setPayment((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreatePaymentMethod = async (name: string) => {
    try {
      const response = await axiosInstance.post('/api/createPaymentMethod', {
        name,
      });
      const { name: newMethod } = response.data;
      setPaymentMethods((prev) => [...prev, newMethod]);
      setPayment((prev) => ({ ...prev, payment_method: newMethod }));
      setIsCreatePaymentModalOpen(false);
      alert('Payment method created successfully.');
    } catch (error) {
      console.error('Error creating payment method:', error);
      alert('Failed to create payment method.');
    }
  };

  const formatAmount = (amount: number | string | null | undefined): string => {
    if (amount === '' || amount == null || isNaN(Number(amount))) {
      return '0';
    }
    const formatted = parseFloat(amount.toString());
    return formatted < 0 ? '0' : formatted.toLocaleString();
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerId = state?.invoice?.customer_id || null;
  
    if (!customerId || !selectedCompany?.company_id) {
      alert('Missing customer ID or company ID');
      return;
    }
    if (!payment.payment_method) {
      alert('Please select a payment method.');
      return;
    }
  
    const invoicePayments = invoices
      .filter((invoice) => selectedInvoices.includes(invoice.id) && Number(payment[invoice.id]) > 0)
      .map((invoice) => ({
        invoice_id: invoice.id,
        payment_amount: Number(payment[invoice.id]) || 0,
      }));
  
    if (invoicePayments.length === 0) {
      alert('please select the invoices to pay.');
      return;
    }
  
    try {
      await axiosInstance.post(
        `/api/recordInvoicePayment/${selectedCompany.company_id}/${customerId}`,
        {
          payment_amount: payment.payment_amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          deposit_to: payment.deposit_to,
          notes: payment.notes,
          customer_id: customerId,
          invoice_payments: invoicePayments,
        }
      );
      alert('Payment recorded successfully');
      navigate('/dashboard/sales', { state: { activeTab: 'invoices' } });
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  if (loading || paymentMethodsLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Error</h2>
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-red-600">{error}</p>
          <div className="flex justify-end mt-4">
            <button onClick={() => navigate(-1)} className="btn btn-secondary">
              Back to Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-xl font-bold text-gray-900">Receive Payment</h2>
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <div className='flex items-center space-x-2 mb-2 gap-x-40'>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Customer: {state?.invoice?.customer_name || 'Unknown Customer'}
              </h3>

              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Credit Limit: {state?.invoice?.customer_credit_limit ? `Rs. ${formatAmount(state?.invoice?.customer_credit_limit)}` : 'N/A'}
              </h3>
            </div>
            
            <h4 className="text-md font-semibold text-gray-600 mb-2">Invoices</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search by Invoice Number</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-1/4"
                placeholder="Enter invoice number"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance Due
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {invoices
                    .filter(
                      (invoice) =>
                      ['opened', 'overdue', 'partially_paid'].includes(invoice.status) &&
                      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-2 text-center text-sm text-gray-500">
                      No invoices found.
                      </td>
                    </tr>
                    ) : (
                    invoices
                      .filter(
                      (invoice) =>
                        ['opened', 'overdue', 'partially_paid'].includes(invoice.status) &&
                        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id, invoice.total_amount)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          disabled={invoice.status === 'paid'}
                        />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{invoice.invoice_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        Rs. {formatAmount(invoice.total_amount)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        Rs. {formatAmount(invoice.paid_amount)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <input
                          type="number"
                          value={
                          payment[invoice.id] !== undefined
                            ? payment[invoice.id]
                            : selectedInvoices.includes(invoice.id)
                            ? Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0)
                            : ''
                          }
                          onChange={(e) => handlePaymentChange(e, invoice.id)}
                          className="input w-full"
                          placeholder="Enter amount"
                          disabled={invoice.status === 'paid'}
                        />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">
                        Rs. {formatAmount(Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0) - (Number(payment[invoice.id]) || 0))}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (invoice.computed_status || invoice.status) === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : (invoice.computed_status || invoice.status) === 'partially_paid'
                            ? 'bg-yellow-100 text-yellow-800'
                            : (invoice.computed_status || invoice.status) === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : (invoice.computed_status || invoice.status) === 'proforma'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {(invoice.computed_status || invoice.status)
                          .replace('_', ' ')
                          .charAt(0)
                          .toUpperCase() +
                          (invoice.computed_status || invoice.status).replace('_', ' ').slice(1)}
                        </span>
                        </td>
                      </tr>
                      ))
                    )}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={payment.payment_date}
                  onChange={handlePaymentChange}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  name="payment_method"
                  value={payment.payment_method}
                  onChange={(e) => {
                    if (e.target.value === 'create_new') {
                      setIsCreatePaymentModalOpen(true);
                    } else {
                      handlePaymentChange(e);
                    }
                  }}
                  className="input w-full"
                  disabled={paymentMethodsLoading}
                >
                  <option value="" disabled>
                    Select Payment Method
                  </option>
                  <option value="create_new">Create New</option>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method.replace('', ' ').charAt(0).toUpperCase() + method.replace('', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input 
                  className='flex items-center border rounded px-3 py-2 w-full'
                  placeholder='Enter Reference'
                  type="text"
                  name="deposit_to"
                  value={payment.deposit_to || ''}
                  onChange={handlePaymentChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={payment.notes || ''}
                style={{ resize: 'none' }}
                onChange={handlePaymentChange}
                className="input w-full h-24"
                placeholder="Add any notes about the payment"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => navigate("/dashboard/sales", { state: { activeTab: 'invoices' } })} className="btn btn-secondary btn-md">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-md" disabled={paymentMethodsLoading}>
                Save Payment
              </button>
            </div>
          </form>

          <CreateModal
            isOpen={isCreatePaymentModalOpen}
            onClose={() => setIsCreatePaymentModalOpen(false)}
            onCreate={handleCreatePaymentMethod}
            existingMethods={paymentMethods}
            title="Create New Payment Method"
            label="Payment Method"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default InvoiceReceivePaymentModal;