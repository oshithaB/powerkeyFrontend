import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Plus, Edit, Trash2, FileText, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSocket } from '../../contexts/SocketContext';

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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printingEstimate, setPrintingEstimate] = useState<Estimate | null>(null);
  const [printItems, setPrintItems] = useState<EstimateItem[]>([]);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
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
      const response = await axiosInstance.get(`/api/getEstimates/${selectedCompany?.company_id}`);
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
        axiosInstance.get(`/api/getCustomers/${selectedCompany?.company_id}`),
        axiosInstance.get(`/api/employees/`),
        axiosInstance.get(`/api/getProducts/${selectedCompany?.company_id}`),
        axiosInstance.get(`/api/tax-rates/${selectedCompany?.company_id}`)
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
      const response = await axiosInstance.get(`/api/estimatesItems/${selectedCompany?.company_id}/${estimateId}`);
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
        await axiosInstance.delete(`/api/deleteEstimate/${selectedCompany?.company_id}/${id}`);
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
      setShowPrintPreview(true);
    } catch (error) {
      console.error('Error preparing print preview:', error);
      alert('Failed to load print preview');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      if (printRef.current) {
        // Preload the logo image to ensure it’s available
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
  
        // Create a new jsPDF instance
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxContentHeight = pageHeight - 2 * margin;
  
        // Capture the entire print preview content with high resolution
        const scale = 3; // Increase scale for better quality
        const canvas = await html2canvas(printRef.current, {
          scale,
          useCORS: true,
          logging: false,
          windowWidth: printRef.current.scrollWidth,
          windowHeight: printRef.current.scrollHeight,
        });
        const imgData = canvas.toDataURL('image/png', 1.0); // Ensure maximum quality
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
  
        // Calculate number of pages needed
        const totalPages = Math.ceil(imgHeight / maxContentHeight);
  
        // Add content to PDF, splitting across pages
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
            // Ensure high-quality rendering
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(canvas, 0, srcY, canvas.width, pageContentHeight, 0, 0, canvas.width, pageContentHeight);
            const pageImgData = tempCanvas.toDataURL('image/png', 1.0); // Maximum quality
            pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight - (i * maxContentHeight), maxContentHeight));
          }
        }
  
        // Save the PDF
        pdf.save(`estimate_${printingEstimate?.estimate_number}.pdf`);
        setShowPrintPreview(false);
        setPrintingEstimate(null);
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
                            title="Print"
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
                          <button
                            onClick={() => handleDelete(estimate.id)}
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
              {/* {filteredEstimates.map((estimate, index) =>
                estimate.is_locked ? (
                  <tr key={estimate.id} className="bg-gray-100">
                    <td
                      colSpan={7}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      This estimate is currently being edited by{" "}
                      {estimate.locked_by?.fullname || "another user"}.
                    </td>
                  </tr>
                ) : (
                  <tr key={estimate.id} className="hover:bg-gray-50"></tr>
                )
              )} */}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && printingEstimate && (
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
                  setPrintingEstimate(null);
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
                      Estimate #{printingEstimate.estimate_number}
                    </h1>
                    <p className="text-sm text-gray-600">
                      ID: {printingEstimate.id}
                    </p>
                  </div>
                  {selectedCompany?.company_logo && (
                    <img
                      src={`http://localhost:3000${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-16 w-auto max-w-[150px] object-contain"
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-20 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Address</h3>
                    {/* <p>{printingEstimate.customer_name || 'Unknown Customer'}</p> */}
                    <p>
                      {printingEstimate.billing_address &&
                      printingEstimate.billing_address.trim()
                        ? printingEstimate.billing_address
                        : "No billing address available"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Ship To</h3>
                    <p>
                      {printingEstimate.shipping_address &&
                      printingEstimate.shipping_address.trim()
                        ? printingEstimate.shipping_address
                        : "No shipping address available"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Details</h3>
                    <p>
                      Estimate Date:{" "}
                      {formatDate(printingEstimate.estimate_date) || "N/A"}
                    </p>
                    {printingEstimate.expiry_date && (
                      <p>
                        Expiry Date: {formatDate(printingEstimate.expiry_date)}
                      </p>
                    )}
                    <p>
                      Employee:{" "}
                      {printingEstimate.employee_name || "Not assigned"}
                    </p>
                    {/* <p>
                      Status:{" "}
                      {printingEstimate.status.charAt(0).toUpperCase() +
                        printingEstimate.status.slice(1)}
                    </p> */}
                  </div>
                </div>

                <div>
                {printingEstimate.head_note && (
                  <p className="text-lg mb-5 bg-gray-100 p-4 rounded">
                    {printingEstimate.head_note}
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
                        {/* <th className="px-4 py-2 text-right">Actual Unit Price</th> */}
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
                              ? products.find((p) => p.id === item.product_id)
                                  ?.name || "N/A"
                              : "N/A"}
                          </td>
                          <td className="px-4 py-2">
                            {item.description || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {item.quantity}
                          </td>
                          {/* <td className="px-4 py-2 text-right">
                            Rs. {Number(item.unit_price || 0).toFixed(2)}
                          </td> */}
                          <td className="px-4 py-2 text-right">
                            Rs. {Number(item.actual_unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {item.tax_rate}%
                          </td>
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
                    {printingEstimate.notes && (
                      <div>
                        <h3 className="text-lg font-semibold">Notes</h3>
                        <p className="text-sm">{printingEstimate.notes}</p>
                      </div>
                    )}
                    {printingEstimate.terms && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold">
                          Terms & Conditions
                        </h3>
                        <p className="text-sm">{printingEstimate.terms}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>
                            Rs.{" "}
                            {Number(printingEstimate.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            Discount (
                            {printingEstimate.discount_type === "percentage"
                              ? "%"
                              : "Rs."}
                            ):
                          </span>
                          <span>
                            Rs.{" "}
                            {Number(
                              printingEstimate.discount_amount || 0
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>
                            Shipping Cost
                          </span>
                          <span>
                            Rs.{" "}
                            {Number(printingEstimate.shipping_cost || 0).toFixed(
                              2
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>
                            Rs.{" "}
                            {Number(printingEstimate.tax_amount || 0).toFixed(
                              2
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>
                            Rs.{" "}
                            {Number(printingEstimate.total_amount || 0).toFixed(
                              2
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-500 mt-20">
                    ..........................................................................................{" "}
                    <br />
                    Accepted By
                  </div>

                  <div className="text-center text-sm text-gray-500 mt-20">
                    ..........................................................................................{" "}
                    <br />
                    Accepted Date
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowPrintPreview(false);
                  setPrintingEstimate(null);
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