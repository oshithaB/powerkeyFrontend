import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { X, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProfitAndLossData {
  period: {
    start_date: string;
    end_date: string;
    generated_at: string;
  };
  income: {
    sales_of_product_income: number;
    shipping_income: number;
    tax_income: number;
    discounts_given: number;
    other_income: number;
    total_income: number;
    net_income: number;
  };
  cost_of_sales: {
    cost_of_sales: number;
    inventory_shrinkage: number;
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

const ProfitAndLossReport: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<ProfitAndLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomRange, setIsCustomRange] = useState(false);

  const fetchProfitAndLossData = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/profit-and-loss/${selectedCompany?.company_id}`, {
        params: { start_date: startDate, end_date: endDate }
      });
      console.log(response.data);
      setData(response.data.data);
    } catch (err) {
      setError('You have no permission to view this report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.company_id) {
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
  
      fetchProfitAndLossData(startDate, endDate);
    }
  }, [selectedCompany?.company_id, filter, isCustomRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
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

        pdf.save(`profit-and-loss-report.pdf`);
        setShowPrintPreview(false);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Ensure the logo image is accessible.');
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
              <h1 className="text-2xl font-bold mb-4">Profit and Loss Report</h1>
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
                            fetchProfitAndLossData(startDate, endDate);
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
                    onClick={() => navigate(-1)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
            </div>

            <div id="print-content">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm">{selectedCompany?.name || 'Company Name'} (Pvt) Ltd.</p>
                <p className="text-sm">
                  {isCustomRange 
                    ? `Period: ${startDate} to ${endDate}` 
                    : filter === 'week' ? 'Last 7 Days' : filter === 'month' ? 'Last 30 Days' : filter === 'year' ? `January 1 - ${data?.period.end_date}` : data?.period.end_date || '--'
                  }
                </p>
              </div>

              {error && <div className="text-red-500 mb-4">{error}</div>}
              {loading && <div className="text-center">Loading data...</div>}
              {data && (
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Income Section */}
                    <tr className="section-spacing">
                      <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Income</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Product Income</td>
                      <td className="p-2 border-b">{formatCurrency(data.income.sales_of_product_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Tax Income</td>
                      <td className="p-2 border-b">{formatCurrency(data.income.tax_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Discounts Given</td>
                      <td className="p-2 border-b">{formatCurrency(-data.income.discounts_given)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Other Income</td>
                      <td className="p-2 border-b">{formatCurrency(data.income.other_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-bold">Total Income</td>
                      <td className="p-2 border-b font-bold">{formatCurrency(data.income.total_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-bold">Net Income</td>
                      <td className="p-2 border-b font-bold">{formatCurrency(data.income.net_income)}</td>
                    </tr>

                    {/* Cost of Sales Section */}
                    <tr className="section-spacing">
                      <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Cost of Sales</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Cost of Sales</td>
                      <td className="p-2 border-b">{formatCurrency(data.cost_of_sales.cost_of_sales)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Inventory Shrinkage</td>
                      <td className="p-2 border-b">{formatCurrency(data.cost_of_sales.inventory_shrinkage)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-bold">Total Cost of Sales</td>
                      <td className="p-2 border-b font-bold">{formatCurrency(data.cost_of_sales.total_cost_of_sales)}</td>
                    </tr>

                    {/* Expenses Section */}
                    <tr className="section-spacing">
                      <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Expenses</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Operating Expenses</td>
                      <td className="p-2 border-b">{formatCurrency(data.expenses.operating_expenses)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Other Expenses</td>
                      <td className="p-2 border-b">{formatCurrency(data.expenses.other_expenses)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b font-bold">Total Expenses</td>
                      <td className="p-2 border-b font-bold">{formatCurrency(data.expenses.total_expenses)}</td>
                    </tr>

                    {/* Profitability Section */}
                    <tr className="section-spacing">
                      <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Profitability</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Gross Profit</td>
                      <td className="p-2 border-b">{formatCurrency(data.profitability.gross_profit)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Net Earnings</td>
                      <td className="p-2 border-b">{formatCurrency(data.profitability.net_earnings)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Gross Profit Margin</td>
                      <td className="p-2 border-b">{formatPercentage(data.profitability.gross_profit_margin)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Net Profit Margin</td>
                      <td className="p-2 border-b">{formatPercentage(data.profitability.net_profit_margin)}</td>
                    </tr>

                    {/* Cash Flow Section */}
                    <tr className="section-spacing">
                      <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Cash Flow</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Total Invoiced</td>
                      <td className="p-2 border-b">{formatCurrency(data.cash_flow.total_invoiced)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Total Paid</td>
                      <td className="p-2 border-b">{formatCurrency(data.cash_flow.total_paid)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Outstanding Balance</td>
                      <td className="p-2 border-b">{formatCurrency(data.cash_flow.outstanding_balance)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Collection Rate</td>
                      <td className="p-2 border-b">{formatPercentage(data.cash_flow.collection_rate)}</td>
                    </tr>

                    {/* Summary Section */}
                    <tr className="section-spacing">
                      <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>Summary</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Total Revenue</td>
                      <td className="p-2 border-b">{formatCurrency(data.summary.total_revenue)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Total Costs</td>
                      <td className="p-2 border-b">{formatCurrency(data.summary.total_costs)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Net Profit/Loss</td>
                      <td className="p-2 border-b">{formatCurrency(data.summary.net_profit_loss)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Profitable</td>
                      <td className="p-2 border-b">{data.summary.is_profitable ? 'Yes' : 'No'}</td>
                    </tr>
                  </tbody>
                </table>
              )}
              <p className="text-sm mt-5">{data?.period.generated_at ? `Report generated at ${new Date(data.period.generated_at).toLocaleString()}` : 'Report generated at --'}</p>
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
          <div className="relative top-4 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Print Preview - Profit and Loss Report
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
                {/* Header with Company Info and Logo */}
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Profit and Loss Report</h1>
                    <h2 className="text-xl text-gray-600 mb-2">
                      {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                    </h2>
                    <p className="text-sm">
                      {isCustomRange 
                        ? `Period: ${startDate} to ${endDate}`
                        : filter === 'week' ? 'Last 7 Days' : filter === 'month' ? 'Last 30 Days' : filter === 'year' ? `January 1 - ${data?.period.end_date}` : data?.period.end_date || '--'
                      }
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

                {/* Report Content */}
                <table className="w-full border-collapse mb-6">
                  <tbody>
                    {/* Income Section */}
                    <tr>
                      <td colSpan={2} className="bg-gray-100 p-1/2 font-bold text-base border section-header">
                        INCOME
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Product Income</td>
                      <td className="p-1 border-b text-right font-medium">{formatCurrency(data.income.sales_of_product_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Tax Income</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.income.tax_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Discounts Given</td>
                      <td className="p-1 border-b text-right text-red-600">{formatCurrency(data.income.discounts_given)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Other Income</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.income.other_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b font-bold">Total Income</td>
                      <td className="p-1 border-b text-right font-bold">{formatCurrency(data.income.total_income)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b font-bold" style={{paddingBottom: '15px'}}>Net Income</td>
                      <td className="p-1 border-b text-right font-bold" style={{paddingBottom: '15px'}}>{formatCurrency(data.income.net_income)}</td>
                    </tr>

                    {/* Cost of Sales Section */}
                    <tr>
                      <td colSpan={2} className="bg-gray-100 p-1/2 font-bold text-base border section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact',}}>
                        COST OF SALES
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Cost of Sales</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.cost_of_sales.cost_of_sales)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Inventory Shrinkage</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.cost_of_sales.inventory_shrinkage)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b font-bold" style={{paddingBottom: '15px'}}>Total Cost of Sales</td>
                      <td className="p-1 border-b text-right font-bold" style={{paddingBottom: '15px'}}>{formatCurrency(data.cost_of_sales.total_cost_of_sales)}</td>
                    </tr>

                    {/* Expenses Section */}
                    <tr>
                      <td colSpan={2} className="bg-gray-100 p-1/2 font-bold text-base border section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>
                        EXPENSES
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Operating Expenses</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.expenses.operating_expenses)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Other Expenses</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.expenses.other_expenses)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b font-bold" style={{paddingBottom: '15px'}}>Total Expenses</td>
                      <td className="p-1 border-b text-right font-bold" style={{paddingBottom: '15px'}}>{formatCurrency(data.expenses.total_expenses)}</td>
                    </tr>

                    {/* Profitability Section */}
                    <tr>
                      <td colSpan={2} className="bg-gray-100 p-1/2 font-bold text-base border section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>
                        PROFITABILITY
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Gross Profit</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.profitability.gross_profit)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Net Earnings</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.profitability.net_earnings)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Gross Profit Margin</td>
                      <td className="p-1 border-b text-right">{formatPercentage(data.profitability.gross_profit_margin)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b" style={{paddingBottom: '15px'}}>Net Profit Margin</td>
                      <td className="p-1 border-b text-right" style={{paddingBottom: '15px'}}>{formatPercentage(data.profitability.net_profit_margin)}</td>
                    </tr>

                    {/* Cash Flow Section */}
                    <tr>
                      <td colSpan={2} className="bg-gray-100 p-1/2 font-bold text-base border section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>
                        CASH FLOW
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Total Invoiced</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.cash_flow.total_invoiced)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Total Paid</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.cash_flow.total_paid)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Outstanding Balance</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.cash_flow.outstanding_balance)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b" style={{paddingBottom: '15px'}}>Collection Rate</td>
                      <td className="p-1 border-b text-right" style={{paddingBottom: '15px'}}>{formatPercentage(data.cash_flow.collection_rate)}</td>
                    </tr>

                    {/* Summary Section */}
                    <tr>
                      <td colSpan={2} className="bg-gray-100 p-1/2 font-bold text-base border section-header" style={{backgroundColor: '#e2e8f0', WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', printColorAdjust: 'exact'}}>
                        SUMMARY
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Total Revenue</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.summary.total_revenue)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b">Total Costs</td>
                      <td className="p-1 border-b text-right">{formatCurrency(data.summary.total_costs)}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-b-2 border-gray-800">Net Profit/Loss</td>
                      <td className={`p-1 border-b-2 border-gray-800 text-right font-bold text-lg ${data.summary.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.summary.net_profit_loss)}
                      </td>
                    </tr>
                    <tr>
                      <td className="pt-1">Profitable</td>
                      <td className={`text-right font-bold pt-1 ${data.summary.is_profitable ? 'text-green-600' : 'text-red-600'}`}>
                        {data.summary.is_profitable ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        Report generated at: {data.period.generated_at ? new Date(data.period.generated_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
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

export default ProfitAndLossReport;