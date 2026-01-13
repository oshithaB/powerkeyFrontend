
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosInstance';
import { useCompany } from '../../contexts/CompanyContext';
import { X, Save, AlertTriangle } from 'lucide-react';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Initialize vfs
if (pdfFonts && (pdfFonts as any).pdfMake && (pdfFonts as any).pdfMake.vfs) {
    (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
} else if (pdfFonts && (pdfFonts as any).vfs) {
    (pdfMake as any).vfs = (pdfFonts as any).vfs;
} else {
    (pdfMake as any).vfs = pdfFonts;
}

interface RefundInvoiceProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any; // Using any for now to avoid strict type issues, but should match Invoice type
    onSuccess: () => void;
}

interface RefundItem {
    invoice_item_id: number;
    product_name: string;
    quantity_purchased: number;
    quantity_to_return: number;
    unit_price: number;
    refund_unit_price: number;
    selected: boolean;
}

const RefundInvoice: React.FC<RefundInvoiceProps> = ({ isOpen, onClose, invoice, onSuccess }) => {
    const { selectedCompany } = useCompany();
    const [items, setItems] = useState<RefundItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [refundMethod, setRefundMethod] = useState('Cash');
    const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen && invoice) {
            fetchInvoiceItems();
            setRefundReason('');
            setRefundMethod('Cash');
            setRefundDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, invoice]);

    const fetchInvoiceItems = async () => {
        if (!selectedCompany || !invoice) return;
        setLoading(true);
        try {
            const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getInvoiceItems/${selectedCompany.company_id}/${invoice.id}`);
            const fetchedItems = Array.isArray(response.data) ? response.data : [];

            const mappedItems = fetchedItems.map((item: any) => ({
                invoice_item_id: item.id,
                product_name: item.product_name || 'Unknown Item',
                quantity_purchased: Number(item.quantity) || 0,
                quantity_to_return: 0,
                unit_price: Number(item.unit_price) || 0, // Using unit_price (gross) as per request
                refund_unit_price: Number(item.unit_price) || 0,
                selected: false
            }));
            setItems(mappedItems);
        } catch (error) {
            console.error("Error fetching invoice items", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefundPriceChange = (index: number, value: string) => {
        const newItems = [...items];
        const val = Number(value);
        newItems[index].refund_unit_price = Math.max(0, val);
        setItems(newItems);
    };

    const handleQuantityChange = (index: number, value: string) => {
        const newItems = [...items];
        const val = Number(value);
        // Limit to purchased quantity
        const limit = newItems[index].quantity_purchased;
        newItems[index].quantity_to_return = Math.max(0, Math.min(val, limit));

        // Auto-select if quantity > 0
        if (newItems[index].quantity_to_return > 0) {
            newItems[index].selected = true;
        }

        setItems(newItems);
    };

    const toggleSelection = (index: number) => {
        const newItems = [...items];
        newItems[index].selected = !newItems[index].selected;
        if (!newItems[index].selected) {
            newItems[index].quantity_to_return = 0;
        } else if (newItems[index].quantity_to_return === 0) {
            newItems[index].quantity_to_return = 1; // Default to 1 when selecting
        }
        setItems(newItems);
    };

    const calculateTotalRefund = () => {
        return items.reduce((sum, item) => {
            if (item.selected) {
                return sum + (item.quantity_to_return * item.refund_unit_price);
            }
            return sum;
        }, 0);
    };

    const getImageDataUrl = async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error loading image:', error);
            return '';
        }
    };

    const generateRefundPDF = async (refundAmount: number, refundNumber: string) => {
        let logoDataUrl = '';
        if (selectedCompany?.company_logo) {
            logoDataUrl = await getImageDataUrl(`http://147.79.115.89:3000${selectedCompany.company_logo}`);
        }

        const itemsToRefund = items.filter(i => i.selected && i.quantity_to_return > 0);

        const docDefinition: any = {
            pageSize: 'A4',
            pageMargins: [35, 35, 35, 35],
            content: [
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'REFUND NOTICE', fontSize: 24, bold: true, color: '#9EDFE8', margin: [0, 0, 0, 4] },
                                { text: `Ref: ${refundNumber}`, fontSize: 14, bold: true, color: '#1f2937' } // Use returned refundNumber
                            ]
                        },
                        logoDataUrl ? {
                            image: logoDataUrl,
                            width: 100,
                            alignment: 'right'
                        } : { text: '', width: 100 }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        {
                            width: '48%',
                            stack: [
                                { text: 'REFUND TO', fontSize: 10, bold: true, color: '#1f2937', margin: [0, 0, 0, 6] },
                                { text: invoice.customer_name || 'Customer', fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
                                { text: `Date: ${refundDate}`, fontSize: 9, color: '#4b5563' }
                            ]
                        },
                        { width: '4%', text: '' },
                        {
                            width: '48%',
                            stack: [
                                { text: 'DETAILS', fontSize: 10, bold: true, alignment: 'right', margin: [0, 0, 0, 6] },
                                { text: `Original Invoice: ${invoice.invoice_number}`, fontSize: 9, alignment: 'right' },
                                { text: `Reason: ${refundReason || 'N/A'}`, fontSize: 9, alignment: 'right' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 50, 80, 80],
                        body: [
                            [
                                { text: 'Item', fontSize: 10, bold: true, fillColor: '#9EDFE8', margin: [4, 5, 4, 5] },
                                { text: 'Qty Returned', fontSize: 10, bold: true, fillColor: '#9EDFE8', alignment: 'center', margin: [4, 5, 4, 5] },
                                { text: 'Unit Price', fontSize: 10, bold: true, fillColor: '#9EDFE8', alignment: 'right', margin: [4, 5, 4, 5] },
                                { text: 'Total Refund', fontSize: 10, bold: true, fillColor: '#9EDFE8', alignment: 'right', margin: [4, 5, 4, 5] }
                            ],
                            ...itemsToRefund.map(item => [
                                { text: item.product_name, fontSize: 9, margin: [3, 4, 3, 4] },
                                { text: item.quantity_to_return.toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
                                { text: `Rs. ${item.refund_unit_price.toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [3, 4, 3, 4] },
                                { text: `Rs. ${(item.quantity_to_return * item.refund_unit_price).toFixed(2)}`, fontSize: 9, bold: true, alignment: 'right', margin: [3, 4, 3, 4] }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 'auto',
                            table: {
                                body: [
                                    [
                                        { text: 'Total Refund:', bold: true, fontSize: 12, margin: [0, 5, 10, 5] },
                                        { text: `Rs. ${refundAmount.toFixed(2)}`, bold: true, fontSize: 12, margin: [0, 5, 0, 5] }
                                    ]
                                ]
                            },
                            layout: 'noBorders'
                        }
                    ]
                }
            ],
            defaultStyle: {
                font: 'Roboto'
            }
        };

        pdfMake.createPdf(docDefinition).download(`Refund_${invoice.invoice_number}.pdf`);
    };

    const handleProcessRefund = async () => {
        if (!selectedCompany || !invoice) return;

        const refundItems = items
            .filter(i => i.selected && i.quantity_to_return > 0)
            .map(i => ({
                invoice_item_id: i.invoice_item_id,
                quantity_to_return: i.quantity_to_return,
                refund_unit_price: i.refund_unit_price
            }));

        if (refundItems.length === 0) {
            alert("Please select at least one item to refund.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                invoiceId: invoice.id,
                companyId: selectedCompany.company_id,
                date: refundDate,
                reason: refundReason,
                paymentMethod: refundMethod,
                refundItems: refundItems
            };

            const response = await axiosInstance.post(`http://147.79.115.89:3000/api/processRefund/${selectedCompany.company_id}`, payload);

            if (response.status === 200) {
                alert("Refund processed successfully!");
                const { refundNumber } = response.data;
                generateRefundPDF(calculateTotalRefund(), refundNumber);
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            console.error("Error processing refund", error);
            alert(error.response?.data?.error || "Failed to process refund. Ensure you are not returning more than purchased.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-900">Process Refund <span className="text-sm font-normal text-gray-500">for Invoice #{invoice?.invoice_number}</span></h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Refund Date</label>
                        <input
                            type="date"
                            className="input w-full"
                            value={refundDate}
                            onChange={(e) => setRefundDate(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                            className="input w-full"
                            value={refundMethod}
                            onChange={(e) => setRefundMethod(e.target.value)}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Return to Account">Return to Account</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="e.g. Defective item, Customer return"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading items...</div>
                ) : (
                    <div className="overflow-x-auto mb-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">Select</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Return Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4">No items found</td></tr>
                                ) : (
                                    items.map((item, index) => (
                                        <tr key={index} className={item.selected ? 'bg-blue-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    checked={item.selected}
                                                    onChange={() => toggleSelection(index)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.product_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity_purchased}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="input w-24 text-right py-1 h-8"
                                                    value={item.refund_unit_price}
                                                    onChange={(e) => handleRefundPriceChange(index, e.target.value)}
                                                    disabled={!item.selected}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity_purchased}
                                                    className="input w-20 text-center py-1 h-8"
                                                    value={item.quantity_to_return}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    disabled={!item.selected}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                                Rs. {(item.quantity_to_return * item.refund_unit_price).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end items-center space-x-4 border-t pt-4">
                    <div className="mr-auto">
                        <span className="text-lg font-bold text-gray-900">Total Refund: </span>
                        <span className="text-xl font-bold text-blue-600">Rs. {calculateTotalRefund().toFixed(2)}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProcessRefund}
                        disabled={submitting || calculateTotalRefund() <= 0}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center"
                    >
                        {submitting ? 'Processing...' : (
                            <>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Process Refund
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefundInvoice;
