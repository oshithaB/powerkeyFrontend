import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Plus, Trash2, Printer } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = pdfFonts;

interface Order {
  id: number;
  company_id: number;
  vendor_id: number | null;
  mailling_address?: string;
  email?: string;
  order_no: string;
  order_date: string;
  category: string;
  class: number | null;
  customer_id: number | null;
  shipping_address?: string;
  location: string;
  ship_via?: string;
  total_amount: number | null | string;
  status: string;
  prev_status?: string;
  created_at: string;
}

interface OrderItem {
  id: number | string;
  order_id: number;
  product_id: number | null;
  name: string;
  sku: string;
  description: string;
  qty: number;
  rate: number;
  amount: number | null | string;
  class: string;
  received: boolean;
  closed: boolean;
  isEditing?: boolean;
}

interface Vendor {
  vendor_id: number;
  name: string;
  address: string;
}

interface Employee {
  id: number;
  name: string;
}

export default function EditOrdersPage() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { selectedCompany } = useCompany();
  const [order, setOrder] = useState<Order>({
    id: 0,
    company_id: selectedCompany?.company_id || 0,
    vendor_id: null,
    mailling_address: '',
    email: '',
    customer_id: null,
    shipping_address: '',
    order_no: '',
    order_date: new Date().toISOString().split('T')[0],
    category: '',
    class: null,
    location: '',
    ship_via: '',
    total_amount: null,
    status: 'open',
    created_at: new Date().toISOString(),
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState('');
  const [vendorSuggestions, setVendorSuggestions] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany || !orderId) {
        console.error('Missing selectedCompany or orderId');
        setLoading(false);
        alert('Invalid company or order ID');
        console.log("company ID:", selectedCompany?.company_id, "orderId:", orderId);
        return;
      }

      try {
        setLoading(true);
        await Promise.all([
          fetchOrderDetails(),
          fetchOrderItems(),
          fetchVendors(),
          fetchEmployees(),
          fetchProducts(),
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load order data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCompany, orderId]);

  useEffect(() => {
    if (vendorFilter) {
      const filteredVendors = vendors.filter((vendor) =>
        vendor.name.toLowerCase().includes(vendorFilter.toLowerCase())
      );
      setVendorSuggestions(filteredVendors);
    } else {
      setVendorSuggestions([]);
    }
  }, [vendorFilter, vendors]);

  useEffect(() => {
    if (activeSuggestionIndex !== null) {
      const activeItem = orderItems[activeSuggestionIndex];
      if (activeItem?.name) {
        const filteredSuggestions = products.filter(product =>
          product.name.toLowerCase().includes(activeItem.name.toLowerCase())
        );
        setProductSuggestions(filteredSuggestions);
      } else {
        setProductSuggestions(products);
      }
    } else {
      setProductSuggestions([]);
    }
  }, [orderItems, products, activeSuggestionIndex]);

  const fetchOrderDetails = async () => {
    try {
      if (!selectedCompany) {
        throw new Error('Selected company is not available');
      }
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/orders/${selectedCompany.company_id}/${orderId}`);
      const orderData = response.data;
      setOrder({
        ...orderData,
        order_date: orderData.order_date ? orderData.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
        category: orderData.category || '',
        prev_status: orderData.status || 'open',
      });
      if (orderData.supplier) {
        setVendorFilter(orderData.supplier);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error; // Let the parent catch handle the error
    }
  };

  const fetchOrderItems = async () => {
    try {
      if (!selectedCompany) {
        throw new Error('Selected company is not available');
      }
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/order-items/${selectedCompany.company_id}`);
      const allOrderItems = response.data;
      const currentOrderItems = allOrderItems.filter((item: OrderItem) => item.order_id === parseInt(orderId ?? '0'));
      setOrderItems(currentOrderItems);
    } catch (error) {
      console.error('Error fetching order items:', error);
      throw error;
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getProducts/${selectedCompany?.company_id}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getVendors/${selectedCompany?.company_id}`);
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'vendor_id') {
      const selectedVendor = vendors.find(vendor => vendor.vendor_id === Number(value));
      setOrder((prev) => ({
        ...prev,
        vendor_id: value === '' ? null : Number(value),
        mailling_address: selectedVendor ? selectedVendor.address : '',
      }));
    } else {
      setOrder((prev) => ({
        ...prev,
        [name]: value === '' ? null : value,
      }));
    }
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: `temp_${Date.now()}`,
      order_id: order.id,
      product_id: null,
      name: '',
      sku: '',
      description: '',
      qty: 0,
      rate: 0,
      amount: 0,
      class: '',
      received: false,
      closed: false,
      isEditing: true,
    };
    setOrderItems([...orderItems, newItem]);
    setProductSuggestions(products);
  };

  const updateItem = (id: number | string, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems];
    const index = updatedItems.findIndex(item => item.id === id);
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index].name = product.name;
        updatedItems[index].sku = product.sku || '';
        updatedItems[index].description = product.description || '';
        updatedItems[index].rate = product.cost_price || 0;
        updatedItems[index].product_id = product.id;
      }
    }

    if (field === 'qty' || field === 'rate') {
      const item = updatedItems[index];
      item.amount = Number((item.qty * item.rate).toFixed(2));
    }

    setOrderItems(updatedItems);
  };

  const removeItem = (id: number | string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return Number(orderItems.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderData = {
        ...order,
        total_amount: calculateTotal(),
        company_id: selectedCompany?.company_id,
        items: orderItems,
      };

      // Update the order
      await axiosInstance.put(`http://147.79.115.89:3000/api/orders/${selectedCompany?.company_id}/${orderId}`, orderData);

      // Delete existing order items and create new ones
      // await axiosInstance.delete(`http://147.79.115.89:3000/api/order-items/${selectedCompany?.company_id}/${orderId}`);

      // for (const item of orderItems) {
      //   await axiosInstance.post(`http://147.79.115.89:3000/api/order-items/${selectedCompany?.company_id}`, {
      //     ...item,
      //     order_id: parseInt(orderId!),
      //   });
      // }

      navigate('/dashboard/purchases');
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert(error.response?.data?.message || 'Failed to update order');
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

  const handleDownloadPDF = async () => {
    if (!order) return;

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

    const vendor = vendors.find(v => v.vendor_id === order.vendor_id);
    const vendorName = vendor ? vendor.name : 'Unknown Vendor';


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
                  { text: vendorName, fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
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
          // Shipping address if available
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

    const createSummarySection = () => ({
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
                { text: 'TOTAL:', fontSize: 11, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [0, 6, 10, 6] },
                { text: `Rs. ${calculateTotal().toFixed(2)}`, fontSize: 11, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [0, 6, 0, 6] }
              ]
            ]
          },
          layout: {
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 0,
            paddingBottom: () => 0
          }
        }
      ],
      margin: [0, 0, 0, 18]
    });
    const createSignatureSection = () => ({
      columns: [
        {
          width: '48%',
          text: ''
        },
        {
          width: '4%',
          text: ''
        },
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

    const totalPages = Math.ceil(orderItems.length / ITEMS_PER_PAGE);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, orderItems.length);
      const pageItems = orderItems.slice(startIndex, endIndex);

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
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.download(`PurchaseOrder_${order.order_no}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-6">
        <div className="relative top-4 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Purchase Order</h3>
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Number</label>
                <input
                  type="text"
                  name="order_no"
                  value={order.order_no}
                  className="input"
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Date</label>
                <input
                  type="date"
                  name="order_date"
                  value={order.order_date}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <div className="relative">
                  <select
                    className="input"
                    name="vendor_id"
                    value={order.vendor_id || ''}
                    disabled={order.prev_status === 'closed'}
                    onChange={(e) => {
                      const selectedVendor = vendors.find(vendor => vendor.vendor_id === Number(e.target.value));
                      setOrder({
                        ...order,
                        vendor_id: e.target.value === '' ? null : Number(e.target.value),
                        mailling_address: selectedVendor ? selectedVendor.address || '' : '',
                      });
                      setVendorFilter(selectedVendor ? selectedVendor.name : '');
                    }}
                  >
                    <option value="" disabled>Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.vendor_id} value={vendor.vendor_id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mailing Address</label>
                <input
                  type="text"
                  name="mailling_address"
                  value={order.mailling_address || ''}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                  placeholder="Enter mailing address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={order.email || ''}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category"
                  value={order.category || ''}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                >
                  <option value="">Select Category</option>
                  <option value="cost_of_sales">Cost of Sales</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Class</label>
                <select
                  name="class"
                  value={order.class || ''}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Order Status</label>
                <select
                  name="status"
                  value={order.status}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ship Via</label>
                <input
                  type="text"
                  name="ship_via"
                  value={order.ship_via || ''}
                  onChange={handleOrderChange}
                  className="input"
                  disabled={order.prev_status === 'closed'}
                  placeholder="Enter shipping method"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Order Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-primary btn-sm"
                  disabled={order.prev_status === 'closed'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={item.name}
                                  disabled={order.prev_status === 'closed'}
                                  onChange={(e) => {
                                    updateItem(item.id, 'name', e.target.value);
                                    setActiveSuggestionIndex(index);
                                  }}
                                  onFocus={() => {
                                    setActiveSuggestionIndex(index);
                                    const filtered = products.filter(product =>
                                      product.name.toLowerCase().includes(item.name?.toLowerCase() || '')
                                    );
                                    setProductSuggestions(filtered.length > 0 ? filtered : products);
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (activeSuggestionIndex === index) {
                                        setProductSuggestions([]);
                                        setActiveSuggestionIndex(null);
                                      }
                                    }, 200);
                                  }}
                                  className="border rounded px-2 py-2 w-full"
                                  placeholder="Search product"
                                  required
                                />
                                {activeSuggestionIndex === index && productSuggestions.length > 0 && (
                                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                                    {productSuggestions.map(product => (
                                      <li
                                        key={product.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                        onMouseDown={() => {
                                          updateItem(item.id, 'product_id', product.id);
                                          setProductSuggestions([]);
                                          setActiveSuggestionIndex(null);
                                        }}
                                      >
                                        {product.image && (
                                          <img
                                            src={`http://147.79.115.89:3000${product.image}`}
                                            alt={product.name}
                                            className="w-8 h-8 object-cover mr-2 rounded"
                                          />
                                        )}
                                        <span>{product.name}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <div
                                onClick={() => updateItem(item.id, 'isEditing', true)}
                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                              >
                                {item.name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="text"
                                name="sku"
                                value={item.sku}
                                onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                                className="input w-full"
                                placeholder="Product SKU"
                                disabled={order.status === 'closed'}
                              />
                            ) : (
                              <div
                                onClick={() => updateItem(item.id, 'isEditing', true)}
                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                              >
                                {item.sku || '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="text"
                                name="description"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                disabled={order.status === 'closed'}
                                className="input w-full"
                                placeholder="Product Description"
                              />
                            ) : (
                              <div
                                onClick={() => updateItem(item.id, 'isEditing', true)}
                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                              >
                                {item.description || '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="number"
                                name="qty"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                                className="input w-full"
                                min="1"
                                disabled={order.prev_status === 'closed'}
                                required
                              />
                            ) : (
                              <div
                                onClick={() => updateItem(item.id, 'isEditing', true)}
                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                              >
                                {item.qty}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.isEditing ? (
                              <input
                                type="number"
                                name="rate"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="input w-full"
                                step="0.01"
                                disabled={order.prev_status === 'closed'}
                                required
                              />
                            ) : (
                              <div
                                onClick={() => updateItem(item.id, 'isEditing', true)}
                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                              >
                                Rs. {Number(item.rate).toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            Rs. {Number(item.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {item.isEditing ? (
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => updateItem(item.id, 'isEditing', false)}
                                  className="text-green-600 hover:text-green-900 text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => removeItem(item.id)}
                                disabled={order.prev_status === 'closed'}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>Rs. {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="btn btn-secondary btn-md flex items-center"
              >
                <Printer className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={order.prev_status === 'closed'}
                className="btn btn-primary btn-md"
              >
                Update Order
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}