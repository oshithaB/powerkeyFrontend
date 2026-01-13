
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosInstance';
import { useCompany } from '../../contexts/CompanyContext';
import { X, Download, Clock } from 'lucide-react';
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

interface RefundHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
}

const RefundHistory: React.FC<RefundHistoryProps> = ({ isOpen, onClose, invoice }) => {
    const { selectedCompany } = useCompany();
    const [refunds, setRefunds] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && invoice) {
            fetchRefunds();
        }
    }, [isOpen, invoice]);

    const fetchRefunds = async () => {
        if (!selectedCompany || !invoice) return;
        setLoading(true);
        try {
            const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getInvoiceRefunds/${selectedCompany.company_id}/${invoice.id}`);
            setRefunds(response.data || []);
        } catch (error) {
            console.error("Error fetching refunds", error);
        } finally {
            setLoading(false);
        }
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

    const generateRefundPDF = async (refund: any) => {
        let logoDataUrl = '';
        if (selectedCompany?.company_logo) {
            logoDataUrl = await getImageDataUrl(`http://147.79.115.89:3000${selectedCompany.company_logo}`);
        }

        const items = refund.items || [];

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
                                { text: `Ref: ${refund.refund_number}`, fontSize: 14, bold: true, color: '#1f2937' }
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
                                { text: `Date: ${refund.refund_date}`, fontSize: 9, color: '#4b5563' }
                            ]
                        },
                        { width: '4%', text: '' },
                        {
                            width: '48%',
                            stack: [
                                { text: 'DETAILS', fontSize: 10, bold: true, alignment: 'right', margin: [0, 0, 0, 6] },
                                { text: `Original Invoice: ${invoice.invoice_number}`, fontSize: 9, alignment: 'right' },
                                { text: `Reason: ${refund.reason || 'N/A'}`, fontSize: 9, alignment: 'right' }
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
                            ...items.map((item: any) => [
                                { text: item.product_name, fontSize: 9, margin: [3, 4, 3, 4] },
                                { text: item.quantity.toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
                                { text: `Rs. ${Number(item.unit_price).toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [3, 4, 3, 4] },
                                { text: `Rs. ${Number(item.total_price).toFixed(2)}`, fontSize: 9, bold: true, alignment: 'right', margin: [3, 4, 3, 4] }
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
                                        { text: `Rs. ${Number(refund.total_amount).toFixed(2)}`, bold: true, fontSize: 12, margin: [0, 5, 0, 5] }
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

        pdfMake.createPdf(docDefinition).download(`Refund_${refund.refund_number}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <Clock className="h-6 w-6 mr-2 text-blue-600" />
                        Refund History
                        <span className="text-sm font-normal text-gray-500 ml-2">for Invoice #{invoice?.invoice_number}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading refunds...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {refunds.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-6 text-gray-500">No refunds found for this invoice.</td></tr>
                                ) : (
                                    refunds.map((refund, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{refund.refund_number}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refund.refund_date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refund.reason || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">Rs. {Number(refund.total_amount).toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => generateRefundPDF(refund)}
                                                    className="text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
                                                    title="Download PDF"
                                                >
                                                    <Download className="h-4 w-4 mr-1" />
                                                    PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end mt-4 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefundHistory;
