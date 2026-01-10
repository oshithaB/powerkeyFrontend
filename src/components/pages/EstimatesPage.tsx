import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Edit, Trash2, FileText, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { useSocket } from '../../contexts/SocketContext';

(pdfMake as any).vfs = pdfFonts;

interface Estimate {
  id: number;
  estimate_number: string;
  customer_id: number;
  customer_name?: string;
  billing_address?: string;
  shipping_address?: string;
  employee_id: number;
  employee_name: string;
  estimate_date: string;
  head_note?: string | null;
  shipping_cost?: number | null;
  expiry_date?: string | null;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'closed' | 'converted';
  notes: string;
  terms: string;
  is_active: boolean;
  invoice_id: number | null;
  created_at: string;
  is_locked?: boolean;
  locked_by?: User | null;
}

interface EstimateItem {
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

export default function EstimatesPage() {
  const { selectedCompany } = useCompany();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [printingEstimate, setPrintingEstimate] = useState<Estimate | null>(null);
  const [printItems, setPrintItems] = useState<EstimateItem[]>([]);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const socketRef = useSocket();
  const [lockedEstimates, setLockedEstimates] = useState<{ [key: number]: User }>({});


  useEffect(() => {
    fetchEstimates();
    fetchData();
  }, [selectedCompany]);

  const fetchEstimates = async () => {
    try {
      console.log('Fetching requests for company estimates sent.');
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getEstimates/${selectedCompany?.company_id}`);
      setEstimates(response.data);
      console.log('Fetched estimates:', response.data);
      console.log(estimates);
    } catch (error) {
      console.error('Error fetching estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      console.log('Fetching customers, employees, products, and tax rates for company sent.');
      const [customersRes, employeesRes, productsRes, taxRatesRes] = await Promise.all([
        axiosInstance.get(`http://147.79.115.89:3000/api/getCustomers/${selectedCompany?.company_id}`),
        axiosInstance.get(`http://147.79.115.89:3000/api/employees/`),
        axiosInstance.get(`http://147.79.115.89:3000/api/getProducts/${selectedCompany?.company_id}`),
        axiosInstance.get(`http://147.79.115.89:3000/api/tax-rates/${selectedCompany?.company_id}`)
      ]);

      console.log('customers, employees, products, and tax rates fetched successfully.');
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
    console.log('Socket in estimate page:', socket);
    if (!socket) return;

    socket.emit('start_listening_estimates');
    console.log('Socket in estimate page emit start_listening_estimates');

    socket.on('locked_estimates', (locked_estimates) => {
      setLockedEstimates(locked_estimates);
      console.log('Received locked estimates:', locked_estimates);
    });

    // Listen for expired estimates
    socket.on('expired_estimates_closed', (data) => {
      console.log('Expired estimates event received:', data);

      // Re-fetch the estimates from backend
      fetchEstimates();
    });

    return () => {
      socket.off('locked_estimates');
      socket.off('expired_estimates_closed');
    };

  }, [selectedCompany]);

  const convertEstimatesToLocked = () => {
    if (estimates.length === 0) {
      console.log('No estimates to update.');
      return;
    }

    console.log('Updating estimates with locked status:', lockedEstimates);

    setEstimates(prevEstimates => {
      const updatedEstimates = prevEstimates.map(estimate => {
        if (lockedEstimates[estimate.id]) {
          return {
            ...estimate,
            is_locked: true,
            locked_by: lockedEstimates[estimate.id]
          };
        } else {
          return {
            ...estimate,
            is_locked: false,
            locked_by: null
          };
        }
      });

      // Check if anything actually changed
      const changed = updatedEstimates.some((est, index) => {
        const prev = prevEstimates[index];
        return (
          est.is_locked !== prev.is_locked ||
          JSON.stringify(est.locked_by) !== JSON.stringify(prev.locked_by)
        );
      });

      return changed ? updatedEstimates : prevEstimates;
    });
  };

  useEffect(() => {
    convertEstimatesToLocked();
  }, [lockedEstimates, estimates]);

  const fetchEstimateItems = async (estimateId: number) => {
    try {
      const response = await axiosInstance.get(`http://147.79.115.89:3000/api/estimatesItems/${selectedCompany?.company_id}/${estimateId}`);
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
      console.error('Error fetching estimate items:', error);
      return [];
    }
  };

  const handleEdit = async (estimate: Estimate) => {
    const fetchedItems = await fetchEstimateItems(estimate.id);
    navigate(`/estimates/edit/${estimate.id}`, { state: { estimate, items: fetchedItems } });
  };


  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      try {
        await axiosInstance.delete(`http://147.79.115.89:3000/api/deleteEstimate/${selectedCompany?.company_id}/${id}`);
        fetchEstimates();
      } catch (error: any) {
        const backendMessage = error.response?.data?.error;
        alert(backendMessage || 'Failed to delete estimate');
        console.error('Error deleting estimate:', error);
      }
    }
  };

  const handleConvertToInvoice = (estimate: Estimate) => {
    if (window.confirm('Convert this estimate to an invoice?')) {
      navigate('/invoices/create', { state: { estimateId: estimate.id } });
    }
  };

  const handlePrint = async (estimate: Estimate) => {
    try {
      setPrintingEstimate(estimate);
      const fetchedItems = await fetchEstimateItems(estimate.id);
      setPrintItems(fetchedItems);
      handleDownloadPDF(estimate, fetchedItems);
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

  const handleDownloadPDF = async (estimateOverride?: Estimate, itemsOverride?: EstimateItem[]) => {
    const estimate = estimateOverride || printingEstimate;
    const items = itemsOverride || printItems;

    if (!estimate || !items) return;

    const ITEMS_PER_PAGE = 20;

    let logoDataUrl = '';
    if (selectedCompany?.company_logo) {
      logoDataUrl = await getImageDataUrl(`http://147.79.115.89:3000${selectedCompany.company_logo}`);
    }

    const formatDateLocal = (isoDate: string | Date | null | undefined) => {
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
                  { text: selectedCompany?.is_taxable ? 'TAX ESTIMATE' : 'ESTIMATE', fontSize: 28, bold: true, color: '#2563eb', margin: [0, 0, 0, 4] },
                  { text: estimate.estimate_number, fontSize: 16, bold: true, color: '#1f2937' }
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
                  { text: estimate.customer_name || 'Unknown Customer', fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
                  { text: estimate.billing_address || 'N/A', fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 2] },
                ]
              },
              {
                width: '4%',
                text: ''
              },
              {
                width: '48%',
                stack: [
                  { text: 'ESTIMATE DETAILS', fontSize: 10, bold: true, color: '#1f2937', alignment: 'right', margin: [0, 0, 0, 6] },
                  {
                    table: {
                      widths: ['*', 'auto'],
                      body: [
                        [
                          { text: 'Estimate Date:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { text: formatDateLocal(estimate.estimate_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ],
                        [
                          { text: 'Expiry Date:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          { text: formatDateLocal(estimate.expiry_date), fontSize: 9, alignment: 'right', border: [false, false, false, false] }
                        ],
                        [
                          { text: 'Status:', fontSize: 9, bold: true, border: [false, false, false, false] },
                          {
                            text: estimate.status.toUpperCase(),
                            fontSize: 9,
                            bold: true,
                            alignment: 'right',
                            color: estimate.status === 'accepted' ? '#059669' : estimate.status === 'declined' ? '#dc2626' : '#6b7280',
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
          estimate.head_note ? {
            text: estimate.head_note,
            fontSize: 9,
            italics: true,
            color: '#4b5563',
            fillColor: '#fef3c7',
            margin: [6, 6, 6, 6]
          } : null,
          estimate.head_note ? { text: '', margin: [0, 0, 0, 10] } : null
        ].filter(Boolean);
      } else {
        return [
          {
            text: `Estimate ${estimate.estimate_number} - Continued`,
            fontSize: 14,
            bold: true,
            color: '#6b7280',
            margin: [0, 0, 0, 12]
          }
        ];
      }
    };

    const createItemsTable = (items: EstimateItem[], startIndex: number) => {
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
          { text: `Rs. ${Number(item.actual_unit_price || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [3, 4, 3, 4] },
          { text: `Rs. ${exclusiveTotal.toFixed(2)}`, fontSize: 9, bold: true, alignment: 'right', margin: [3, 4, 3, 4] }
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
      // Calculate subtotal from exclusive item totals
      const exclusiveSubtotal = printItems.reduce((acc, item) => {
        return acc + ((Number(item.quantity) || 0) * (Number(item.actual_unit_price) || 0));
      }, 0);

      return {
        columns: [
          {
            width: '55%',
            stack: [
              estimate.notes ? {
                stack: [
                  { text: 'Notes', fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
                  { text: estimate.notes, fontSize: 9, color: '#4b5563', margin: [0, 0, 0, 10] }
                ]
              } : {},
              estimate.terms ? {
                stack: [
                  { text: 'Terms & Conditions', fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
                  { text: estimate.terms, fontSize: 9, color: '#4b5563' }
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
                  { text: `Rs. ${exclusiveSubtotal.toFixed(2)}`, fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'Discount:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                  { text: `Rs. ${Number(estimate.discount_amount || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', color: '#dc2626', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'Shipping:', fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 10, 3] },
                  { text: `Rs. ${Number(estimate.shipping_cost || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', border: [false, false, false, false], margin: [0, 3, 0, 3] }
                ],
                [
                  { text: 'Tax:', fontSize: 9, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#e5e7eb'], margin: [0, 3, 10, 6] },
                  { text: `Rs. ${Number(estimate.tax_amount || 0).toFixed(2)}`, fontSize: 9, alignment: 'right', border: [false, false, false, true], borderColor: ['', '', '', '#e5e7eb'], margin: [0, 3, 0, 6] }
                ],
                [
                  { text: 'TOTAL:', fontSize: 11, bold: true, alignment: 'right', margin: [0, 6, 10, 6] },
                  { text: `Rs. ${Number(estimate.total_amount || 0).toFixed(2)}`, fontSize: 11, bold: true, alignment: 'right', margin: [0, 6, 0, 6] }
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
      };
    };
    const createSignatureSection = () => ({
      margin: [0, 30, 0, 0],
      columns: [
        {
          width: '45%',
          text: ''
        },
        {
          width: '10%',
          text: ''
        },
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
                    { text: 'Created by:', fontSize: 8, color: '#6b7280', border: [false, false, false, false], margin: [0, 5, 0, 0] },
                    { text: estimate.employee_name || 'N/A', fontSize: 8, color: '#1f2937', border: [false, false, false, true], borderColor: ['#9ca3af', '#9ca3af', '#9ca3af', '#d1d5db'], margin: [0, 5, 0, 0] }
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

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === totalPages - 1;
      const startIndex = pageIndex * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, items.length);
      const pageItems = items.slice(startIndex, endIndex);

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
      pdfDocGenerator.download(`Estimate_${estimate.estimate_number}_${formatDateLocal(estimate.estimate_date)}.pdf`);
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
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  useEffect(() => {
    if (customerFilter) {
      const filteredSuggestions = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerFilter.toLowerCase())
      );
      setCustomerSuggestions(filteredSuggestions);
    } else {
      setCustomerSuggestions([]);
    }
  }, [customerFilter, customers]);

  const filteredEstimates = estimates.filter(estimate =>
    (estimate.estimate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.billing_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.shipping_address?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === '' || estimate.status === statusFilter) &&
    (dateFilter === '' || estimate.estimate_date === dateFilter) &&
    (customerFilter === '' || estimate.customer_name?.toLowerCase() === customerFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900"></h1>
        <button
          onClick={() => {
            navigate("/estimates/create");
          }}
          className="btn btn-primary btn-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="input pr-3 w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Estimates</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            className="input pr-3 w-full"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* Customer Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          <div className="relative">
            <input
              type="text"
              className="input pr-3 w-full"
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setCustomerSuggestions(customers);
              }}
              onFocus={() => setCustomerSuggestions(customers)}
              placeholder="Search customers..."
              onBlur={() => setTimeout(() => setCustomerSuggestions([]), 100)}
            />
            {customerSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto w-full">
                {customerSuggestions
                  .filter((customer) =>
                    customer.name.toLowerCase().includes(customerFilter.toLowerCase())
                  )
                  .map((customer) => (
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
      </div>

      {/* Estimates Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimate
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
              {filteredEstimates.map((estimate) => (
                <React.Fragment key={estimate.id}>
                  {estimate.is_locked ? (
                    <tr className="bg-gray-100">
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        This estimate is currently being edited by{" "}
                        {estimate.locked_by?.fullname || "another user"}.
                      </td>
                    </tr>
                  ) : (
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {estimate.estimate_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{estimate.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {estimate.customer_name || "Unknown Customer"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {estimate.employee_name || "Not assigned"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(
                            new Date(estimate.estimate_date),
                            "MMM dd, yyyy"
                          )}
                        </div>
                        {estimate.expiry_date && (
                          <div className="text-sm text-gray-500">
                            Expires:{" "}
                            {format(
                              new Date(estimate.expiry_date),
                              "MMM dd, yyyy"
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Rs.{" "}
                          {estimate.total_amount?.toLocaleString() || "0.00"}
                        </div>
                        {estimate.discount_amount > 0 && (
                          <div className="text-sm text-gray-500">
                            Discount: Rs.{" "}
                            {estimate.discount_amount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            estimate.status
                          )}`}
                        >
                          {estimate.status.charAt(0).toUpperCase() +
                            estimate.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {estimate.status !== "closed" && (
                            <button
                              onClick={() => handleEdit(estimate)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrint(estimate)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Download PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {(estimate.status !== "converted" && estimate.status !== "closed") && (
                            <button
                              onClick={() =>
                                handleConvertToInvoice(estimate)
                              }
                              className="text-green-600 hover:text-green-900"
                              title="Convert to Invoice"
                            >
                              <FileText className="h-4 w-4" />
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
    </div>
  );
}