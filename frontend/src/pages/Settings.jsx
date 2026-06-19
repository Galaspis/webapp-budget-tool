import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient from '../api/apiClient';
import { Globe, Database, Tag, AlertTriangle, Check, Plus, Edit, Trash, ChevronDown, ChevronRight } from 'lucide-react';

const Settings = () => {
  const { getText, language, toggleLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('language');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Category state
  const [categoryStructure, setCategoryStructure] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [categoryError, setCategoryError] = useState(null);
  const [categorySuccess, setCategorySuccess] = useState(null);

  // Load category structure on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/categories-structure/');
        if (response.ok) {
          const structure = await response.json();
          setCategoryStructure(structure);
        } else {
          setCategoryError('Failed to load categories');
        }
      } catch (err) {
        setCategoryError(err.message || 'Error loading categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Add new main category
  const addMainCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError('Category name cannot be empty');
      return;
    }

    try {
      // Call the API endpoint to add the category
      const response = await fetch('/api/add-category/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategoryName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add category');
      }
      
      // Update the local state
      setCategoryStructure(prev => ({
        ...prev,
        [newCategoryName]: []
      }));
      
      setNewCategoryName('');
      setCategorySuccess('Category added successfully');
      setTimeout(() => setCategorySuccess(null), 3000);
    } catch (err) {
      setCategoryError(err.message || 'Failed to add category');
    }
  };

  // Add new subcategory
  const addSubcategory = async () => {
    if (!selectedMainCategory) {
      setCategoryError('Please select a main category');
      return;
    }

    if (!newSubcategoryName.trim()) {
      setCategoryError('Subcategory name cannot be empty');
      return;
    }

    try {
      // Call the API endpoint to add the subcategory
      const response = await fetch('/api/add-subcategory/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          main_category: selectedMainCategory,
          subcategory: newSubcategoryName 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add subcategory');
      }
      
      // Update the local state
      setCategoryStructure(prev => ({
        ...prev,
        [selectedMainCategory]: [...(prev[selectedMainCategory] || []), newSubcategoryName]
      }));
      
      setNewSubcategoryName('');
      setCategorySuccess('Subcategory added successfully');
      setTimeout(() => setCategorySuccess(null), 3000);
    } catch (err) {
      setCategoryError(err.message || 'Failed to add subcategory');
    }
  };

  // Start editing a category or subcategory
  const startEditing = (type, name, parentCategory = null) => {
    if (type === 'category') {
      setEditingCategory(name);
      setEditName(name);
    } else {
      setEditingSubcategory({ name, parent: parentCategory });
      setEditName(name);
    }
  };

  // Save edited category
  const saveEdit = async (type) => {
    if (!editName.trim()) {
      setCategoryError(`${type === 'category' ? 'Category' : 'Subcategory'} name cannot be empty`);
      return;
    }

    try {
      if (type === 'category') {
        // Update main category
        if (editingCategory !== editName) {
          // Call API to update category
          const response = await fetch('/api/update-category/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              old_name: editingCategory,
              new_name: editName
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update category');
          }
          
          // Update local state
          const updatedStructure = { ...categoryStructure };
          updatedStructure[editName] = updatedStructure[editingCategory];
          delete updatedStructure[editingCategory];
          setCategoryStructure(updatedStructure);
        }
        setEditingCategory(null);
      } else {
        // Update subcategory
        const parent = editingSubcategory.parent;
        const oldName = editingSubcategory.name;
        
        if (oldName !== editName) {
          // Call API to update subcategory
          const response = await fetch('/api/update-subcategory/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              main_category: parent,
              old_name: oldName,
              new_name: editName
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update subcategory');
          }
          
          // Update local state
          const updatedSubcategories = categoryStructure[parent].map(sub => 
            sub === oldName ? editName : sub
          );
          
          setCategoryStructure(prev => ({
            ...prev,
            [parent]: updatedSubcategories
          }));
        }
        
        setEditingSubcategory(null);
      }
      
      setCategorySuccess(`${type === 'category' ? 'Category' : 'Subcategory'} updated successfully`);
      setTimeout(() => setCategorySuccess(null), 3000);
    } catch (err) {
      setCategoryError(err.message || `Failed to update ${type}`);
    }
  };

  // Delete category or subcategory
  const deleteCategory = async (type, name, parentCategory = null) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?\nThis action cannot be undone.`)) {
      try {
        if (type === 'category') {
          // Call API to delete main category
          const response = await fetch('/api/delete-category/', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: name
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete category');
          }
          
          // Update local state
          const updatedStructure = { ...categoryStructure };
          delete updatedStructure[name];
          setCategoryStructure(updatedStructure);
        } else {
          // Call API to delete subcategory
          const response = await fetch('/api/delete-subcategory/', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              main_category: parentCategory,
              subcategory: name
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete subcategory');
          }
          
          // Update local state
          const updatedSubcategories = categoryStructure[parentCategory].filter(sub => sub !== name);
          
          setCategoryStructure(prev => ({
            ...prev,
            [parentCategory]: updatedSubcategories
          }));
        }
        
        setCategorySuccess(`${type === 'category' ? 'Category' : 'Subcategory'} deleted successfully`);
        setTimeout(() => setCategorySuccess(null), 3000);
      } catch (err) {
        setCategoryError(err.message || `Failed to delete ${type}`);
      }
    }
  };

  // Function to clear all transactions
  const clearAllTransactions = async () => {
    try {
      setIsDeleting(true);
      const result = await fetch('/api/delete-all-transactions/', {
        method: 'POST',
      });
      
      const data = await result.json();
      
      if (data.success) {
        setDeleteResult({
          success: true,
          message: data.message || 'All transactions deleted successfully'
        });
      } else {
        setDeleteResult({
          success: false,
          message: data.error || 'Failed to delete transactions'
        });
      }
    } catch (error) {
      setDeleteResult({
        success: false,
        message: error.message || 'An error occurred while deleting transactions'
      });
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  // Confirmation Dialog
  const ConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Deletion</h3>
        <p className="mb-6 text-gray-700">
          Are you sure you want to delete ALL transactions? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setShowConfirmDialog(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={clearAllTransactions}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{getText('settings')}</h1>
      </header>

      {showConfirmDialog && <ConfirmDialog />}

      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b overflow-x-auto">
          <button
            className={`px-6 py-3 font-medium flex items-center whitespace-nowrap ${
              activeTab === 'language'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('language')}
          >
            <Globe className="mr-2 h-5 w-5" />
            Language
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center whitespace-nowrap ${
              activeTab === 'database'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('database')}
          >
            <Database className="mr-2 h-5 w-5" />
            Database
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center whitespace-nowrap ${
              activeTab === 'categories'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('categories')}
          >
            <Tag className="mr-2 h-5 w-5" />
            Categories
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'language' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Language Settings</h2>
              <p className="mb-4 text-gray-600">Choose your preferred language for the application interface.</p>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Language</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => language !== 'en' && toggleLanguage()}
                    className={`px-4 py-2 rounded-md ${
                      language === 'en'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => language !== 'he' && toggleLanguage()}
                    className={`px-4 py-2 rounded-md ${
                      language === 'he'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    עברית (Hebrew)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Database Settings</h2>
              <p className="text-gray-600 mb-4">
                Your application is currently using a SQLite database stored locally.
              </p>
              
              <div className="bg-green-50 p-4 rounded-md mb-6">
                <p className="text-green-800 font-medium">Database Status: Connected</p>
                <p className="text-green-700 mt-1">Database location: budget.db</p>
              </div>
              
              {/* Show result message if there's a delete result */}
              {deleteResult && (
                <div className={`p-4 mb-6 rounded-md flex items-start ${deleteResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  {deleteResult.success ? (
                    <Check className="text-green-500 mr-2 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="text-red-500 mr-2 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className={`text-sm font-medium ${deleteResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {deleteResult.success ? 'Success' : 'Error'}
                    </h3>
                    <p className={`mt-1 text-sm ${deleteResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {deleteResult.message}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="border p-4 rounded-md bg-white">
                  <h3 className="font-medium text-gray-900 mb-2">Backup Database</h3>
                  <p className="text-gray-600 mb-2">Create a backup of your current database.</p>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Create Backup
                  </button>
                </div>
                
                <div className="border p-4 rounded-md bg-white">
                  <h3 className="font-medium text-red-600 mb-2">Clear Database</h3>
                  <p className="text-gray-600 mb-2">
                    Delete all transactions from the database. This action cannot be undone.
                  </p>
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting Data...
                      </>
                    ) : (
                      "Clear All Transactions"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Category Management</h2>
              <p className="text-gray-600 mb-4">
                Manage transaction categories and subcategories for better organization of your finances.
              </p>
              
              {/* Status messages */}
              {categoryError && (
                <div className="p-4 mb-6 rounded-md bg-red-50 flex items-start">
                  <AlertTriangle className="text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-red-800">{categoryError}</p>
                </div>
              )}
              
              {categorySuccess && (
                <div className="p-4 mb-6 rounded-md bg-green-50 flex items-start">
                  <Check className="text-green-500 mr-2 flex-shrink-0" />
                  <p className="text-green-800">{categorySuccess}</p>
                </div>
              )}
              
              {/* Loading state */}
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Add new main category */}
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-3">Add New Main Category</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="px-3 py-2 border rounded-md flex-1"
                      />
                      <button
                        onClick={addMainCategory}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                      >
                        <Plus size={18} className="mr-1" /> Add
                      </button>
                    </div>
                  </div>
                  
                  {/* Add new subcategory */}
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-3">Add New Subcategory</h3>
                    <div className="space-y-3">
                      <select
                        value={selectedMainCategory}
                        onChange={(e) => setSelectedMainCategory(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md mb-2"
                      >
                        <option value="">Select Main Category</option>
                        {Object.keys(categoryStructure).map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubcategoryName}
                          onChange={(e) => setNewSubcategoryName(e.target.value)}
                          placeholder="Enter subcategory name"
                          className="px-3 py-2 border rounded-md flex-1"
                          disabled={!selectedMainCategory}
                        />
                        <button
                          onClick={addSubcategory}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                          disabled={!selectedMainCategory}
                        >
                          <Plus size={18} className="mr-1" /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Category list */}
                  <div className="border p-4 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-3">Manage Categories</h3>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {Object.keys(categoryStructure).map(category => (
                        <div key={category} className="border rounded-md overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-gray-50">
                            <div className="flex items-center">
                              <button 
                                onClick={() => toggleCategory(category)}
                                className="mr-2 text-gray-500 hover:text-gray-700"
                              >
                                {expandedCategories[category] ? 
                                  <ChevronDown size={18} /> : 
                                  <ChevronRight size={18} />
                                }
                              </button>
                              
                              {editingCategory === category ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="px-2 py-1 border rounded-md"
                                  autoFocus
                                />
                              ) : (
                                <span className="font-medium">{category}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {editingCategory === category ? (
                                <button
                                  onClick={() => saveEdit('category')}
                                  className="text-green-600 hover:text-green-800"
                                  title="Save"
                                >
                                  <Check size={18} />
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing('category', category)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => deleteCategory('category', category)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete"
                                  >
                                    <Trash size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Subcategories */}
                          {expandedCategories[category] && categoryStructure[category] && (
                            <div className="bg-white p-2 space-y-1 border-t">
                              {categoryStructure[category].length === 0 ? (
                                <p className="text-gray-500 text-sm p-2">No subcategories</p>
                              ) : (
                                categoryStructure[category].map(subcategory => (
                                  <div 
                                    key={`${category}-${subcategory}`}
                                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                                  >
                                    <div className="ml-6">
                                      {editingSubcategory && 
                                       editingSubcategory.name === subcategory && 
                                       editingSubcategory.parent === category ? (
                                        <input
                                          type="text"
                                          value={editName}
                                          onChange={(e) => setEditName(e.target.value)}
                                          className="px-2 py-1 border rounded-md"
                                          autoFocus
                                        />
                                      ) : (
                                        <span>{subcategory}</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      {editingSubcategory && 
                                       editingSubcategory.name === subcategory && 
                                       editingSubcategory.parent === category ? (
                                        <button
                                          onClick={() => saveEdit('subcategory')}
                                          className="text-green-600 hover:text-green-800"
                                          title="Save"
                                        >
                                          <Check size={16} />
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => startEditing('subcategory', subcategory, category)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Edit"
                                          >
                                            <Edit size={16} />
                                          </button>
                                          <button
                                            onClick={() => deleteCategory('subcategory', subcategory, category)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Delete"
                                          >
                                            <Trash size={16} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {Object.keys(categoryStructure).length === 0 && (
                        <p className="text-gray-500 text-center p-4">No categories found</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;