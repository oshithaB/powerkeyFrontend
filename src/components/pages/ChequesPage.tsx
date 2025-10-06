import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useNotification } from '../../contexts/NotificationContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Search, Edit, Trash2, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Cheque {
  id: number;
  cheque_number: string;
  bank_name: string;
  branch_name: string;
  cheque_date: string;
  payee_name: string;
  amount: number;
  status: 'pending' | 'deposited' | 'returned';
  created_at: string;
}

export default function ChequesPage() {
  const { selectedCompany } = useCompany();
  const { setHasNearDueCheques } = useNotification();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const updateNearDueCheques = (fetchedCheques: Cheque[]) => {
    const hasNearDue = fetchedCheques.some((cheque) => {
      if (cheque.cheque_date && cheque.status === 'pending') {
        const today = new Date();
        const chequeDate = new Date(cheque.cheque_date);
        const diffInTime = chequeDate.getTime() - today.getTime();
        const diffInDays = diffInTime / (1000 * 3600 * 24);
        return diffInDays == 0 || diffInDays <= 3;
      }
      return false;
    });
    setHasNearDueCheques(hasNearDue);
  };

  useEffect(() => {
    fetchCheques();
  }, [selectedCompany]);

  const fetchCheques = async () => {
    try {
      if (selectedCompany?.company_id) {
        const response = await axiosInstance.get(`/api/getChequesByCompanyId/${selectedCompany.company_id}`);
        const fetchedCheques = response.data;
        setCheques(fetchedCheques);
        updateNearDueCheques(fetchedCheques);
      } else {
        setCheques([]);
        setHasNearDueCheques(false);
      }
    } catch (error) {
      console.error('Error fetching cheques:', error);
      setHasNearDueCheques(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cheque: Cheque) => {
    navigate(`/cheque/edit/${cheque.id}`);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this cheque?')) {
      try {
        await axiosInstance.delete(`/api/deleteCheque/${id}`);
        await fetchCheques();
      } catch (error) {
        console.error('Error deleting cheque:', error);
        alert('Failed to delete cheque. Please try again.');
      }
    }
  };

  const handleStatusChange = async (chequeId: number, newStatus: string) => {
    try {
      await axiosInstance.put(`/api/updateStatus/${chequeId}`, {
        status: newStatus
      });
      await fetchCheques();
    } catch (error) {
      console.error('Error updating cheque status:', error);
      alert('Failed to update cheque status. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'deposited':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const filteredCheques = cheques.filter(cheque =>
    cheque.cheque_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cheque.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cheque.bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Cheques</h1>
        <button
          onClick={() => navigate('/cheque/create')}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Cheque
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search cheques..."
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
                  Cheque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cheque Date
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
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No cheques found. Create your first cheque to get started.
                  </td>
                </tr>
              ) : (
                filteredCheques.map((cheque) => {
                  const isNearDue = cheque.cheque_date && cheque.status === 'pending'
                    ? (() => {
                        const today = new Date();
                        const chequeDate = new Date(cheque.cheque_date);
                        const diffInTime = chequeDate.getTime() - today.getTime();
                        const diffInDays = diffInTime / (1000 * 3600 * 24);
                        return diffInDays == 0 || diffInDays <= 3;
                      })()
                    : false;

                  return (
                    <tr
                      key={cheque.id}
                      className={`hover:bg-gray-50 ${isNearDue ? 'bg-red-100' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Banknote className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {cheque.cheque_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{cheque.id} | Created on{' '}
                              {format(new Date(cheque.created_at), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cheque.bank_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cheque.branch_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cheque.payee_name || 'No payee'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cheque.cheque_date
                          ? format(new Date(cheque.cheque_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Rs. {cheque.amount?.toLocaleString() || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={cheque.status}
                          onChange={(e) => handleStatusChange(cheque.id, e.target.value)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusColor(
                            cheque.status
                          )}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="deposited">Deposited</option>
                          <option value="returned">Returned</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(cheque)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cheque.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}