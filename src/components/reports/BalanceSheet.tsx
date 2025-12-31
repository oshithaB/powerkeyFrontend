import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { X, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BalanceSheetData {
    companyName: string;
    asOfDate: string;
    assets: {
        currentAssets: {
            accountsReceivable: {
                accountsReceivableAR: number;
                totalAccountsReceivable: number;
                adjustment: number;
            };
            cashAndCashEquivalents: number;
            inventory: number;
            inventoryAsset: number;
            totalCurrentAssets: number;
        };
        longTermAssets: number;
        totalAssets: number;
    };
    liabilities: {
        currentLiabilities: {
            accountsPayable: {
                accountsPayableAP: number;
                totalAccountsPayable: number;
            };
            ssclPayable: number;
            vatPayable: number;
            totalCurrentLiabilities: number;
        };
        nonCurrentLiabilities: number;
        totalLiabilities: number;
    };
    equity: {
        openingBalanceEquity: number;
        retainedEarnings: number;
        netIncome: number;
        totalEquity: number;
    };
    totalLiabilitiesAndEquity: number;
}

const BalanceSheet: React.FC = () => {
    const { selectedCompany } = useCompany();
    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);
    const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const fetchBalanceSheetData = async (date?: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get(`http://147.79.115.89:3000/api/balance-sheet/${selectedCompany?.company_id}`, {
                params: { asOfDate: date }
            });
            console.log('Balance Sheet Data:', response.data);
            if (response.data && response.data.data) {
                setData(response.data.data);
            } else {
                setError('Invalid data received from server');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch balance sheet data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompany?.company_id) {
            fetchBalanceSheetData(asOfDate);
        }
    }, [selectedCompany?.company_id, asOfDate]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(value);
    };

    const handlePrint = () => {
        setShowPrintPreview(true);
    };

    const handleDownloadPDF = async () => {
        try {
            if (printRef.current) {
                const logoUrl = selectedCompany?.company_logo ? `http://147.79.115.89:3000${selectedCompany.company_logo}` : null;
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

                pdf.save(`balance-sheet-${asOfDate}.pdf`);
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
                            <h1 className="text-2xl font-bold mb-4">Balance Sheet</h1>
                            <div className="flex space-x-2 items-end">
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-600 mb-1">As Of Date</label>
                                    <input
                                        type="date"
                                        value={asOfDate}
                                        onChange={(e) => setAsOfDate(e.target.value)}
                                        className="border rounded-md p-2"
                                    />
                                </div>

                                <button
                                    onClick={handlePrint}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                                    title="Print Report"
                                >
                                    <Printer className="h-6 w-6" />
                                </button>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div id="print-content">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm">{selectedCompany?.name || 'Company Name'} (Pvt) Ltd.</p>
                                <p className="text-sm">As of {asOfDate}</p>
                            </div>

                            {error && <div className="text-red-500 mb-4">{error}</div>}
                            {loading && <div className="text-center">Loading data...</div>}

                            {data && (
                                <table className="w-full border-collapse">
                                    <tbody>
                                        {/* ASSETS */}
                                        <tr className="section-spacing">
                                            <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{ backgroundColor: '#e2e8f0' }}>Assets</td>
                                        </tr>

                                        {/* Current Assets */}
                                        <tr>
                                            <td colSpan={2} className="p-2 font-semibold">Current Assets</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Cash and Cash Equivalents</td>
                                            <td className="p-2 text-right">{formatCurrency(data.assets.currentAssets.cashAndCashEquivalents)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Accounts Receivable</td>
                                            <td className="p-2 text-right">{formatCurrency(data.assets.currentAssets.accountsReceivable.totalAccountsReceivable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Inventory Asset</td>
                                            <td className="p-2 text-right">{formatCurrency(data.assets.currentAssets.inventory + data.assets.currentAssets.inventoryAsset)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-4 font-bold">Total Current Assets</td>
                                            <td className="p-2 text-right font-bold border-t">{formatCurrency(data.assets.currentAssets.totalCurrentAssets)}</td>
                                        </tr>

                                        {/* Long Term Assets (if any) - currently 0 in controller but good to show structure */}
                                        {data.assets.longTermAssets !== 0 && (
                                            <>
                                                <tr>
                                                    <td colSpan={2} className="p-2 font-semibold">Long Term Assets</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 pl-4 font-bold">Total Long Term Assets</td>
                                                    <td className="p-2 text-right font-bold border-t">{formatCurrency(data.assets.longTermAssets)}</td>
                                                </tr>
                                            </>
                                        )}

                                        <tr className="bg-gray-50">
                                            <td className="p-2 font-bold text-lg">Total Assets</td>
                                            <td className="p-2 text-right font-bold text-lg border-t-2 border-black">{formatCurrency(data.assets.totalAssets)}</td>
                                        </tr>

                                        <tr><td colSpan={2} className="h-4"></td></tr>

                                        {/* LIABILITIES AND EQUITY */}
                                        <tr className="section-spacing">
                                            <td colSpan={2} className="bg-gray-100 p-1 font-semibold text-lg border-b section-header" style={{ backgroundColor: '#e2e8f0' }}>Liabilities and Equity</td>
                                        </tr>

                                        {/* Liabilities */}
                                        <tr>
                                            <td colSpan={2} className="p-2 font-semibold">Liabilities</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2} className="p-2 pl-4 font-semibold">Current Liabilities</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Accounts Payable</td>
                                            <td className="p-2 text-right">{formatCurrency(data.liabilities.currentLiabilities.accountsPayable.totalAccountsPayable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">SSCL Payable</td>
                                            <td className="p-2 text-right">{formatCurrency(data.liabilities.currentLiabilities.ssclPayable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">VAT Payable</td>
                                            <td className="p-2 text-right">{formatCurrency(data.liabilities.currentLiabilities.vatPayable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-4 font-bold">Total Current Liabilities</td>
                                            <td className="p-2 text-right font-bold border-t">{formatCurrency(data.liabilities.currentLiabilities.totalCurrentLiabilities)}</td>
                                        </tr>

                                        <tr>
                                            <td className="p-2 pl-2 font-bold">Total Liabilities</td>
                                            <td className="p-2 text-right font-bold border-t">{formatCurrency(data.liabilities.totalLiabilities)}</td>
                                        </tr>

                                        {/* Equity */}
                                        <tr>
                                            <td colSpan={2} className="p-2 font-semibold mt-4">Equity</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Opening Balance Equity</td>
                                            <td className="p-2 text-right">{formatCurrency(data.equity.openingBalanceEquity)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Retained Earnings</td>
                                            <td className="p-2 text-right">{formatCurrency(data.equity.retainedEarnings)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6">Net Income</td>
                                            <td className="p-2 text-right">{formatCurrency(data.equity.netIncome)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-4 font-bold">Total Equity</td>
                                            <td className="p-2 text-right font-bold border-t">{formatCurrency(data.equity.totalEquity)}</td>
                                        </tr>

                                        <tr className="bg-gray-50">
                                            <td className="p-2 font-bold text-lg">Total Liabilities and Equity</td>
                                            <td className="p-2 text-right font-bold text-lg border-t-2 border-black">{formatCurrency(data.totalLiabilitiesAndEquity)}</td>
                                        </tr>

                                    </tbody>
                                </table>
                            )}
                            <p className="text-sm mt-5">Report generated at {new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Print Preview Modal */}
            {showPrintPreview && data && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50 flex justify-center pt-10"
                >
                    <div className="relative p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Print Preview - Balance Sheet
                            </h3>
                            <button
                                onClick={() => setShowPrintPreview(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[80vh]">
                            <div
                                ref={printRef}
                                className="p-8 bg-white text-gray-900"
                            >
                                {/* Header with Company Info and Logo */}
                                <div className="flex justify-between items-start border-b pb-4 mb-6">
                                    <div>
                                        <h1 className="text-3xl font-bold mb-2">Balance Sheet</h1>
                                        <h2 className="text-xl text-gray-600 mb-2">
                                            {selectedCompany?.name || 'Company Name'} (Pvt) Ltd.
                                        </h2>
                                        <p className="text-sm">
                                            As of {asOfDate}
                                        </p>
                                    </div>
                                    {selectedCompany?.company_logo && (
                                        <img
                                            src={`http://147.79.115.89:3000${selectedCompany.company_logo}`}
                                            alt={`${selectedCompany.name} Logo`}
                                            className="h-20 w-auto max-w-[200px] object-contain"
                                        />
                                    )}
                                </div>

                                {/* Report Report Content (Duplicate for Print) */}
                                <table className="w-full border-collapse">
                                    <tbody>
                                        {/* ASSETS */}
                                        <tr>
                                            <td colSpan={2} className="bg-gray-100 p-2 font-bold text-lg border-b section-header">ASSETS</td>
                                        </tr>

                                        <tr>
                                            <td colSpan={2} className="p-2 font-semibold uppercase">Current Assets</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Cash and Cash Equivalents</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.assets.currentAssets.cashAndCashEquivalents)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Accounts Receivable</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.assets.currentAssets.accountsReceivable.totalAccountsReceivable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Inventory Asset</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.assets.currentAssets.inventory + data.assets.currentAssets.inventoryAsset)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-4 font-bold border-b">Total Current Assets</td>
                                            <td className="p-2 text-right font-bold border-b">{formatCurrency(data.assets.currentAssets.totalCurrentAssets)}</td>
                                        </tr>

                                        <tr className="bg-gray-50">
                                            <td className="p-2 font-bold text-lg">TOTAL ASSETS</td>
                                            <td className="p-2 text-right font-bold text-lg border-t-2 border-black">{formatCurrency(data.assets.totalAssets)}</td>
                                        </tr>

                                        <tr><td colSpan={2} className="h-6"></td></tr>

                                        {/* LIABILITIES AND EQUITY */}
                                        <tr>
                                            <td colSpan={2} className="bg-gray-100 p-2 font-bold text-lg border-b section-header">LIABILITIES AND EQUITY</td>
                                        </tr>

                                        <tr>
                                            <td colSpan={2} className="p-2 font-semibold uppercase">Liabilities</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2} className="p-2 pl-4 font-semibold">Current Liabilities</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Accounts Payable</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.liabilities.currentLiabilities.accountsPayable.totalAccountsPayable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">SSCL Payable</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.liabilities.currentLiabilities.ssclPayable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">VAT Payable</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.liabilities.currentLiabilities.vatPayable)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-4 font-bold border-b">Total Current Liabilities</td>
                                            <td className="p-2 text-right font-bold border-b">{formatCurrency(data.liabilities.currentLiabilities.totalCurrentLiabilities)}</td>
                                        </tr>

                                        <tr>
                                            <td className="p-2 pl-2 font-bold border-b">Total Liabilities</td>
                                            <td className="p-2 text-right font-bold border-b">{formatCurrency(data.liabilities.totalLiabilities)}</td>
                                        </tr>

                                        {/* Equity */}
                                        <tr>
                                            <td colSpan={2} className="p-2 font-semibold uppercase mt-4">Equity</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Opening Balance Equity</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.equity.openingBalanceEquity)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Retained Earnings</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.equity.retainedEarnings)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-6 border-b">Net Income</td>
                                            <td className="p-2 border-b text-right">{formatCurrency(data.equity.netIncome)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-4 font-bold border-b">Total Equity</td>
                                            <td className="p-2 text-right font-bold border-b">{formatCurrency(data.equity.totalEquity)}</td>
                                        </tr>

                                        <tr className="bg-gray-50">
                                            <td className="p-2 font-bold text-lg">TOTAL LIABILITIES AND EQUITY</td>
                                            <td className="p-2 text-right font-bold text-lg border-t-2 border-black">{formatCurrency(data.totalLiabilitiesAndEquity)}</td>
                                        </tr>

                                    </tbody>
                                </table>
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
                                className="btn btn-primary btn-md flex items-center"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BalanceSheet;
