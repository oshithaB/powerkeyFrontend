import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface BillItem {
    product_id: number;
    product_name: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Bill {
    id: number;
    bill_number: string; 
    company_id: number;
    order_id?: number;
    vendor_id: number;
    vendor_name?: string; 
    payment_method_id: number;
    payment_method?: string; 
    employee_id: number;
    employee_name?: string; 
    bill_date: string;
    due_date: string; 
    notes: string;
    status: 'opened' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    order_number?: string; 
    created_at: string;
}

interface Payment {
    payment_amount: number;
    payment_date: string;
    payment_method: string;
    deposit_to: string;
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

const BillReceivePaymentModal: React.FC = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { selectedCompany } = useCompany();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payment, setPayment] = useState<Payment>({
        payment_amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        deposit_to: '',
        notes: '',
    });
    const [selectedBills, setSelectedBills] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);
    const [isCreateDepositModalOpen, setIsCreateDepositModalOpen] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchBills = async () => {
            if (!selectedCompany?.company_id) {
                setError('No company selected. Please select a company first.');
                setLoading(false);
                return;
            }

            const vendorId = state?.bill?.vendor_id || null;

            if (!vendorId || isNaN(vendorId)) {
                setError('Invalid or missing Vendor ID');
                setLoading(false);
                return;
            }

            try {
                const response = await axiosInstance.get(
                `/api/getBillsByVendor/${selectedCompany.company_id}/${vendorId}`
                );
                setBills(response.data);
            } catch (error: any) {
                setError('Failed to fetch bills. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchBills();
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
      const newSelected = bills.filter((bill) => bill.status !== 'paid').map((bill) => bill.id);
      setSelectedBills(newSelected);
      const updatedPayments = bills.reduce(
        (acc, bill) => ({
          ...acc,
          [bill.id]: bill.status === 'paid' ? 0 : Number(bill.total_amount) - (Number(bill.paid_amount) || 0),
        }),
        {}
      );
      const total = bills.reduce((sum, bill) => sum + (bill.status === 'paid' ? 0 : Number(bill.total_amount) - (Number(bill.paid_amount) || 0)), 0);
      setPayment((prev) => ({ ...prev, ...updatedPayments, payment_amount: total }));
    } else {
      setSelectedBills([]);
      setPayment((prev) => ({ ...prev, payment_amount: 0 }));
    }
  };
  
  const handleSelectBill = (bill_id: number, totalAmount: number | string | null) => {
    const bill = bills.find((inv) => inv.id === bill_id);
    if (bill?.status === 'paid') return;
  
    const newSelected = selectedBills.includes(bill_id)
      ? selectedBills.filter((id) => id !== bill_id)
      : [...selectedBills, bill_id];
  
    setSelectedBills(newSelected);
  
    const balanceDue = bill ? Number(bill.total_amount) - (Number(bill.paid_amount) || 0) : 0;
  
    const total = newSelected.reduce((sum, id) => {
      const bill = bills.find((bill) => bill.id === id);
      return sum + (bill ? (Number(payment[id]) || (bill.status === 'paid' ? 0 : Number(bill.total_amount) - (Number(bill.paid_amount) || 0))) : 0);
    }, 0);
  
    setPayment((prev) => ({
      ...prev,
      [bill_id]: newSelected.includes(bill_id) ? balanceDue : '',
      payment_amount: total,
    }));
    setSelectAll(newSelected.length === bills.filter((bill) => bill.status !== 'paid').length);
  };

  const handlePaymentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    bill_id?: number
  ) => {
    const { name, value } = e.target;
    if (bill_id) {
      setPayment((prev) => {
        const updatedPayments = { ...prev, [bill_id]: value };
        const total = selectedBills.reduce((sum, id) => {
          const bill = bills.find((bill) => bill.id === id);
          return sum + (bill ? (Number(updatedPayments[id]) || 0) : 0);
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
    const vendor_id = state?.bill?.vendor_id || null;
  
    if (!vendor_id|| !selectedCompany?.company_id) {
      alert('Missing vendor ID or company ID');
      return;
    }
    if (!payment.payment_method) {
      alert('Please select a payment method.');
      return;
    }
  
    const billPayments = bills
      .filter((bill) => selectedBills.includes(bill.id) && Number(payment[bill.id]) > 0)
      .map((bill) => ({
        bill_id: bill.id,
        payment_amount: Number(payment[bill.id]) || 0,
      }));
  
    if (billPayments.length === 0) {
      alert('please select the bills to pay.');
      return;
    }
  
    // const creditLimit = Number(state?.invoice?.customer_credit_limit) || 0;
    // const payingAmount = Number(payment.payment_amount) || 0;
  
    // if (payingAmount > creditLimit) {
    //   alert('The payment amount exceeds the customer\'s credit limit.');
    //   return;
    // }
  
    try {
      await axiosInstance.post(
        `/api/recordBillPayment/${selectedCompany.company_id}/${vendor_id}`,
        {
          payment_amount: payment.payment_amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          deposit_to: payment.deposit_to,
          notes: payment.notes,
          vendor_id: vendor_id,
          bill_payments: billPayments,
        }
      );
      alert('Payment recorded successfully');
      navigate('/dashboard/expenses', { state: { activeTab: 'bills' } });
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
              Back to Bills
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
            <h2 className="text-xl font-bold text-gray-900">Send Payment</h2>
            <button onClick={() => navigate("/dashboard/expenses", { state: { activeTab: 'bills' } })} className="text-gray-600 hover:text-gray-900">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <div className='flex items-center space-x-2 mb-2 gap-x-40'>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Vendor: {state?.bill?.vendor_name || 'Unknown Vendor'}
              </h3>
            </div>
            
            <h4 className="text-md font-semibold text-gray-600 mb-2">Bills</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search by Bill Number</label>
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
                      Bill #
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
                    {bills
                    .filter(
                      (bill) =>
                      ['opened', 'overdue', 'partially_paid'].includes(bill.status) &&
                      bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-2 text-center text-sm text-gray-500">
                      No bills found.
                      </td>
                    </tr>
                    ) : (
                    bills
                      .filter(
                      (bill) =>
                        ['opened', 'overdue', 'partially_paid'].includes(bill.status) &&
                        bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((bill) => (
                      <tr key={bill.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedBills.includes(bill.id)}
                          onChange={() => handleSelectBill(bill.id, bill.total_amount)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          disabled={bill.status === 'paid'}
                        />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{bill.bill_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {format(new Date(bill.due_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        Rs. {formatAmount(bill.total_amount)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        Rs. {formatAmount(bill.paid_amount)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <input
                          type="number"
                          value={
                          payment[bill.id] !== undefined
                            ? payment[bill.id]
                            : selectedBills.includes(bill.id)
                            ? Number(bill.total_amount) - (Number(bill.paid_amount) || 0)
                            : ''
                          }
                          onChange={(e) => handlePaymentChange(e, bill.id)}
                          className="input w-full"
                          placeholder="Enter amount"
                          disabled={bill.status === 'paid'}
                        />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">
                        Rs. {formatAmount(Number(bill.total_amount) - (Number(bill.paid_amount) || 0) - (Number(payment[bill.id]) || 0))}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (bill.status) === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : (bill.status) === 'partially_paid'
                            ? 'bg-yellow-100 text-yellow-800'
                            : (bill.status) === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {(bill.status)
                          .replace('_', ' ')
                          .charAt(0)
                          .toUpperCase() +
                          bill.status.replace('_', ' ').slice(1)}
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
              <button type="button" onClick={() => navigate("/dashboard/expenses", { state: { activeTab: 'bills' } })} className="btn btn-secondary btn-md">
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

export default BillReceivePaymentModal;