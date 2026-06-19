import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient from '../api/apiClient';
import { Upload, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const TransactionUpload = () => {
  const { getText } = useLanguage();
  const [fileType, setFileType] = useState('bank_statement');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [categorizedCount, setCategorizedCount] = useState(0);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    // Reset previous results
    setUploadResult(null);
    setError(null);
  };

  // Handle file type selection
  const handleFileTypeChange = (type) => {
    setFileType(type);
    // Reset previous results
    setUploadResult(null);
    setError(null);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      // Upload file to server
      const result = await apiClient.uploadTransactionFile(selectedFile, fileType);
      
      if (result.success) {
        setUploadResult(result);
        
        // Get all transactions to check how many were categorized
        const transactions = await apiClient.getTransactions();
        const categorized = transactions.filter(tx => 
          tx.main_category && tx.main_category !== 'לא מסווג' && 
          tx.sub_category && tx.sub_category !== 'לא מסווג'
        );
        
        setCategorizedCount(categorized.length);
      } else {
        setError(result.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{getText('upload_transactions')}</h1>
      </header>

      <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{getText('file_type')}</label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleFileTypeChange('bank_statement')}
              className={`px-4 py-2 rounded-md ${
                fileType === 'bank_statement'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {getText('bank_statement')}
            </button>
            <button
              type="button"
              onClick={() => handleFileTypeChange('credit_card')}
              className={`px-4 py-2 rounded-md ${
                fileType === 'credit_card'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {getText('credit_card')}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{getText('upload_file')}</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV files only</p>
            </div>
          </div>
          {selectedFile && (
            <div className="mt-2 text-sm text-indigo-600">
              Selected file: {selectedFile.name}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`py-2 px-4 rounded-md flex items-center ${
              isUploading || !selectedFile
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>{getText('process_file')}</>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-md flex items-start">
            <AlertTriangle className="text-red-500 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">{getText('error_processing')}</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {uploadResult && (
          <div className="mt-4 p-4 bg-green-50 rounded-md flex items-start">
            <CheckCircle className="text-green-500 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-green-800">{getText('upload_successful')}</h3>
              <p className="mt-1 text-sm text-green-700">
                {uploadResult.message || `Processed ${uploadResult.transactions_count} transactions`}
              </p>
              {categorizedCount > 0 && (
                <p className="mt-1 text-sm text-green-700">
                  {categorizedCount} transactions have been automatically categorized.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions for file formats */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">CSV Format Instructions</h2>
        
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h3 className="font-medium text-indigo-700 mb-2">Bank Statement Format</h3>
          <p className="mb-2 text-sm text-gray-600">Your CSV should include the following columns:</p>
          <ul className="list-disc pl-5 text-sm text-gray-600">
            <li>תאריך - Transaction date (DD/MM/YY or DD/MM/YYYY format)</li>
            <li>תיאור - Transaction description</li>
            <li>בחובה - Debit amount (expenses)</li>
            <li>בזכות - Credit amount (income)</li>
            <li>אסמכתא - Reference number (optional)</li>
            <li>הערה - Note (optional)</li>
          </ul>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium text-indigo-700 mb-2">Credit Card Statement Format</h3>
          <p className="mb-2 text-sm text-gray-600">Your CSV should include the following columns:</p>
          <ul className="list-disc pl-5 text-sm text-gray-600">
            <li>תאריך העסקה - Transaction date (DD/MM/YY or DD/MM/YYYY format)</li>
            <li>שם בית העסק - Merchant name</li>
            <li>סכום חיוב - Transaction amount</li>
            <li>סוג העסקה - Transaction type (optional)</li>
            <li>פרטים - Details/note (optional)</li>
          </ul>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow mt-4">
          <div className="flex items-start">
            <Info className="text-blue-500 mr-2 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium text-blue-700 mb-2">Automatic Categorization</h3>
              <p className="text-sm text-gray-600">
                Transactions will be automatically categorized based on merchant name, amount, and previous patterns.
                You can always edit categories manually in the Transaction View page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionUpload;