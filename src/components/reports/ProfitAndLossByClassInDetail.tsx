import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../axiosInstance';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../contexts/CompanyContext';

interface Invoice {
  invoiceId: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  invoiceDate: string;
  discountAmount: string;
  totalAmount: string;
  status: string;
  customerId: string;
  customerName: string;
}

interface SalesReport {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  totalSalesAmount: string;
  invoices: Invoice[];
}

interface ProfitAndLossData {
  company: {
    id: string;
    name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
  };
  employee: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  period: {
    start_date: string;
    end_date: string;
    generated_at: string;
  };
  income: {
    sales_of_product_income: number;
    tax_income: number;
    discounts_given: number;
    other_income: number;
    total_income: number;
    net_income: number;
  };
  cost_of_sales: {
    cost_of_sales: number;
    total_cost_of_sales: number;
  };
  expenses: {
    operating_expenses: number;
    other_expenses: number;
    total_expenses: number;
  };
  profitability: {
    gross_profit: number;
    net_earnings: number;
    gross_profit_margin: number;
    net_profit_margin: number;
  };
  cash_flow: {
    total_invoiced: number;
    total_paid: number;
    outstanding_balance: number;
    collection_rate: number;
  };
  summary: {
    total_revenue: number;
    total_costs: number;
    net_profit_loss: number;
    is_profitable: boolean;
  };
}

const ProfitAndLossByClassInDetail: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<ProfitAndLossData | null>(null);
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filter, setFilter] = useState<string>('year');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { employeeId } = useParams<{ employeeId: string }>();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomRange, setIsCustomRange] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const fetchProfitAndLossData = async (employeeId: string, startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/profit-and-loss-by-emp/${selectedCompany?.company_id}/${employeeId}`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setData(response.data.data);
    } catch (err) {
      setError('Failed to fetch profit and loss data. Please try again.');
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesByEmployee = async (employeeId: string, startDate?: string, endDate?: string) => {
    try {
      const response = await axiosInstance.get(`/api/invoices-by-employee/${selectedCompany?.company_id}/${employeeId}`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setSalesData(response.data.data);
    } catch (err) {
      setError('Failed to fetch invoices data. Please try again.');
      console.error('Error fetching invoices by employee:', err);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id && employeeId) {
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
      fetchProfitAndLossData(employeeId, startDate, endDate);
      fetchInvoicesByEmployee(employeeId, startDate, endDate);
    } else {
      setError('Missing company or employee information');
      setLoading(false);
    }
  }, [selectedCompany?.company_id, employeeId, filter, isCustomRange]);

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue || 0);
  };

  const handlePrint = () => {
    if (!data || !salesData) {
      alert('No data available to print');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      alert('Print content not available');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxContentHeight = pageHeight - 2 * margin;

      const scale = 2;
      const canvas = await html2canvas(printRef.current, {
        scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 0.95);
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      const totalPages = Math.ceil(imgHeight / maxContentHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        const srcY = i * maxContentHeight * (canvas.height / imgHeight);
        const pageContentHeight = Math.min(canvas.height - srcY, maxContentHeight * (canvas.height / imgHeight));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = pageContentHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx && pageContentHeight > 0) {
          tempCtx.imageSmoothingEnabled = true;
          tempCtx.imageSmoothingQuality = 'high';
          tempCtx.drawImage(canvas, 0, srcY, canvas.width, pageContentHeight, 0, 0, canvas.width, pageContentHeight);
          const pageImgData = tempCanvas.toDataURL('image/png', 0.95);
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight - (i * maxContentHeight), maxContentHeight));
        }
      }

      const filename = `profit-and-loss-${data?.employee.name || 'employee'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      setShowPrintPreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const printStyles = `
    @media print {
      .section-header {
        background-color: #e2e8f0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .cost-section {
        background-color: #f7fafc !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
    .cost-section {
      background-color: #f7fafc;
    }
  `;

  const renderTableRow = (label: string, value: number, isTotal = false, isSection = false) => (
    <tr key={label}>
      <td className={`p-2 border-b ${isTotal ? 'font-bold' : 'font-medium'} ${isSection ? 'cost-section' : ''}`}>
        {label}
      </td>
      <td className={`p-2 border-b text-right ${isTotal ? 'font-bold' : ''} ${isSection ? 'cost-section' : ''}`}>
        {formatCurrency(value)}
      </td>
    </tr>
  );

  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please select a company to view profit and loss data.</p>
          <button
            onClick={() => navigate(-1)}
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
                  onClick={() => navigate(-1)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Go Back"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Employee Profit and Loss Report</h1>
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
                        if (startDate && endDate && employeeId) {
                          setPeriodStart(startDate);
                          setPeriodEnd(endDate);
                          fetchProfitAndLossData(employeeId, startDate, endDate);
                          fetchInvoicesByEmployee(employeeId, startDate, endDate);
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
                  disabled={loading || !data || !salesData}
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
                <p className="text-sm font-medium">Employee Profit and Loss Details</p>
                <p className="text-sm text-gray-600">
                  {isCustomRange 
                    ? `Period: ${startDate} to ${endDate}` 
                    : filter === 'week' ? 'Last 7 Days' 
                    : filter === 'month' ? 'Last 30 Days' 
                    : filter === 'year' ? `January 1 - December 31, ${new Date().getFullYear()}` 
                    : ''
                  }
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-600">Loading data...</p>
                </div>
              )}

              {!loading && !error && data && salesData && (
                <>
                  <div className="mb-6 flex">
                    <div>
                      <h2 className="text-lg font-semibold">{data.employee.name}</h2>
                      <p className="text-sm text-gray-600">Email: {data.employee.email || 'N/A'}</p>
                      <p className="text-sm text-gray-600">Total Net Earnings: {formatCurrency(data.profitability.net_earnings)}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm text-gray-600">Total Invoiced: {formatCurrency(data.cash_flow.total_invoiced)}</p>
                      <p className="text-sm text-green-600">Total Paid: {formatCurrency(data.cash_flow.total_paid)}</p>
                      <p className="text-sm text-red-600">Outstanding Balance: {formatCurrency(data.cash_flow.outstanding_balance)}</p>
                    </div>
                  </div>

                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Account
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTableRow('Discounts Given', data.income.discounts_given)}
                      {renderTableRow('Sales of Product Income', data.income.sales_of_product_income)}
                      {renderTableRow('Tax Income', data.income.tax_income)}
                      {renderTableRow('Total Income', data.income.total_income, true)}
                      {renderTableRow('Cost of Sales', data.cost_of_sales.cost_of_sales, false, true)}
                      {renderTableRow('Total Cost of Sales', data.cost_of_sales.total_cost_of_sales, true)}
                      {renderTableRow('Gross Profit', data.profitability.gross_profit, true)}
                      {renderTableRow('Other Income', data.income.other_income)}
                      {renderTableRow('Operating Expenses', data.expenses.operating_expenses)}
                      {renderTableRow('Other Expenses', data.expenses.other_expenses)}
                      {renderTableRow('Total Expenses', data.expenses.total_expenses, true)}
                      {renderTableRow('Net Earnings', data.profitability.net_earnings, true)}
                    </tbody>
                  </table>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Invoices</h3>
                    {salesData.invoices.length > 0 ? (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Invoice Number
                            </th>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Date
                            </th>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Customer
                            </th>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Discount
                            </th>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Paid Amount
                            </th>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Total Amount
                            </th>
                            <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                                style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesData.invoices.map((invoice) => (
                            <tr key={invoice.invoiceId}>
                              <td className="p-2 border-b">{invoice.invoiceNumber}</td>
                              <td className="p-2 border-b">{formatDate(invoice.invoiceDate)}</td>
                              <td className="p-2 border-b">{invoice.customerName}</td>
                              <td className="p-2 border-b text-right">{formatCurrency(invoice.discountAmount)}</td>
                              <td className='p-2 border-b text-right'>{formatCurrency(data.cash_flow.total_paid)}</td>
                              <td className="p-2 border-b text-right">{formatCurrency(invoice.totalAmount)}</td>
                              <td className="p-2 border-b ">{invoice.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-600">No invoices found for this employee.</p>
                    )}
                  </div>

                  <p className="text-sm mt-5 text-gray-600">
                    Report generated at {new Date().toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {showPrintPreview && data && salesData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Employee Profit and Loss Report
              </h3>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close Preview"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div ref={printRef} className="p-8 bg-white text-gray-900">
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Employee Profit and Loss Report</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Employee Profit and Loss Details</h2>
                    <h2 className="text-xl text-gray-600 mb-2">{data.company.name} (Pvt) Ltd.</h2>
                    <p className="text-sm text-gray-600">
                      Period: {formatDate(periodStart)} - {formatDate(periodEnd)}, {new Date(periodEnd).getFullYear()}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Employee: {data.employee.name}</p>
                    <p className="text-sm text-gray-600">Email: {data.employee.email || 'N/A'}</p>
                  </div>

                  {selectedCompany?.company_logo && (
                    <img
                      src={`http://localhost:3000${selectedCompany.company_logo}`}
                      alt={`${selectedCompany.name} Logo`}
                      className="h-20 w-auto max-w-[200px] object-contain"
                    />
                  )}
                </div>

                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Account
                      </th>
                      <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right" 
                          style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTableRow('Discounts Given', data.income.discounts_given)}
                    {renderTableRow('Sales of Product Income', data.income.sales_of_product_income)}
                    {renderTableRow('Tax Income', data.income.tax_income)}
                    {renderTableRow('Total Income', data.income.total_income, true)}
                    {renderTableRow('Cost of Sales', data.cost_of_sales.cost_of_sales, false, true)}
                    {renderTableRow('Total Cost of Sales', data.cost_of_sales.total_cost_of_sales, true)}
                    {renderTableRow('Gross Profit', data.profitability.gross_profit, true)}
                    {renderTableRow('Other Income', data.income.other_income)}
                    {renderTableRow('Operating Expenses', data.expenses.operating_expenses)}
                    {renderTableRow('Other Expenses', data.expenses.other_expenses)}
                    {renderTableRow('Total Expenses', data.expenses.total_expenses, true)}
                    {renderTableRow('Net Earnings', data.profitability.net_earnings, true)}
                  </tbody>
                </table>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Cash Flow Summary</h3>
                  <table className="w-full border-collapse">
                    <tbody>
                      {renderTableRow('Total Invoiced', data.cash_flow.total_invoiced)}
                      {renderTableRow('Total Paid', data.cash_flow.total_paid)}
                      {renderTableRow('Outstanding Balance', data.cash_flow.outstanding_balance)}
                    </tbody>
                  </table>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Invoices</h3>
                  {salesData.invoices.length > 0 ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Invoice Number
                          </th>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Date
                          </th>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Customer
                          </th>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Discount
                          </th>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Paid Amount
                          </th>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Total Amount
                          </th>
                          <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left"
                              style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.invoices.map((invoice) => (
                          <tr key={invoice.invoiceId}>
                            <td className="p-2 border-b">{invoice.invoiceNumber}</td>
                            <td className="p-2 border-b">{formatDate(invoice.invoiceDate)}</td>
                            <td className="p-2 border-b">{invoice.customerName}</td>
                            <td className="p-2 border-b text-right">{formatCurrency(invoice.discountAmount)}</td>
                            <td className='p-2 border-b text-right'>{formatCurrency(data.cash_flow.total_paid)}</td>
                            <td className="p-2 border-b text-right">{formatCurrency(invoice.totalAmount)}</td>
                            <td className="p-2 border-b">{invoice.status}</td>
                          </tr>
                        ))}
                        
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-600">No invoices found for this employee.</p>
                  )}
                </div>

                <div className="border-t pt-2 mt-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Report generated at: {new Date().toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Employee Profit and Loss Report
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

export default ProfitAndLossByClassInDetail;