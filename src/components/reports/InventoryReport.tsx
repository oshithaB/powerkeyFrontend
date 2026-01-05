import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import axiosInstance from '../../axiosInstance';
import { Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Product {
    id: number;
    sku: string;
    name: string;
    quantity_on_hand: number;
    cost_price: number;
    unit_price: number;
    total_asset_value: number;
}

interface InventorySummary {
    total_stock_value: number;
    total_items: number;
    generated_at: string;
}

const InventoryReport: React.FC = () => {
    const { selectedCompany } = useCompany();
    const [products, setProducts] = useState<Product[]>([]);
    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInventoryData = async () => {
        if (!selectedCompany?.company_id) return;
        setLoading(true);
        try {
            const response = await axiosInstance.get(`http://147.79.115.89:3000/api/getProducts/${selectedCompany.company_id}`);

            // Calculate values client-side since the backend just returns raw product data
            const productsData = Array.isArray(response.data) ? response.data : [];

            let totalStockValue = 0;
            let totalItems = 0;

            const calculatedProducts = productsData.map((p: any) => {
                const qty = Number(p.quantity_on_hand) || 0;
                const cost = Number(p.cost_price) || 0;
                const assetValue = qty * cost;

                totalStockValue += assetValue;
                totalItems += qty;

                return {
                    ...p,
                    quantity_on_hand: qty,
                    cost_price: cost,
                    unit_price: Number(p.unit_price) || 0,
                    total_asset_value: assetValue
                };
            });

            setProducts(calculatedProducts);
            setSummary({
                total_stock_value: totalStockValue,
                total_items: totalItems,
                generated_at: new Date().toISOString()
            });
            setError(null);
        } catch (err) {
            setError('Failed to load inventory data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventoryData();
    }, [selectedCompany?.company_id]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(val);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.text(`${selectedCompany?.name} - Inventory Report`, 14, 20);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["SKU", "Product Name", "Qty", "Cost Price", "Asset Value"];
        const tableRows = products.map(p => [
            p.sku,
            p.name,
            p.quantity_on_hand,
            formatCurrency(Number(p.cost_price)),
            formatCurrency(Number(p.total_asset_value))
        ]);

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        // specific type casting to avoid TS errors with autotable
        const finalY = (doc as any).lastAutoTable.finalY || 40;

        doc.text(`Total Items: ${summary?.total_items}`, 14, finalY + 10);
        doc.text(`Total Stock Value: ${formatCurrency(summary?.total_stock_value || 0)}`, 14, finalY + 20);

        doc.save('inventory_report.pdf');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Inventory Valuation Report</h1>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
                            <Printer size={20} /> Print
                        </button>
                        <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            <Download size={20} /> Export PDF
                        </button>
                    </div>
                </div>

                {error && <div className="text-red-500 mb-4">{error}</div>}

                {loading ? (
                    <div className="text-center py-10">Loading inventory data...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="p-3">SKU</th>
                                        <th className="p-3">Product Name</th>
                                        <th className="p-3 text-right">Quantity</th>
                                        <th className="p-3 text-right">Cost Price</th>
                                        <th className="p-3 text-right">Total Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr key={product.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3">{product.sku}</td>
                                            <td className="p-3">{product.name}</td>
                                            <td className="p-3 text-right">{product.quantity_on_hand}</td>
                                            <td className="p-3 text-right">{formatCurrency(Number(product.cost_price))}</td>
                                            <td className="p-3 text-right font-medium">{formatCurrency(Number(product.total_asset_value))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold">
                                        <td colSpan={2} className="p-3 text-right">Totals:</td>
                                        <td className="p-3 text-right">{summary?.total_items}</td>
                                        <td className="p-3"></td>
                                        <td className="p-3 text-right">{formatCurrency(summary?.total_stock_value || 0)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default InventoryReport;
