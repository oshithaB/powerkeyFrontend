import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axiosInstance from '../../axiosInstance';
import { useCompany } from '../../contexts/CompanyContext';
import { motion } from 'framer-motion';

interface Payment {
    id: number;
    payment_amount: number;
    payment_date: string;
    payment_method: string;
    deposit_to: string;
    notes: string;
}

interface InvoiceEditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment;
    onPaymentUpdated: () => void;
}

const InvoiceEditPaymentModal: React.FC<InvoiceEditPaymentModalProps> = ({
    isOpen,
    onClose,
    payment,
    onPaymentUpdated,
}) => {
    const { selectedCompany } = useCompany();
    const [formData, setFormData] = useState<Payment>(payment);
    const [loading, setLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

    useEffect(() => {
        setFormData(payment);
    }, [payment]);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const response = await axiosInstance.get('/getPaymentMethods');
                const methods = response.data.map((method: { name: string }) => method.name);
                setPaymentMethods(methods);
            } catch (error) {
                console.error('Error fetching payment methods:', error);
            }
        };

        if (isOpen) {
            fetchPaymentMethods();
        }
    }, [isOpen]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany?.company_id) return;
        setLoading(true);

        try {
            await axiosInstance.put(
                `/updatePayment/${selectedCompany.company_id}/${formData.id}`,
                {
                    payment_amount: formData.payment_amount,
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    deposit_to: formData.deposit_to,
                    notes: formData.notes,
                }
            );
            onPaymentUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error updating payment:', error);
            alert(error.response?.data?.error || 'Failed to update payment');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
        >
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Edit Payment</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input
                            type="number"
                            name="payment_amount"
                            value={formData.payment_amount}
                            onChange={handleChange}
                            className="input w-full"
                            required
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            name="payment_date"
                            value={formData.payment_date ? new Date(formData.payment_date).toISOString().split('T')[0] : ''}
                            onChange={handleChange}
                            className="input w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                            name="payment_method"
                            value={formData.payment_method}
                            onChange={handleChange}
                            className="input w-full"
                            required
                        >
                            <option value="">Select Method</option>
                            {paymentMethods.map(method => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Deposit To)</label>
                        <input
                            type="text"
                            name="deposit_to"
                            value={formData.deposit_to || ''}
                            onChange={handleChange}
                            className="input w-full"
                            placeholder="e.g. Bank Account, Check #"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes || ''}
                            onChange={handleChange}
                            className="input w-full h-24 resize-none"
                            placeholder="Add notes..."
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

export default InvoiceEditPaymentModal;
