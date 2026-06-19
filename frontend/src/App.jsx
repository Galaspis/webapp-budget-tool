import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Wallet, Upload, List, PieChart, BarChart2, Settings, Target } from 'lucide-react';

// Page components
import Dashboard from './pages/Dashboard';
import TransactionUpload from './pages/TransactionUpload';
import TransactionView from './pages/TransactionView';
import MonthlySummary from './pages/MonthlySummary';
import CategoryReport from './pages/CategoryReport';
import SettingsPage from './pages/Settings';
import BudgetTool from './pages/BudgetTool';

// Language translation provider
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <LanguageProvider>
      <Router>
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar */}
          <aside 
            className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-indigo-700 text-white transition-all duration-300 ease-in-out flex flex-col`}
          >
            {/* Sidebar Header */}
            <div className="p-4 flex items-center justify-between">
              {sidebarOpen && <h2 className="text-xl font-bold">Finance Dashboard</h2>}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 rounded-full hover:bg-indigo-600"
              >
                {sidebarOpen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                <NavItem to="/" icon={<Wallet />} text="Dashboard" sidebarOpen={sidebarOpen} />
                <NavItem to="/upload" icon={<Upload />} text="Upload Transactions" sidebarOpen={sidebarOpen} />
                <NavItem to="/transactions" icon={<List />} text="View Transactions" sidebarOpen={sidebarOpen} />
                <NavItem to="/summary" icon={<BarChart2 />} text="Monthly Summary" sidebarOpen={sidebarOpen} />
                <NavItem to="/categories" icon={<PieChart />} text="Category Report" sidebarOpen={sidebarOpen} />
                <NavItem to="/budget" icon={<Target />} text="Budget Tool" sidebarOpen={sidebarOpen} />
                <NavItem to="/settings" icon={<Settings />} text="Settings" sidebarOpen={sidebarOpen} />
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<TransactionUpload />} />
              <Route path="/transactions" element={<TransactionView />} />
              <Route path="/summary" element={<MonthlySummary />} />
              <Route path="/categories" element={<CategoryReport />} />
              <Route path="/budget" element={<BudgetTool />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LanguageProvider>
  );
}

// NavItem component for sidebar navigation
function NavItem({ to, icon, text, sidebarOpen }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) => `
          flex items-center p-2 rounded-md 
          ${isActive ? 'bg-indigo-800' : 'hover:bg-indigo-600'} 
          transition-colors duration-200
        `}
      >
        <span className="text-white">{icon}</span>
        {sidebarOpen && <span className="ml-3">{text}</span>}
      </NavLink>
    </li>
  );
}

export default App;