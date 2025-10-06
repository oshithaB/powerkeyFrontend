import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Edit, Trash2, DollarSign, Filter, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSocket } from '../../contexts/SocketContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Invoice {
  id: number;
  invoice_number: string;
  head_note?: string | null;
  customer_id: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_billing_address?: string;
  customer_shipping_address?: string;
  customer_tax_number?: string | null;
  employee_id: number;
  employee_name?: string;
  estimate_id?: number;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  shipping_cost?: number;
  status: 'opened' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'proforma';
  notes: string;
  terms: string;
  created_at: string;
  is_locked?: boolean;
  locked_by?: User | null;
}

interface InvoiceItem {
  id?: number;
  product_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  actual_unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  fullname: string;
  role: string;
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    customer: '',
    employee: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [printItems, setPrintItems] = useState<InvoiceItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const socketRef = useSocket();
  const [lockedInvoices, setLockedInvoices] = useState<{ [key: number]: User }>({});

  useEffect(() => {
    if (!selectedCompany?.company_id) {
      console.log('No company selected, redirecting to /companies');
      navigate('/companies');
      return;
    }
    fetchInvoices();
    fetchData();
  }, [selectedCompany, navigate]);

  const fetchInvoices = async () => {
    try {
      const response = await axiosInstance.get(`/api/getInvoice/${selectedCompany?.company_id}`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [customersRes, employeesRes, productsRes, taxRatesRes] = await Promise.all([
        axiosInstance.get(`/api/getCustomers/${selectedCompany?.company_id}`),
        axiosInstance.get(`/api/employees`),
        axiosInstance.get(`/api/getProducts/${selectedCompany?.company_id}`),
        axiosInstance.get(`/api/tax-rates/${selectedCompany?.company_id}`)
      ]);
      setCustomers(customersRes.data);
      setEmployees(employeesRes.data);
      setProducts(productsRes.data);
      setTaxRates(taxRatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    const socket = socketRef.current;
    console.log('Socket in invoice page:', socket);
    if (!socket) return;

    socket.emit('start_listening_invoices');
    console.log('Socket in invoice page emit start_listening_invoices');

    socket.on('locked_invoices', (locked_invoices) => {
      setLockedInvoices(locked_invoices);
      console.log('Received locked invoices:', locked_invoices);
    });

    return () => {
      socket.off('locked_invoices');
    };

  }, []);


  const convertInvoicesToLocked = () => {
    if (invoices.length === 0) {
      console.log('No invoices to update.');
      return;
    }

    console.log('Updating invoices with locked status:', lockedInvoices);

    setInvoices(prevInvoices => {
      const updatedInvoices = prevInvoices.map(invoice => {
        if (lockedInvoices[invoice.id]) {
          return {
            ...invoice,
            is_locked: true,
            locked_by: lockedInvoices[invoice.id]
          };
        } else {
          return {
            ...invoice,
            is_locked: false,
            locked_by: null
          };
        }
      });

      // Check if anything actually changed
      const changed = updatedInvoices.some((inv, index) => {
        const prev = prevInvoices[index];
        return (
          inv.is_locked !== prev.is_locked ||
          JSON.stringify(inv.locked_by) !== JSON.stringify(prev.locked_by)
        );
      });

      return changed ? updatedInvoices : prevInvoices;
    });
  };
  
  useEffect(() => {
    convertInvoicesToLocked();
  }, [lockedInvoices, invoices]);

  const fetchInvoiceItems = async (invoiceId: number) => {
    try {
      const response = await axiosInstance.get(`/api/getInvoiceItems/${selectedCompany?.company_id}/${invoiceId}`);
      const items = Array.isArray(response.data) ? response.data : [];
      return items.map(item => ({
        id: item.id,
        product_id: item.product_id || 0,
        product_name: item.product_name || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        actual_unit_price: Number(item.actual_unit_price) || 0,
        tax_rate: Number(item.tax_rate) || 0,
        tax_amount: Number(item.tax_amount) || 0,
        total_price: Number(item.total_price) || 0
      }));
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      return [];
    }
  };

  const handleEdit = async (invoice: Invoice) => {
    try {
      const items = await fetchInvoiceItems(invoice.id);
      navigate('/invoices/edit', { state: { invoice, items } });
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      alert('Failed to fetch invoice items');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await axiosInstance.delete(`/api/deleteInvoice/${selectedCompany?.company_id}/${id}`);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleAddPayment = (invoice: Invoice) => {
    if (!invoice.customer_id || isNaN(invoice.customer_id) || invoice.customer_id <= 0) {
      console.error('Invalid or missing customer ID for invoice:', {
        id: invoice.id,
        customer_id: invoice.customer_id,
      });
      alert(`Cannot proceed: Invalid or missing customer ID for invoice ${invoice.invoice_number}`);
      return;
    }
    navigate(`/invoices/receive-payment/${invoice.customer_id}`, { state: { invoice } });
  };

  const handlePrint = async (invoice: Invoice) => {
    try {
      setPrintingInvoice(invoice);
      const fetchedItems = await fetchInvoiceItems(invoice.id);
      setPrintItems(fetchedItems);
      setShowPrintPreview(true);
    } catch (error) {
      console.error('Error preparing print preview:', error);
      alert('Failed to load print preview');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      if (printRef.current) {
        const logoUrl = selectedCompany?.company_logo ? `http://localhost:3000${selectedCompany.company_logo}` : null;
        let logoImage: HTMLImageElement | null = null;
        if (logoUrl) {
          logoImage = new Image();
          logoImage.crossOrigin = 'Anonymous';
          logoImage.src = logoUrl;
          await new Promise((resolve, reject) => {
            if (logoImage) {
              logoImage.onload = resolve;
            }
            if (logoImage) {
              logoImage.onerror = reject;
            }
          });
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxContentHeight = pageHeight - 2 * margin;

        const scale = 3;
        const canvas = await html2canvas(printRef.current, {
          scale,
          useCORS: true,
          logging: false,
          windowWidth: printRef.current.scrollWidth,
          windowHeight: printRef.current.scrollHeight,
        });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        const totalPages = Math.ceil(imgHeight / maxContentHeight);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
          }
          const srcY = i * maxContentHeight * (canvas.width / imgWidth);
          const pageContentHeight = Math.min(canvas.height - srcY, maxContentHeight * (canvas.width / imgWidth));
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = pageContentHeight;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(canvas, 0, srcY, canvas.width, pageContentHeight, 0, 0, canvas.width, pageContentHeight);
            const pageImgData = tempCanvas.toDataURL('image/png', 1.0);
            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight - (i * maxContentHeight), maxContentHeight));
          }
        }

        pdf.save(`invoice_${printingInvoice?.invoice_number}.pdf`);
        setShowPrintPreview(false);
        setPrintingInvoice(null);
        setPrintItems([]);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Ensure the logo image is accessible.');
    }
  };

  const formatDate = (isoDate: string | Date | null | undefined) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'opened':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'proforma':
        return 'bg-purple-200 text-purple-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerFilter(value);
    if (value) {
      const filteredSuggestions = customers.filter((customer) =>
        customer.name.toLowerCase().includes(value.toLowerCase())
      );
      setCustomerSuggestions(filteredSuggestions);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearchTerm =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      'Unknown Customer'.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filters.status
      ? invoice.status === filters.status
      : true;

    const matchesCustomer = customerFilter
      ? invoice.customer_name?.toLowerCase().includes(customerFilter.toLowerCase()) ||
        'Unknown Customer'.toLowerCase().includes(customerFilter.toLowerCase())
      : true;

    const invoiceDate = new Date(invoice.invoice_date).getTime();
    const matchesDate =
      (!filters.dateFrom || invoiceDate >= new Date(filters.dateFrom).getTime()) &&
      (!filters.dateTo || invoiceDate <= new Date(filters.dateTo).getTime());

    return matchesSearchTerm && matchesStatus && matchesCustomer && matchesDate;
  });

  const overdueData = invoices
    .filter(invoice => invoice.status === 'overdue')
    .reduce((acc, invoice) => acc + (Number(invoice.balance_due) || 0), 0);

  const balanceDueData = invoices
    .filter(invoice => invoice.status === 'partially_paid' || invoice.status === 'opened' || invoice.status === 'sent')
    .reduce((acc, invoice) => {
      const amount = invoice.status === 'partially_paid'
        ? (Number(invoice.balance_due) || 0) 
        : (Number(invoice.total_amount) || 0);
      return acc + amount;
  }, 0);

  const partially_paidData = invoices
    .filter(invoices => invoices.status === 'partially_paid')
    .reduce((acc, invoice) => acc + (Number(invoice.paid_amount)), 0);

  const paidData = invoices
    .filter(invoices => invoices.status === 'paid')
    .reduce((acc, invoice) => acc + (Number(invoice.paid_amount)), 0);
    console.log('Paid Data Calculation:', invoices.filter(invoice => invoice.status === 'paid').map(inv => ({id: inv.id, paid_amount: inv.paid_amount})));

  const cancelledData = invoices
    .filter(invoice => invoice.status === 'cancelled')
    .reduce((acc, invoice) => acc + (Number(invoice.total_amount) || 0), 0);

  const chartData = {
    labels: ['Overdue', 'Balance Due', 'Partially Paid', 'Paid', 'Cancelled'],
    datasets: [
      {
        label: 'Amount (LKR)',
        data: [overdueData, balanceDueData, partially_paidData, paidData, cancelledData],
        backgroundColor: ['#dc2626', '#6b7280', '#f4f871', '#10b981', '#f87171'],
        borderColor: ['#dc2626', '#6b7280', '#f4f871', '#10b981', '#f87171'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `LKR ${context.parsed.y.toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (tickValue: string | number) => `LKR ${Number(tickValue).toLocaleString()}`,
        },
      },
    },
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
      <div className="bg-white p-6 rounded-lg shadow h-72">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Summary</h2>
        <div className="h-full">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="flex justify-between items-center pt-8">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-md"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => navigate('/invoices/create')}
            className="btn btn-primary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="input"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="opened">Opened</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input pr-3 w-full"
                    value={customerFilter}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    placeholder="Search customers..."
                    onBlur={() => setCustomerSuggestions([])}
                  />
                  {customerSuggestions.length > 0 && (
                    <ul className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto w-full">
                      {customerSuggestions.map((customer) => (
                        <li
                          key={customer.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={() => {
                            setCustomerFilter(customer.name);
                            setCustomerSuggestions([]);
                          }}
                        >
                          {customer.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    className="input"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    placeholder="From"
                  />
                  <input
                    type="date"
                    className="input"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
              {filteredInvoices.map((invoice) => (
                <React.Fragment key={invoice.id}>
                  {invoice.is_locked ? (
                    <tr className="bg-gray-100">
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        This invoice is currently being edited by{" "}
                        {invoice.locked_by?.fullname || "another user"}.
                      </td>
                    </tr>
                  ) : (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{invoice.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.customer_name || 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.employee_name || 'Unknown Employee'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </div>
                        {invoice.status === 'overdue' && (
                          <div className="text-sm text-red-600">
                            {Math.floor(
                              (new Date().getTime() - new Date(invoice.due_date).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            days late
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Rs. {invoice.total_amount?.toLocaleString() || '0.00'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Paid: Rs. {invoice.paid_amount?.toLocaleString() || '0.00'}
                        </div>
                        {invoice.balance_due > 0 && (
                          <div className="text-sm text-red-600">
                            Due: Rs. {invoice.balance_due?.toLocaleString() || '0.00'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status.replace('_', ' ').charAt(0).toUpperCase() + invoice.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(invoice)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAddPayment(invoice)}
                            className="text-green-600 hover:text-green-900"
                            style={{ display: invoice.status === 'cancelled' || invoice.status === 'paid' ? 'none' : undefined }}
                            title="Add Payment"
                            disabled={!invoice.customer_id}
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPrintPreview && printingInvoice && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50"
          style={{ marginTop: "-10px" }}
        >
          <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview
              </h3>
              <button
                onClick={() => {
                  setShowPrintPreview(false);
                  setPrintingInvoice(null);
                  setPrintItems([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[70vh]">
              <div
                ref={printRef}
                className="p-8 bg-white w-[210mm] min-h-[297mm] text-gray-900"
              >
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    Invoice #{printingInvoice.invoice_number}
                  </h1>
                  <p className="text-sm text-gray-600">
                    ID: {printingInvoice.id}
                  </p>

                  {/* Tax Info Row */}
                  <div className="flex items-center gap-6 mt-2">
                    {/* Taxed Invoice Badge */}
                    {!!selectedCompany?.is_taxable && (
                      <span
                        className="px-3 py-1 text-2xl font-semibold text-red-600"
                      >
                        Tax Invoice
                      </span>
                    )}

                    {/* Customer Tax Number */}
                    <p className="text-sm text-gray-700">
                      Customer VAT No: {printingInvoice.customer_tax_number || 'N/A'}
                    </p>

                    {/* Company Tax Number */}
                    <p className="text-sm text-gray-700">
                      Company VAT No: {selectedCompany?.tax_number || 'N/A'}
                    </p>
                  </div>
                </div>
                  {selectedCompany?.company_logo && (
                    <img
                      src={`http://localhost:3000${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-16 w-auto max-w-[150px] object-contain"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-20 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Bill To</h3>
                    <p>Customer: {printingInvoice.customer_name || 'Unknown Customer'}</p>
                    <p>Address: {printingInvoice.customer_billing_address || 'N/A'}</p>
                    <p>Phone: {printingInvoice.customer_phone || 'N/A'}</p>
                    <p>Email: {printingInvoice.customer_email || 'N/A'}</p>

                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Details</h3>
                    <p>
                      Invoice Date: {formatDate(printingInvoice.invoice_date) || 'N/A'}
                    </p>
                    <p>
                      Due Date: {formatDate(printingInvoice.due_date) || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                {printingInvoice.head_note && (
                  <p className="text-lg mb-5 bg-gray-100 p-4 rounded">
                    {printingInvoice.head_note}
                  </p>
                )}

                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Items</h3>
                  <table className="w-full border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Item #</th>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">Tax %</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{index + 1}</td>
                          <td className="px-4 py-2">
                            {item.product_id
                              ? products.find((p) => p.id === item.product_id)?.name || 'N/A'
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-2">{item.description || 'N/A'}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">
                            Rs. {Number(item.actual_unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">{item.tax_rate}%</td>
                          <td className="px-4 py-2 text-right">
                            Rs. {Number(item.total_price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    {printingInvoice.notes && (
                      <div>
                        <h3 className="text-lg font-semibold">Notes</h3>
                        <p className="text-sm">{printingInvoice.notes}</p>
                      </div>
                    )}
                    {printingInvoice.terms && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold">Terms & Conditions</h3>
                        <p className="text-sm">{printingInvoice.terms}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>Rs. {Number(printingInvoice.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount ({printingInvoice.discount_type === 'percentage' ? '%' : 'Rs.'}):</span>
                          <span>Rs. {Number(printingInvoice.discount_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping Cost</span>
                          <span>Rs. {Number(printingInvoice.shipping_cost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>Rs. {Number(printingInvoice.tax_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>Rs. {Number(printingInvoice.total_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Paid:</span>
                          <span>Rs. {Number(printingInvoice.paid_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Balance Due:</span>
                          <span>Rs. {Number(printingInvoice.balance_due || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-md p-6">

                  {/* Left side */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex">
                      <span className="w-28 text-sm font-medium text-gray-600">Name:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400"></span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-sm font-medium text-gray-600">NIC:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400"></span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-sm font-medium text-gray-600">Contact No:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400"></span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-sm font-medium text-gray-600">Vehicle No:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400"></span>
                    </div>
                    <div className="flex">
                      <span className="w-28 text-sm font-medium text-gray-600">Signature:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400"></span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col space-y-2 items-end text-right">
                    <div className="flex w-full justify-end">
                      <span className="w-40 text-sm font-medium text-gray-600">Order Created by:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 ml-2"></span>
                    </div>
                    <div className="flex w-full justify-end">
                      <span className="w-40 text-sm font-medium text-gray-600">Order Checked by:</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 ml-2"></span>
                    </div>
                  </div>

                </div>


              </div>
                
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowPrintPreview(false);
                  setPrintingInvoice(null);
                  setPrintItems([]);
                }}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPDF}
                className="btn btn-primary btn-md"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}