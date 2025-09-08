  import React, { useContext } from 'react';
  import { Routes, Route, Navigate } from 'react-router-dom';
  import { AuthProvider } from './AuthProvider';
  import { AuthContext } from './AuthContext';

  import Login from './pages/Login';
  import Dashboard from './pages/Dashboard';
  import CompanyDashboard from './pages/Company/CompanyDashboard';
  import JoinTraining from './pages/Company/JoinTraining';
  import Employees from './pages/Company/Employees';
  import Products from './pages/Company/Products';
  import TrainerDashboard from './pages/TrainerDashboard';
  import AllProducts from './pages/AllProducts';
  import Trainings from './pages/Company/Trainings';
  import Customers from './pages/Customers';
  import Orders from './pages/Orders';
  import Team from './pages/Team';
  import HomePage from './pages/HomePage';
  import CompanyOrderManager from './pages/Company/CompanyOrderManager';
  import ServiceManager from './pages/Company/ServiceManager';
  import TrainerLogin from './pages/Trainer/TrainerLogin';
  import CompanyHome from './pages/Company/CompanyHome';
  import SetNewPassword from './pages/SetNewPassword';
  import AgencyTraining from './pages/AgencyJoinTraining';
  import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
  import LoginPageEmployee from './pages/Employee/LoginPageEmployee';
  import CompanyUserList from './pages/Company/CompanyUserList';
  import Bill from './pages/Bill';
  import UserProfile from './pages/UserProfile';
  import OrderProduct from './pages/OrderProduct';
  import AddAdminPage from './pages/Company/AddAdminPage';
  import SubAdminLogin from './pages/subadminsPermission/SubAdminLogin';
  import SubAdminDashboard from './pages/subadminsPermission/SubAdminDashboard';
  import SalesDashboard from './pages/SalesDashboard';
  import PreviewPage from './pages/PreviewPage';
  import DemoPage from './pages/DemoPage';
  import TrainerSetPassword from './pages/Trainer/TrainerSetPassword';
  import FetchTrainers from './pages/FetchTrainers';
  import UserReports from './UserReports';
  // import PoliciesRoutes from './Privacy/PoliciesRoutes';
  import PageShell from './Privacy/PageShell';
  import TermsAndConditions from './Privacy/TermsAndConditions';
  import PrivacyPolicy from './Privacy/PrivacyPolicy';
  import RefundPolicy from './Privacy/RefundPolicy';
  import ShippingPolicy from './Privacy/ShippingPolicy';
  import ContactUs from './Privacy/ContactUs';
  import LevelsManager from './pages/Company/LevelsManager';
import WithdrawMoney from './pages/WithdrawMoney';
import WithdrawRequests from './pages/Company/WithdrawRequests';

  function PrivateRoute({ children, allowedRoles }) {
    const { currentUser, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    if (!currentUser) {
      const currentPath = window.location.pathname;

      // Trainer dashboards → trainer-login
      if (currentPath.startsWith("/trainer-dashboard")) {
        return <Navigate to="/trainer-login" replace />;
      }

      // Employee dashboards → employee-login
      if (currentPath.startsWith("/employee-dashboard")) {
        return <Navigate to="/employee-login" replace />;
      }

      // Subadmin dashboards → subadmin-login
      if (currentPath.startsWith("/subadmin")) {
        return <Navigate to="/subadmin-login" replace />;
      }

      // Default → normal login
      return <Navigate to="/login" replace />;
    }

    // Role mismatch → block and send to dashboard
    if (
      allowedRoles &&
      !allowedRoles.includes(currentUser.role) &&
      currentUser.email !== "ramshinde9370@gmail.com"
    ) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  }

  function App() {
    return (
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/subadmin-login" element={<SubAdminLogin />} />
          <Route path="/set-password" element={<SetNewPassword />} />
          <Route path="/trainer-login" element={<TrainerLogin />} />
          <Route path="/trainer-set-password" element={<TrainerSetPassword />} />
          <Route path="/join-training/:id" element={<JoinTraining />} />
          <Route path="/preview/:uid" element={<PreviewPage />} />
          <Route path="/Policies" element={<PageShell/>} />
          <Route path="/policies/terms" element={<TermsAndConditions/>} />
          <Route path="/policies/privacy" element={<PrivacyPolicy />} />
          <Route path="/policies/refund" element={<RefundPolicy />} />
          <Route path="/policies/shipping" element={<ShippingPolicy />} />
          <Route path="/policies/contact" element={<ContactUs />} />



          
          
          
          {/* FIXED: Move UserReports to top level as separate route */}
          <Route 
            path="/user-reports/:userId" 
            element={
              <PrivateRoute allowedRoles={['admin', 'company']}>
                <UserReports />
              </PrivateRoute>
            } 
          />

          {/* SubAdmin */}
          <Route
            path="/subadmin"
            element={
              <PrivateRoute allowedRoles={['subadmin']}>
                <SubAdminDashboard />
              </PrivateRoute>
            }
          />

          {/* Employee Dashboard */}
          <Route
            path="/employee-dashboard"
            element={
              <PrivateRoute allowedRoles={['Technician', 'employee', 'trainer']}>
                <EmployeeDashboard />
              </PrivateRoute>
            }
          />

          {/* Trainer Dashboard */}
          <Route
            path="/trainer-dashboard"
            element={
              <PrivateRoute allowedRoles={['trainer']}>
                <TrainerDashboard />
              </PrivateRoute>
            }
          />

          {/* Agency/Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={[
                'agency', 'dealer', 'distributor', 'wholesaler',
                'mega agency', 'diamond agency', 'mega dealer',
                'mega distributor', 'diamond distributor', 'diamond wholesaler','admin','subadmin','company'
              ]}>
                <Dashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="team" element={<Team />} />
            <Route path="employees" element={<Employees />} />
            <Route path="products" element={<Products />} />
            <Route path="Allproducts" element={<AllProducts />} />
            <Route path="bill/:orderId" element={<Bill />} />
            <Route path="AgencyTraining" element={<AgencyTraining />} />
            <Route path="user-profile" element={<UserProfile />} />
            <Route path="web-builder" element={<DemoPage />} />
            <Route path="withdrawal" element={<WithdrawMoney />} />
          </Route>

          {/* Company Dashboard */}
          <Route
            path="/company-dashboard"
            element={
              <PrivateRoute allowedRoles={['admin', 'company']}>
                <CompanyHome />
              </PrivateRoute>
            }
          >
            <Route index element={<CompanyDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="products" element={<Products />} />
            <Route path="trainers" element={<Trainings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<CompanyOrderManager />} />
            <Route path="sales-dashboard" element={<SalesDashboard />} />
            <Route path="user-list" element={<CompanyUserList />} />
            <Route path="add-admin" element={<AddAdminPage />} />
            
            <Route path="total-trainers" element={<FetchTrainers />} />
            <Route path="levels" element={<LevelsManager />} />
            <Route path="withdraw-requests" element={<WithdrawRequests />} />
            {/* REMOVED: This was causing the error */}
            {/* <Route path="/user-reports/:userId" element={<UserReports />} /> */}
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    );
  }

  export default App;
