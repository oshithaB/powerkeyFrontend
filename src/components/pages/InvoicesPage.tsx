import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Edit, Trash2, DollarSign, Filter, Printer, X, Ban, FileText, RotateCcw, Clock } from 'lucide-react';
import RefundInvoice from '../modals/RefundInvoice';
import RefundHistory from '../modals/RefundHistory';
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
import { useSocket } from '../../contexts/SocketContext';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = pdfFonts;

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
  has_refunds?: boolean;
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

const formatCurrency = (amount: number | string | undefined | null) => {
  const value = Number(amount) || 0;
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [printItems, setPrintItems] = useState<InvoiceItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const socketRef = useSocket();
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundInvoice, setRefundInvoice] = useState<Invoice | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);
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
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getInvoice/${selectedCompany?.company_id}`);
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
        axiosInstance.get(`http://147.79.115.89:3000/api/getCustomers/${selectedCompany?.company_id}`),
        axiosInstance.get(`http://147.79.115.89:3000/api/employees`),
        axiosInstance.get(`http://147.79.115.89:3000/api/getProducts/${selectedCompany?.company_id}`),
        axiosInstance.get(`http://147.79.115.89:3000/api/tax-rates/${selectedCompany?.company_id}`)
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
    if (!socket) return;

    socket.emit('start_listening_invoices');

    socket.on('locked_invoices', (locked_invoices) => {
      setLockedInvoices(locked_invoices);
    });

    return () => {
      socket.off('locked_invoices');
    };
  }, []);

  const convertInvoicesToLocked = () => {
    if (invoices.length === 0) return;

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
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getInvoiceItems/${selectedCompany?.company_id}/${invoiceId}`);
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
        await axiosInstance.delete(`http://147.79.115.89:3000/api/deleteInvoice/${selectedCompany?.company_id}/${id}`);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (invoice.status === 'cancelled') return;

    if (window.confirm('Are you sure you want to cancel this invoice? This will reverse stock, payments, and customer balance.')) {
      try {
        await axiosInstance.post(`http://147.79.115.89:3000/api/invoice/cancelInvoice/${selectedCompany?.company_id}`, {
          invoiceId: invoice.id,
          companyId: selectedCompany?.company_id
        });
        alert('Invoice cancelled successfully');
        fetchInvoices();
      } catch (error: any) {
        console.error('Error cancelling invoice:', error);
        alert(error.response?.data?.error || 'Failed to cancel invoice');
      }
    }
  };

  const handleAddPayment = (invoice: Invoice) => {
    if (!invoice.customer_id || isNaN(invoice.customer_id) || invoice.customer_id <= 0) {
      alert(`Cannot proceed: Invalid or missing customer ID for invoice ${invoice.invoice_number}`);
      return;
    }
    navigate(`/invoices/receive-payment/${invoice.customer_id}`, { state: { invoice } });
  };

  const handleRefund = (invoice: Invoice) => {
    setRefundInvoice(invoice);
    setShowRefundModal(true);
  };

  const handleRefundHistory = (invoice: Invoice) => {
    setHistoryInvoice(invoice);
    setShowHistoryModal(true);
  };


  const handlePrint = async (invoice: Invoice) => {
    try {
      const fetchedItems = await fetchInvoiceItems(invoice.id);
      await handleDownloadPDF('print', invoice, fetchedItems);
    } catch (error) {
      console.error('Error preparing print:', error);
      alert('Failed to prepare print');
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const fetchedItems = await fetchInvoiceItems(invoice.id);
      await handleDownloadPDF('download', invoice, fetchedItems);
    } catch (error) {
      console.error('Error preparing download:', error);
      alert('Failed to prepare download');
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

  const handleDownloadPDF = async (action: 'download' | 'print' = 'download', overrideInvoice?: Invoice, overrideItems?: InvoiceItem[]) => {
    const targetInvoice = overrideInvoice || printingInvoice;
    const targetItems = overrideItems || printItems;

    if (!targetInvoice || !targetItems) return;

    const ITEMS_PER_PAGE = 20;

    let logoDataUrl = '';
    if (selectedCompany?.company_logo) {
      logoDataUrl = await getImageDataUrl(`http://147.79.115.89:3000${selectedCompany.company_logo}`);
    }

    const createHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        return [
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: selectedCompany?.is_taxable ? 'TAX INVOICE' : 'INVOICE', fontSize: 28, bold: true, color: '#9EDFE8', margin: [0, 0, 0, 4] },
                  { text: targetInvoice.invoice_number, fontSize: 16, bold: true, color: '#1f2937' }
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
                  { text: 'BILL TO', fontSize: 10, bold: true, color: '#1f2937', margin: [0, 0, 0, 6] },
                  { text: targetInvoice.customer_name || 'Unknown Customer', fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
                  { text: targetInvoice.customer_billing_address || 'N/A', fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                  { text: `Phone: ${targetInvoice.customer_phone || 'N/A'}`, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                  { text: `Email: ${targetInvoice.customer_email || 'N/A'}`, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                  { text: `VAT No: ${targetInvoice.customer_tax_number || 'N/A'}`, fontSize: 9, color: '#4b5563' }
                ]
              },
              {
                width: '4%',
                text: ''
              },
              {
                width: '48%',
                stack: [
                  { text: 'INVOICE DETAILS', fontSize: 10, bold: true, color: '#1f2937', alignment: 'right', margin: [0, 0, 0, 6] },
                  {
                    table: {
                      widths: ['*', 'auto'],
                      body: [
                        [
                          { text: 'Invoice Date:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { text: formatDate(targetInvoice.invoice_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ],
                        [
                          { text: 'Due Date:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { text: formatDate(targetInvoice.due_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ],
                        [
                          { text: 'Status:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          {
                            text: targetInvoice.status.toUpperCase().replace('_', ' '),
                            fontSize: 9,
                            bold: true,
                            alignment: 'right',
                            color: targetInvoice.status === 'paid' ? '#059669' : targetInvoice.status === 'overdue' ? '#dc2626' : '#6b7280',
                            border: [false, false, false, false]
                          }
                        ],
                        [
                          { text: 'Company VAT:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { text: selectedCompany?.tax_number || 'N/A', fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ]
                      ]
                    },
                    layout: 'noBorders'
                  },
                  selectedCompany?.is_taxable ? { text: '' } : { text: '' }
                ]
              }
            ],
            margin: [0, 0, 0, 15]
          },
          targetInvoice.head_note ? {
            text: targetInvoice.head_note,
            fontSize: 9,
            italics: true,
            color: '#4b5563',
            fillColor: '#fef3c7',
            margin: [6, 6, 6, 6]
          } : null,
          targetInvoice.head_note ? { text: '', margin: [0, 0, 0, 10] } : null
        ].filter(Boolean);
      } else {
        return [
          {
            text: `Invoice ${targetInvoice.invoice_number} - Continued`,
            fontSize: 14,
            bold: true,
            color: '#6b7280',
            margin: [0, 0, 0, 12]
          }
        ];
      }
    };



    const createItemsTable = (items: InvoiceItem[], startIndex: number) => {
      const tableBody: any[][] = [
        [
          { text: '#', fontSize: 10, bold: true, fillColor: '#9EDFE8', color: '#1f2937', margin: [4, 5, 4, 5] },
          { text: 'Product', fontSize: 10, bold: true, fillColor: '#9EDFE8', color: '#1f2937', margin: [4, 5, 4, 5] },
          { text: 'Description', fontSize: 10, bold: true, fillColor: '#9EDFE8', color: '#1f2937', margin: [4, 5, 4, 5] },
          { text: 'Qty', fontSize: 10, bold: true, fillColor: '#9EDFE8', color: '#1f2937', alignment: 'center', margin: [4, 5, 4, 5] },
          { text: 'Unit Price', fontSize: 10, bold: true, fillColor: '#9EDFE8', color: '#1f2937', alignment: 'right', margin: [4, 5, 4, 5] },
          { text: 'Total', fontSize: 10, bold: true, fillColor: '#9EDFE8', color: '#1f2937', alignment: 'right', margin: [4, 5, 4, 5] }
        ]
      ];

      items.forEach((item, index) => {
        // Calculate exclusive total: Qty * Actual Unit Price
        const exclusiveTotal = (Number(item.quantity) || 0) * (Number(item.actual_unit_price) || 0);

        tableBody.push([
          { text: (startIndex + index + 1).toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
          { text: products.find((p) => p.id === item.product_id)?.name || 'N/A', fontSize: 9, margin: [3, 4, 3, 4] },
          { text: item.description || '-', fontSize: 8.5, color: '#4b5563', margin: [3, 4, 3, 4] },
          { text: item.quantity.toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
          { text: `Rs. ${formatCurrency(item.actual_unit_price)}`, fontSize: 9, alignment: 'right', margin: [3, 4, 3, 4] },
          { text: `Rs. ${formatCurrency(exclusiveTotal)}`, fontSize: 9, bold: true, alignment: 'right', margin: [3, 4, 3, 4] }
        ]);
      });

      return {
        table: {
          headerRows: 1,
          widths: [30, 'auto', '*', 35, 65, 75],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => '#e5e7eb',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0
        },
        margin: [0, 0, 0, 12]
      };
    };

    const createSummarySection = () => {
      // Calculate subtotal from exclusive item totals
      const exclusiveSubtotal = Number(targetItems.reduce((acc, item) => {
        return acc + ((Number(item.quantity) || 0) * (Number(item.actual_unit_price) || 0));
      }, 0).toFixed(2));

      // Calculate total tax from items using (UnitPrice - ActualUnitPrice) * Qty
      // This ensures we calculate based on the difference between inclusive and exclusive prices per unit
      const calculatedTax = Number(targetItems.reduce((acc, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const actualUnitPrice = Number(item.actual_unit_price) || 0;
        const unitTax = unitPrice - actualUnitPrice;
        return acc + (quantity * unitTax);
      }, 0).toFixed(2));

      const calculatedTotal = Number((exclusiveSubtotal + Number(targetInvoice.shipping_cost || 0) + calculatedTax - Number(targetInvoice.discount_amount || 0)).toFixed(2));
      const calculatedBalanceDue = Number((calculatedTotal - Number(targetInvoice.paid_amount || 0)).toFixed(2));

      return {
        columns: [
          {
            width: '55%',
            stack: [
              targetInvoice.notes ? {
                stack: [
                  { text: 'Notes', fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
                  { text: targetInvoice.notes, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 10] }
                ]
              } : {},
              targetInvoice.terms ? {
                stack: [
                  { text: 'Terms & Conditions', fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
                  { text: targetInvoice.terms, fontSize: 9, color: '#4b5563' }
                ]
              } : {}
            ]
          },
          {
            width: '45%',
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'Subtotal:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                  { text: `Rs. ${formatCurrency(exclusiveSubtotal)}`, fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'Discount:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                  { text: `Rs. ${formatCurrency(targetInvoice.discount_amount)}`, fontSize: 9, alignment: 'right', color: '#dc2626', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'Shipping:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                  { text: `Rs. ${formatCurrency(targetInvoice.shipping_cost)}`, fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'Tax:', fontSize: 9, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#e5e7eb'], margin: [0, 3, 10, 6] },
                  { text: `Rs. ${formatCurrency(calculatedTax)}`, fontSize: 9, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#e5e7eb'], margin: [0, 3, 0, 6] }
                ],
                [
                  { text: 'TOTAL:', fontSize: 11, bold: true, alignment: 'right', margin: [0, 6, 10, 6] },
                  { text: `Rs. ${formatCurrency(calculatedTotal)}`, fontSize: 11, bold: true, alignment: 'right', margin: [0, 6, 0, 6] }
                ],
                [
                  { text: 'Paid:', fontSize: 9, alignment: 'right', color: '#059669', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                  { text: `Rs. ${formatCurrency(targetInvoice.paid_amount)}`, fontSize: 9, alignment: 'right', color: '#059669', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'BALANCE DUE:', fontSize: 10, bold: true, alignment: 'right', margin: [0, 6, 10, 6] },
                  { text: `Rs. ${formatCurrency(calculatedBalanceDue)}`, fontSize: 10, bold: true, alignment: 'right', margin: [0, 6, 0, 6] }
                ]
              ]
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 10,
              paddingRight: () => 10,
              paddingTop: () => 0,
              paddingBottom: () => 0
            }
          }
        ],
        margin: [0, 0, 0, 18]
      };
    };

    const createSignatureSection = () => ({
      margin: [0, 30, 0, 0],
      columns: [
        {
          width: '45%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#9ca3af' }], margin: [0, 0, 0, 4] },
            { text: 'Customer Signature', fontSize: 9, bold: true, color: '#4b5563', alignment: 'center', margin: [0, 0, 0, 15] },
            {
              table: {
                widths: [60, '*'],
                body: [
                  [
                    { text: 'Name:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: '', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ],
                  [
                    { text: 'NIC:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: '', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ],
                  [
                    { text: 'Contact:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: '', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ],
                  [
                    { text: 'Vehicle No:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: '', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ]
                ]
              },
              layout: 'noBorders'
            }
          ]
        },
        { width: '10%', text: '' },
        {
          width: '45%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#9ca3af' }], margin: [0, 0, 0, 4] },
            { text: 'Authorized Signature', fontSize: 9, bold: true, color: '#4b5563', alignment: 'center', margin: [0, 0, 0, 15] },
            {
              table: {
                widths: [60, '*'],
                body: [
                  [
                    { text: 'Prepared by:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: '', fontSize: 8, color: '#1f2937', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ],
                  [
                    { text: 'Created by:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: JSON.parse(localStorage.getItem('user') || '{}')?.fullname || 'N/A', fontSize: 8, color: '#1f2937', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ],
                  [
                    { text: 'Checked by:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: '', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
                  ]
                ]
              },
              layout: 'noBorders'
            }
          ]
        }
      ]
    });

    const content: any[] = [];

    const totalPages = Math.ceil(targetItems.length / ITEMS_PER_PAGE);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, targetItems.length);
      const pageItems = targetItems.slice(startIndex, endIndex);

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
      if (action === 'download') {
        pdfDocGenerator.download(`Invoice_${targetInvoice.invoice_number}_${formatDate(targetInvoice.invoice_date)}.pdf`);
      } else {
        pdfDocGenerator.print();
      }
      setPrintingInvoice(null);
      setPrintItems([]);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
      case 'opened': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'proforma': return 'bg-purple-200 text-purple-900';
      default: return 'bg-gray-100 text-gray-800';
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
                    <tr className="hover:bg-gray-50">
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
                          Rs. {formatCurrency(invoice.total_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Paid: Rs. {formatCurrency(invoice.paid_amount)}
                        </div>
                        {invoice.balance_due > 0 && (
                          <div className="text-sm text-red-600">
                            Due: Rs. {formatCurrency(invoice.balance_due)}
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
                            onClick={() => handleDownload(invoice)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download PDF"
                          >
                            <FileText className="h-4 w-4" />
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
                            onClick={() => handleCancelInvoice(invoice)}
                            className="text-red-600 hover:text-red-900"
                            style={{ display: invoice.status === 'cancelled' ? 'none' : undefined }}
                            title="Cancel Invoice"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          {(invoice.status === 'paid' || invoice.status === 'partially_paid') && (
                            <button
                              onClick={() => handleRefund(invoice)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Refund"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                          {invoice.has_refunds && (
                            <button
                              onClick={() => handleRefundHistory(invoice)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Refund History"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                          )}
                          {/* Delete button removed as per user request */}
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

      <RefundInvoice
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setRefundInvoice(null);
        }}
        invoice={refundInvoice}
        onSuccess={() => {
          fetchInvoices();
        }}
      />
      <RefundHistory
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setHistoryInvoice(null);
        }}
        invoice={historyInvoice}
      />
    </div>
  );
}