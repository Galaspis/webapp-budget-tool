// Add this utility function to filter out excluded categories
// You can place this in a separate utils.js file or directly in your components

/**
 * Utility function to filter out excluded categories from category data
 * @param {Array} categoryData - The category data array
 * @returns {Array} - Filtered category data
 */
export const filterCategoryData = (categoryData) => {
  const EXCLUDED_CATEGORIES = ['לא מסווג', 'לא לתזרים'];
  
  if (!categoryData || !Array.isArray(categoryData)) {
    return [];
  }
  
  return categoryData.filter(category => 
    !EXCLUDED_CATEGORIES.includes(category.category)
  );
};

// Example of how to use this in each component:

// In Dashboard.jsx
import { filterCategoryData } from '../utils'; // Adjust path as needed

// Then update the part where you process category data:
useEffect(() => {
  const fetchData = async () => {
    try {
      // ... existing code ...
      
      // Get category data for most recent period
      if (periodsData.length > 0) {
        const rawCategoryResult = await apiClient.getCategoryReport(periodsData[0]);
        // Apply additional filter to ensure excluded categories don't appear
        const filteredCategoryResult = filterCategoryData(rawCategoryResult);
        setCategoryData(filteredCategoryResult);
      }
      
      // ... rest of the code ...
    } catch (err) {
      // ... error handling ...
    }
  };
  
  fetchData();
}, []);

// Similarly for CategoryReport.jsx:
useEffect(() => {
  const fetchCategoryData = async () => {
    if (!selectedPeriod) return;
    
    try {
      setLoading(true);
      const rawData = await apiClient.getCategoryReport(selectedPeriod);
      // Apply additional filter to ensure excluded categories don't appear
      const filteredData = filterCategoryData(rawData);
      setCategoryData(filteredData);
      setSelectedCategory(null); // Reset selected category
      setLoading(false);
    } catch (err) {
      // ... error handling ...
    }
  };
  
  fetchCategoryData();
}, [selectedPeriod]);