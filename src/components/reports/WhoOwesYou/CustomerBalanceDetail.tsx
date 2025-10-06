import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../../axiosInstance';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../../contexts/CompanyContext';

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  status: string;
}

interface CustomerBalanceData {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  invoices: Invoice[];
}

const CustomerBalanceDetail: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<CustomerBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filter, setFilter] = useState<string>('year');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { customer_Id } = useParams<{ customer_Id: string }>(); 
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const fetchCustomerBalanceData = async (customerId: string, startDate?: string, endDate?: string) => {
    if (!selectedCompany?.company_id) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching with params:', { start_date: startDate, end_date: endDate, customerId });
      const response = await axiosInstance.get(`/api/customer-balance-detail/${selectedCompany.company_id}/${customerId}`, {
        params: { start_date: startDate, end_date: endDate },
      });
      console.log('API Response:', response.data);
      
      // Transform the flat response into grouped data
      const invoices = response.data.data;
      if (invoices.length > 0) {
        const customerInfo = {
          id: invoices[0].id,
          customer_name: invoices[0].customer_name,
          email: invoices[0].email,
          phone: invoices[0].phone,
          invoices: invoices.map((inv: any) => ({
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            subtotal: inv.subtotal,
            tax_amount: inv.tax_amount,
            discount_amount: inv.discount_amount,
            total_amount: inv.total_amount,
            paid_amount: inv.paid_amount,
            balance_due: inv.balance_due,
            status: inv.status
          }))
        };
        setData(customerInfo);
      } else {
        setData(null);
      }
    } catch (err) {
      setError('Failed to fetch customer balance data. Please try again.');
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id && customer_Id) {
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
      fetchCustomerBalanceData(customer_Id, startDate, endDate);
    } else {
      setError('Missing company or customer information');
      setLoading(false);
    }
  }, [selectedCompany?.company_id, customer_Id, filter, isCustomRange]);

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency', 
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(value || '0'));
  };

  const getTotalBalance = () => {
    if (!data?.invoices) return 0;
    return data.invoices.reduce((total, invoice) => total + parseFloat(invoice.balance_due), 0);
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

        const filename = `customer-balance-detail-${data?.customer_name || 'customer'}-${new Date().toISOString().split('T')[0]}.pdf`;
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
          <p className="text-gray-600">Please select a company to view customer balance details.</p>
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
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-gray-600 mr-4"
              title="Go Back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold mb-4">Customer Balance Detail</h1>
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
                        if (startDate && endDate && customer_Id) {
                            fetchCustomerBalanceData(customer_Id, startDate, endDate);
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
                  disabled={loading || !data}
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

            <div id="print-content">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm">Outstanding Invoice Details - {selectedCompany.name}</p>
                <p className="text-sm text-gray-600">
                  {filter === 'week' && `Last 7 days: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                  {filter === 'month' && `Last 1 month: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                  {filter === 'year' && `Year to Date: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                  {isCustomRange && startDate && endDate && `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)}`}
                </p>
              </div>

              {error && <div className="text-red-500 mb-4">{error}</div>}
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-600">Loading data...</p>
                </div>
              )}
              
              {data && (
                <>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-lg font-semibold">{data.customer_name}</h2>
                    <p className="text-sm text-gray-600">Email: {data.email || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Phone: {data.phone || 'N/A'}</p>
                    <p className="text-sm font-medium text-red-600 mt-2">Total Outstanding Balance: {formatCurrency(getTotalBalance().toString())}</p>
                  </div>
                  
                  {data.invoices && data.invoices.length > 0 ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Invoice Number</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Invoice Date</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Due Date</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Status</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Total Amount</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Paid Amount</th>
                          <th className="bg-gray-100 p-2 font-semibold text-lg border-b section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Balance Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.invoices.map((invoice, index) => (
                          <tr key={`${invoice.invoice_number}-${index}`}>
                            <td className="p-2 border-b">{invoice.invoice_number}</td>
                            <td className="p-2 border-b">{formatDate(invoice.invoice_date)}</td>
                            <td className="p-2 border-b">{formatDate(invoice.due_date)}</td>
                            <td className="p-2 border-b">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {invoice.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2 border-b text-right">{formatCurrency(invoice.total_amount)}</td>
                            <td className="p-2 border-b text-right">{formatCurrency(invoice.paid_amount)}</td>
                            <td className="p-2 border-b text-right font-medium text-red-600">{formatCurrency(invoice.balance_due)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="p-2 border-t-2 border-gray-800 font-bold" colSpan={6}>Total Outstanding Balance</td>
                          <td className="p-2 border-t-2 border-gray-800 font-bold text-right text-red-600">{formatCurrency(getTotalBalance().toString())}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-600">No outstanding invoices found for this customer.</p>
                  )}
                  <p className="text-sm mt-5">Report generated at {new Date().toLocaleString()}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Print Preview Modal */}
      {showPrintPreview && data && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50"
          style={{ marginTop: "-10px" }}
        >
          <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Customer Balance Detail
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
                    <h1 className="text-3xl font-bold mb-2">Customer Balance Detail</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Outstanding Invoice Details</h2>
                    <h2 className="text-xl text-gray-600 mb-2">
                      {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                    </h2>
                    <p className="text-sm text-gray-600">
                      {filter === 'week' && `Last 7 days: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                      {filter === 'month' && `Last 1 month: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                      {filter === 'year' && `Year to Date: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                      {isCustomRange && startDate && endDate && `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Customer: {data.customer_name}</p>
                    <p className="text-sm text-gray-600">Email: {data.email || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Phone: {data.phone || 'N/A'}</p>
                  </div>

                  {selectedCompany?.company_logo && (
                    <img
                      src={`http://localhost:3000${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-20 w-auto max-w-[200px] object-contain"
                    />
                  )}
                </div>

                {/* Report Content */}
                {data.invoices && data.invoices.length > 0 ? (
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>INVOICE NUMBER</th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>INVOICE DATE</th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>DUE DATE</th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>STATUS</th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>TOTAL AMOUNT</th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>PAID AMOUNT</th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>BALANCE DUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((invoice, index) => (
                        <tr key={`${invoice.invoice_number}-${index}`}>
                          <td className="p-2 border-b">{invoice.invoice_number}</td>
                          <td className="p-2 border-b">{formatDate(invoice.invoice_date)}</td>
                          <td className="p-2 border-b">{formatDate(invoice.due_date)}</td>
                          <td className="p-2 border-b">{invoice.status.replace('_', ' ').toUpperCase()}</td>
                          <td className="p-2 border-b text-right">{formatCurrency(invoice.total_amount)}</td>
                          <td className="p-2 border-b text-right">{formatCurrency(invoice.paid_amount)}</td>
                          <td className="p-2 border-b text-right font-medium">{formatCurrency(invoice.balance_due)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-2 border-t-2 border-gray-800 font-bold" colSpan={6}>TOTAL OUTSTANDING BALANCE</td>
                        <td className="p-2 border-t-2 border-gray-800 font-bold text-right text-lg">{formatCurrency(getTotalBalance().toString())}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-600">No outstanding invoices found for this customer.</p>
                )}

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
                        Customer Balance Detail
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

export default CustomerBalanceDetail;