import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Search, Edit, Trash2, Receipt, Eye, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

interface Bill {
  id: number;
  bill_number: string; // Changed from expense_number
  company_id: number;
  order_id?: number;
  vendor_id: number;
  vendor_name?: string; // Add this
  payment_method_id: number;
  payment_method?: string; // Add this
  employee_id: number;
  employee_name?: string; // Add this
  bill_date: string;
  due_date: string; // Keep as optional
  notes: string;
  status: 'opened' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  order_number?: string; // Add this
  created_at: string;
}

export default function BillsPage() {
  const { selectedCompany } = useCompany();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchBills();
  }, [selectedCompany]);

  const fetchBills = async () => {
    try {
      const response = await axiosInstance.get(`/api/getAllBills/${selectedCompany?.company_id}`);
      setBills(response.data);
      console.log('Fetched bills:', response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bill: Bill) => {
    navigate(`/bill/edit/${bill.id}`, { state: { bill } });
  };

  const handleAddPayment = (bill: Bill) => {
    if (!bill.vendor_id || isNaN(bill.vendor_id) || bill.vendor_id <= 0) {
      console.error('Invalid or missing vendor ID for bill:', {
        id: bill.id,
        customer_id: bill.vendor_id,
      });
      alert(`Cannot proceed: Invalid or missing vendor ID for bill ${bill.bill_number}`);
      return;
    }
    navigate(`/bills/receive-payment/${bill.vendor_id}`, { state: { bill } });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await axiosInstance.delete(`/api/bills/${selectedCompany?.company_id}/${id}`);
        fetchBills();
      } catch (error) {
        console.error('Error deleting bill:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'opened':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.notes?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div></div>
          <button
            onClick={() => navigate('/bill/create')}
            className="btn btn-primary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Bill
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search bills..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Bills Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
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
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {bill.bill_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {bill.notes || 'No notes'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.vendor_name || 'No vendor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.employee_name || 'No employee'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(bill.due_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Rs. {bill.total_amount?.toLocaleString() || '0.00'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid: Rs. {bill.paid_amount?.toLocaleString() || '0.00'}
                      </div>
                      {bill.balance_due > 0 && (
                        <div className="text-sm text-red-600">
                          Due: Rs. {bill.balance_due?.toLocaleString() || '0.00'}
                        </div>
                      )}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                        {bill.status.replace('_', ' ').charAt(0).toUpperCase() + bill.status.replace('_', ' ').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(bill)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAddPayment(bill)}
                          className="text-green-600 hover:text-green-900"
                          style={{ display: bill.status === 'cancelled' || bill.status === 'paid' ? 'none' : undefined }}
                          title="Add Payment"
                          disabled={!bill.vendor_id}
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
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
      </div>
    </div>
  );
}