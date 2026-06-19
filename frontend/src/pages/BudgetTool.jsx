import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const BudgetTool = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  // Add view toggle state
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'annual'

  // Add income data state
  const [incomeData, setIncomeData] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(false);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Initialize with current month
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    setSelectedMonth(currentMonth);
    loadAvailableMonths();
  }, []);

  // Load available months from billing periods
  const loadAvailableMonths = async () => {
    try {
      const response = await apiClient.get('/billing-periods/');
      // The API returns the data directly, not wrapped in a data property
      if (response && Array.isArray(response)) {
        // Convert billing periods to YYYY-MM format
        const months = response.map(period => {
          // Parse billing period like "January 2024" to "2024-01"
          const parts = period.split(' ');
          if (parts.length === 2) {
            const monthName = parts[0];
            const year = parts[1];
            const monthMap = {
              'January': '01', 'February': '02', 'March': '03', 'April': '04',
              'May': '05', 'June': '06', 'July': '07', 'August': '08',
              'September': '09', 'October': '10', 'November': '11', 'December': '12'
            };
            const monthNum = monthMap[monthName];
            if (monthNum) {
              return `${year}-${monthNum}`;
            }
          }
          return null;
        }).filter(Boolean);
        
        setAvailableMonths(months);
      }
    } catch (error) {
      console.error('Error loading available months:', error);
    }
  };

  // Load budget data for selected month
  const loadBudgetData = async () => {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/budget/combined/?month=${selectedMonth}`);
      // The API returns the data directly, not wrapped in a data property
      setBudgetData(response || []);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when month changes
  useEffect(() => {
    if (selectedMonth) {
      loadBudgetData();
    }
  }, [selectedMonth]);

  // Load income data for selected month
  const loadIncomeData = async () => {
    if (!selectedMonth) return;
    
    setIncomeLoading(true);
    try {
      // Use the new income-combined endpoint to get real income data
      const response = await apiClient.get(`/budget/income-combined/?month=${selectedMonth}`);
      setIncomeData(response || []);
    } catch (error) {
      console.error('Error loading income data:', error);
      // Fallback to empty array if no income data
      setIncomeData([]);
    } finally {
      setIncomeLoading(false);
    }
  };



  // Load income data when month changes
  useEffect(() => {
    if (selectedMonth && viewMode === 'monthly') {
      loadIncomeData();
    }
  }, [selectedMonth, viewMode]);

  // Sort availableMonths chronologically (oldest to newest)
  const sortedMonths = React.useMemo(() => {
    return [...availableMonths].sort((a, b) => new Date(a + '-01') - new Date(b + '-01'));
  }, [availableMonths]);

  // Annual overview data
  const [annualData, setAnnualData] = useState([]);
  const [annualIncomeData, setAnnualIncomeData] = useState([]);
  // Fix useEffect to use combined endpoints for both expense and income data
  useEffect(() => {
    if (viewMode === 'annual') {
      const fetchAnnual = async () => {
        setLoading(true);
        try {
          // Use combined endpoints for both expense and income data to get budget info
          const [expenseResponse, incomeResponse] = await Promise.all([
            apiClient.get('/budget/combined/?month=' + getCurrentMonth()),
            apiClient.get('/budget/income-combined/?month=' + getCurrentMonth())
          ]);
          
          setAnnualData(expenseResponse || []);
          setAnnualIncomeData(incomeResponse || []);
        } catch (error) {
          console.error('Error fetching annual data:', error);
          setAnnualData([]);
          setAnnualIncomeData([]);
        } finally {
          setLoading(false);
        }
      };
      fetchAnnual();
    }
  }, [viewMode]);

  // Calculate annual totals for summary cards
  const totalAnnualExpenseAverage = annualData.reduce((sum, row) => sum + row.average_amount, 0);
  const totalAnnualExpenseBudget = annualData.reduce((sum, row) => sum + (row.budget_amount || 0), 0);
  const totalAnnualIncomeAverage = annualIncomeData.reduce((sum, row) => sum + row.average_amount, 0);
  const totalAnnualIncomeBudget = annualIncomeData.reduce((sum, row) => sum + (row.budget_amount || 0), 0);
  const netAnnualAverage = totalAnnualIncomeAverage - totalAnnualExpenseAverage;
  const netAnnualBudget = totalAnnualIncomeBudget - totalAnnualExpenseBudget;

  // Handle cell edit start
  const handleEditStart = (rowIndex, field) => {
    const currentValue = budgetData[rowIndex][field];
    setEditingCell({ rowIndex, field });
    setEditValue(currentValue.toString());
  };

  // Handle cell edit save
  const handleEditSave = async (rowIndex) => {
    const row = budgetData[rowIndex];
    const newBudgetAmount = parseFloat(editValue);
    
    if (isNaN(newBudgetAmount) || newBudgetAmount < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    try {
      await apiClient.post('/budget/user/', {
        month: selectedMonth,
        main_category: row.main_category,
        sub_category: row.sub_category,
        budget_amount: newBudgetAmount
      });

      // Update local state
      const updatedData = [...budgetData];
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        budget_amount: newBudgetAmount,
        has_budget: true
      };
      setBudgetData(updatedData);
      
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Error saving budget. Please try again.');
    }
  };

  // Handle cell edit cancel
  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle key press in edit field
  const handleKeyPress = (e, rowIndex) => {
    if (e.key === 'Enter') {
      handleEditSave(rowIndex);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  // Calculate budget vs actual difference
  const calculateDifference = (budget, actual) => {
    return budget - actual;
  };

  // Get difference color
  const getDifferenceColor = (difference) => {
    if (difference >= 0) return 'text-green-600';
    return 'text-red-600';
  };

  // Group budget data by main category
  const groupedData = React.useMemo(() => {
    const groups = {};
    budgetData.forEach(row => {
      if (!groups[row.main_category]) {
        groups[row.main_category] = [];
      }
      groups[row.main_category].push(row);
    });
    return groups;
  }, [budgetData]);

  // Calculate category sums
  const categorySums = React.useMemo(() => {
    const sums = {};
    Object.entries(groupedData).forEach(([mainCategory, rows]) => {
      sums[mainCategory] = {
        average_amount: rows.reduce((sum, r) => sum + r.average_amount, 0),
        budget_amount: rows.reduce((sum, r) => sum + r.budget_amount, 0),
        actual_amount: rows.reduce((sum, r) => sum + r.actual_amount, 0),
      };
    });
    return sums;
  }, [groupedData]);

  // Group annual data by main category
  const groupedAnnualData = React.useMemo(() => {
    const groups = {};
    annualData.forEach(row => {
      if (!groups[row.main_category]) {
        groups[row.main_category] = [];
      }
      groups[row.main_category].push(row);
    });
    return groups;
  }, [annualData]);

  // Calculate annual category sums
  const annualCategorySums = React.useMemo(() => {
    const sums = {};
    Object.entries(groupedAnnualData).forEach(([mainCategory, rows]) => {
      sums[mainCategory] = {
        average_amount: rows.reduce((sum, r) => sum + r.average_amount, 0),
      };
    });
    return sums;
  }, [groupedAnnualData]);

  // Group income data by main category
  const groupedIncomeData = React.useMemo(() => {
    const groups = {};
    incomeData.forEach(row => {
      if (!groups[row.main_category]) {
        groups[row.main_category] = [];
      }
      groups[row.main_category].push(row);
    });
    return groups;
  }, [incomeData]);

  // Calculate income category sums
  const incomeCategorySums = React.useMemo(() => {
    const sums = {};
    Object.entries(groupedIncomeData).forEach(([mainCategory, rows]) => {
      sums[mainCategory] = {
        average_amount: rows.reduce((sum, r) => sum + r.average_amount, 0),
        budget_amount: rows.reduce((sum, r) => sum + r.budget_amount, 0),
        actual_amount: rows.reduce((sum, r) => sum + r.actual_amount, 0),
      };
    });
    return sums;
  }, [groupedIncomeData]);

  // Group annual income data by main category
  const groupedAnnualIncomeData = React.useMemo(() => {
    const groups = {};
    annualIncomeData.forEach(row => {
      if (!groups[row.main_category]) {
        groups[row.main_category] = [];
      }
      groups[row.main_category].push(row);
    });
    return groups;
  }, [annualIncomeData]);

  // Calculate annual income category sums
  const annualIncomeCategorySums = React.useMemo(() => {
    const sums = {};
    Object.entries(groupedAnnualIncomeData).forEach(([mainCategory, rows]) => {
      sums[mainCategory] = {
        average_amount: rows.reduce((sum, r) => sum + r.average_amount, 0),
      };
    });
    return sums;
  }, [groupedAnnualIncomeData]);

  // Fix income editing by using the row data directly
  const handleAnnualIncomeEditStart = (row, field) => {
    console.log('Starting income edit with row:', row);
    if (!row || !row.main_category || !row.sub_category) {
      alert('Error: Invalid row data');
      return;
    }
    
    setEditingCell({ row: row, field, type: 'annual-income' });
    setEditValue(row.budget_amount ? row.budget_amount.toString() : '0');
  };

  const handleAnnualIncomeEditSave = async () => {
    const row = editingCell?.row;
    if (!row || !row.main_category || !row.sub_category) {
      alert('Error: No valid row data for save');
      return;
    }
    
    const newBudgetAmount = parseFloat(editValue);
    
    if (isNaN(newBudgetAmount) || newBudgetAmount < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    const saveData = {
      month: getCurrentMonth(),
      main_category: row.main_category,
      sub_category: row.sub_category,
      budget_amount: newBudgetAmount
    };

    try {
      console.log('Saving income budget:', saveData);
      const response = await apiClient.post('/budget/user/', saveData);
      console.log('Save successful:', response);

      // Refresh the data from the server to get updated budget info
      const incomeResponse = await apiClient.get('/budget/income-combined/?month=' + getCurrentMonth());
      setAnnualIncomeData(incomeResponse || []);
      
      setEditingCell(null);
      setEditValue('');
      
      alert('Budget saved successfully!');
    } catch (error) {
      alert('Error saving income budget: ' + error.message);
      console.error('Error saving income budget:', error);
    }
  };

  // Fix annual expense edit handlers to use row-based approach like income
  const handleAnnualExpenseEditStart = (row, field) => {
    console.log('Starting expense edit with row:', row);
    if (!row || !row.main_category || !row.sub_category) {
      alert('Error: Invalid row data');
      return;
    }
    
    setEditingCell({ row: row, field, type: 'annual-expense' });
    setEditValue(row.budget_amount ? row.budget_amount.toString() : '0');
  };

  const handleAnnualExpenseEditSave = async () => {
    const row = editingCell?.row;
    if (!row || !row.main_category || !row.sub_category) {
      alert('Error: No valid row data for save');
      return;
    }
    
    const newBudgetAmount = parseFloat(editValue);
    
    if (isNaN(newBudgetAmount) || newBudgetAmount < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    const saveData = {
      month: getCurrentMonth(),
      main_category: row.main_category,
      sub_category: row.sub_category,
      budget_amount: newBudgetAmount
    };

    try {
      console.log('Saving expense budget:', saveData);
      const response = await apiClient.post('/budget/user/', saveData);
      console.log('Save successful:', response);

      // Refresh the data from the server to get updated budget info
      const expenseResponse = await apiClient.get('/budget/combined/?month=' + getCurrentMonth());
      setAnnualData(expenseResponse || []);
      
      setEditingCell(null);
      setEditValue('');
      
      alert('Budget saved successfully!');
    } catch (error) {
      alert('Error saving expense budget: ' + error.message);
      console.error('Error saving expense budget:', error);
    }
  };

  // Handle income budget edit
  const handleIncomeEditStart = (rowIndex, field) => {
    const currentValue = incomeData[rowIndex][field];
    setEditingCell({ rowIndex, field, type: 'income' });
    setEditValue(currentValue.toString());
  };

  const handleIncomeEditSave = async (rowIndex) => {
    const row = incomeData[rowIndex];
    const newBudgetAmount = parseFloat(editValue);
    
    if (isNaN(newBudgetAmount) || newBudgetAmount < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    try {
      await apiClient.post('/budget/user/', {
        month: selectedMonth,
        main_category: row.main_category,
        sub_category: row.sub_category,
        budget_amount: newBudgetAmount
      });

      // Update local state
      const updatedData = [...incomeData];
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        budget_amount: newBudgetAmount,
        has_budget: true
      };
      setIncomeData(updatedData);
      
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving income budget:', error);
      alert('Error saving income budget. Please try again.');
    }
  };

  // Calculate comprehensive totals for monthly view
  const totalBudgetExpenses = budgetData.reduce((sum, row) => sum + row.budget_amount, 0);
  const totalActualExpenses = budgetData.reduce((sum, row) => sum + row.actual_amount, 0);
  const totalBudgetIncome = incomeData.reduce((sum, row) => sum + row.budget_amount, 0);
  const totalActualIncome = incomeData.reduce((sum, row) => sum + row.actual_amount, 0);
  const netBudget = totalBudgetIncome - totalBudgetExpenses;
  const netActual = totalActualIncome - totalActualExpenses;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* View Toggle */}
        <div className="mb-4 flex gap-4">
          <button
            className={`px-4 py-2 rounded ${viewMode === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setViewMode('monthly')}
          >
            Monthly View
          </button>
          <button
            className={`px-4 py-2 rounded ${viewMode === 'annual' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setViewMode('annual')}
          >
            Annual Overview
          </button>
        </div>
        {/* Enhanced Summary Cards in Header (Monthly only) */}
        {viewMode === 'monthly' && !loading && !incomeLoading && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800">Total Income</h3>
              <div className="space-y-1">
                <p className="text-sm text-green-600">Budget: {formatCurrency(totalBudgetIncome)}</p>
                <p className="text-xl font-bold text-green-900">Actual: {formatCurrency(totalActualIncome)}</p>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800">Total Expenses</h3>
              <div className="space-y-1">
                <p className="text-sm text-red-600">Budget: {formatCurrency(totalBudgetExpenses)}</p>
                <p className="text-xl font-bold text-red-900">Actual: {formatCurrency(totalActualExpenses)}</p>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${netActual >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <h3 className={`text-lg font-semibold ${netActual >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Net Balance</h3>
              <div className="space-y-1">
                <p className={`text-sm ${netBudget >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Budget: {formatCurrency(netBudget)}</p>
                <p className={`text-xl font-bold ${netActual >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>Actual: {formatCurrency(netActual)}</p>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800">Savings Rate</h3>
              <div className="space-y-1">
                <p className="text-sm text-purple-600">Budget: {totalBudgetIncome > 0 ? ((netBudget / totalBudgetIncome) * 100).toFixed(1) : 0}%</p>
                <p className="text-xl font-bold text-purple-900">Actual: {totalActualIncome > 0 ? ((netActual / totalActualIncome) * 100).toFixed(1) : 0}%</p>
              </div>
            </div>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Budget Tool</h1>
        
        {/* Annual Overview Summary Cards */}
        {viewMode === 'annual' && !loading && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800">Income Average</h3>
              <p className="text-xl font-bold text-green-900">{formatCurrency(totalAnnualIncomeAverage)}</p>
              <p className="text-sm text-green-600">12-month average</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800">Income Budget</h3>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalAnnualIncomeBudget)}</p>
              <p className="text-sm text-blue-600">Monthly target</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="text-lg font-semibold text-orange-800">Expense Average</h3>
              <p className="text-xl font-bold text-orange-900">{formatCurrency(totalAnnualExpenseAverage)}</p>
              <p className="text-sm text-orange-600">12-month average</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800">Expense Budget</h3>
              <p className="text-xl font-bold text-red-900">{formatCurrency(totalAnnualExpenseBudget)}</p>
              <p className="text-sm text-red-600">Monthly target</p>
            </div>
            <div className={`p-4 rounded-lg border ${netAnnualAverage >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <h3 className={`text-lg font-semibold ${netAnnualAverage >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>Net Balance</h3>
              <div className="space-y-1">
                <p className={`text-sm ${netAnnualAverage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Average: {formatCurrency(netAnnualAverage)}</p>
                <p className={`text-lg font-bold ${netAnnualBudget >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>Budget: {formatCurrency(netAnnualBudget)}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Month Selector (Monthly only) */}
        {viewMode === 'monthly' && (
          <div className="mb-6">
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Month:
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {sortedMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('he-IL', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading budget data...</span>
          </div>
        )}


        {/* Income Section (Monthly only) */}
        {viewMode === 'monthly' && !loading && !incomeLoading && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Income Budget</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Income Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Average (12 months)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Budget (Editable)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Actual (selected month)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Difference</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedIncomeData).map(([mainCategory, rows]) => {
                    const catSum = incomeCategorySums[mainCategory];
                    return (
                      <React.Fragment key={mainCategory}>
                        {/* Income category summary row */}
                        <tr className="bg-green-100 font-bold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{mainCategory}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">(Total)</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.average_amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.budget_amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.actual_amount)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getDifferenceColor(catSum.actual_amount - catSum.budget_amount)}`}>{formatCurrency(catSum.actual_amount - catSum.budget_amount)}</td>
                        </tr>
                        {/* Income subcategory rows */}
                        {rows.map((row, index) => {
                          const difference = row.actual_amount - row.budget_amount;
                          const isEditing = editingCell?.row && 
                                           editingCell.row.main_category === row.main_category && 
                                           editingCell.row.sub_category === row.sub_category && 
                                           editingCell.field === 'budget_amount' && 
                                           editingCell.type === 'income';
                          return (
                            <tr key={`${row.main_category}-${row.sub_category}`} className="hover:bg-green-25">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left"></td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">{row.sub_category}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.average_amount)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                {isEditing ? (
                                  <div className="flex items-center">
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleIncomeEditSave(actualIndex);
                                        } else if (e.key === 'Escape') {
                                          handleEditCancel();
                                        }
                                      }}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleIncomeEditSave(actualIndex)}
                                      className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={handleEditCancel}
                                      className="ml-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                    >
                                      ✗
                                    </button>
                                  </div>
                                ) : (
                                  <div 
                                    className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                    onClick={() => handleIncomeEditStart(actualIndex, 'budget_amount')}
                                  >
                                    {row.has_budget ? formatCurrency(row.budget_amount) : 'Click to set'}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.actual_amount)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getDifferenceColor(difference)}`}>{formatCurrency(difference)}</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Expenses Section Header (Monthly only) */}
        {viewMode === 'monthly' && !loading && budgetData.length > 0 && (
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Expense Budget</h2>
        )}
        {/* Budget Table (Monthly) */}
        {viewMode === 'monthly' && !loading && budgetData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average (12 months)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget (Editable)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><span title="Actual spending for the selected month">Actual <span className="text-xs text-gray-400">(selected month)</span></span></th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupedData).map(([mainCategory, rows]) => {
                  const catSum = categorySums[mainCategory];
                  return (
                    <React.Fragment key={mainCategory}>
                      {/* Category summary row */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{mainCategory}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">(Total)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.average_amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.budget_amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.actual_amount)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getDifferenceColor(catSum.budget_amount - catSum.actual_amount)}`}>{formatCurrency(catSum.budget_amount - catSum.actual_amount)}</td>
                      </tr>
                      {/* Subcategory rows */}
                      {rows.map((row, index) => {
                        const difference = calculateDifference(row.budget_amount, row.actual_amount);
                        const isEditing = editingCell?.rowIndex === budgetData.findIndex(r => r.main_category === row.main_category && r.sub_category === row.sub_category) && editingCell?.field === 'budget_amount';
                        return (
                          <tr key={`${row.main_category}-${row.sub_category}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left"></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">{row.sub_category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.average_amount)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {isEditing ? (
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, budgetData.findIndex(r => r.main_category === row.main_category && r.sub_category === row.sub_category))}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleEditSave(budgetData.findIndex(r => r.main_category === row.main_category && r.sub_category === row.sub_category))}
                                    className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={handleEditCancel}
                                    className="ml-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                  >
                                    ✗
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                  onClick={() => handleEditStart(budgetData.findIndex(r => r.main_category === row.main_category && r.sub_category === row.sub_category), 'budget_amount')}
                                >
                                  {row.has_budget ? formatCurrency(row.budget_amount) : 'Click to set'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.actual_amount)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getDifferenceColor(difference)}`}>{formatCurrency(difference)}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Annual Overview Table */}
        {viewMode === 'annual' && !loading && (annualData.length > 0 || annualIncomeData.length > 0) && (
          <div className="space-y-8">
            {/* Income Section */}
            {annualIncomeData.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-green-800 mb-4">Annual Income Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Income Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Average (12 months)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Budget (Editable)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(groupedAnnualIncomeData).map(([mainCategory, rows]) => {
                        const catSum = annualIncomeCategorySums[mainCategory];
                        return (
                          <React.Fragment key={`income-${mainCategory}`}>
                            {/* Income category summary row */}
                            <tr className="bg-green-100 font-bold">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{mainCategory}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">(Total)</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.average_amount)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">-</td>
                            </tr>
                            {/* Income subcategory rows */}
                            {rows.map((row, index) => {
                              // Check if this specific row is being edited
                              const isEditing = editingCell?.row && 
                                               editingCell.row.main_category === row.main_category && 
                                               editingCell.row.sub_category === row.sub_category && 
                                               editingCell.field === 'budget_amount' && 
                                               editingCell.type === 'annual-income';
                              return (
                                <tr key={`income-${row.main_category}-${row.sub_category}`} className="hover:bg-green-25">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">{row.sub_category}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.average_amount)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                    {isEditing ? (
                                      <div className="flex items-center">
                                        <input
                                          type="number"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onKeyPress={(e) => handleKeyPress(e, actualIndex)}
                                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleAnnualIncomeEditSave()}
                                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={handleEditCancel}
                                          className="ml-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                        >
                                          ✗
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                        onClick={() => handleAnnualIncomeEditStart(row, 'budget_amount')}
                                      >
                                        {row.has_budget ? formatCurrency(row.budget_amount || 0) : 'Click to set'}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Expense Section */}
            {annualData.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-red-800 mb-4">Annual Expense Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average (12 months)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget (Editable)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(groupedAnnualData).map(([mainCategory, rows]) => {
                        const catSum = annualCategorySums[mainCategory];
                        return (
                          <React.Fragment key={`expense-${mainCategory}`}>
                            {/* Category summary row */}
                            <tr className="bg-gray-100 font-bold">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{mainCategory}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">(Total)</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(catSum.average_amount)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">-</td>
                            </tr>
                            {/* Subcategory rows */}
                            {rows.map((row, index) => {
                              // Check if this specific row is being edited
                              const isEditing = editingCell?.row && 
                                               editingCell.row.main_category === row.main_category && 
                                               editingCell.row.sub_category === row.sub_category && 
                                               editingCell.field === 'budget_amount' && 
                                               editingCell.type === 'annual-expense';
                              return (
                                <tr key={`expense-${row.main_category}-${row.sub_category}`} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left"></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">{row.sub_category}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.average_amount)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                    {isEditing ? (
                                      <div className="flex items-center">
                                        <input
                                          type="number"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              handleAnnualExpenseEditSave();
                                            } else if (e.key === 'Escape') {
                                              handleEditCancel();
                                            }
                                          }}
                                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleAnnualExpenseEditSave()}
                                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={handleEditCancel}
                                          className="ml-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                        >
                                          ✗
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                        onClick={() => handleAnnualExpenseEditStart(row, 'budget_amount')}
                                      >
                                        {row.has_budget ? formatCurrency(row.budget_amount || 0) : 'Click to set'}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && ((viewMode === 'monthly' && budgetData.length === 0) || (viewMode === 'annual' && annualData.length === 0)) && (
          <div className="text-center py-8">
            <p className="text-gray-500">No budget data available for the selected view.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTool;