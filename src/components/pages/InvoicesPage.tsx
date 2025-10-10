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
    if (!printingInvoice || !printItems) return;

    const ITEMS_PER_PAGE = 20;
    
    let logoDataUrl = '';
    if (selectedCompany?.company_logo) {
      logoDataUrl = await getImageDataUrl(`https://powerkeybackend-production.up.railway.app${selectedCompany.company_logo}`);
    }

    const createHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        return [
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'INVOICE', fontSize: 28, bold: true, color: '#2563eb', margin: [0, 0, 0, 4] },
                  { text: printingInvoice.invoice_number, fontSize: 16, bold: true, color: '#1f2937' }
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
                  { text: printingInvoice.customer_name || 'Unknown Customer', fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
                  { text: printingInvoice.customer_billing_address || 'N/A', fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                  { text: `Phone: ${printingInvoice.customer_phone || 'N/A'}`, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                  { text: `Email: ${printingInvoice.customer_email || 'N/A'}`, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                  { text: `VAT No: ${printingInvoice.customer_tax_number || 'N/A'}`, fontSize: 9, color: '#4b5563' }
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
                          { text: formatDate(printingInvoice.invoice_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ],
                        [
                          { text: 'Due Date:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { text: formatDate(printingInvoice.due_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ],
                        [
                          { text: 'Status:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { 
                            text: printingInvoice.status.toUpperCase().replace('_', ' '), 
                            fontSize: 9, 
                            bold: true,
                            alignment: 'right',
                            color: printingInvoice.status === 'paid' ? '#059669' : printingInvoice.status === 'overdue' ? '#dc2626' : '#6b7280',
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
                  selectedCompany?.is_taxable ? {
                    text: 'TAX INVOICE',
                    fontSize: 10,
                    bold: true,
                    color: '#dc2626',
                    alignment: 'right',
                    margin: [0, 6, 0, 0]
                  } : { text: '' }
                ]
              }
            ],
            margin: [0, 0, 0, 15]
          },
          printingInvoice.head_note ? {
            text: printingInvoice.head_note,
            fontSize: 9,
            italics: true,
            color: '#4b5563',
            fillColor: '#fef3c7',
            margin: [6, 6, 6, 6]
          } : null,
          printingInvoice.head_note ? { text: '', margin: [0, 0, 0, 10] } : null
        ].filter(Boolean);
      } else {
        return [
          {
            text: `Invoice ${printingInvoice.invoice_number} - Continued`,
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
          { text: '#', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', margin: [4, 5, 4, 5] },
          { text: 'Product', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', margin: [4, 5, 4, 5] },
          { text: 'Description', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', margin: [4, 5, 4, 5] },
          { text: 'Qty', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'center', margin: [4, 5, 4, 5] },
          { text: 'Unit Price', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [4, 5, 4, 5] },
          { text: 'Tax %', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'center', margin: [4, 5, 4, 5] },
          { text: 'Total', fontSize: 10, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [4, 5, 4, 5] }
        ]
      ];

      items.forEach((item, index) => {
        tableBody.push([
          { text: (startIndex + index + 1).toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
          { text: products.find((p) => p.id === item.product_id)?.name || 'N/A', fontSize: 9, margin: [3, 4, 3, 4] },
          { text: item.description || '-', fontSize: 8.5, color: '#4b5563', margin: [3, 4, 3, 4] },
          { text: item.quantity.toString(), fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
          { text: `Rs. ${Number(item.actual_unit_price || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [3, 4, 3, 4] },
          { text: `${item.tax_rate}%`, fontSize: 9, alignment: 'center', margin: [3, 4, 3, 4] },
          { text: `Rs. ${Number(item.total_price || 0).toFixed(2)}`, fontSize: 9, bold: true, alignment: 'right', margin: [3, 4, 3, 4] }
        ]);
      });

      return {
        table: {
          headerRows: 1,
          widths: [30, 'auto', '*', 35, 65, 35, 75],
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
          stack: [
            printingInvoice.notes ? {
              stack: [
                { text: 'Notes', fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
                { text: printingInvoice.notes, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 10] }
              ]
            } : {},
            printingInvoice.terms ? {
              stack: [
                { text: 'Terms & Conditions', fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
                { text: printingInvoice.terms, fontSize: 9, color: '#4b5563' }
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
                { text: `Rs. ${Number(printingInvoice.subtotal || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 0, 3] }
              ],
              [
                { text: 'Discount:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                { text: `Rs. ${Number(printingInvoice.discount_amount || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', color: '#dc2626', border: [false, false, false, false], margin: [0, 3, 0, 3] }
              ],
              [
                { text: 'Shipping:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                { text: `Rs. ${Number(printingInvoice.shipping_cost || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 0, 3] }
              ],
              [
                { text: 'Tax:', fontSize: 9, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#e5e7eb'], margin: [0, 3, 10, 6] },
                { text: `Rs. ${Number(printingInvoice.tax_amount || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#e5e7eb'], margin: [0, 3, 0, 6] }
              ],
              [
                { text: 'TOTAL:', fontSize: 11, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [0, 6, 10, 6] },
                { text: `Rs. ${Number(printingInvoice.total_amount || 0).toFixed(2)}`, fontSize: 11, bold: true, fillColor: '#1f2937', color: '#ffffff', alignment: 'right', margin: [0, 6, 0, 6] }
              ],
              [
                { text: 'Paid:', fontSize: 9, alignment: 'right', color: '#059669', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                { text: `Rs. ${Number(printingInvoice.paid_amount || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', color: '#059669', border: [false, false, false, false], margin: [0, 3, 0, 3] }
              ],
              [
                { text: 'BALANCE DUE:', fontSize: 10, bold: true, fillColor: '#fef3c7', color: '#92400e', alignment: 'right', margin: [0, 6, 10, 6] },
                { text: `Rs. ${Number(printingInvoice.balance_due || 0).toFixed(2)}`, fontSize: 10, bold: true, fillColor: '#fef3c7', color: '#92400e', alignment: 'right', margin: [0, 6, 0, 6] }
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
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#9ca3af' }], margin: [0, 0, 0, 4] },
            { text: 'Customer Signature', fontSize: 8, color: '#6b7280', alignment: 'center', margin: [0, 0, 0, 8] },
            { text: 'Name: _______________________', fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 3] },
            { text: 'NIC: _______________________', fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 3] },
            { text: 'Contact: _______________________', fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 3] },
            { text: 'Vehicle No: _______________________', fontSize: 8, color: '#6b7280' }
          ]
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
            { text: `Created by: ${printingInvoice.employee_name || 'N/A'}`, fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 3] },
            { text: 'Checked by: _______________________', fontSize: 8, color: '#6b7280' }
          ]
        }
      ]
    });

    const content: any[] = [];
    
    const totalPages = Math.ceil(printItems.length / ITEMS_PER_PAGE);
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, printItems.length);
      const pageItems = printItems.slice(startIndex, endIndex);

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
      pdfDocGenerator.download(`Invoice_${printingInvoice.invoice_number}_${formatDate(printingInvoice.invoice_date)}.pdf`);
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Invoice {printingInvoice.invoice_number}
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

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-sm text-blue-700">
                <strong>PDF Preview:</strong> This invoice will be generated with pdfMake.
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Total Items:</strong> {printItems.length} | <strong>Pages:</strong> {Math.ceil(printItems.length / 20)} (20 items per page)
              </p>
            </div>

            <div className="overflow-y-auto max-h-[60vh] bg-gray-100 p-4">
              <div className="bg-white p-8 shadow-lg">
                <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-blue-600">INVOICE</h1>
                    <p className="text-xl font-semibold text-gray-800 mt-2">
                      {printingInvoice.invoice_number}
                    </p>
                  </div>
                  {selectedCompany?.company_logo && (
                    <img
                      src={`https://powerkeybackend-production.up.railway.app${selectedCompany.company_logo}`}
                      alt="Company Logo"
                      className="h-20 w-auto object-contain"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Bill To</h3>
                    <p className="font-semibold">{printingInvoice.customer_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{printingInvoice.customer_billing_address || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Phone: {printingInvoice.customer_phone || 'N/A'}</p>
                    <p className="text-sm text-gray-600">VAT: {printingInvoice.customer_tax_number || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Invoice Details</h3>
                    <p className="text-sm">Invoice Date: {formatDate(printingInvoice.invoice_date)}</p>
                    <p className="text-sm">Due Date: {formatDate(printingInvoice.due_date)}</p>
                    <p className="text-sm">Status: <span className="font-semibold">{printingInvoice.status.toUpperCase()}</span></p>
                    {selectedCompany?.is_taxable && (
                      <p className="text-sm font-bold text-red-600 mt-2">TAX INVOICE</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 bg-yellow-50 p-2 rounded">
                  📄 Preview showing first 20 items. PDF will contain all {printItems.length} items across {Math.ceil(printItems.length / 20)} page(s)
                </p>

                <table className="w-full text-sm border-collapse mb-6">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Product</th>
                      <th className="px-2 py-2 text-left">Description</th>
                      <th className="px-2 py-2 text-center">Qty</th>
                      <th className="px-2 py-2 text-right">Price</th>
                      <th className="px-2 py-2 text-center">Tax%</th>
                      <th className="px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printItems.slice(0, 20).map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-2">{index + 1}</td>
                        <td className="px-2 py-2">{products.find((p) => p.id === item.product_id)?.name || 'N/A'}</td>
                        <td className="px-2 py-2 text-xs text-gray-600">{item.description || '-'}</td>
                        <td className="px-2 py-2 text-center">{item.quantity}</td>
                        <td className="px-2 py-2 text-right">Rs. {Number(item.actual_unit_price || 0).toFixed(2)}</td>
                        <td className="px-2 py-2 text-center">{item.tax_rate}%</td>
                        <td className="px-2 py-2 text-right font-semibold">Rs. {Number(item.total_price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>Rs. {Number(printingInvoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span className="text-red-600">Rs. {Number(printingInvoice.discount_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>Rs. {Number(printingInvoice.shipping_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b pb-2">
                      <span>Tax:</span>
                      <span>Rs. {Number(printingInvoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold bg-gray-800 text-white p-2 rounded">
                      <span>TOTAL:</span>
                      <span>Rs. {Number(printingInvoice.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid:</span>
                      <span>Rs. {Number(printingInvoice.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold bg-yellow-100 text-yellow-900 p-2 rounded">
                      <span>BALANCE DUE:</span>
                      <span>Rs. {Number(printingInvoice.balance_due || 0).toFixed(2)}</span>
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
                <Printer className="h-4 w-4 mr-2" />
                Download PDF (20 items/page)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}