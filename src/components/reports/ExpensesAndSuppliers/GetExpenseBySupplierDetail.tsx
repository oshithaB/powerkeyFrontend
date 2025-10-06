import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../../axiosInstance';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCompany } from '../../../contexts/CompanyContext';

interface ExpenseBySupplierDetailData {
  payee_id: string;
  expense_id: string;
  expense_number: string;
  payment_date: string;
  total_amount: number;
  expense_notes: string;
  status: string;
  payee_name: string;
  payment_account_name: string;
  payment_method: string;
  expense_item_id: string;
  item_description: string;
  item_amount: number;
  category_name: string;
  account_type_name: string;
  detail_type_name: string;
}

interface PayeeInfo {
  id: string;
  name: string;
}

const GetExpenseBySupplierDetail: React.FC = () => {
    const { selectedCompany } = useCompany();
    const { payee_id } = useParams<{ payee_id: string }>();
    const [data, setData] = useState<ExpenseBySupplierDetailData[]>([]);
    const [payeeInfo, setPayeeInfo] = useState<PayeeInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [expenseFilter, setExpenseFilter] = useState<string>('');
    const [expenseSuggestions, setExpenseSuggestions] = useState<ExpenseBySupplierDetailData[]>([]);
    const [filter, setFilter] = useState<string>('year');
    const [periodStart, setPeriodStart] = useState<string>('');
    const [periodEnd, setPeriodEnd] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isCustomRange, setIsCustomRange] = useState(false);
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const fetchExpenseBySupplierDetail = async (startDate?: string, endDate?: string) => {
    if (!selectedCompany?.company_id || !payee_id) {
      setError('No company or payee selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/expense-by-supplier-detail/${selectedCompany.company_id}/${payee_id}`, {
        params: { start_date: startDate, end_date: endDate },
      });
      
      if (response.data?.success) {
        const responseData = response.data.data || [];
        setData(responseData);
        setExpenseSuggestions(responseData);
        setPayeeInfo(response.data.payee_info);
        console.log('Fetched Expense by Supplier Detail data:', responseData);
      } else {
        setData([]);
        setExpenseSuggestions([]);
        setError('Invalid data format received from server');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Payee not found or no expense data available for this supplier.');
      } else {
        setError('Failed to fetch Expense by Supplier Detail data. Please check the server endpoint or try again later.');
      }
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id && payee_id) {
      if (isCustomRange) {
        return;
      }
      
      const today = new Date();
      let startDate: string | undefined;
      let endDate: string = today.toISOString().split('T')[0];
  
      if (filter === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
      } else if (filter === 'month') {
        const monthStart = new Date(today);
        monthStart.setMonth(monthStart.getMonth() - 1);
        startDate = monthStart.toISOString().split('T')[0];
      } else if (filter === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      setPeriodStart(startDate || '');
      setPeriodEnd(endDate);
      fetchExpenseBySupplierDetail(startDate, endDate);
    }
  }, [selectedCompany?.company_id, payee_id, filter, isCustomRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency', 
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getTotal = (field: keyof ExpenseBySupplierDetailData) => {
    return expenseSuggestions.reduce((total, expense) => {
      const value = Number(expense[field]) || 0;
      return total + value;
    }, 0);
  };

  const handlePrint = () => {
    if (expenseSuggestions.length === 0) {
      alert('No data available to print');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleExpenseSearch = (value: string) => {
    setExpenseFilter(value);
    const filtered = data.filter(expense =>
      expense.expense_number.toLowerCase().includes(value.toLowerCase()) ||
      expense.item_description.toLowerCase().includes(value.toLowerCase()) ||
      expense.category_name.toLowerCase().includes(value.toLowerCase())
    );
    setExpenseSuggestions(filtered.length > 0 ? filtered : data);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      alert('Print content not available');
      return;
    }

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
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

      const filename = `expense-by-supplier-detail-${payeeInfo?.name || 'supplier'}-${new Date().toISOString().split('T')[0]}.pdf`;
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
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  `;

  if (!selectedCompany) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please select a company to view Expense by Supplier Detail.</p>
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
                <h1 className="text-2xl font-bold mb-4">
                  Expense by Supplier Detail - {payeeInfo?.name || 'Loading...'}
                </h1>
              </div>
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Search Expenses</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="border rounded-md p-2 w-40"
                      value={expenseFilter}
                      onChange={(e) => handleExpenseSearch(e.target.value)}
                      placeholder="Search expenses..."
                    />
                  </div>
                </div>
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
                    className="border rounded-md p-2 w-40"
                  >
                    <option value="">Select Period</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
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
                          fetchExpenseBySupplierDetail(startDate, endDate);
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
                  className="text-gray-400 hover:text-gray-600"
                  title="Print Report"
                >
                  <Printer className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigate('/dashboard/reports')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div id="print-content">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-medium">
                  Expense Detail for: {payeeInfo?.name || 'Loading...'}
                </p>
                <p className="text-sm text-gray-600">
                  {filter === 'week' && periodStart && periodEnd && `Last 7 days: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                  {filter === 'month' && periodStart && periodEnd && `Last 1 month: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                  {filter === 'year' && periodStart && periodEnd && `Year to Date: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                  {isCustomRange && startDate && endDate && `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)}`}
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
              
              {!loading && !error && expenseSuggestions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No expense data available for this supplier.
                </div>
              )}
              
              {!loading && !error && expenseSuggestions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-full">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Expense Number
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Payment Date
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Description
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Category
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Payment Method
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Status
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right min-w-[120px]" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Item Amount
                        </th>
                        <th className="bg-gray-100 p-3 font-semibold text-lg border section-header text-right min-w-[120px]" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseSuggestions.map((expense, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-2 border-b font-medium">
                            {expense.expense_number || 'N/A'}
                          </td>
                          <td className="p-2 border-b">
                            {formatDate(expense.payment_date) || 'N/A'}
                          </td>
                          <td className="p-2 border-b">
                            {expense.item_description || expense.expense_notes || 'N/A'}
                          </td>
                          <td className="p-2 border-b">
                            {expense.category_name || 'N/A'}
                          </td>
                          <td className="p-2 border-b">
                            {expense.payment_method || 'N/A'}
                          </td>
                          <td className="p-2 border-b">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              expense.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {expense.status || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2 border-b text-right">
                            {formatCurrency(expense.item_amount || 0)}
                          </td>
                          <td className="p-2 border-b text-right font-bold">
                            {formatCurrency(expense.total_amount || 0)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-3 border-t-2 border-gray-800 font-bold" colSpan={6}>Total</td>
                        <td className="p-3 border-t-2 border-gray-800 font-bold text-right">
                          {formatCurrency(getTotal('item_amount'))}
                        </td>
                        <td className="p-3 border-t-2 border-gray-800 font-bold text-right">
                          {formatCurrency(getTotal('total_amount'))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              <p className="text-sm mt-5 text-gray-600">
                Report generated at {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {showPrintPreview && expenseSuggestions.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Expense by Supplier Detail ({payeeInfo?.name})
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
                    <h1 className="text-3xl font-bold mb-2">Expense by Supplier Detail</h1>
                    <h2 className="text-xl text-gray-600 mb-2">Supplier: {payeeInfo?.name}</h2>
                    <h2 className="text-xl text-gray-600 mb-2">
                      {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                    </h2>
                    <p className="text-sm text-gray-600">
                        {filter === 'week' && periodStart && periodEnd && `Last 7 days: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                        {filter === 'month' && periodStart && periodEnd && `Last 1 month: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                        {filter === 'year' && periodStart && periodEnd && `Year to Date: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`}
                        {isCustomRange && startDate && endDate && `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)}`}
                    </p>
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
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Expense Number
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Payment Date
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Description
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Category
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Payment Method
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-left" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Status
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right min-w-[120px]" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Item Amount
                        </th>
                        <th className="bg-gray-100 p-2 font-bold text-base border section-header text-right min-w-[120px]" 
                            style={{ backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            Total Amount
                        </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseSuggestions.map((expense, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-2 border-b font-medium">
                          {expense.expense_number || 'N/A'}
                        </td>
                        <td className="p-2 border-b">
                          {formatDate(expense.payment_date) || 'N/A'}
                        </td>
                        <td className="p-2 border-b">
                          {expense.item_description || expense.expense_notes || 'N/A'}
                        </td>
                        <td className="p-2 border-b">
                          {expense.category_name || 'N/A'}
                        </td>
                        <td className="p-2 border-b">
                          {expense.payment_method || 'N/A'}
                        </td>
                        <td className="p-2 border-b">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            expense.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {expense.status || 'N/A'}
                          </span>
                        </td>
                        <td className="p-2 border-b text-right">
                          {formatCurrency(expense.item_amount || 0)}
                        </td>
                        <td className="p-2 border-b text-right font-bold">
                          {formatCurrency(expense.total_amount || 0)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                        <td className="p-3 border-t-2 border-gray-800 font-bold" colSpan={6}>Total</td>
                        <td className="p-3 border-t-2 border-gray-800 font-bold text-right">
                          {formatCurrency(getTotal('item_amount'))}
                        </td>
                        <td className="p-3 border-t-2 border-gray-800 font-bold text-right">
                          {formatCurrency(getTotal('total_amount'))}
                        </td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        Report generated at: {new Date().toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Expense by Supplier Detail - {payeeInfo?.name}
                      </p>
                    </div>
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

export default GetExpenseBySupplierDetail;