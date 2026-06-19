import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient from '../api/apiClient';
import { Search, Filter, X, ChevronLeft, ChevronRight, Edit, Trash2, Check, XCircle } from 'lucide-react';

const TransactionView = () => {
  const { getText, language } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [categories, setCategories] = useState({});
  const [categoryStructure, setCategoryStructure] = useState({});
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    billingPeriod: '',
    mainCategory: '',
    subCategory: '',
    search: '',
  });
  
  // UI state
  const [filterOpen, setFilterOpen] = useState(false);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  
  // Edit state
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({
    main_category: '',
    sub_category: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch billing periods
        const periods = await apiClient.getBillingPeriods();
        setBillingPeriods(periods);
        
        // Fetch categories
        const categoriesData = await apiClient.getCategoriesList();
        setCategories(categoriesData);
        
        // Also fetch the full category structure
        try {
          const response = await fetch('/api/categories-structure/');
          if (response.ok) {
            const structure = await response.json();
            setCategoryStructure(structure);
          }
        } catch (err) {
          console.error('Error fetching category structure:', err);
        }
        
        // Initial transactions will be loaded by the useEffect below
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Update subcategories when main category changes
  useEffect(() => {
    if (filters.mainCategory && categories[filters.mainCategory]) {
      setAvailableSubcategories(categories[filters.mainCategory]);
    } else {
      setAvailableSubcategories([]);
    }
    
    // Clear subcategory if main category changes
    if (filters.subCategory && !availableSubcategories.includes(filters.subCategory)) {
      setFilters(prev => ({ ...prev, subCategory: '' }));
    }
  }, [filters.mainCategory, categories]);

  // Update form subcategories when main category changes in edit form
  useEffect(() => {
    if (editForm.main_category && categoryStructure[editForm.main_category]) {
      // If sub_category isn't in the selected main category, reset it
      if (editForm.sub_category && !categoryStructure[editForm.main_category].includes(editForm.sub_category)) {
        setEditForm(prev => ({ ...prev, sub_category: '' }));
      }
    }
  }, [editForm.main_category, categoryStructure]);

  // Fetch transactions when page changes or filters are applied
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        const response = await apiClient.getTransactions({
          skip: page * pageSize,
          limit: pageSize,
          ...filters
        });
        
        // If the response format has changed to include items and total
        if (response.items && response.total !== undefined) {
          setTransactions(response.items);
          setTotal(response.total);
        } else {
          // Fallback for old API format
          setTransactions(response);
          setTotal(response.length);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [page, pageSize, filters]);

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    setPage(0); // Reset to first page
    setFilterOpen(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      billingPeriod: '',
      mainCategory: '',
      subCategory: '',
      search: '',
    });
    setPage(0);
    setFilterOpen(false);
  };

  // Start editing a transaction
  const startEdit = (transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      main_category: transaction.main_category || '',
      sub_category: transaction.sub_category || ''
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingTransaction(null);
    setEditForm({
      main_category: '',
      sub_category: ''
    });
  };

  // Save edited transaction
  const saveTransaction = async () => {
    try {
      setIsSaving(true);
      
      // Create updated transaction object
      const updatedTransaction = {
        ...editingTransaction,
        main_category: editForm.main_category,
        sub_category: editForm.sub_category
      };
      
      // Send update request
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTransaction),
      });
      
      if (response.ok) {
        // Update local state
        setTransactions(transactions.map(tx => 
          tx.id === editingTransaction.id ? { ...tx, ...updatedTransaction } : tx
        ));
        
        setActionMessage({
          type: 'success',
          text: 'Transaction updated successfully'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update transaction');
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsSaving(false);
      setEditingTransaction(null);
    }
  };

  // Confirm delete
  const confirmDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteConfirm(true);
  };

  // Cancel delete
  const cancelDelete = () => {
    setTransactionToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Delete transaction
  const deleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Send delete request
      const response = await fetch(`/api/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Update local state
        setTransactions(transactions.filter(tx => tx.id !== transactionToDelete.id));
        
        setActionMessage({
          type: 'success',
          text: 'Transaction deleted successfully'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete transaction');
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsDeleting(false);
      setTransactionToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Format amount with color
  const formatAmount = (amount) => {
    const formatted = Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const style = amount < 0
      ? 'text-red-600 font-medium'
      : 'text-green-600 font-medium';
    
    return (
      <span className={style}>
        {amount < 0 ? '-' : '+'}{formatted} ₪
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US');
    } catch (e) {
      return dateString;
    }
  };

  // Confirmation Dialog
  const DeleteConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Deletion</h3>
        <p className="mb-6 text-gray-700">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={cancelDelete}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={deleteTransaction}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-indigo-700 font-semibold">{getText('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {showDeleteConfirm && <DeleteConfirmDialog />}

      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">{getText('view_transactions')}</h1>
        
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              className="px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={getText('search')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
            <button 
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={applyFilters}
            >
              <Search size={18} />
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`px-3 py-2 rounded-md flex items-center ${
              Object.values(filters).some(v => v) 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Filter size={18} className="mr-1" />
            {getText('filter')}
          </button>
        </div>
      </header>

      {/* Action message */}
      {actionMessage && (
        <div className={`mb-4 p-4 rounded-md flex items-center ${
          actionMessage.type === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {actionMessage.type === 'success' ? (
            <Check className="text-green-500 mr-2" />
          ) : (
            <XCircle className="text-red-500 mr-2" />
          )}
          <span className={actionMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {actionMessage.text}
          </span>
        </div>
      )}

      {/* Filter Panel */}
      {filterOpen && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{getText('filter')}</h2>
            <button
              onClick={() => setFilterOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getText('from')}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getText('to')}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            {/* Billing Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getText('select_period')}
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.billingPeriod}
                onChange={(e) => handleFilterChange('billingPeriod', e.target.value)}
              >
                <option value="">{getText('all')}</option>
                {billingPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getText('category')}
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.mainCategory}
                onChange={(e) => handleFilterChange('mainCategory', e.target.value)}
              >
                <option value="">{getText('all')}</option>
                {Object.keys(categories).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getText('subcategory')}
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.subCategory}
                onChange={(e) => handleFilterChange('subCategory', e.target.value)}
                disabled={!filters.mainCategory}
              >
                <option value="">{getText('all')}</option>
                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {getText('clear_filters')}
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {getText('apply')}
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">{getText('no_data')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getText('date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getText('description')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getText('amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getText('category')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getText('subcategory')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getText('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                        {transaction.note && (
                          <p className="text-xs text-gray-500 mt-1">{transaction.note}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {formatAmount(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingTransaction && editingTransaction.id === transaction.id ? (
                          <select
                            className="w-full px-2 py-1 border rounded text-sm"
                            value={editForm.main_category}
                            onChange={(e) => setEditForm({...editForm, main_category: e.target.value})}
                          >
                            <option value="">Select category</option>
                            {Object.keys(categoryStructure).map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-900">{transaction.main_category}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingTransaction && editingTransaction.id === transaction.id ? (
                          <select
                            className="w-full px-2 py-1 border rounded text-sm"
                            value={editForm.sub_category}
                            onChange={(e) => setEditForm({...editForm, sub_category: e.target.value})}
                            disabled={!editForm.main_category}
                          >
                            <option value="">Select subcategory</option>
                            {editForm.main_category && categoryStructure[editForm.main_category] && 
                              categoryStructure[editForm.main_category].map(subcategory => (
                                <option key={subcategory} value={subcategory}>{subcategory}</option>
                              ))
                            }
                          </select>
                        ) : (
                          <span className="text-gray-900">{transaction.sub_category}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <div className="flex justify-center space-x-2">
                          {editingTransaction && editingTransaction.id === transaction.id ? (
                            <>
                              <button 
                                onClick={saveTransaction}
                                disabled={isSaving}
                                className="text-green-600 hover:text-green-900"
                                title="Save"
                              >
                                {isSaving ? (
                                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <Check size={18} />
                                )}
                              </button>
                              <button 
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-900"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEdit(transaction)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => confirmDelete(transaction)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              {/* Mobile Pagination Buttons */}
              <div className="flex-1 flex justify-between sm:hidden">
                {/* Mobile First Page Button - NEW */}
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className={`relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md mr-2 ${
                    page === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>First</span>
                </button>

                {/* Mobile Previous Button */}
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    page === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {getText('previous')}
                </button>

                {/* Mobile Next Button */}
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / pageSize) - 1}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    page >= Math.ceil(total / pageSize) - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {getText('next')}
                </button>

                {/* Mobile Last Page Button - NEW */}
                <button
                  onClick={() => setPage(Math.ceil(total / pageSize) - 1)}
                  disabled={page >= Math.ceil(total / pageSize) - 1}
                  className={`ml-2 relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    page >= Math.ceil(total / pageSize) - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Last</span>
                </button>
              </div>

              {/* Desktop Pagination */}
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {getText('showing')} <span className="font-medium">{page * pageSize + 1}</span>{' '}
                    {getText('to')}{' '}
                    <span className="font-medium">
                      {Math.min((page + 1) * pageSize, total)}
                    </span>{' '}
                    {getText('of')} <span className="font-medium">{total}</span>{' '}
                    {getText('results')}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    {/* First Page Button - NEW */}
                    <button
                      onClick={() => setPage(0)}
                      disabled={page === 0}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 ${
                        page === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                        <span className="sr-only">First Page</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M10.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L6.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                   
                   {/* Previous Button */}
                   <button
                     onClick={() => setPage(Math.max(0, page - 1))}
                     disabled={page === 0}
                     className={`relative inline-flex items-center px-2 py-2 border border-gray-300 ${
                       page === 0
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : 'bg-white text-gray-500 hover:bg-gray-50'
                     }`}
                   >
                     <span className="sr-only">{getText('previous')}</span>
                     <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                   </button>
                   
                   {/* Current Page / Total Pages */}
                   <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                     {page + 1} / {Math.ceil(total / pageSize)}
                   </span>
                   
                   {/* Next Button */}
                   <button
                     onClick={() => setPage(page + 1)}
                     disabled={page >= Math.ceil(total / pageSize) - 1 || loading}
                     className={`relative inline-flex items-center px-2 py-2 border border-gray-300 ${
                       page >= Math.ceil(total / pageSize) - 1 || loading
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : 'bg-white text-gray-500 hover:bg-gray-50'
                     }`}
                   >
                     <span className="sr-only">{getText('next')}</span>
                     <ChevronRight className="h-5 w-5" aria-hidden="true" />
                   </button>
                   
                   {/* Last Page Button - NEW */}
                   <button
                     onClick={() => setPage(Math.ceil(total / pageSize) - 1)}
                     disabled={page >= Math.ceil(total / pageSize) - 1 || loading}
                     className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 ${
                       page >= Math.ceil(total / pageSize) - 1 || loading
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : 'bg-white text-gray-500 hover:bg-gray-50'
                     }`}
                   >
                     <span className="sr-only">Last Page</span>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M4.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L8.586 10 4.293 14.293a1 1 0 000 1.414z" clipRule="evenodd" />
                       <path fillRule="evenodd" d="M9.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L13.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
                     </svg>
                   </button>
                 </nav>
               </div>
             </div>
           </div>
         </>
       )}
     </div>
   </div>
 );
};

export default TransactionView;