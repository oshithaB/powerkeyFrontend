import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';

interface Product {
    id: number;
    name: string;
    sku: string;
    quantity_on_hand: number;
}

interface ManualStockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: Product | null;
}

export default function ManualStockAdjustmentModal({
    isOpen,
    onClose,
    onSuccess,
    product
}: ManualStockAdjustmentModalProps) {
    const { selectedCompany } = useCompany();
    const [newQuantity, setNewQuantity] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [isDirectCorrection, setIsDirectCorrection] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (product) {
            setNewQuantity(product.quantity_on_hand.toString());
            setReason('Manual Adjustment');
            setIsDirectCorrection(false);
            setError(null);
        }
    }, [product]);

    useEffect(() => {
        if (isDirectCorrection) {
            setReason('Direct Correction');
        } else {
            setReason('Manual Adjustment');
        }
    }, [isDirectCorrection]);

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;

        const qty = parseInt(newQuantity);
        if (isNaN(qty) || qty < 0) {
            setError('Please enter a valid non-negative quantity');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await axiosInstance.put(
                `http://147.79.115.89:3000/api/adjust-stock/${selectedCompany.company_id}/${product.id}`,
                {
                    new_quantity: qty,
                    reason: reason
                }
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error adjusting stock:', err);
            setError(err.response?.data?.message || 'Failed to adjust stock');
        } finally {
            setLoading(false);
        }
    };

    const currentQty = product.quantity_on_hand;
    const newQty = parseInt(newQuantity) || 0;
    const diff = newQty - currentQty;
    const isSurplus = diff > 0;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                            <button
                                type="button"
                                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                onClick={onClose}
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                                    Manual Stock Adjustment
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                    <p>Product: <span className="font-medium text-gray-900">{product.name}</span> ({product.sku})</p>
                                    <p>Current Stock: <span className="font-medium text-gray-900">{product.quantity_on_hand}</span></p>
                                </div>

                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    {error && (
                                        <div className="rounded-md bg-red-50 p-4">
                                            <div className="flex">
                                                <AlertCircle className="h-5 w-5 text-red-400" />
                                                <div className="ml-3 text-sm text-red-700">{error}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="quantity" className="block text-sm font-medium leading-6 text-gray-900">
                                            New Quantity
                                        </label>
                                        <div className="mt-2">
                                            <input
                                                type="number"
                                                name="quantity"
                                                id="quantity"
                                                required
                                                min="0"
                                                value={newQuantity}
                                                onChange={(e) => setNewQuantity(e.target.value)}
                                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                                            />
                                        </div>
                                        {newQuantity !== '' && (
                                            <p className={`mt-2 text-sm ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Adjustment: {diff > 0 ? '+' : ''}{diff} ({isSurplus ? 'Surplus' : 'Reduction'})
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2 py-2">
                                        <input
                                            type="checkbox"
                                            id="directCorrection"
                                            checked={isDirectCorrection}
                                            onChange={(e) => setIsDirectCorrection(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                                        />
                                        <label htmlFor="directCorrection" className="text-sm font-medium text-gray-900 cursor-pointer">
                                            Direct Correction <span className="text-xs text-gray-500 font-normal">(Exclude from inventory shrinkage)</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label htmlFor="reason" className="block text-sm font-medium leading-6 text-gray-900">
                                            Reason
                                        </label>
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                name="reason"
                                                id="reason"
                                                required
                                                disabled={isDirectCorrection}
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="e.g. Manual Adjustment, Damaged Goods"
                                                className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 ${isDirectCorrection ? 'bg-gray-100 italic' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:col-start-2 disabled:opacity-50"
                                        >
                                            {loading ? 'Adjusting...' : 'Adjust Stock'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
