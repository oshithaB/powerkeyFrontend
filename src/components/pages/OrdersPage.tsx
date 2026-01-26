import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Search, Edit, Trash2, FileText, Printer } from 'lucide-react';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = pdfFonts;

interface Order {
    id: number;
    supplier: string;
    employee_name: string;
    order_no: string;
    order_date: string;
    category: string;
    class: string;
    location: string;
    mailling_address: string;
    total_amount: number | null | string;
    status: string;
    company_id: number;
    created_at: string;
    bill_id: number | null;
    subtotal: number;
    tax_amount: number;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    discount_amount: number;
    shipping_cost: number;
    notes: string;
    terms: string;
    shipping_address?: string;
    ship_via?: string;
    email?: string;
}

interface OrderItem {
    id: number;
    order_id: number;
    name: string;
    sku: string;
    description: string;
    qty: number;
    rate: number;
    amount: number | null | string;
    class: string;
    closed: boolean;
    tax_rate: number;
    tax_amount: number;
}

export default function OrdersPage() {
    const { selectedCompany } = useCompany();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (selectedCompany) {
            fetchOrders();
            fetchOrderItems();
        }
    }, [selectedCompany]);

    const fetchOrders = async () => {
        try {
            const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getOrders/${selectedCompany?.company_id}`);
            const parsedOrders = response.data.map((order: Order) => ({
                ...order,
                total_amount: order.total_amount != null ? parseFloat(order.total_amount.toString()) : null,
                bill_id: order.bill_id || null,
                subtotal: Number(order.subtotal) || 0,
                tax_amount: Number(order.tax_amount) || 0,
                discount_type: order.discount_type || 'fixed',
                discount_value: Number(order.discount_value) || 0,
                discount_amount: Number(order.discount_amount) || 0,
                shipping_cost: Number(order.shipping_cost) || 0,
                notes: order.notes || '',
                terms: order.terms || '',
            }));
            setOrders(parsedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderItems = async () => {
        try {
            const response = await axiosInstance.get(`http://147.79.115.89:3000/api/order-items/${selectedCompany?.company_id}`);
            setOrderItems(response.data);
        } catch (error) {
            console.error('Error fetching order items:', error);
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

    const handleDownloadPDF = async (order: Order) => {
        const orderSpecificItems = orderItems.filter(item => item.order_id === order.id);
        const ITEMS_PER_PAGE = 20;

        let logoDataUrl = '';
        if (selectedCompany?.company_logo) {
            logoDataUrl = await getImageDataUrl(`http://147.79.115.89:3000${selectedCompany.company_logo}`);
        }

        const formatDate = (isoDate: string | Date | null | undefined) => {
            if (!isoDate) return '';
            const date = new Date(isoDate);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        };

        const createHeader = (isFirstPage: boolean) => {
            if (isFirstPage) {
                return [
                    {
                        columns: [
                            {
                                width: '*',
                                stack: [
                                    { text: 'PURCHASE ORDER', fontSize: 28, bold: true, color: '#2563eb', margin: [0, 0, 0, 4] },
                                    { text: order.order_no, fontSize: 16, bold: true, color: '#1f2937' }
                                ]
                            },
                            logoDataUrl ? {
                                image: logoDataUrl,
                                width: 110,
                                alignment: 'right'
                            } : { text: '', width: 110 }
                        ],
                        margin: [0, 0, 0, 15]
                    },
                    {
                        columns: [
                            {
                                width: '48%',
                                stack: [
                                    { text: 'VENDOR', fontSize: 10, bold: true, color: '#1f2937', margin: [0, 0, 0, 6] },
                                    { text: order.supplier || 'Unknown Vendor', fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
                                    { text: order.mailling_address || 'N/A', fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                                    { text: order.email || '', fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                                ]
                            },
                            {
                                width: '4%',
                                text: ''
                            },
                            {
                                width: '48%',
                                stack: [
                                    { text: 'ORDER DETAILS', fontSize: 10, bold: true, color: '#1f2937', alignment: 'right', margin: [0, 0, 0, 6] },
                                    {
                                        table: {
                                            widths: ['*', 'auto'],
                                            body: [
                                                [
                                                    { text: 'Order Date:', fontSize: 9, bold: true, border: [false, false, false, false] },
                                                    { text: formatDate(order.order_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                                                ],
                                                [
                                                    { text: 'Ship Via:', fontSize: 9, bold: true, border: [false, false, false, false] },
                                                    { text: order.ship_via || 'N/A', fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                                                ],
                                                [
                                                    { text: 'Status:', fontSize: 9, bold: true, border: [false, false, false, false] },
                                                    {
                                                        text: order.status.toUpperCase(),
                                                        fontSize: 9,
                                                        bold: true,
                                                        alignment: 'right',
                                                        color: order.status === 'open' ? '#059669' : '#6b7280',
                                                        border: [false, false, false, false]
                                                    }
                                                ],
                                            ]
                                        },
                                        layout: 'noBorders'
                                    }
                                ]
                            }
                        ],
                        margin: [0, 0, 0, 15]
                    },
                    order.shipping_address ? {
                        columns: [
                            {
                                width: '48%',
                                stack: [
                                    { text: 'SHIP TO', fontSize: 10, bold: true, color: '#1f2937', margin: [0, 10, 0, 4] },
                                    { text: order.shipping_address, fontSize: 9, color: '#4b5563' }
                                ]
                            }
                        ]
                    } : null,
                    { text: '', margin: [0, 0, 0, 10] }
                ].filter(Boolean);
            } else {
                return [
                    {
                        text: `Purchase Order ${order.order_no} - Continued`,
                        fontSize: 14,
                        bold: true,
                        color: '#6b7280',
                        margin: [0, 0, 0, 12]
                    }
                ];
            }
        };

        const createItemsTable = (items: OrderItem[], startIndex: number) => {
            const tableBody: any[][] = [
                [
                    { text: '#', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', margin: [4, 5, 4, 5] },
                    { text: 'Item', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', margin: [4, 5, 4, 5] },
                    { text: 'Description', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', margin: [4, 5, 4, 5] },
                    { text: 'Qty', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'center', margin: [4, 5, 4, 5] },
                    { text: 'Rate', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [4, 5, 4, 5] },
                    { text: 'Amount', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [4, 5, 4, 5] }
                ]
            ];

            items.forEach((item, index) => {
                tableBody.push([
                    { text: (startIndex + index + 1).toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
                    { text: item.name || 'N/A', fontSize: 9, margin: [3, 4, 3, 4] },
                    { text: item.description || '-', fontSize: 8.5, color: '#4b5563', margin: [3, 4, 3, 4] },
                    { text: item.qty.toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
                    { text: `Rs. ${Number(item.rate || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [3, 4, 3, 4] },
                    { text: `Rs. ${Number(item.amount || 0).toFixed(2)}`, fontSize: 9, bold: true, alignment: 'right', margin: [3, 4, 3, 4] }
                ]);
            });

            return {
                table: {
                    headerRows: 1,
                    widths: [30, 'auto', '*', 35, 65, 75],
                    body: tableBody
                },
                layout: {
                    hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.5,
                    vLineWidth: () => 0,
                    hLineColor: (i: number) => (i === 0 || i === 1) ? '#1f2937' : '#e5e7eb',
                    paddingLeft: () => 0,
                    paddingRight: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0
                },
                margin: [0, 0, 0, 12]
            };
        };

        const createSummarySection = () => {
            // Recalculate totals similarly to EditPage to ensure accuracy
            const subtotal = orderSpecificItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0);
            const taxTotal = orderSpecificItems.reduce((sum, item) => sum + ((Number(item.qty) * Number(item.rate) * (Number(item.tax_rate) || 0)) / 100), 0);

            let discountAmount = 0;
            if (order.discount_type === 'percentage') {
                discountAmount = (subtotal * (order.discount_value || 0)) / 100;
            } else {
                discountAmount = Number(order.discount_value) || 0;
            }

            const shipping = Number(order.shipping_cost) || 0;
            const total = subtotal + taxTotal + shipping - discountAmount;

            return {
                columns: [
                    {
                        width: '55%',
                        text: ''
                    },
                    {
                        width: '45%',
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [
                                    { text: 'Subtotal:', fontSize: 10, bold: true, alignment: 'right', margin: [0, 2, 10, 2] },
                                    { text: `Rs. ${subtotal.toFixed(2)}`, fontSize: 10, alignment: 'right', margin: [0, 2, 0, 2] }
                                ],
                                [
                                    { text: 'Discount:', fontSize: 10, bold: true, alignment: 'right', margin: [0, 2, 10, 2] },
                                    { text: `- Rs. ${discountAmount.toFixed(2)}`, fontSize: 10, alignment: 'right', color: '#dc2626', margin: [0, 2, 0, 2] }
                                ],
                                [
                                    { text: 'Shipping:', fontSize: 10, bold: true, alignment: 'right', margin: [0, 2, 10, 2] },
                                    { text: `Rs. ${shipping.toFixed(2)}`, fontSize: 10, alignment: 'right', margin: [0, 2, 0, 2] }
                                ],
                                [
                                    { text: 'Tax:', fontSize: 10, bold: true, alignment: 'right', margin: [0, 2, 10, 2] },
                                    { text: `Rs. ${taxTotal.toFixed(2)}`, fontSize: 10, alignment: 'right', margin: [0, 2, 0, 2] }
                                ],
                                [
                                    { text: 'TOTAL:', fontSize: 12, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [0, 6, 10, 6] },
                                    { text: `Rs. ${total.toFixed(2)}`, fontSize: 12, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [0, 6, 0, 6] }
                                ]
                            ]
                        },
                        layout: {
                            paddingLeft: () => 10,
                            paddingRight: () => 10,
                            paddingTop: () => 2,
                            paddingBottom: () => 2
                        }
                    }
                ],
                margin: [0, 0, 0, 18]
            };
        };

        const createSignatureSection = () => ({
            columns: [
                { width: '48%', text: '' },
                { width: '4%', text: '' },
                {
                    width: '48%',
                    stack: [
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#9ca3af' }], margin: [0, 0, 0, 4] },
                        { text: 'Authorized Signature', fontSize: 8, color: '#6b7280', alignment: 'center', margin: [0, 0, 0, 8] },
                    ]
                }
            ]
        });

        const content: any[] = [];
        const totalPages = Math.ceil(orderSpecificItems.length / ITEMS_PER_PAGE);

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const isFirstPage = pageIndex === 0;
            const isLastPage = pageIndex === totalPages - 1;
            const startIndex = pageIndex * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, orderSpecificItems.length);
            const pageItems = orderSpecificItems.slice(startIndex, endIndex);

            const headerContent = createHeader(isFirstPage);
            headerContent.forEach(item => content.push(item));

            content.push(createItemsTable(pageItems, startIndex));

            if (isLastPage) {
                content.push(createSummarySection());
                content.push(createSignatureSection());
            }

            if (!isLastPage) {
                content.push({ text: '', pageBreak: 'after' });
            }
        }

        const docDefinition: any = {
            pageSize: 'A4',
            pageMargins: [35, 35, 35, 55],
            footer: (currentPage: number, pageCount: number) => ({
                columns: [
                    {
                        text: selectedCompany?.name || 'Company Name',
                        fontSize: 8,
                        color: '#9ca3af',
                        margin: [35, 10, 0, 0]
                    },
                    {
                        text: `Page ${currentPage} of ${pageCount}`,
                        alignment: 'right',
                        fontSize: 8,
                        color: '#9ca3af',
                        margin: [0, 10, 35, 0]
                    }
                ]
            }),
            content: content,
            defaultStyle: {
                font: 'Roboto'
            }
        };

        try {
            pdfMake.createPdf(docDefinition).download(`PurchaseOrder_${order.order_no}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            try {
                await axiosInstance.delete(`http://147.79.115.89:3000/api/orders/${selectedCompany?.company_id}/${id}`);
                fetchOrders();
            } catch (error: any) {
                console.error('Error deleting order:', error);
                alert(error.response?.data?.message || 'Failed to delete order');
            }
        }
    };

    const filteredOrders = orders.filter(order =>
        order.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'opened':
                return 'bg-gray-100 text-gray-800';
            case 'closed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                    type="text"
                    placeholder="Search orders..."
                    className="input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Orders Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Supplier
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Order No.
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Order Date
                                </th>
                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th> */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Class
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Amount
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
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {order.supplier || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {order.order_no || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {order.order_date || '-'}
                                    </td>
                                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {order.category || '-'}
                                    </td> */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {order.employee_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {order.mailling_address || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {order.total_amount != null && !isNaN(Number(order.total_amount)) ? `Rs. ${Number(order.total_amount).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => navigate(`/purchase-orders/edit/${order.id}`)}
                                                className="text-primary-600 hover:text-primary-900"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(order)}
                                                className="text-gray-600 hover:text-gray-900"
                                                title="Download PDF"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </button>
                                            {/* Delete button removed as per user request */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}