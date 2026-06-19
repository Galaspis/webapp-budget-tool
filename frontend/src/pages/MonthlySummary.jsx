import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient from '../api/apiClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MonthlySummary = () => {
  const { getText, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState([]);
  const [billingPeriods, setBillingPeriods] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [error, setError] = useState(null);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  // Replace the existing useEffect for fetching billing periods with this:
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const periods = await apiClient.getBillingPeriods();
        
        // Sort periods chronologically from oldest to newest
        const sortedPeriods = [...periods].sort((a, b) => {
          // Parse month names and years
          const [aMonth, aYear] = a.split(' ');
          const [bMonth, bYear] = b.split(' ');
          
          // Define month order
          const months = [
            'January', 'February', 'March', 'April', 
            'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December'
          ];
          
          // Compare years first
          const yearDiff = parseInt(aYear) - parseInt(bYear);
          if (yearDiff !== 0) {
            return yearDiff; // Sort by year (ascending)
          }
          
          // If years are the same, compare months
          return months.indexOf(aMonth) - months.indexOf(bMonth); // Sort by month (ascending)
        });
        
        setBillingPeriods(sortedPeriods);
        
        // Default to most recent periods (up to 6) - taking from the end of the sorted array
        const initialPeriods = sortedPeriods.slice(-Math.min(6, sortedPeriods.length));
        setSelectedPeriods(initialPeriods);
      } catch (err) {
        console.error('Error fetching billing periods:', err);
        setError(err.message);
      }
    };
    
    fetchPeriods();
  }, []);

 // First, modify the fetchSummary function in your useEffect
  useEffect(() => {
    const fetchSummary = async () => {
      if (selectedPeriods.length === 0) {
        setSummaryData([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetching data for selected periods:', selectedPeriods);
      
      try {
        setLoading(true);
        const data = await apiClient.getMonthlySummary(selectedPeriods);
        console.log('Raw data received from API:', data);
        
        // Filter the data to only include the selected periods
        const filteredData = data.filter(item => 
          selectedPeriods.includes(item.Period)
        );
        
        console.log('Filtered data (should match selected periods):', filteredData);
        setSummaryData(filteredData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, [selectedPeriods]);

  // Toggle period selection
  // Updated togglePeriodSelection function
  const togglePeriodSelection = (period) => {
  // Make a copy of the current selectedPeriods
  const newSelectedPeriods = [...selectedPeriods];
  
  // Find the index of the period in the array
  const index = newSelectedPeriods.indexOf(period);
  
  // If found, remove it; otherwise add it
  if (index > -1) {
    newSelectedPeriods.splice(index, 1);
  } else {
    newSelectedPeriods.push(period);
  }
  
  // Set the new state
  setSelectedPeriods(newSelectedPeriods);
  console.log('Selected periods updated:', newSelectedPeriods);
};

  // Select all periods
  const selectAllPeriods = () => {
    setSelectedPeriods([...billingPeriods]);
  };

  // Clear all selected periods
  const clearSelectedPeriods = () => {
    setSelectedPeriods([]);
  };

  // Format data for charts
  const chartData = summaryData
    .sort((a, b) => a.Period.localeCompare(b.Period)) // Sort by period
    .map(item => ({
      period: item.Period,
      income: item.Income,
      expenses: item.Expenses,
      net: item.Net
    }));

  // Loading state
  if (loading && summaryData.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-800">{getText('monthly_summary')}</h1>
      </header>

      {/* Period Selection */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">{getText('select_period')}</h2>
        
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={selectAllPeriods}
            className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200"
          >
            Select All
          </button>
          <button
            onClick={clearSelectedPeriods}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
          >
            Clear All
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {billingPeriods.map(period => (
            <button
              key={period}
              onClick={() => togglePeriodSelection(period)}
              className={`px-4 py-2 rounded-md ${
                selectedPeriods.includes(period)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {selectedPeriods.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">{getText('no_data')}</p>
          <p className="text-gray-500 mt-2">Please select at least one billing period.</p>
        </div>
      ) : selectedPeriods.length > 0 && summaryData.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">{getText('no_data')}</p>
          <p className="text-gray-500 mt-2">No valid transaction data found for the selected periods.</p>
          <p className="text-gray-500 mt-2 text-sm">Note: Transactions marked as "לא מסווג" or "לא לתזרים" are excluded from reports.</p>
        </div>
      ) : (
        <>
          {/* Summary Table */}
          <div className="bg-white p-6 rounded-lg shadow mb-6 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Period Summary</h2>
              <div className="text-sm text-gray-500 italic">
                Note: Transactions marked as "לא מסווג" or "לא לתזרים" are excluded from summaries.
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('total_income')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('total_expenses')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('net_balance')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.map(item => (
                  <tr key={item.Period}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.Period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {item.Income.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {item.Expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      item.Net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.Net.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {item.Transactions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Income vs Expenses Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Income vs Expenses</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                  <Legend />
                  <Bar name={getText('total_income')} dataKey="income" fill="#4ade80" />
                  <Bar name={getText('total_expenses')} dataKey="expenses" fill="#f87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net Balance Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">{getText('net_balance')}</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                  <Legend />
                  <Bar 
                    name={getText('net_balance')} 
                    dataKey="net" 
                    fill="#60a5fa"
                    // Color bars based on positive/negative value
                    isAnimationActive={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#4ade80' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlySummary;