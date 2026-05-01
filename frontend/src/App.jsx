import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import CallPopup from './components/CallPopup/CallPopup';

const Home             = lazy(() => import('./pages/Home/Home'));
const Login            = lazy(() => import('./pages/Login/Login'));
const Register         = lazy(() => import('./pages/Register/Register'));
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword/ForgotPassword'));
const FarmerDashboard  = lazy(() => import('./pages/FarmerDashboard/FarmerDashboard'));
const CustomerDashboard= lazy(() => import('./pages/CustomerDashboard/CustomerDashboard'));
const Chat             = lazy(() => import('./pages/Chat/Chat'));
const Call             = lazy(() => import('./pages/Call/Call'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard/AdminDashboard'));

const Loader = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
    <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>Loading...</div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <BrowserRouter>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/farmer/dashboard" element={
                  <ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>
                } />
                <Route path="/customer/dashboard" element={
                  <ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute><Chat /></ProtectedRoute>
                } />
                <Route path="/call" element={
                  <ProtectedRoute><Call /></ProtectedRoute>
                } />
                <Route path="/admin-secret-dashboard" element={
                  <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
                } />
              </Routes>
            </Suspense>
            <CallPopup />
          </BrowserRouter>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
