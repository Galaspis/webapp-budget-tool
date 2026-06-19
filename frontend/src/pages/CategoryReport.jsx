import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient from '../api/apiClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3, PieChart as PieChartIcon, Activity, ArrowUpDown } from 'lucide-react';

const CategoryReport = () => {
  const { getText, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'trends', 'comparison'
  const [timeRange, setTimeRange] = useState('6months'); // 'all', '3months', '6months', '1year', 'custom'
  const [selectionMode, setSelectionMode] = useState('period'); // 'period', 'month'
  const [selectedMonths, setSelectedMonths] = useState([]); // For custom month selection
  
  // Real data state
  const [timeSeriesData, setTimeSeriesData] = useState({});
  const [comparisonData, setComparisonData] = useState([]);
  const [subcategoryTrends, setSubcategoryTrends] = useState({});

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  // Fetch billing periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const periods = await apiClient.getBillingPeriods();
        
        // Sort periods chronologically from oldest to newest
        const sortedPeriods = [...periods].sort((a, b) => {
          const [aMonth, aYear] = a.split(' ');
          const [bMonth, bYear] = b.split(' ');
          
          const months = [
            'January', 'February', 'March', 'April', 
            'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December'
          ];
          
          const yearDiff = parseInt(aYear) - parseInt(bYear);
          if (yearDiff !== 0) {
            return yearDiff;
          }
          
          return months.indexOf(aMonth) - months.indexOf(bMonth);
        });
        
        setBillingPeriods(sortedPeriods);
        
        if (sortedPeriods.length > 0) {
          setSelectedPeriod(sortedPeriods[sortedPeriods.length - 1]);
        }
      } catch (err) {
        console.error('Error fetching billing periods:', err);
        setError(err.message);
      }
    };
    
    fetchPeriods();
  }, []);

  // Fetch category data when time range changes (for overview view)
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (viewMode !== 'overview') return;
      
      try {
        setLoading(true);
        
        let periodsToFetch = [];
        
        if (timeRange === 'all') {
          periodsToFetch = billingPeriods;
        } else if (timeRange === '3months') {
          periodsToFetch = billingPeriods.slice(-3);
        } else if (timeRange === '6months') {
          periodsToFetch = billingPeriods.slice(-6);
        } else if (timeRange === '1year') {
          periodsToFetch = billingPeriods.slice(-12);
        } else if (timeRange === 'custom' && selectedMonths.length > 0) {
          periodsToFetch = selectedMonths;
        } else {
          periodsToFetch = billingPeriods.slice(-1); // Default to most recent period
        }
        
        if (periodsToFetch.length === 0) {
          setCategoryData([]);
          setLoading(false);
          return;
        }
        
        // For overview, we'll aggregate data across selected periods
        const allData = [];
        for (const period of periodsToFetch) {
          const data = await apiClient.getCategoryReport(period);
          allData.push(...data);
        }
        
        // Aggregate by category
        const aggregatedData = {};
        allData.forEach(item => {
          if (item.category !== 'לא מסווג' && item.category !== 'לא לתזרים') {
            if (!aggregatedData[item.category]) {
              aggregatedData[item.category] = {
                category: item.category,
                total: 0,
                subcategories: {}
              };
            }
            
            aggregatedData[item.category].total += item.total;
            
            // Aggregate subcategories
            if (item.subcategories) {
              item.subcategories.forEach(sub => {
                if (sub.name !== 'לא מסווג') {
                  if (!aggregatedData[item.category].subcategories[sub.name]) {
                    aggregatedData[item.category].subcategories[sub.name] = 0;
                  }
                  aggregatedData[item.category].subcategories[sub.name] += sub.amount;
                }
              });
            }
          }
        });
        
        // Convert subcategories back to array format
        const finalData = Object.values(aggregatedData).map(category => ({
          ...category,
          subcategories: Object.entries(category.subcategories).map(([name, amount]) => ({
            name,
            amount
          }))
        }));
        
        setCategoryData(finalData);
        setSelectedCategory(null);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchCategoryData();
  }, [viewMode, timeRange, billingPeriods, selectedMonths]);

  // Fetch trend data when switching to trends or comparison view
  useEffect(() => {
    const fetchTrendData = async () => {
      if (viewMode === 'overview') return;
      
      try {
        setLoading(true);
        
        if (viewMode === 'comparison') {
          let periodsToFetch = [];
          
          if (timeRange === 'all') {
            periodsToFetch = billingPeriods;
          } else if (timeRange === '3months') {
            periodsToFetch = billingPeriods.slice(-3);
          } else if (timeRange === '6months') {
            periodsToFetch = billingPeriods.slice(-6);
          } else if (timeRange === '1year') {
            periodsToFetch = billingPeriods.slice(-12);
          } else if (timeRange === 'custom' && selectedMonths.length > 0) {
            periodsToFetch = selectedMonths;
          } else {
            periodsToFetch = billingPeriods.slice(-6); // Default to 6 months
          }
          
          // Fetch comparison data for selected periods
          const allTrends = await apiClient.getAllCategoriesTrends(24); // Get all data
          // Filter to only include selected periods
          const filteredTrends = allTrends.filter(item => 
            periodsToFetch.includes(item.period)
          );
          setComparisonData(filteredTrends);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchTrendData();
  }, [viewMode, timeRange, billingPeriods, selectedMonths]);

  // Fetch specific category trends when a category is selected in trends view
  useEffect(() => {
    const fetchCategoryTrends = async () => {
      if (viewMode !== 'trends' || !selectedCategory) return;
      
      try {
        let periodsToFetch = [];
        
        if (timeRange === 'all') {
          periodsToFetch = billingPeriods;
        } else if (timeRange === '3months') {
          periodsToFetch = billingPeriods.slice(-3);
        } else if (timeRange === '6months') {
          periodsToFetch = billingPeriods.slice(-6);
        } else if (timeRange === '1year') {
          periodsToFetch = billingPeriods.slice(-12);
        } else if (timeRange === 'custom' && selectedMonths.length > 0) {
          periodsToFetch = selectedMonths;
        } else {
          periodsToFetch = billingPeriods.slice(-6); // Default to 6 months
        }
        
        // Fetch main category trend
        const categoryTrend = await apiClient.getCategoryTrends(selectedCategory, null, 24);
        // Filter to selected periods
        const filteredCategoryTrend = categoryTrend.filter(item => 
          periodsToFetch.includes(item.period)
        );
        
        // Fetch subcategory trends
        const subcategoryResponse = await fetch(
          `/api/subcategory-trends/?main_category=${selectedCategory}&months=24`
        );
        const subcategoryData = await subcategoryResponse.json();
        // Filter subcategory data to selected periods
        const filteredSubcategoryData = subcategoryData.filter(item => 
          periodsToFetch.includes(item.period)
        );
        
        setTimeSeriesData({
          [selectedCategory]: filteredCategoryTrend
        });
        
        setSubcategoryTrends({
          [selectedCategory]: filteredSubcategoryData
        });
        
      } catch (err) {
        console.error('Error fetching category trends:', err);
        setError(err.message);
      }
    };
    
    fetchCategoryTrends();
  }, [selectedCategory, viewMode, timeRange, billingPeriods, selectedMonths]);

  // Calculate trend for a category/subcategory
  const calculateTrend = (data) => {
    if (!data || data.length < 2) return { trend: 'stable', percentage: 0 };
    
    const recent = data[data.length - 1]?.amount || 0;
    const previous = data[data.length - 2]?.amount || 0;
    
    if (previous === 0) return { trend: 'stable', percentage: 0 };
    
    const percentage = ((recent - previous) / previous * 100);
    
    return {
      trend: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable',
      percentage: Math.abs(percentage)
    };
  };

  // Get trend data for selected category
  const getTrendDataForCategory = (mainCategory, subCategory = null) => {
    if (subCategory && subcategoryTrends[mainCategory]) {
      // Return specific subcategory data
      return subcategoryTrends[mainCategory].map(item => ({
        period: item.period,
        amount: item[subCategory] || 0
      }));
    }
    
    if (timeSeriesData[mainCategory]) {
      return timeSeriesData[mainCategory];
    }
    
    return [];
  };

  // Get available categories for trends view
  const getAvailableCategories = () => {
    if (comparisonData.length === 0) return [];
    
    const categories = new Set();
    comparisonData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'period') {
          categories.add(key);
        }
      });
    });
    
    return Array.from(categories);
  };

  // Handle month selection for custom time range
  const toggleMonthSelection = (period) => {
    if (selectedMonths.includes(period)) {
      setSelectedMonths(selectedMonths.filter(p => p !== period));
    } else {
      setSelectedMonths([...selectedMonths, period]);
    }
  };

  // Handle selection mode change
  const handleSelectionModeChange = (mode) => {
    setSelectionMode(mode);
    if (mode === 'month') {
      setTimeRange('custom');
      setSelectedMonths([]);
    } else {
      setTimeRange('6months');
      setSelectedMonths([]);
    }
  };

  const availableCategories = getAvailableCategories();

  // Format pie data
  const formatPieData = (categoryData) => {
    return categoryData
      .filter(item => item.category !== 'לא מסווג' && item.category !== 'לא לתזרים')
      .filter(item => item.total && item.total > 0)
      .map(item => ({
        name: item.category,
        value: item.total
      }));
  };

  const pieData = formatPieData(categoryData);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getVarianceIcon = (trend) => {
    if (trend === 'up') return <TrendingUp size={16} className="text-red-500" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-green-500" />;
    return <ArrowUpDown size={16} className="text-gray-400" />;
  };

  // Loading state
  if (loading && categoryData.length === 0 && comparisonData.length === 0) {
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
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{getText('category_report')}</h1>
      </header>

      {/* View Mode Selection */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Report View</h2>
          
          {/* Time Range Controls - show for all tabs */}
          <div className="flex items-center space-x-4">
            {/* Selection Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Select by:</span>
              <button
                onClick={() => handleSelectionModeChange('period')}
                className={`px-3 py-1 text-sm rounded ${
                  selectionMode === 'period'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Time Range
              </button>
              <button
                onClick={() => handleSelectionModeChange('month')}
                className={`px-3 py-1 text-sm rounded ${
                  selectionMode === 'month'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Specific Months
              </button>
            </div>

            {/* Time Range Selector */}
            {selectionMode === 'period' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Range:</span>
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="3months">Last 3 months</option>
                  <option value="6months">Last 6 months</option>
                  <option value="1year">Last year</option>
                  <option value="all">All time</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-md flex items-center ${
              viewMode === 'overview'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <PieChartIcon size={16} className="mr-2" />
            Overview
          </button>
          <button
            onClick={() => setViewMode('trends')}
            className={`px-4 py-2 rounded-md flex items-center ${
              viewMode === 'trends'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <Activity size={16} className="mr-2" />
            Category Trends
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-4 py-2 rounded-md flex items-center ${
              viewMode === 'comparison'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <BarChart3 size={16} className="mr-2" />
            Multi-Category Comparison
          </button>
        </div>

        {/* Custom Month Selection */}
        {selectionMode === 'month' && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Select Months:</h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {billingPeriods.map(period => (
                <button
                  key={period}
                  onClick={() => toggleMonthSelection(period)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedMonths.includes(period)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            {selectedMonths.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Selected {selectedMonths.length} month{selectedMonths.length !== 1 ? 's' : ''}
                {viewMode === 'overview' && selectedMonths.length > 1 && (
                  <span className="text-indigo-600"> (data will be aggregated)</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && (
        <>
          {categoryData.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">{getText('no_data')}</p>
              <p className="text-gray-500 mt-2">No categorized expense data available for the selected time range.</p>
              <div className="text-sm text-gray-500 italic mt-2">
                Note: Transactions marked as "לא מסווג" or "לא לתזרים" are excluded from reports.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">
                    Expenses by Category
                    {selectionMode === 'period' && timeRange !== 'all' && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({timeRange === '3months' ? 'Last 3 months' : 
                          timeRange === '6months' ? 'Last 6 months' : 
                          timeRange === '1year' ? 'Last year' : 'Selected period'})
                      </span>
                    )}
                    {selectionMode === 'month' && selectedMonths.length > 0 && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({selectedMonths.length} month{selectedMonths.length !== 1 ? 's' : ''} aggregated)
                      </span>
                    )}
                  </h2>
                  <div className="h-80">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onClick={(data) => setSelectedCategory(data.name)}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No category data available to display</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-center text-gray-500 mt-2">Click on a category to see subcategories</p>
                </div>

                {/* Category Table */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">Category Summary</h2>
                  <div className="overflow-auto max-h-80">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">{getText('category')}</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">{getText('amount')}</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {categoryData.map((category) => {
                          const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.total, 0);
                          const percentage = totalExpenses > 0 ? (category.total / totalExpenses * 100).toFixed(1) : 0;
                          
                          return (
                            <tr 
                              key={category.category} 
                              className={`hover:bg-gray-50 cursor-pointer ${selectedCategory === category.category ? 'bg-indigo-50' : ''}`}
                              onClick={() => setSelectedCategory(category.category)}
                            >
                              <td className="px-4 py-2 text-sm text-gray-900">{category.category}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">
                                {category.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Subcategory Breakdown */}
              {selectedCategory && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Subcategories for {selectedCategory}</h2>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Back to All Categories
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Subcategory Chart */}
                    <div className="h-80">
                      {categoryData.find(cat => cat.category === selectedCategory)?.subcategories?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryData.find(cat => cat.category === selectedCategory).subcategories}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                            <Bar dataKey="amount" fill="#8884d8">
                              {categoryData.find(cat => cat.category === selectedCategory).subcategories.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500">No subcategory data available</p>
                        </div>
                      )}
                    </div>

                    {/* Subcategory Table */}
                    <div className="overflow-auto max-h-80">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">{getText('subcategory')}</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">{getText('amount')}</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {categoryData.find(cat => cat.category === selectedCategory)?.subcategories
                            ?.filter(subcat => subcat.name !== 'לא מסווג')
                            ?.map((subcat) => {
                              const categoryTotal = categoryData.find(cat => cat.category === selectedCategory)?.total || 0;
                              const percentage = categoryTotal > 0 ? (subcat.amount / categoryTotal * 100).toFixed(1) : 0;
                              
                              return (
                                <tr key={subcat.name}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{subcat.name}</td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">
                                    {subcat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{percentage}%</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Category Trends View */}
      {viewMode === 'trends' && (
        <div className="space-y-6">
          {/* Category Selector */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Select Category to View Trends</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-md text-sm ${
                    selectedCategory === category
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Trend Charts */}
          {selectedCategory && timeSeriesData[selectedCategory] && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">{selectedCategory} - Trend Over Time</h2>
              
              {/* Main Category Trend */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Overall {selectedCategory} Spending</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData[selectedCategory]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                      <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subcategory Trends */}
              {subcategoryTrends[selectedCategory] && subcategoryTrends[selectedCategory].length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Subcategory Breakdown</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={subcategoryTrends[selectedCategory]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                        <Legend />
                        {Object.keys(subcategoryTrends[selectedCategory][0] || {})
                          .filter(key => key !== 'period')
                          .map((subcat, index) => (
                            <Line 
                              key={subcat}
                              type="monotone" 
                              dataKey={subcat}
                              stroke={COLORS[index % COLORS.length]}
                              strokeWidth={2}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Multi-Category Comparison View */}
      {viewMode === 'comparison' && comparisonData.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">All Categories Comparison Over Time</h2>
            
            {/* Stacked Area Chart */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Spending Trends - All Categories</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                    <Legend />
                    {availableCategories.map((category, index) => (
                      <Area
                        key={category}
                        type="monotone"
                        dataKey={category}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Individual Category Lines */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Individual Category Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                    <Legend />
                    {availableCategories.map((category, index) => (
                      <Line
                        key={category}
                        type="monotone"
                        dataKey={category}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={3}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison Summary Table */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Category Comparison Summary</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Category</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Current Month</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">6-Month Average</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Highest Month</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Lowest Month</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Volatility</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Overall Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {availableCategories.map((category) => {
                      const categoryAmounts = comparisonData.map(item => item[category] || 0);
                      const current = categoryAmounts[categoryAmounts.length - 1] || 0;
                      const average = categoryAmounts.reduce((sum, amt) => sum + amt, 0) / categoryAmounts.length;
                      const highest = Math.max(...categoryAmounts);
                      const lowest = Math.min(...categoryAmounts);
                      const volatility = average > 0 ? ((highest - lowest) / average * 100) : 0;
                      
                      // Calculate trend from last 2 data points
                      const recent = categoryAmounts[categoryAmounts.length - 1] || 0;
                      const previous = categoryAmounts[categoryAmounts.length - 2] || 0;
                      const trendPercentage = previous > 0 ? ((recent - previous) / previous * 100) : 0;
                      const trend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';
                      
                      return (
                        <tr key={category} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{category}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">
                            {current.toLocaleString()} ₪
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">
                            {average.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">
                            {highest.toLocaleString()} ₪
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-green-600 font-medium">
                            {lowest.toLocaleString()} ₪
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">
                            {volatility.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2 text-center">
                            {trend === 'up' && (
                              <div className="flex items-center justify-center">
                                <TrendingUp size={16} className="text-red-500 mr-1" />
                                <span className="text-xs text-red-600">+{Math.abs(trendPercentage).toFixed(1)}%</span>
                              </div>
                            )}
                            {trend === 'down' && (
                              <div className="flex items-center justify-center">
                                <TrendingDown size={16} className="text-green-500 mr-1" />
                                <span className="text-xs text-green-600">-{Math.abs(trendPercentage).toFixed(1)}%</span>
                              </div>
                            )}
                            {trend === 'stable' && (
                              <div className="flex items-center justify-center">
                                <ArrowUpDown size={16} className="text-gray-400 mr-1" />
                                <span className="text-xs text-gray-600">Stable</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Grid */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Monthly Breakdown by Category</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 sticky left-0 bg-gray-50">Category</th>
                    {comparisonData.map(item => (
                      <th key={item.period} className="px-3 py-2 text-right font-medium text-gray-500 min-w-24">
                        {item.period.split(' ')[0]} {item.period.split(' ')[1]?.slice(-2)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {availableCategories.map((category) => (
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white">
                        {category}
                      </td>
                      {comparisonData.map(item => {
                        const amount = item[category] || 0;
                        return (
                          <td key={item.period} className="px-3 py-2 text-right text-gray-900">
                            {amount.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryReport;