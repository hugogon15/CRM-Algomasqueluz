import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Sparkles, X, Bot, Clock, LayoutDashboard, Users, Columns3, FileBarChart2, Menu, MessageSquare, FileText, CalendarClock } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export default function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isTabActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    const handleClose = () => setIsSidebarOpen(false);
    window.addEventListener("toggle-sidebar", handleToggle);
    window.addEventListener("close-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-sidebar", handleToggle);
      window.removeEventListener("close-sidebar", handleClose);
    };
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#dcdfe4] p-0 md:p-6 gap-0 md:gap-4 overflow-hidden relative text-zinc-900 font-sans">
      
      {/* Mobile Backdrop overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Permanent on desktop (md:static), Slide-over overlay on mobile */}
      <div 
        className={cn(
          "fixed md:static left-0 top-0 bottom-0 z-[100] md:z-auto flex items-center transition-all duration-300 ease-in-out w-64 shrink-0 h-full",
          isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
        )}
      >
        <Sidebar 
          className={cn(
            "bg-zinc-950 border border-zinc-800 shadow-2xl md:shadow-none h-full flex w-64",
            "md:rounded-[1.5rem]",
            "rounded-none border-y-0 border-l-0"
          )}
        />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <main className="flex-1 min-w-0 flex flex-col rounded-none md:rounded-[1.5rem] border-0 md:border border-black/[0.04] bg-[#f4f5f8] overflow-y-auto shadow-sm relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden h-16 bg-white border-t border-zinc-200/80 flex items-center justify-around px-2 z-40 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isTabActive("/dashboard") ? "text-orange-500 font-bold" : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Inicio</span>
          </Link>

          <Link
            to="/clientes"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isTabActive("/clientes") ? "text-orange-500 font-bold" : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1">Clientes</span>
          </Link>

          <Link
            to="/pipeline"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isTabActive("/pipeline") ? "text-orange-500 font-bold" : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Columns3 className="w-5 h-5" />
            <span className="text-[10px] mt-1">Pipeline</span>
          </Link>

          <Link
            to="/contratos"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isTabActive("/contratos") ? "text-orange-500 font-bold" : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1">Contratos</span>
          </Link>

          <Link
            to="/renovaciones"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isTabActive("/renovaciones") ? "text-orange-500 font-bold" : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <CalendarClock className="w-5 h-5" />
            <span className="text-[10px] mt-1">Renovaciones</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
