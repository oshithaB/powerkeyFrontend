import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './contexts/SocketContext';

import Login from './components/auth/Login';
import CompanySelection from './components/company/CompanySelection';
import CreateCompany from './components/company/CreateCompany';
import Dashboard from './components/dashboard/Dashboard';
import Layout from './components/layout/Layout';

import CreateEstimate from './components/modals/CreateEstimate';
import EditEstimate from './components/modals/EditEstimate';
import CreateInvoice from './components/modals/CreateInvoice';
import EditInvoice from './components/modals/EditInvoice';
import InvoiceRecievedPayment from './components/modals/InvoiceReceivePaymentModal';
import BillReceivePaymentModal from './components/modals/billPayPaymentModal';
import PurchaseOrdersPage from './components/modals/PurchaseOrdersPage';
import EditPurchaseOrders from './components/modals/EditPurchaseOrders';
import CreateExpense from './components/modals/CreateExpense';
import EditExpense from './components/modals/EditExpense';
import CreateBill from './components/modals/CreateBill';
import CreateCheque from './components/modals/CreateCheque';
import EditCheques from './components/modals/EditCheques';
import EditBill from './components/modals/EditBill';

// Reports
import ProfitAndLossReport from './components/reports/ProfitAndLossReport';
import CommissionReport from './components/reports/CommissionReport';
import CommissionReportByEmployees from './components/reports/CommissionReportByEmployees';
import SalesReport from './components/reports/SalesReport';
import SalesReportByEmployees from './components/reports/SalesReportByEmployees';
import ProfitAndLossByClass from './components/reports/ProfitAndLossByClass';
import ProfitAndLossByClassInDetail from './components/reports/ProfitAndLossByClassInDetail';
import ProfitAndLossByCustomer from './components/reports/ProfitAndLossByCustomer';
import ProfitAndLossByCustomerInDetail from './components/reports/ProfitAndLossByCustomerInDetail';
import ProfitAndLossByMonth from './components/reports/ProfitAndLossByMonth';

// Sales & Customers Reports
import CustomerContactDetails from './components/reports/Sales&Customers/CustomerContactDetails';
import ProductAndServiceList from './components/reports/Sales&Customers/ProductAndServiceList';
import SalesbyCustomerSummary from './components/reports/Sales&Customers/SalesbyCustomerSummary';
import SalesbyCustomerDetail from './components/reports/Sales&Customers/SalesbyCustomerDetail';
import SalesbyProductSummary from './components/reports/Sales&Customers/SalesbyProductSummary';
import SalesbyProductDetail from './components/reports/Sales&Customers/SalesbyProductDetail';
import DepoistDetail from './components/reports/Sales&Customers/DepoistDetail';
import EstimatesbyCustomers from './components/reports/Sales&Customers/EstimatesbyCustomers';
import StockTakeWorksheet from './components/reports/Sales&Customers/StockTakeWorksheet';
import IncomeByCustomerSummary from './components/reports/Sales&Customers/IncomeByCustomerSummary';

// Who Owes You Reports
import ARAgingSummaryReport from './components/reports/WhoOwesYou/ARAgingSummaryReport';
import ARAgingSummaryInDetails from './components/reports/WhoOwesYou/ARAgingSummaryInDetails';
import InvoicesAndRecievePayments from './components/reports/WhoOwesYou/InvoicesAndRecievePayments';
import OpenInvoices from './components/reports/WhoOwesYou/OpenInvoices';
import InvoiceList from './components/reports/WhoOwesYou/InvoiceList';
import CustomerBalanceSummary from './components/reports/WhoOwesYou/CustomerBalanceSummary';
import CustomerBalanceDetail from './components/reports/WhoOwesYou/CustomerBalanceDetail';

// What you owe Reports
import APAgingSummaryReport from './components/reports/WhatYouOwe/APAgingSummaryReport';
import SupplierBalanceSummary from './components/reports/WhatYouOwe/SupplierBalanceSummary';
import SupplierBalanceDetails from './components/reports/WhatYouOwe/SupplierBalanceDetails';
import APAgingDetailReport from './components/reports/WhatYouOwe/APAgingDetailReport';
import BillsAndAppliedPayments from './components/reports/WhatYouOwe/BillsAndAppliedPayments';
import UnpaidBills from './components/reports/WhatYouOwe/UnpaidBills';

// Expense and Suppliers Reports
import SupplierContactDetails from './components/reports/ExpensesAndSuppliers/SupplierContactDetails';
import ChequeDetails from './components/reports/ExpensesAndSuppliers/ChequeDetails';
import GetPurchasesByProductServiceSummary from './components/reports/ExpensesAndSuppliers/GetPurchasesByProductServiceSummary';
import GetPurchasesByClassDetail from './components/reports/ExpensesAndSuppliers/GetPurchasesByClassDetail';
import GetOpenPurchaseOrdersDetail from './components/reports/ExpensesAndSuppliers/GetOpenPurchaseOrdersDetail';
import GetPurchaseList from './components/reports/ExpensesAndSuppliers/GetPurchaseList';
import GetPurchasesBySupplierSummary from './components/reports/ExpensesAndSuppliers/GetPurchasesBySupplierSummary';
import GetOpenPurchaseOrdersList from './components/reports/ExpensesAndSuppliers/GetOpenPurchaseOrdersList';
import GetExpenseBySupplierSummary from './components/reports/ExpensesAndSuppliers/GetExpenseBySupplierSummary';
import GetExpenseBySupplierDetail from './components/reports/ExpensesAndSuppliers/GetExpenseBySupplierDetail';

// Sales Tax
import SSCL100percentTaxDetails from './components/reports/SalesTax/SSCL100percentTaxDetails';
import VAT18percentTaxDetails from './components/reports/SalesTax/VAT18percentTaxDetails';
import TransactionDetailsByTaxCode from './components/reports/SalesTax/TransactionDetailsByTaxCode';

// Employees
import EmployeeContactDetails from './components/reports/Employees/EmployeeContactDetails';

import NotFound from './components/NotFound/NotFound';

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                path: "login",
                element: <Login />,
            },
            {
                path: "companies",
                element: (
                    <ProtectedRoute>
                        <CompanySelection />
                    </ProtectedRoute>
                ),
            },
            {
                path: "create-company",
                element: (
                    <ProtectedRoute>
                        <CreateCompany />
                    </ProtectedRoute>
                ),
            },
            {
                path: "dashboard/*",
                element: (
                    <ProtectedRoute>
                        <SocketProvider>
                            <Layout>
                                <Dashboard />
                            </Layout>
                        </SocketProvider>
                    </ProtectedRoute>
                ),
            },
            {
                path: "estimates/create",
                element: (
                    <ProtectedRoute>
                        <CreateEstimate />
                    </ProtectedRoute>
                ),
            },
            {
                path: "estimates/edit/:id",
                element: (
                    <ProtectedRoute>
                        <SocketProvider>
                            <EditEstimate />
                        </SocketProvider>
                    </ProtectedRoute>
                ),
            },
            {
                path: "purchase-orders",
                element: (
                    <ProtectedRoute>
                        <PurchaseOrdersPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "invoices/create",
                element: (
                    <ProtectedRoute>
                        <CreateInvoice />
                    </ProtectedRoute>
                ),
            },
            {
                path: "invoices/edit",
                element: (
                    <ProtectedRoute>
                        <SocketProvider>
                            <EditInvoice />
                        </SocketProvider>
                    </ProtectedRoute>
                ),
            },
            {
                path: "invoices/receive-payment/:customerId",
                element: (
                    <ProtectedRoute>
                        <InvoiceRecievedPayment />
                    </ProtectedRoute>
                ),
            },
            {
                path: "bills/receive-payment/:vendorId",
                element: (
                    <ProtectedRoute>
                        <BillReceivePaymentModal />
                    </ProtectedRoute>
                ),
            },
            {
                path: "purchase-orders/edit/:orderId",
                element: (
                    <ProtectedRoute>
                        <EditPurchaseOrders />
                    </ProtectedRoute>
                ),
            },
            {
                path: "expense/create",
                element: (
                    <ProtectedRoute>
                        <CreateExpense />
                    </ProtectedRoute>
                ),
            },
            {
                path: "expense/edit/:id",
                element: (
                    <ProtectedRoute>
                        <EditExpense />
                    </ProtectedRoute>
                ),
            },
            {
                path: "bill/create",
                element: (
                    <ProtectedRoute>
                        <CreateBill />
                    </ProtectedRoute>
                ),
            },
            {
                path: "bill/edit/:id",
                element: (
                    <ProtectedRoute>
                        <EditBill />
                    </ProtectedRoute>
                ),
            },
            {
                path: "cheque/create",
                element: (
                    <ProtectedRoute>
                        <CreateCheque />
                    </ProtectedRoute>
                ),
            },
            {
                path: "cheque/edit/:id",
                element: (
                    <ProtectedRoute>
                        <EditCheques />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/profit&loss",
                element: (
                    <ProtectedRoute>
                        <ProfitAndLossReport />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/profit&loss-by-class",
                element: (
                    <ProtectedRoute>
                        <ProfitAndLossByClass />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/profit-and-loss-by-employee/:employeeId",
                element: (
                    <ProtectedRoute>
                        <ProfitAndLossByClassInDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/profit&loss-by-customer",
                element: (
                    <ProtectedRoute>
                        <ProfitAndLossByCustomer />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/profit-and-loss-by-customer/:customerId",
                element: (
                    <ProtectedRoute>
                        <ProfitAndLossByCustomerInDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/profit&loss-by-month",
                element: (
                    <ProtectedRoute>
                        <ProfitAndLossByMonth />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/commission",
                element: (
                    <ProtectedRoute>
                        <CommissionReport />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/commission-by-employee/:employeeId",
                element: (
                    <ProtectedRoute>
                        <CommissionReportByEmployees />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sales",
                element: (
                    <ProtectedRoute>
                        <SalesReport />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sales-by-employee/:employeeId",
                element: (
                    <ProtectedRoute>
                        <SalesReportByEmployees />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/customer-contact-list",
                element: (
                    <ProtectedRoute>
                        <CustomerContactDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/product-service-list",
                element: (
                    <ProtectedRoute>
                        <ProductAndServiceList />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sales-by-customer",
                element: (
                    <ProtectedRoute>
                        <SalesbyCustomerSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sales-by-customer-detail/:customerId",
                element: (
                    <ProtectedRoute>
                        <SalesbyCustomerDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sales-by-product",
                element: (
                    <ProtectedRoute>
                        <SalesbyProductSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sales-by-product-detail/:productId",
                element: (
                    <ProtectedRoute>
                        <SalesbyProductDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/deposit-detail",
                element: (
                    <ProtectedRoute>
                        <DepoistDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/estimates-by-customer",
                element: (
                    <ProtectedRoute>
                        <EstimatesbyCustomers />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/stock-take-worksheet",
                element: (
                    <ProtectedRoute>
                        <StockTakeWorksheet />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/income-by-customer-summary",
                element: (
                    <ProtectedRoute>
                        <IncomeByCustomerSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/ar-aging-summary",
                element: (
                    <ProtectedRoute>
                        <ARAgingSummaryReport />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/ar-aging-in-detail/:customerId",
                element: (
                    <ProtectedRoute>
                        <ARAgingSummaryInDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/invoices-and-payments",
                element: (
                    <ProtectedRoute>
                        <InvoicesAndRecievePayments />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/open-invoices",
                element: (
                    <ProtectedRoute>
                        <OpenInvoices />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/invoice-list",
                element: (
                    <ProtectedRoute>
                        <InvoiceList />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/customer-balance-summary",
                element: (
                    <ProtectedRoute>
                        <CustomerBalanceSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/customer-balance-detail/:customer_Id",
                element: (
                    <ProtectedRoute>
                        <CustomerBalanceDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/supplier-contact-list",
                element: (
                    <ProtectedRoute>
                        <SupplierContactDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/cheque-detail",
                element: (
                    <ProtectedRoute>
                        <ChequeDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/purchases-by-product-service",
                element: (
                    <ProtectedRoute>
                        <GetPurchasesByProductServiceSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/purchases-by-class-detail",
                element: (
                    <ProtectedRoute>
                        <GetPurchasesByClassDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/open-purchase-orders-detail",
                element: (
                    <ProtectedRoute>
                        <GetOpenPurchaseOrdersDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/purchase-list",
                element: (
                    <ProtectedRoute>
                        <GetPurchaseList />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/purchases-by-supplier",
                element: (
                    <ProtectedRoute>
                        <GetPurchasesBySupplierSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/open-purchase-orders-list",
                element: (
                    <ProtectedRoute>
                        <GetOpenPurchaseOrdersList />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/expense-by-supplier",
                element: (
                    <ProtectedRoute>
                        <GetExpenseBySupplierSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/expense-by-supplier-detail/:payee_id",
                element: (
                    <ProtectedRoute>
                        <GetExpenseBySupplierDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/sscl-tax-detail",
                element: (
                    <ProtectedRoute>
                        <SSCL100percentTaxDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/vat-18-tax-detail",
                element: (
                    <ProtectedRoute>
                        <VAT18percentTaxDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/transaction-detail-by-tax-code",
                element: (
                    <ProtectedRoute>
                        <TransactionDetailsByTaxCode />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/ap-aging-summary",
                element: (
                    <ProtectedRoute>
                        <APAgingSummaryReport />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/ap-aging-detail/:vendorId",
                element: (
                    <ProtectedRoute>
                        <APAgingDetailReport />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/supplier-balance-summary",
                element: (
                    <ProtectedRoute>
                        <SupplierBalanceSummary />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/supplier-balance-detail/:vendor_id",
                element: (
                    <ProtectedRoute>
                        <SupplierBalanceDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/bills-and-payments",
                element: (
                    <ProtectedRoute>
                        <BillsAndAppliedPayments />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/unpaid-bills",
                element: (
                    <ProtectedRoute>
                        <UnpaidBills />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports/employee-contact-list",
                element: (
                    <ProtectedRoute>
                        <EmployeeContactDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/",
                element: <Navigate to="/companies" />,
            },
            {
                path: "*",
                element: <NotFound />,
            },
        ],
    },
]);
