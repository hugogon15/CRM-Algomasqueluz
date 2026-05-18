import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Pipeline from "./pages/Pipeline";
import Contracts from "./pages/Contracts";
import Renovations from "./pages/Renovations";
import Documents from "./pages/Documents";
import Users from "./pages/Users";

const guarded = (el, roles) => (
  <ProtectedRoute roles={roles}>
    <AppLayout>{el}</AppLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={guarded(<Dashboard />)} />
          <Route path="/clientes" element={guarded(<Clients />)} />
          <Route path="/clientes/:id" element={guarded(<ClientDetail />)} />
          <Route path="/pipeline" element={guarded(<Pipeline />)} />
          <Route path="/contratos" element={guarded(<Contracts />)} />
          <Route path="/renovaciones" element={guarded(<Renovations />)} />
          <Route path="/documentos" element={guarded(<Documents />)} />
          <Route path="/usuarios" element={guarded(<Users />, ["admin"])} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
