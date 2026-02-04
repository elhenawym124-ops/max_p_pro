import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { customerService, Customer, CustomerFilters } from '../../services/customerService';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useDateFormat } from '../../hooks/useDateFormat';
import CustomerImportModal from './CustomerImportModal';
import { useAuth } from '../../hooks/useAuthSimple';

const CustomerList: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const isAdmin = ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const statusOptions = customerService.getStatusOptions();

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عميل؟`)) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => customerService.deleteCustomer(id))
      );
      setSelectedIds(new Set());
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'فشل في حذف العملاء');
    } finally {
      setIsBulkDeleting(false);
    }
  };
  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customerService.getCustomers(filters);
      console.log(response.data)
      setCustomers(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || t('customers.loadingError'));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadCustomers();
  }, [filters]);



  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
      search: searchQuery,
      page: 1,
    }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => {
      const newFilters: CustomerFilters = { ...prev, page: 1 };
      if (status === 'all') {
        delete newFilters.status;
      } else {
        newFilters.status = status;
      }
      return newFilters;
    });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await customerService.exportCustomers(format, filters);
    } catch (err: any) {
      setError(err.message || t('customers.exportError'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    if (!statusOption) return null;

    const colorClasses = {
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800',
      purple: 'bg-purple-100 text-purple-800',
      red: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusOption.color as keyof typeof colorClasses]}`}>
        {statusOption.label}
      </span>
    );
  };

  const getRatingBadge = (rating: string | undefined) => {
    if (!rating) return null;
    switch (rating) {
      case 'EXCELLENT': return <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ring-1 ring-purple-600/20">💎 Excellent</span>;
      case 'GOOD': return <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ring-1 ring-blue-600/20">✅ Good</span>;
      case 'AVERAGE': return <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full ring-1 ring-gray-600/20">Average</span>;
      case 'BAD': return <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ring-1 ring-red-600/20">⛔ Bad</span>;
      default: return null;
    }
  };



  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('customers.pageTitle')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('customers.pageSubtitle')}</p>
          </div>
          {isAdmin && (
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowUpTrayIcon className="h-4 w-4 ml-2" />
                استيراد CSV
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
                {t('customers.exportCSV')}
              </button>
              <Link
                to="/customers/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <PlusIcon className="h-4 w-4 ml-2" />
                {t('customers.addCustomer')}
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-md">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('customers.searchPlaceholder')}
                  className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-gray-100"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <FunnelIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">{t('customers.allStatuses')}</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                {selectedIds.size} عميل محدد
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                إلغاء التحديد
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 ml-1" />
                {isBulkDeleting ? 'جاري الحذف...' : 'حذف المحدد'}
              </button>
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-md overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === customers.length && customers.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('customers.tableCustomer')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('customers.tableContactInfo')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('customers.tableStatus')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('customers.tableStats')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('customers.tableCreatedAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('customers.tableActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer) => (
                  <tr key={customer.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(customer.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                              {customer.firstName && customer.firstName.charAt(0)}{customer.lastName && customer.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            {customer.firstName || ''} {customer.lastName || ''}
                            {getRatingBadge(customer.customerRating)}
                          </div>
                          {customer.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.tags.slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                                >
                                  {tag}
                                </span>
                              ))}
                              {customer.tags.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{customer.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{customer.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{t('customers.conversations')}: {customer._count?.conversations || 0}</div>
                      <div>{t('customers.orders')}: {customer._count?.orders || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {t('customers.previous')}
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {t('customers.next')}
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('customers.showing')}{' '}
                    <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                    {' '}{t('customers.to')}{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>
                    {' '}{t('customers.of')}{' '}
                    <span className="font-medium">{pagination.total}</span>
                    {' '}{t('customers.result')}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      {t('customers.previous')}
                    </button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.page
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {t('customers.next')}
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}


        </div>

        {/* Empty State */}
        {!isLoading && customers.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('customers.noCustomers')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('customers.noCustomersDesc')}</p>
            <div className="mt-6">
              <Link
                to="/customers/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 ml-2" />
                {t('customers.addCustomer')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          loadCustomers();
        }}
      />
    </>
  );
};

export default CustomerList;
