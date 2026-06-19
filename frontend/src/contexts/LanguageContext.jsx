import { createContext, useState, useContext } from 'react';

// Create language context
const LanguageContext = createContext();

// Translation dictionary for UI elements
const translations = {
  dashboard_title: {
    en: "Finance Dashboard",
    he: "לוח מחוונים פיננסי"
  },
  upload_transactions: {
    en: "Upload Transactions",
    he: "העלאת עסקאות"
  },
  view_transactions: {
    en: "View Transactions",
    he: "צפייה בעסקאות"
  },
  monthly_summary: {
    en: "Monthly Summary",
    he: "סיכום חודשי"
  },
  category_report: {
    en: "Category Report",
    he: "דוח קטגוריות"
  },
  budget_planning: {
    en: "Budget Planning",
    he: "תכנון תקציב"
  },
  settings: {
    en: "Settings",
    he: "הגדרות"
  },
  file_type: {
    en: "File Type",
    he: "סוג קובץ"
  },
  bank_statement: {
    en: "Bank Statement",
    he: "דף חשבון בנק"
  },
  credit_card: {
    en: "Credit Card Statement",
    he: "דף כרטיס אשראי"
  },
  upload_file: {
    en: "Upload File",
    he: "העלאת קובץ"
  },
  process_file: {
    en: "Process File",
    he: "עיבוד קובץ"
  },
  upload_successful: {
    en: "Upload Successful!",
    he: "העלאה הצליחה!"
  },
  error_processing: {
    en: "Error Processing File",
    he: "שגיאה בעיבוד הקובץ"
  },
  select_period: {
    en: "Select Period",
    he: "בחר תקופה"
  },
  total_income: {
    en: "Total Income",
    he: "סך הכנסות"
  },
  total_expenses: {
    en: "Total Expenses",
    he: "סך הוצאות"
  },
  net_balance: {
    en: "Net Balance",
    he: "מאזן נטו"
  },
  language: {
    en: "Language",
    he: "שפה"
  },
  english: {
    en: "English",
    he: "אנגלית"
  },
  hebrew: {
    en: "Hebrew",
    he: "עברית"
  },
  date: {
    en: "Date",
    he: "תאריך"
  },
  description: {
    en: "Description",
    he: "תיאור"
  },
  amount: {
    en: "Amount",
    he: "סכום"
  },
  category: {
    en: "Category",
    he: "קטגוריה"
  },
  subcategory: {
    en: "Subcategory",
    he: "קטגוריה משנית"
  },
  actions: {
    en: "Actions",
    he: "פעולות"
  },
  filter: {
    en: "Filter",
    he: "סינון"
  },
  clear_filters: {
    en: "Clear Filters",
    he: "נקה סינון"
  },
  from: {
    en: "From",
    he: "מתאריך"
  },
  to: {
    en: "To",
    he: "עד תאריך"
  },
  search: {
    en: "Search",
    he: "חיפוש"
  },
  apply: {
    en: "Apply",
    he: "החל"
  },
  cancel: {
    en: "Cancel",
    he: "ביטול"
  },
  no_data: {
    en: "No data available",
    he: "אין נתונים זמינים"
  },
  loading: {
    en: "Loading...",
    he: "טוען..."
  }
};

// Language provider component
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en'); // Default to English

  // Function to toggle language
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'he' : 'en');
  };

  // Function to get translated text
  const getText = (key) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, getText }}>
      <div className={language === 'he' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}