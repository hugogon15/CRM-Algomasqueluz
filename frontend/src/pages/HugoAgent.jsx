import React from "react";
import Topbar from "../components/layout/Topbar";
import { Sparkles, Bot, Clock } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

export default function HugoAgent() {
  return (
    <>
      <Topbar
        title="Asistente Hugo IA"
        subtitle="Módulo de Inteligencia Artificial de AlgoMásQueLuz"
        action={
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-amber-800 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            En Actualización
          </div>
        }
      />

      <div className="p-6 max-w-2xl mx-auto flex items-center justify-center min-h-[70vh]">
        <Card className="border-zinc-200 shadow-xl rounded-2xl overflow-hidden bg-white w-full relative">
          {/* Gradiente solar de fondo sutil */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-orange-500/5 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
          
          <CardContent className="p-8 md:p-12 flex flex-col items-center text-center space-y-6">
            {/* Avatar circular con pulso premium de estado */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-zinc-100 ring-4 ring-zinc-50 scale-105 animate-pulse" />
              <img
                src="/hugo_avatar.jpg"
                alt="Hugo"
                className="relative w-24 h-24 rounded-full object-cover shadow-md border border-zinc-200"
              />
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-amber-500 border-4 border-white flex items-center justify-center shadow-sm">
                <Clock className="w-2.5 h-2.5 text-white" />
              </span>
            </div>

            {/* Título y descripción */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 rounded-full text-[10px] uppercase tracking-wider font-bold text-zinc-500 border border-zinc-200/50">
                <Sparkles className="w-3 h-3 text-[#F97316]" />
                Asistente de Energía Inteligente
              </div>
              <h2 className="font-display font-bold text-xl md:text-2xl text-zinc-950 mt-2">
                Hugo está cargando nuevas habilidades
              </h2>
              <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed mt-2 font-medium">
                Hemos desactivado las funciones anteriores temporalmente. Muy pronto añadiremos y configuraremos las nuevas habilidades avanzadas para que Hugo gestione las tareas con total autonomía.
              </p>
            </div>

            {/* Listado estético de lo que vendrá */}
            <div className="w-full border-t border-zinc-100 pt-6 space-y-3 text-left max-w-sm mx-auto">
              <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-zinc-400 mb-2">
                Próximas capacidades integradas:
              </div>
              {[
                "Redacción adaptativa de correos y WhatsApps",
                "Estudios automáticos de ahorro energético",
                "Gestión inteligente de incidencias del CRM",
                "Alertas preventivas y seguimiento de firmas"
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                  <span className="text-[#F97316]">✦</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Pie informativo */}
            <div className="pt-4 w-full">
              <div className="w-full py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-500 tracking-wide flex items-center justify-center gap-2">
                <Bot className="w-4 h-4 text-zinc-400" />
                Módulo AI de AlgoMásQueLuz — Versión 2.0
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </>
  );
}
