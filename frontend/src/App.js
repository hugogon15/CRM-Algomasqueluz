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
import HugoAgent from "./pages/HugoAgent";
import Pipeline from "./pages/Pipeline";
import Contracts from "./pages/Contracts";
import Renovations from "./pages/Renovations";
import Documents from "./pages/Documents";
import Documentation from "./pages/Documentation";
import Users from "./pages/Users";
import ClientMap from "./pages/Map";
import Messages from "./pages/Messages";
import Autorizacion from "./pages/Autorizacion";

import ErrorBoundary from "./components/ErrorBoundary";

const guarded = (el, roles) => (
  <ProtectedRoute roles={roles}>
    <AppLayout>
      <ErrorBoundary>
        {el}
      </ErrorBoundary>
    </AppLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/autorizacion" element={<Autorizacion />} />
          <Route path="/rgpd/:id" element={<Autorizacion />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={guarded(<Dashboard />)} />
          <Route path="/clientes" element={guarded(<Clients />)} />
          <Route path="/clientes/:id" element={guarded(<ClientDetail />)} />
          <Route path="/asistente" element={guarded(<HugoAgent />)} />
          <Route path="/pipeline" element={guarded(<Pipeline />)} />
          <Route path="/mapa" element={guarded(<ClientMap />)} />
          <Route path="/contratos" element={guarded(<Contracts />)} />
          <Route path="/renovaciones" element={guarded(<Renovations />)} />
          <Route path="/documentos" element={guarded(<Documents />)} />
          <Route path="/documentacion" element={guarded(<Documentation />)} />
          <Route path="/mensajes" element={guarded(<Messages />)} />
          <Route path="/usuarios" element={guarded(<Users />, ["admin"])} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;