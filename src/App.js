import React, { useContext, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { AuthContext } from './AuthContext';
import MobileAppLayout from './components/MobileAppLayout';
import { clearNonEssentialCache } from './utils/cacheBuster';
import './App.css';

// --- Your Existing Component Imports ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyDashboard from './pages/Company/CompanyDashboard';
import JoinTraining from './pages/Company/JoinTraining';
import Employees from './pages/Company/Employees';
import Products from './pages/Company/Products';
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
import PageShell from './Privacy/PageShell';
import TermsAndConditions from './Privacy/TermsAndConditions';
import PrivacyPolicy from './Privacy/PrivacyPolicy';
import RefundPolicy from './Privacy/RefundPolicy';
import ShippingPolicy from './Privacy/ShippingPolicy';
import ContactUs from './Privacy/ContactUs';
import LevelsManager from './pages/Company/LevelsManager';
import WithdrawMoney from './pages/WithdrawMoney';
import WithdrawRequests from './pages/Company/WithdrawRequests';
import DocumentVerification from './pages/DocumentVerification';
import AdminDocumentVerification from './pages/Company/AdminDocumentVerification';
import FollowUpCustomers from './pages/Company/FollowUpCustomers';
import VideoSharingSystem from './pages/Company/VideoSharingSystem ';
import AdminVideoSharing from './pages/Company/AdminVideoSharing';
import Dispatch from './pages/Company/Dispatch';
import ChequeApproval from './pages/Company/ChequeApproval';
import TrainerProfile from './pages/Trainer/TrainerProfile';
import TrainerTrainings from './pages/Trainer/TrainerTrainings';
import TrainerDashboard from './pages/Trainer/TrainerDashboard';
import TrainerDashboardLayout from './pages/Trainer/TrainerDashboardLayout';
import TrainerParticipants from './pages/Trainer/TrainerParticipants';
import QuotationManagement from './pages/Quotation';


import SetNewPasswordtechnican from './pages/Employee/SetNewPasswordtechnican';
import EmployeePageLayout from './pages/Employee/EmployeePageLayout';

import EmployeeProfile from './pages/Employee/EmployeeProfile';
import EmployeeTasks from './pages/Employee/EmployeeTasks';
import EmployeeSchedule from './pages/Employee/EmployeeSchedule';
import EmployeeDocuments from './pages/Employee/EmployeeDocuments';
import EmployeeSettings from './pages/Employee/EmployeeSettings';

// --- CA Component Imports ---
import CALogin from './CAreports/CALogin';
import CADashboardLayout from './CAreports/CADashboardLayout';
import CADashboard from './CAreports/CADashboard'; // Overview Page
import SalesReport from './CAreports/SalesReport';
import CommissionReport from './CAreports/CommissionReport';
import AllOrdersReport from './CAreports/AllOrdersReport';
import UserFinancialReport from './CAreports/UserFinancialReport';
import useDisablePinchZoom from './utils/useDisablePinchZoom';


// --- Your Existing Route Guards ---
function EmployeeRoute({ children }) {
  useDisablePinchZoom();
  const employeeId = localStorage.getItem('employeeId');
  const employeeToken = localStorage.getItem('employeeToken');
  
  // Check if employee is authenticated
  if (!employeeId || !employeeToken || employeeToken !== 'authenticated') { 
    return <Navigate to="/employee-login" replace />; 
  }
  
  return children;
}

function PrivateRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!currentUser) {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/trainer-dashboard")) { return <Navigate to="/trainer-login" replace />; }
    // Remove employee-dashboard redirect from here since it's handled by EmployeeRoute
    if (currentPath.startsWith("/subadmin")) { return <Navigate to="/subadmin-login" replace />; }
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(currentUser.role) && currentUser.email !== "ramshinde9370@gmail.com") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// --- NEW CA Private Route Guard ---
function CaPrivateRoute({ children, allowedRoles }) {
  const caUserString = localStorage.getItem('caUser');
  if (!caUserString) {
    return <Navigate to="/ca-login" replace />;
  }
  try {
    const caUser = JSON.parse(caUserString);
    if (allowedRoles && !allowedRoles.includes(caUser.role)) {
      return <Navigate to="/ca-login" replace />;
    }
    return children;
  } catch (error) {
    console.error("Error parsing CA user data:", error);
    localStorage.removeItem('caUser');
    return <Navigate to="/ca-login" replace />;
  }
}

function App() {
  // Clear localStorage on app startup to ensure fresh data
  useEffect(() => {
    clearNonEssentialCache();
  }, []);

  return (
    <AuthProvider>
      <Routes>
        {/* --- All Your Existing Routes (Unchanged) --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/subadmin-login" element={<SubAdminLogin />} />
        <Route path="/set-password" element={<SetNewPassword />} />
        <Route path="/trainer-login" element={<TrainerLogin />} />
        <Route path="/trainer-set-password" element={<TrainerSetPassword />} />
        <Route path="/join-training/:id" element={<JoinTraining />} />
        <Route path="/employee-login" element={<LoginPageEmployee />} />
        
        <Route path="/set-new-password" element={<SetNewPasswordtechnican />} />

        <Route path="/employee-dashboard" element={<EmployeeRoute><EmployeePageLayout /></EmployeeRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="tasks" element={<EmployeeTasks />} />
          <Route path="schedule" element={<EmployeeSchedule />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="settings" element={<EmployeeSettings />} />
        </Route>

        {/* --- Public CA Login Route --- */}
        <Route path="/ca-login" element={<CALogin />} />
        
        {/* --- NEW Protected CA Dashboard Route --- */}
        <Route
          path="/ca-dashboard"
          element={
            <CaPrivateRoute allowedRoles={['ca']}>
              <CADashboardLayout />
            </CaPrivateRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<CADashboard />} />
          <Route path="sales-report" element={<SalesReport />} />
           <Route path="user-financials" element={<UserFinancialReport />} />
          <Route path="commission-report" element={<CommissionReport />} />
          <Route path="all-orders" element={<AllOrdersReport />} />
        </Route>




        

        {/* --- The rest of your routes (Unchanged) --- */}
        <Route path="/preview/:uid" element={<PreviewPage />} />
        <Route path="/Policies" element={<PageShell />} />
        <Route path="/policies/terms" element={<TermsAndConditions />} />
        <Route path="/policies/privacy" element={<PrivacyPolicy />} />
        <Route path="/policies/refund" element={<RefundPolicy />} />
        <Route path="/policies/shipping" element={<ShippingPolicy />} />
        <Route path="/policies/contact" element={<ContactUs />} />



        
        <Route path="/user-reports/:userId" element={<PrivateRoute allowedRoles={['admin', 'company']}><UserReports /></PrivateRoute>} />
        <Route path="/subadmin" element={<PrivateRoute allowedRoles={['subadmin']}><SubAdminDashboard /></PrivateRoute>} />

        <Route path="/trainer-dashboard" element={<PrivateRoute allowedRoles={['trainer']}><TrainerDashboardLayout /></PrivateRoute>}>
          <Route index element={<TrainerDashboard />} />
          <Route path="participants" element={<TrainerParticipants />} />
          <Route path="profile" element={<TrainerProfile />} />
          <Route path="trainees" element={<TrainerTrainings />} />
        </Route>









        <Route path="/dashboard" element={<PrivateRoute allowedRoles={['agency', 'dealer', 'distributor', 'wholesaler', 'mega agency', 'diamond agency', 'mega dealer', 'mega distributor', 'diamond distributor', 'diamond wholesaler', 'admin', 'subadmin', 'company']}><Dashboard /></PrivateRoute>}>
            <Route index element={<MobileAppLayout><HomePage /></MobileAppLayout>} />
            <Route path="customers" element={<MobileAppLayout><Customers /></MobileAppLayout>} />
            <Route path="orders" element={<MobileAppLayout><Orders /></MobileAppLayout>} />
            <Route path="team" element={<MobileAppLayout><Team /></MobileAppLayout>} />
            <Route path="employees" element={<Employees />} />
            <Route path="products" element={<Products />} />
            <Route path="Allproducts" element={<MobileAppLayout><AllProducts /></MobileAppLayout>} />
            <Route path="bill/:orderId" element={<Bill />} />
            <Route path="AgencyTraining" element={<MobileAppLayout><AgencyTraining /></MobileAppLayout>} />
            <Route path="user-profile" element={<MobileAppLayout><UserProfile /></MobileAppLayout>} />
            <Route path="web-builder" element={<MobileAppLayout><DemoPage /></MobileAppLayout>} />
            <Route path="withdrawal" element={<MobileAppLayout><WithdrawMoney /></MobileAppLayout>} />
            <Route path="DocumentVerification" element={<DocumentVerification />} />
            <Route path="follow-up-customers" element={<MobileAppLayout><FollowUpCustomers /></MobileAppLayout>} />
            <Route path="video-training" element={<MobileAppLayout><VideoSharingSystem /></MobileAppLayout>} />
            <Route path="Quotation" element={<MobileAppLayout><QuotationManagement /></MobileAppLayout>} />
        </Route>

        <Route path="/company-dashboard" element={<PrivateRoute allowedRoles={['admin', 'company']}><CompanyHome /></PrivateRoute>}>
            <Route index element={<CompanyDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="products" element={<Products />} />
            <Route path="trainers" element={<Trainings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<CompanyOrderManager />} />
            <Route path="sales-dashboard" element={<SalesDashboard />} />
            <Route path="user-list" element={<CompanyUserList />} />
            <Route path="add-admin" element={<AddAdminPage />} />
            <Route path="document-verification" element={<AdminDocumentVerification />} />
            <Route path="total-trainers" element={<FetchTrainers />} />
            <Route path="levels" element={<LevelsManager />} />
            <Route path="withdraw-requests" element={<WithdrawRequests />} />
          
            <Route path="video-sharing" element={<AdminVideoSharing />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="cheque-approval" element={<ChequeApproval />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
