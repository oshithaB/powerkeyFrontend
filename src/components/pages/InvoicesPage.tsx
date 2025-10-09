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
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set vfs with proper type handling
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
      const response = await axiosInstance.get(`https://powerkeybackend-production.up.railway.app/api/getInvoice/${selectedCompany?.company_id}`);
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
        axiosInstance.get(`https://powerkeybackend-production.up.railway.app/api/getCustomers/${selectedCompany?.company_id}`),
        axiosInstance.get(`https://powerkeybackend-production.up.railway.app/api/employees`),
        axiosInstance.get(`https://powerkeybackend-production.up.railway.app/api/getProducts/${selectedCompany?.company_id}`),
        axiosInstance.get(`https://powerkeybackend-production.up.railway.app/api/tax-rates/${selectedCompany?.company_id}`)
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
      const response = await axiosInstance.get(`https://powerkeybackend-production.up.railway.app/api/getInvoiceItems/${selectedCompany?.company_id}/${invoiceId}`);
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
        await axiosInstance.delete(`https://powerkeybackend-production.up.railway.app/api/deleteInvoice/${selectedCompany?.company_id}/${id}`);
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
    if (!printingInvoice || !printItems) return;

    const ITEMS_PER_PAGE = 20;
    
    // Convert logo to base64 if exists
    let logoDataUrl = '';
    if (selectedCompany?.company_logo) {
      try {
        const response = await fetch(`https://powerkeybackend-production.up.railway.app${selectedCompany.company_logo}`);
        const blob = await response.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Split items into pages
    const itemPages: InvoiceItem[][] = [];
    for (let i = 0; i < printItems.length; i += ITEMS_PER_PAGE) {
      itemPages.push(printItems.slice(i, i + ITEMS_PER_PAGE));
    }

    const content: any[] = [];

    itemPages.forEach((pageItems, pageIndex) => {
      // Header section (only on first page)
      if (pageIndex === 0) {
        content.push({
          columns: [
            {
              width: '*',
              stack: [
                { 
                  text: 'INVOICE', 
                  style: 'invoiceTitle',
                  color: '#2563eb'
                },
                { 
                  text: `${printingInvoice.invoice_number}`, 
                  style: 'invoiceNumber',
                  margin: [0, 5, 0, 0]
                }
              ]
            },
            logoDataUrl ? {
              width: 120,
              image: logoDataUrl,
              fit: [120, 80],
              alignment: 'right'
            } : { text: '', width: 120 }
          ],
          margin: [0, 0, 0, 20]
        });

        // Company and customer info
        content.push({
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'BILL TO', style: 'sectionHeader', color: '#1f2937' },
                { 
                  text: printingInvoice.customer_name || 'Unknown Customer', 
                  bold: true, 
                  fontSize: 11,
                  margin: [0, 5, 0, 3]
                },
                { text: printingInvoice.customer_billing_address || 'N/A', fontSize: 9, margin: [0, 2, 0, 2] },
                { text: `Phone: ${printingInvoice.customer_phone || 'N/A'}`, fontSize: 9, margin: [0, 2, 0, 2] },
                { text: `Email: ${printingInvoice.customer_email || 'N/A'}`, fontSize: 9, margin: [0, 2, 0, 2] },
                { text: `VAT No: ${printingInvoice.customer_tax_number || 'N/A'}`, fontSize: 9, margin: [0, 2, 0, 0] }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'INVOICE DETAILS', style: 'sectionHeader', color: '#1f2937', alignment: 'right' },
                {
                  table: {
                    widths: ['auto', '*'],
                    body: [
                      [
                        { text: 'Invoice Date:', bold: true, fontSize: 9, border: [false, false, false, false] },
                        { text: formatDate(printingInvoice.invoice_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                      ],
                      [
                        { text: 'Due Date:', bold: true, fontSize: 9, border: [false, false, false, false] },
                        { text: formatDate(printingInvoice.due_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                      ],
                      [
                        { text: 'Status:', bold: true, fontSize: 9, border: [false, false, false, false] },
                        { 
                          text: printingInvoice.status.toUpperCase().replace('_', ' '), 
                          fontSize: 9, 
                          alignment: 'right',
                          color: printingInvoice.status === 'paid' ? '#059669' : printingInvoice.status === 'overdue' ? '#dc2626' : '#6b7280',
                          bold: true,
                          border: [false, false, false, false]
                        }
                      ],
                      [
                        { text: 'Company VAT:', bold: true, fontSize: 9, border: [false, false, false, false] },
                        { text: selectedCompany?.tax_number || 'N/A', fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                      ]
                    ]
                  },
                  margin: [0, 5, 0, 0]
                },
                selectedCompany?.is_taxable ? {
                  text: 'TAX INVOICE',
                  color: '#dc2626',
                  fontSize: 12,
                  bold: true,
                  alignment: 'right',
                  margin: [0, 10, 0, 0]
                } : { text: '' }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        });

        // Head note
        if (printingInvoice.head_note) {
          content.push({
            text: printingInvoice.head_note,
            fontSize: 10,
            italics: true,
            fillColor: '#f3f4f6',
            margin: [0, 0, 0, 15],
            border: [false, false, false, true],
            borderColor: ['#e5e7eb'],
            color: '#4b5563'
          });
        }
      } else {
        // Continuation header for subsequent pages
        content.push({
          text: `Invoice ${printingInvoice.invoice_number} (Continued)`,
          style: 'continuationHeader',
          margin: [0, 0, 0, 15]
        });
      }

      // Items table
      const tableBody = [
        [
          { text: '#', style: 'tableHeader', fillColor: '#1f2937', color: '#ffffff' },
          { text: 'Product', style: 'tableHeader', fillColor: '#1f2937', color: '#ffffff' },
          { text: 'Description', style: 'tableHeader', fillColor: '#1f2937', color: '#ffffff' },
          { text: 'Qty', style: 'tableHeader', alignment: 'center', fillColor: '#1f2937', color: '#ffffff' },
          { text: 'Unit Price', style: 'tableHeader', alignment: 'right', fillColor: '#1f2937', color: '#ffffff' },
          { text: 'Tax %', style: 'tableHeader', alignment: 'center', fillColor: '#1f2937', color: '#ffffff' },
          { text: 'Total', style: 'tableHeader', alignment: 'right', fillColor: '#1f2937', color: '#ffffff' }
        ]
      ];

      const startIndex = pageIndex * ITEMS_PER_PAGE;
      pageItems.forEach((item, index) => {
        tableBody.push([
          { text: (startIndex + index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: products.find((p) => p.id === item.product_id)?.name || 'N/A', style: 'tableCell' },
          { text: item.description || '-', style: 'tableCell', fontSize: 8 },
          { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
          { text: `Rs. ${Number(item.actual_unit_price || 0).toFixed(2)}`, style: 'tableCell', alignment: 'right' },
          { text: `${item.tax_rate}%`, style: 'tableCell', alignment: 'center' },
          { text: `Rs. ${Number(item.total_price || 0).toFixed(2)}`, style: 'tableCell', alignment: 'right', bold: true }
        ]);
      });

      content.push({
        table: {
          headerRows: 1,
          widths: [30, 'auto', '*', 40, 70, 40, 80],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number, node: any) => i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => i === 0 || i === 1 ? '#1f2937' : '#e5e7eb',
          paddingTop: () => 8,
          paddingBottom: () => 8,
          paddingLeft: () => 10,
          paddingRight: () => 10
        },
        margin: [0, 0, 0, 15]
      });

      // Add page break if not last page
      if (pageIndex < itemPages.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });

    // Summary section (only on last page)
    content.push({
      columns: [
        {
          width: '60%',
          stack: [
            printingInvoice.notes ? {
              stack: [
                { text: 'Notes', style: 'sectionHeader', margin: [0, 10, 0, 5] },
                { 
                  text: printingInvoice.notes, 
                  fontSize: 9,
                  color: '#4b5563'
                }
              ]
            } : {},
            printingInvoice.terms ? {
              stack: [
                { text: 'Terms & Conditions', style: 'sectionHeader', margin: [0, 15, 0, 5] },
                { 
                  text: printingInvoice.terms, 
                  fontSize: 9,
                  color: '#4b5563'
                }
              ]
            } : {}
          ]
        },
        {
          width: '40%',
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Subtotal:', alignment: 'right', fontSize: 10, border: [false, false, false, false] },
                { text: `Rs. ${Number(printingInvoice.subtotal || 0).toFixed(2)}`, alignment: 'right', fontSize: 10, border: [false, false, false, false] }
              ],
              [
                { text: 'Discount:', alignment: 'right', fontSize: 10, border: [false, false, false, false] },
                { text: `Rs. ${Number(printingInvoice.discount_amount || 0).toFixed(2)}`, alignment: 'right', fontSize: 10, color: '#dc2626', border: [false, false, false, false] }
              ],
              [
                { text: 'Shipping:', alignment: 'right', fontSize: 10, border: [false, false, false, false] },
                { text: `Rs. ${Number(printingInvoice.shipping_cost || 0).toFixed(2)}`, alignment: 'right', fontSize: 10, border: [false, false, false, false] }
              ],
              [
                { text: 'Tax:', alignment: 'right', fontSize: 10, border: [false, false, false, true], borderColor: ['#e5e7eb'] },
                { text: `Rs. ${Number(printingInvoice.tax_amount || 0).toFixed(2)}`, alignment: 'right', fontSize: 10, border: [false, false, false, true], borderColor: ['#e5e7eb'] }
              ],
              [
                { text: 'TOTAL:', alignment: 'right', bold: true, fontSize: 12, fillColor: '#1f2937', color: '#ffffff', margin: [0, 5, 0, 5] },
                { text: `Rs. ${Number(printingInvoice.total_amount || 0).toFixed(2)}`, alignment: 'right', bold: true, fontSize: 12, fillColor: '#1f2937', color: '#ffffff', margin: [0, 5, 0, 5] }
              ],
              [
                { text: 'Paid:', alignment: 'right', fontSize: 10, border: [false, false, false, false], color: '#059669' },
                { text: `Rs. ${Number(printingInvoice.paid_amount || 0).toFixed(2)}`, alignment: 'right', fontSize: 10, border: [false, false, false, false], color: '#059669' }
              ],
              [
                { text: 'BALANCE DUE:', alignment: 'right', bold: true, fontSize: 11, fillColor: '#fef3c7', color: '#92400e' },
                { text: `Rs. ${Number(printingInvoice.balance_due || 0).toFixed(2)}`, alignment: 'right', bold: true, fontSize: 11, fillColor: '#fef3c7', color: '#92400e' }
              ]
            ]
          },
          layout: {
            paddingTop: () => 5,
            paddingBottom: () => 5,
            paddingLeft: () => 10,
            paddingRight: () => 10
          }
        }
      ],
      margin: [0, 20, 0, 30]
    });

    // Signature section
    content.push({
      columns: [
        {
          width: '50%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#9ca3af' }] },
            { text: 'Customer Signature', alignment: 'center', fontSize: 9, margin: [0, 5, 0, 0], color: '#6b7280' },
            { text: 'Name:', fontSize: 8, margin: [0, 10, 0, 2], color: '#6b7280' },
            { text: 'NIC:', fontSize: 8, margin: [0, 2, 0, 2], color: '#6b7280' },
            { text: 'Contact:', fontSize: 8, margin: [0, 2, 0, 2], color: '#6b7280' },
            { text: 'Vehicle No:', fontSize: 8, margin: [0, 2, 0, 0], color: '#6b7280' }
          ]
        },
        {
          width: '50%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#9ca3af' }] },
            { text: 'Authorized Signature', alignment: 'center', fontSize: 9, margin: [0, 5, 0, 0], color: '#6b7280' },
            { text: `Created by: ${printingInvoice.employee_name || 'N/A'}`, fontSize: 8, margin: [0, 10, 0, 2], color: '#6b7280' },
            { text: 'Checked by: _______________', fontSize: 8, margin: [0, 2, 0, 0], color: '#6b7280' }
          ]
        }
      ],
      margin: [0, 30, 0, 0]
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { 
            text: selectedCompany?.name || 'Company Name', 
            fontSize: 8, 
            color: '#9ca3af',
            margin: [40, 10, 0, 0]
          },
          { 
            text: `Page ${currentPage} of ${pageCount}`, 
            alignment: 'right',
            fontSize: 8,
            color: '#9ca3af',
            margin: [0, 10, 40, 0]
          }
        ]
      }),
      styles: {
        invoiceTitle: {
          fontSize: 28,
          bold: true
        },
        invoiceNumber: {
          fontSize: 16,
          bold: true,
          color: '#1f2937'
        },
        sectionHeader: {
          fontSize: 11,
          bold: true,
          margin: [0, 0, 0, 5]
        },
        tableHeader: {
          bold: true,
          fontSize: 10
        },
        tableCell: {
          fontSize: 9
        },
        continuationHeader: {
          fontSize: 14,
          bold: true,
          color: '#6b7280'
        }
      },
      content: content
    };

    try {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.download(`Invoice_${printingInvoice.invoice_number}_${formatDate(printingInvoice.invoice_date)}.pdf`);
      setShowPrintPreview(false);
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
                <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-blue-600">
                      INVOICE
                    </h1>
                    <p className="text-xl font-semibold text-gray-800 mt-2">
                      {printingInvoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Invoice ID: #{printingInvoice.id}
                    </p>
                  </div>
                  {selectedCompany?.company_logo && (
                    <img
                      src={`https://powerkeybackend-production.up.railway.app${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-20 w-auto max-w-[180px] object-contain"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Bill To</h3>
                    <p className="font-semibold text-gray-900 text-base mb-2">{printingInvoice.customer_name || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-600 mb-1">{printingInvoice.customer_billing_address || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mb-1">Phone: {printingInvoice.customer_phone || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mb-1">Email: {printingInvoice.customer_email || 'N/A'}</p>
                    <p className="text-sm text-gray-600">VAT No: {printingInvoice.customer_tax_number || 'N/A'}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Invoice Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Invoice Date:</span>
                        <span className="text-sm text-gray-900">{formatDate(printingInvoice.invoice_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Due Date:</span>
                        <span className="text-sm text-gray-900">{formatDate(printingInvoice.due_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span className={`text-sm font-semibold ${printingInvoice.status === 'paid' ? 'text-green-600' : printingInvoice.status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                          {printingInvoice.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Company VAT:</span>
                        <span className="text-sm text-gray-900">{selectedCompany?.tax_number || 'N/A'}</span>
                      </div>
                      {selectedCompany?.is_taxable && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="px-3 py-1 bg-red-100 text-red-700 font-bold text-sm rounded">
                            TAX INVOICE
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {printingInvoice.head_note && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <p className="text-sm text-gray-700 italic">{printingInvoice.head_note}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Items</h3>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-3 py-3 text-left text-xs font-semibold">#</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold">Product</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold">Description</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold">Qty</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold">Unit Price</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold">Tax %</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-sm border-b">{index + 1}</td>
                          <td className="px-3 py-2 text-sm border-b font-medium">
                            {products.find((p) => p.id === item.product_id)?.name || 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-sm border-b text-gray-600">{item.description || '-'}</td>
                          <td className="px-3 py-2 text-sm border-b text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm border-b text-right">
                            Rs. {Number(item.actual_unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-sm border-b text-center">{item.tax_rate}%</td>
                          <td className="px-3 py-2 text-sm border-b text-right font-semibold">
                            Rs. {Number(item.total_price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    {printingInvoice.notes && (
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Notes</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{printingInvoice.notes}</p>
                      </div>
                    )}
                    {printingInvoice.terms && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Terms & Conditions</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{printingInvoice.terms}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">Rs. {Number(printingInvoice.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-red-600">- Rs. {Number(printingInvoice.discount_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium">Rs. {Number(printingInvoice.shipping_cost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b pb-2">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">Rs. {Number(printingInvoice.tax_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold bg-gray-800 text-white p-3 rounded">
                          <span>TOTAL:</span>
                          <span>Rs. {Number(printingInvoice.total_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Paid:</span>
                          <span className="font-semibold">Rs. {Number(printingInvoice.paid_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold bg-yellow-100 text-yellow-900 p-3 rounded">
                          <span>BALANCE DUE:</span>
                          <span>Rs. {Number(printingInvoice.balance_due || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 border-t-2 pt-6 mt-8">
                  <div>
                    <div className="border-b border-gray-300 pb-1 mb-2"></div>
                    <p className="text-center text-sm font-medium text-gray-600 mb-4">Customer Signature</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>Name: _________________________</p>
                      <p>NIC: _________________________</p>
                      <p>Contact: _________________________</p>
                      <p>Vehicle No: _________________________</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-gray-300 pb-1 mb-2"></div>
                    <p className="text-center text-sm font-medium text-gray-600 mb-4">Authorized Signature</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>Created by: {printingInvoice.employee_name || 'N/A'}</p>
                      <p>Checked by: _________________________</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
                  <p>Thank you for your business!</p>
                  <p className="mt-1">{selectedCompany?.name || 'Company Name'}</p>
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
                <Printer className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}