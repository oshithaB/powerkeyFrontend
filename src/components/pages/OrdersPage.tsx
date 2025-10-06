import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Search, Edit, Trash2, FileText } from 'lucide-react';

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
  received: boolean;
  closed: boolean;
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
            const response = await axiosInstance.get(`/api/getOrders/${selectedCompany?.company_id}`);
            const parsedOrders = response.data.map((order: Order) => ({
                ...order,
                total_amount: order.total_amount != null ? parseFloat(order.total_amount.toString()) : null,
                bill_id: order.bill_id || null,
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
            const response = await axiosInstance.get(`/api/order-items/${selectedCompany?.company_id}`);
            setOrderItems(response.data);
        } catch (error) {
            console.error('Error fetching order items:', error);
        }
    };

    const handleConvertToBill = (order: Order) => {
        if (window.confirm("Convert this purchase to a bill?")) {
            navigate("/bill/create", { state: { orderId: order.id } });
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            try {
                await axiosInstance.delete(`/api/orders/${selectedCompany?.company_id}/${id}`);
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
                                        {order.status === 'closed' && (
                                        <button
                                            onClick={() => handleConvertToBill(order)}
                                            className={`text-green-600 hover:text-green-900 ${order.bill_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={order.bill_id ? 'Already converted to a bill' : 'Convert to Bill'}
                                            disabled={!!order.bill_id}
                                        >
                                            <FileText className="h-4 w-4" />
                                        </button>
                                        )}
                                        <button
                                        onClick={() => handleDelete(order.id)}
                                        className="text-red-600 hover:text-red-900"
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
    );
}