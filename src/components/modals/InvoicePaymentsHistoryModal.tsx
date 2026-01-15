import React, { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosInstance from '../../axiosInstance';
import { useCompany } from '../../contexts/CompanyContext';
import InvoiceEditPaymentModal from './InvoiceEditPaymentModal';

interface InvoicePaymentsHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    onPaymentsUpdated: () => void;
}

const InvoicePaymentsHistoryModal: React.FC<InvoicePaymentsHistoryModalProps> = ({
    isOpen,
    onClose,
    invoice,
    onPaymentsUpdated,
}) => {
    const { selectedCompany } = useCompany();
    const [payments, setPayments] = useState<any[]>([]);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
    const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchPayments = async () => {
        if (!selectedCompany?.company_id || !invoice?.id) return;
        setLoading(true);
        try {
            const response = await axiosInstance.get(`/getInvoicePayments/${selectedCompany.company_id}/${invoice.id}`);
            setPayments(response.data);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPayments();
        }
    }, [isOpen, invoice]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
        >
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Payment History for #{invoice?.invoice_number}</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading payments...</td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payments found for this invoice.</td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm">{new Date(payment.payment_date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-sm font-medium">Rs. {Number(payment.payment_amount).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-sm">{payment.payment_method}</td>
                                        <td className="px-4 py-2 text-sm">{payment.deposit_to}</td>
                                        <td className="px-4 py-2 text-sm max-w-xs truncate" title={payment.notes}>{payment.notes || '-'}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <button
                                                type="button"
                                                className="text-primary-600 hover:text-primary-800 font-medium inline-flex items-center"
                                                onClick={() => {
                                                    setSelectedPaymentToEdit(payment);
                                                    setIsEditPaymentModalOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Close
                    </button>
                </div>
            </div>

            {selectedPaymentToEdit && (
                <InvoiceEditPaymentModal
                    isOpen={isEditPaymentModalOpen}
                    onClose={() => {
                        setIsEditPaymentModalOpen(false);
                        setSelectedPaymentToEdit(null);
                    }}
                    payment={selectedPaymentToEdit}
                    onPaymentUpdated={() => {
                        fetchPayments();
                        onPaymentsUpdated();
                    }}
                />
            )}
        </motion.div>
    );
};

export default InvoicePaymentsHistoryModal;
