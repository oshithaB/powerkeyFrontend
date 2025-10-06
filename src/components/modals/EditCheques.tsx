import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';

interface Cheque {
  id: number;
  cheque_number: string;
  bank_name: string | null;
  branch_name: string | null;
  cheque_date: string | null;
  payee_name: string | null;
  amount: number;
}

export default function EditCheques() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedCompany } = useCompany();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cheque_number: '',
    bank_name: '',
    branch_name: '',
    cheque_date: '',
    payee_name: '',
    amount: ''
  });

  useEffect(() => {
    const fetchCheque = async () => {
      if (!id || isNaN(parseInt(id))) {
        console.error('Invalid cheque ID:', id);
        setError('Invalid cheque ID');
        return;
      }

      if (!selectedCompany?.company_id) {
        console.error('No company selected');
        setError('No company selected. Please select a company first.');
        return;
      }

      try {
        setLoading(true);
        const response = await axiosInstance.get(`/api/getChequeByID/${id}/${selectedCompany.company_id}`);
        const cheque = response.data;
        console.log('Fetched cheque:', cheque);

        if (!cheque) {
          console.error('Cheque not found for ID:', id);
          setError('Cheque not found');
          return;
        }

        setFormData({
          cheque_number: cheque.cheque_number || '',
          bank_name: cheque.bank_name || '',
          branch_name: cheque.branch_name || '',
          cheque_date: cheque.cheque_date ? cheque.cheque_date.split('T')[0] : '',
          payee_name: cheque.payee_name || '',
          amount: cheque.amount ? cheque.amount.toString() : ''
        });
      } catch (err: any) {
        console.error('Error fetching cheque:', err.response || err);
        if (err.response?.status === 404) {
          setError('Cheque not found');
        } else if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
          navigate('/login');
        } else {
          setError(err.response?.data?.error || 'Failed to load cheque details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCheque();
  }, [id, selectedCompany, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!selectedCompany) {
        setError('No company selected. Please select a company first.');
        setLoading(false);
        return;
      }

      if (!id || isNaN(parseInt(id))) {
        setError('Invalid cheque ID');
        setLoading(false);
        return;
      }

      const payload = {
        cheque_number: formData.cheque_number,
        bank_name: formData.bank_name || null,
        branch_name: formData.branch_name || null,
        cheque_date: formData.cheque_date || null,
        payee_name: formData.payee_name || null,
        amount: parseFloat(formData.amount)
      };

      const response = await axiosInstance.put(`/api/updateCheque/${id}`, payload);
      console.log('Update response:', response.data);

      setSuccess('Cheque updated successfully!');
      
      setTimeout(() => {
        navigate('/dashboard/cheques');
      }, 2000);
    } catch (err: any) {
      console.error('Error updating cheque:', err.response || err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to update cheque');
      }
    } finally {
      setLoading(false);
    }
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
            <h3 className="text-lg font-medium text-gray-900">Edit Cheque</h3>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          )}

          {!loading && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    className="input w-full border rounded-md p-2"
                    placeholder="Enter cheque number"
                    value={formData.cheque_number}
                    onChange={handleInputChange}
                    name="cheque_number"
                    required
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    className="input w-full border rounded-md p-2"
                    placeholder="Enter bank name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    className="input w-full border rounded-md p-2"
                    placeholder="Enter branch name"
                    value={formData.branch_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    name="cheque_date"
                    className="input w-full border rounded-md p-2"
                    value={formData.cheque_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payee Name
                  </label>
                  <input
                    type="text"
                    name="payee_name"
                    className="input w-full border rounded-md p-2"
                    placeholder="Enter payee name"
                    value={formData.payee_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    className="input w-full border rounded-md p-2"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn btn-secondary btn-md"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-md"
                >
                  {loading ? 'Updating...' : 'Update Cheque'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}