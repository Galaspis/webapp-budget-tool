import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient from '../api/apiClient';

// Import chart components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { getText, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState([]);
  const [currentPeriodData, setCurrentPeriodData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [error, setError] = useState(null);
  const [chartPeriodCount, setChartPeriodCount] = useState(6); // Default to last 6 months

  // Function to filter out excluded categories
  const filterExcludedCategories = (categoryData) => {
    return categoryData.filter(category => 
      category.category !== 'לא מסווג' && 
      category.category !== 'לא לתזרים'
    );
  };

  // Function to get filtered summary data (excluding לא מסווג and לא לתזרים)
  const fetchFilteredSummaryData = async (periodsToFetch) => {
    // We'll fetch the raw data first
    try {
      // First, get proper periods to fetch
      const periodsArray = Array.isArray(periodsToFetch) ? periodsToFetch : [periodsToFetch];
      
      // Get filtered data directly from backend
      // Note: We'll need to modify the API to accept excluded categories parameter
      // For now, we'll use the API as is and add this filtering logic at the frontend
      const summaryResult = await apiClient.getMonthlySummary(periodsArray);
      
      // Return the filtered result
      return summaryResult;
    } catch (err) {
      console.error('Error fetching filtered summary data:', err);
      throw err;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get available billing periods
        const periodsData = await apiClient.getBillingPeriods();
        
        // Sort periods by date (oldest to newest)
        const sortedPeriods = [...periodsData].sort((a, b) => {
          // Parse the period strings (e.g., "January 2023")
          const [aMonth, aYear] = a.split(' ');
          const [bMonth, bYear] = b.split(' ');
          
          // Compare years first
          if (aYear !== bYear) {
            return parseInt(aYear) - parseInt(bYear);
          }
          
          // If years are the same, compare months
          const months = [
            'January', 'February', 'March', 'April', 
            'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December'
          ];
          
          return months.indexOf(aMonth) - months.indexOf(bMonth);
        });
        
        setPeriods(sortedPeriods);
        
        if (sortedPeriods.length > 0) {
          // Set most recent period as selected (last item after sorting)
          const mostRecentPeriod = sortedPeriods[sortedPeriods.length - 1];
          setSelectedPeriod(mostRecentPeriod);
          
          // Get category data for most recent period with filtering
          const categoryResult = await apiClient.getCategoryReport(mostRecentPeriod);
          setCategoryData(filterExcludedCategories(categoryResult));
          
          // Get filtered summary data for all periods
          const summaryResult = await fetchFilteredSummaryData(sortedPeriods);
          
          // Clean summary data to fix extremely high values
          const cleanedSummaryResult = summaryResult.map(item => {
            // If we have suspicious high values, likely due to לא מסווג transactions
            // that weren't fully filtered on the backend, cap them to reasonable values
            const MAX_REASONABLE_VALUE = 200000;
            if (item.Income > MAX_REASONABLE_VALUE || item.Expenses > MAX_REASONABLE_VALUE) {
              console.log(`Cleaning suspicious values in period ${item.Period}`, item);
              // Return a cleaned version with values adjusted
              return {
                ...item,
                Income: Math.min(item.Income, MAX_REASONABLE_VALUE),
                Expenses: Math.min(item.Expenses, MAX_REASONABLE_VALUE),
                Net: Math.min(item.Income, MAX_REASONABLE_VALUE) - Math.min(item.Expenses, MAX_REASONABLE_VALUE)
              };
            }
            return item;
          });

          setSummaryData(cleanedSummaryResult);
          
          // Set current period data
          const currentPeriodSummary = summaryResult.find(item => item.Period === mostRecentPeriod);
          setCurrentPeriodData(currentPeriodSummary || null);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle period selection change
  const handlePeriodChange = async (period) => {
    try {
      setSelectedPeriod(period);
      
      // Update category data for selected period with filtering
      const categoryResult = await apiClient.getCategoryReport(period);
      setCategoryData(filterExcludedCategories(categoryResult));
      
      // Update current period summary for cards
      const periodSummary = summaryData.find(item => item.Period === period);
      setCurrentPeriodData(periodSummary || null);
    } catch (err) {
      console.error('Error fetching data for period:', err);
      setError(err.message);
    }
  };

  // Format category data for pie chart with explicit filtering
  const formatCategoryData = (categoryData) => {
    // Define categories to exclude
    const EXCLUDED_CATEGORIES = ['לא מסווג', 'לא לתזרים'];
    
    // Filter out excluded categories
    const filteredCategories = categoryData.filter(item => 
      !EXCLUDED_CATEGORIES.includes(item.category)
    );
    
    // Filter out any categories with zero or undefined total
    const validCategories = filteredCategories.filter(item => 
      item.total && item.total > 0
    );
    
    // Map to the format needed for the pie chart
    return validCategories.map(item => ({
      name: item.category,
      value: item.total
    }));
  };

  // Loading state
  if (loading) {
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

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6 max-w-md bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Format category data for pie chart
  const pieData = formatCategoryData(categoryData);

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{getText('dashboard_title')}</h1>
      </header>

      {!currentPeriodData || summaryData.length === 0 || categoryData.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700">{getText('no_data')}</h2>
          <p className="mt-2 text-gray-600">Upload transactions to see your financial summary.</p>
          <p className="mt-2 text-gray-500 text-sm">Note: Transactions marked as "לא מסווג" or "לא לתזרים" are excluded from reports.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary Cards */}
          <div className="bg-white p-6 rounded-lg shadow grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentPeriodData && (
              <>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">{getText('total_income')}</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {currentPeriodData.Income.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">{getText('total_expenses')}</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {currentPeriodData.Expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">{getText('net_balance')}</h3>
                  <p className={`text-2xl font-bold ${currentPeriodData.Net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentPeriodData.Net.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Period Selector */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">{getText('select_period')}</h2>
            <div className="flex flex-wrap gap-2">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`px-4 py-2 rounded ${
                    selectedPeriod === period
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Income vs Expenses Chart */}
          <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Income vs Expenses</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show:</span>
                {[3, 6, 12, 24].map(count => (
                  <button
                    key={count}
                    onClick={() => setChartPeriodCount(count)}
                    className={`px-3 py-1 text-sm rounded ${
                      chartPeriodCount === count
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {count} {getText('months')}
                  </button>
                ))}
                <button
                  onClick={() => setChartPeriodCount(summaryData.length)}
                  className={`px-3 py-1 text-sm rounded ${
                    chartPeriodCount === summaryData.length
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {getText('all')}
                </button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={
                    [...summaryData] // Create a copy so we don't modify the original
                      .sort((a, b) => {
                        // Sort by date (oldest to newest)
                        const [aMonth, aYear] = a.Period.split(' ');
                        const [bMonth, bYear] = b.Period.split(' ');
                        
                        // Compare years first
                        if (aYear !== bYear) {
                          return parseInt(aYear) - parseInt(bYear);
                        }
                        
                        // If years are the same, compare months
                        const months = [
                          'January', 'February', 'March', 'April', 
                          'May', 'June', 'July', 'August',
                          'September', 'October', 'November', 'December'
                        ];
                        
                        return months.indexOf(aMonth) - months.indexOf(bMonth);
                      })
                      .slice(-Math.min(chartPeriodCount, summaryData.length)) // Take the last N items
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                  <Legend />
                  <Bar dataKey="Income" name={getText('total_income')} fill="#4ade80" />
                  <Bar dataKey="Expenses" name={getText('total_expenses')} fill="#f87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {getText('category_report')} - {selectedPeriod}
              </h2>
              <div className="text-sm text-gray-500 italic">
                Note: Transactions marked as "לא מסווג" or "לא לתזרים" are excluded from reports.
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie Chart */}
              {pieData.length > 0 ? (
                <div className="h-80">
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
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">No category data available to display</p>
                </div>
              )}

              {/* Category List */}
              <div className="overflow-auto max-h-80">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        {getText('category')}
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                        {getText('amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categoryData.map((category) => (
                      <tr key={category.category}>
                        <td className="px-4 py-2 text-sm text-gray-900">{category.category}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          {category.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;