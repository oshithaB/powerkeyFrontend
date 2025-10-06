import React from 'react';
import { Calculator, PieChart, FileText, TrendingUp } from 'lucide-react';

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
      </div>

      {/* Accounting Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-content p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calculator className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content p-6">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <PieChart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Equity</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Income</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart of Accounts */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        </div>
        <div className="card-content">
          <div className="text-center py-8">
            <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chart of Accounts</h3>
            <p className="text-gray-600">
              Your chart of accounts will be displayed here. This includes all your assets, liabilities, equity, revenue, and expense accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Balance Sheet</h2>
          </div>
          <div className="card-content">
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-600">Balance sheet will be generated here</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Income Statement</h2>
          </div>
          <div className="card-content">
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-600">Income statement will be generated here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}