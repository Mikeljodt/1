import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { initDB } from './lib/db';
import { fetchAllCounters } from './store/slices/counterSlice';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import MachinesPage from './pages/MachinesPage';
import CollectionsPage from './pages/CollectionsPage';
import ExpensesPage from './pages/ExpensesPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import InstallationsPage from './pages/InstallationsPage';
import MaintenancePage from './pages/MaintenancePage';
import SparePartsPage from './pages/SparePartsPage';
import RoutesPage from './pages/RoutesPage';
import PaymentsPage from './pages/PaymentsPage';

// Components
import Layout from './components/Layout';
import { Toaster } from './components/ui/toaster';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Initialize the database
    const initialize = async () => {
      try {
        await initDB();
        console.log('Database initialized successfully');
        
        // Initialize counter system
        dispatch(fetchAllCounters());
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    initialize();
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="machines" element={<MachinesPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="installations" element={<InstallationsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="spare-parts" element={<SparePartsPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
