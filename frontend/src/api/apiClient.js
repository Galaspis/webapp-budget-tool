const API_BASE_URL = '/api';

/**
 * API client for interacting with the backend
 */
const apiClient = {
  /**
   * Generic GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} - Response data
   */
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Generic POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} - Response data
   */
  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to post data: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Generic PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} - Response data
   */
  async put(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update data: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Generic DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} - Response data
   */
  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete data: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get all transactions with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - List of transactions
   */
  async getTransactions(filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    if (filters.startDate) queryParams.append('start_date', filters.startDate);
    if (filters.endDate) queryParams.append('end_date', filters.endDate);
    if (filters.billingPeriod) queryParams.append('billing_period', filters.billingPeriod);
    if (filters.mainCategory) queryParams.append('main_category', filters.mainCategory);
    if (filters.subCategory) queryParams.append('sub_category', filters.subCategory);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.skip) queryParams.append('skip', filters.skip);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const url = `${API_BASE_URL}/transactions/?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Upload transaction file (CSV)
   * @param {File} file - The CSV file to upload
   * @param {string} fileType - 'bank_statement' or 'credit_card'
   * @returns {Promise<Object>} - Upload result
   */
  async uploadTransactionFile(file, fileType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    const response = await fetch(`${API_BASE_URL}/upload/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get monthly summary data
   * @param {Array<string>} billingPeriods - Optional list of billing periods to include
   * @returns {Promise<Array>} - Summary data
   */
  async getMonthlySummary(billingPeriods = []) {
    const queryParams = new URLSearchParams();
    
    if (billingPeriods.length > 0) {
      billingPeriods.forEach(period => {
        queryParams.append('billing_period', period);
      });
    }

    const url = `${API_BASE_URL}/summary/?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get category report data
   * @param {string} billingPeriod - Optional billing period to filter by
   * @returns {Promise<Array>} - Category report data
   */
  async getCategoryReport(billingPeriod = null) {
    const queryParams = new URLSearchParams();
    
    if (billingPeriod) {
      queryParams.append('billing_period', billingPeriod);
    }

    const url = `${API_BASE_URL}/categories/?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch category report: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get list of all billing periods
   * @returns {Promise<Array<string>>} - List of billing periods
   */
  async getBillingPeriods() {
    const response = await fetch(`${API_BASE_URL}/billing-periods/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch billing periods: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get list of categories and subcategories
   * @returns {Promise<Object>} - Categories structure
   */
  async getCategoriesList() {
    const response = await fetch(`${API_BASE_URL}/categories-list/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get full category structure
   * @returns {Promise<Object>} - Complete category structure with subcategories
   */
  async getCategoriesStructure() {
    const response = await fetch(`${API_BASE_URL}/categories-structure/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch category structure: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Update a transaction
   * @param {number} id - Transaction ID
   * @param {Object} transactionData - Updated transaction data
   * @returns {Promise<Object>} - Updated transaction
   */
  async updateTransaction(id, transactionData) {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update transaction: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Delete a transaction
   * @param {number} id - Transaction ID
   * @returns {Promise<Object>} - Response data
   */
  async deleteTransaction(id) {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete transaction: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Delete all transactions
   * @returns {Promise<Object>} - Response data
   */
  async deleteAllTransactions() {
    const response = await fetch(`${API_BASE_URL}/delete-all-transactions/`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete all transactions: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get time series data for a specific category/subcategory
   * @param {string} mainCategory - Main category name
   * @param {string|null} subCategory - Optional subcategory name
   * @param {number} months - Number of months to retrieve (default: 12)
   * @returns {Promise<Array>} - Time series data
   */
  async getCategoryTrends(mainCategory, subCategory = null, months = 12) {
    const queryParams = new URLSearchParams({
      main_category: mainCategory,
      months: months.toString()
    });
    
    if (subCategory) {
      queryParams.append('sub_category', subCategory);
    }

    const url = `${API_BASE_URL}/category-trends/?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch category trends: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get time series data for all categories combined
   * @param {number} months - Number of months to retrieve (default: 12)
   * @returns {Promise<Array>} - Time series data for all categories
   */
  async getAllCategoriesTrends(months = 12) {
    const queryParams = new URLSearchParams({
      months: months.toString()
    });

    const url = `${API_BASE_URL}/all-categories-trends/?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all categories trends: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get budget averages for a specific month
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Array>} - Budget averages data
   */
  async getBudgetAverages(month) {
    const response = await fetch(`${API_BASE_URL}/budget/averages/?month=${month}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch budget averages: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get user budgets for a specific month
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Array>} - User budgets data
   */
  async getUserBudgets(month) {
    const response = await fetch(`${API_BASE_URL}/budget/user/?month=${month}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user budgets: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Create or update a user budget
   * @param {Object} budgetData - Budget data
   * @returns {Promise<Object>} - Created/updated budget
   */
  async createOrUpdateBudget(budgetData) {
    const response = await fetch(`${API_BASE_URL}/budget/user/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budgetData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create/update budget: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get combined budget data (averages + user budgets + actual spending)
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Array>} - Combined budget data
   */
  async getCombinedBudgetData(month) {
    const response = await fetch(`${API_BASE_URL}/budget/combined/?month=${month}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch combined budget data: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export default apiClient;