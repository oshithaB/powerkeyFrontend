import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../../axiosInstance';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../../contexts/CompanyContext';

interface OrderItem {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone: string;
  order_no: string;
  order_date: string;
  status: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_cost_price: string;
  total_cost_price: string;
}

interface SupplierInfo {
  vendor_id: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone: string;
}

const SupplierBalanceDetails: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { vendor_id } = useParams<{ vendor_id: string }>();
  const [data, setData] = useState<OrderItem[]>([]);
  const [supplierInfo, setSupplierInfo] = useState<SupplierInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filter, setFilter] = useState<string>('year');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDate, setStartDate] = useState<string>('');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency', 
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchSupplierBalanceDetail = async (startDate?: string, endDate?: string) => {
    if (!selectedCompany?.company_id || !vendor_id) {
      setError('Missing company or supplier information');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(
        `/api/supplier-balance-detail/${selectedCompany.company_id}/${vendor_id}`,
        {
          params: { start_date: startDate, end_date: endDate }
        }
      );

      setData(response.data.data);

      // Extract supplier info from first record
      if (response.data.data.length > 0) {
        const firstRecord = response.data.data[0];
        setSupplierInfo({
          vendor_id: firstRecord.vendor_id,
          vendor_name: firstRecord.vendor_name,
          vendor_email: firstRecord.vendor_email,
          vendor_phone: firstRecord.vendor_phone
        });
      }
    } catch (err) {
      setError('Failed to fetch supplier balance details. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id && vendor_id) {
      if (isCustomRange) {
        return;
      }
      
      const today = new Date();
      let startDate: string | undefined;
      let endDate: string = today.toISOString().split('T')[0];
  
      if (filter === 'week') {
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
      } else if (filter === 'month') {
        startDate = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
      } else if (filter === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      }
  
      setPeriodStart(startDate || '');
      setPeriodEnd(endDate);
      fetchSupplierBalanceDetail(startDate, endDate);
    } else {
      setError('Please select a company to view supplier balance details');
      setLoading(false);
    }
  }, [selectedCompany?.company_id, vendor_id, filter, isCustomRange]);

  const getTotalAmount = () => {
    return data.reduce((total, item) => total + parseFloat(item.total_cost_price), 0);
  };

  const getUniqueOrders = () => {
    const orderMap = new Map();
    data.forEach(item => {
      if (!orderMap.has(item.order_no)) {
        orderMap.set(item.order_no, {
          order_no: item.order_no,
          order_date: item.order_date,
          status: item.status,
          total: data
            .filter(d => d.order_no === item.order_no)
            .reduce((sum, d) => sum + parseFloat(d.total_cost_price), 0)
        });
      }
    });
    return Array.from(orderMap.values());
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handleDownloadPDF = async () => {
    try {
      if (printRef.current) {
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

        const filename = `supplier-balance-detail-${vendor_id}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
        setShowPrintPreview(false);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF.');
    }
  };

  const printStyles = `
    @media print {
      .section-header {
        background-color: #e2e8f0 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    .section-header {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  `;

  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please select a company to view supplier balance details.</p>
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/reports/supplier-balance-summary')}
                  className="text-gray-400 hover:text-gray-600"
                  title="Back to Summary"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Supplier Balance Details</h1>
              </div>
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Filter Period</label>
                  <select
                    value={isCustomRange ? 'custom' : filter}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'custom') {
                        setIsCustomRange(true);
                        setFilter('');
                      } else {
                        setIsCustomRange(false);
                        setFilter(value);
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className="border rounded-md p-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Select Period</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                
                {isCustomRange && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded-md p-2"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded-md p-2"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (startDate && endDate) {
                          fetchSupplierBalanceDetail(startDate, endDate);
                        }
                      }}
                      disabled={!startDate || !endDate}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </>
                )}
                
                <button
                  onClick={handlePrint}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Print Report"
                  disabled={loading || !data.length}
                >
                  <Printer className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigate('/dashboard/reports')}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Supplier Information */}
            {supplierInfo && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-2">Supplier Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{supplierInfo.vendor_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium">{supplierInfo.vendor_email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone:</span>
                    <p className="font-medium">{supplierInfo.vendor_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            <div id="print-content">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm">Order Details - {selectedCompany.name}</p>
                <p className="text-sm text-gray-600">
                  {filter === 'week' && `Last 7 days: ${formatDate(periodStart)} - ${formatDate(periodEnd)} `}
                  {filter === 'month' && `Last 1 month: ${formatDate(periodStart)} - ${formatDate(periodEnd)} `}
                  {filter === 'year' && `Year to Date: ${formatDate(periodStart)} - ${formatDate(periodEnd)} `}
                  {isCustomRange && startDate && endDate && `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)} `}
                </p>
              </div>

              {error && <div className="text-red-500 mb-4">{error}</div>}
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-600">Loading data...</p>
                </div>
              )}
              
              {!loading && !error && data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No order data available for the selected supplier and period.
                </div>
              )}
              
              {!loading && !error && data.length > 0 && (
                <>
                  {/* Order Summary */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                    <table className="w-full border-collapse mb-6">
                      <thead>
                        <tr>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Order No</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Order Date</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-center" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Status</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getUniqueOrders().map((order, index) => (
                          <tr key={order.order_no} className="hover:bg-gray-50">
                            <td className="p-2 border-b font-medium">{order.order_no}</td>
                            <td className="p-2 border-b">{formatDate(order.order_date)}</td>
                            <td className="p-2 border-b text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-2 border-b text-right">{formatCurrency(order.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Detailed Items */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Order Items Detail</h3>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="bg-gray-100 p-2 font-semibold text-sm border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Order No</th>
                          <th className="bg-gray-100 p-2 font-semibold text-sm border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Product Name</th>
                          <th className="bg-gray-100 p-2 font-semibold text-sm border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>SKU</th>
                          <th className="bg-gray-100 p-2 font-semibold text-sm border-b section-header text-center" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Quantity</th>
                          <th className="bg-gray-100 p-2 font-semibold text-sm border-b section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Unit Price</th>
                          <th className="bg-gray-100 p-2 font-semibold text-sm border-b section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Total Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={`${item.order_no}-${index}`} className="hover:bg-gray-50">
                            <td className="p-2 border-b text-sm">{item.order_no}</td>
                            <td className="p-2 border-b text-sm">{item.product_name || 'N/A'}</td>
                            <td className="p-2 border-b text-sm">{item.product_sku || 'N/A'}</td>
                            <td className="p-2 border-b text-center text-sm">{item.quantity}</td>
                            <td className="p-2 border-b text-right text-sm">{formatCurrency(item.unit_cost_price)}</td>
                            <td className="p-2 border-b text-right text-sm font-medium">{formatCurrency(item.total_cost_price)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="p-2 border-t-2 border-gray-800 font-bold text-sm" colSpan={5}>Total Outstanding Balance</td>
                          <td className="p-2 border-t-2 border-gray-800 font-bold text-right text-lg">{formatCurrency(getTotalAmount())}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p className="text-sm mt-5">Report generated at {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Print Preview Modal */}
      {showPrintPreview && data.length > 0 && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50"
          style={{ marginTop: "-10px" }}
        >
          <div className="relative top-4 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Supplier Balance Details
              </h3>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[70vh]">
              <div
                ref={printRef}
                className="p-8 bg-white text-gray-900"
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Supplier Balance Details</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Order Details Report</h2>
                    <h2 className="text-xl text-gray-600 mb-2">
                      {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                    </h2>
                    <p className="text-sm text-gray-600">
                      {filter === 'week' && `Last 7 days: ${formatDate(periodStart)} - ${formatDate(periodEnd)} `}
                      {filter === 'month' && `Last 1 month: ${formatDate(periodStart)} - ${formatDate(periodEnd)} `}
                      {filter === 'year' && `Year to Date: ${formatDate(periodStart)} - ${formatDate(periodEnd)} `}
                      {isCustomRange && startDate && endDate && `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)} `}
                    </p>
                    {supplierInfo && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <h4 className="font-semibold mb-2">Supplier: {supplierInfo.vendor_name}</h4>
                        <p className="text-sm text-gray-600">Email: {supplierInfo.vendor_email || 'N/A'} | Phone: {supplierInfo.vendor_phone || 'N/A'}</p>
                      </div>
                    )}
                  </div>

                  {selectedCompany?.company_logo && (
                    <img
                      src={`http://localhost:3000${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-20 w-auto max-w-[200px] object-contain"
                    />
                  )}
                </div>

                {/* Order Summary */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4">ORDER SUMMARY</h3>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-2 font-bold text-sm border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>ORDER NO</th>
                        <th className="bg-gray-100 p-2 font-bold text-sm border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>ORDER DATE</th>
                        <th className="bg-gray-100 p-2 font-bold text-sm border section-header text-center" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>STATUS</th>
                        <th className="bg-gray-100 p-2 font-bold text-sm border section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>TOTAL AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getUniqueOrders().map((order, index) => (
                        <tr key={order.order_no}>
                          <td className="p-2 border-b font-medium text-sm">{order.order_no}</td>
                          <td className="p-2 border-b text-sm">{formatDate(order.order_date)}</td>
                          <td className="p-2 border-b text-center text-sm">{order.status}</td>
                          <td className="p-2 border-b text-right text-sm font-medium">{formatCurrency(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Items */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4">ORDER ITEMS DETAIL</h3>
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-2 font-bold text-xs border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>ORDER NO</th>
                        <th className="bg-gray-100 p-2 font-bold text-xs border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>PRODUCT</th>
                        <th className="bg-gray-100 p-2 font-bold text-xs border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>SKU</th>
                        <th className="bg-gray-100 p-2 font-bold text-xs border section-header text-center" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>QTY</th>
                        <th className="bg-gray-100 p-2 font-bold text-xs border section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>UNIT PRICE</th>
                        <th className="bg-gray-100 p-2 font-bold text-xs border section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>TOTAL PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr key={`${item.order_no}-${index}`}>
                          <td className="p-2 border-b text-xs">{item.order_no}</td>
                          <td className="p-2 border-b text-xs">{item.product_name || 'N/A'}</td>
                          <td className="p-2 border-b text-xs">{item.product_sku || 'N/A'}</td>
                          <td className="p-2 border-b text-center text-xs">{item.quantity}</td>
                          <td className="p-2 border-b text-right text-xs">{formatCurrency(item.unit_cost_price)}</td>
                          <td className="p-2 border-b text-right text-xs font-medium">{formatCurrency(item.total_cost_price)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-2 border-t-2 border-gray-800 font-bold text-xs" colSpan={5}>TOTAL OUTSTANDING BALANCE</td>
                        <td className="p-2 border-t-2 border-gray-800 font-bold text-right text-sm">{formatCurrency(getTotalAmount())}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        Report generated at: {new Date().toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Supplier Balance Details - {supplierInfo?.vendor_name || 'Supplier'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowPrintPreview(false)}
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
    </>
  );
};

export default SupplierBalanceDetails;