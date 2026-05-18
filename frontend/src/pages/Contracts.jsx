import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatEUR, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  useEffect(() => { api.get("/contracts").then((r) => setContracts(r.data)); }, []);

  const daysUntil = (d) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <>
      <Topbar title="Contratos" subtitle={`${contracts.length} contratos activos`} />
      <div className="p-6 md:p-8 anim-fadeup">
        <div className="bg-white border border-zinc-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Comercializadora</th>
                <th className="text-left px-3 py-3">Tarifa</th>
                <th className="text-right px-3 py-3">Potencia</th>
                <th className="text-left px-3 py-3">Inicio</th>
                <th className="text-left px-3 py-3">Renovación</th>
                <th className="text-right px-3 py-3">Días</th>
                <th className="text-right px-5 py-3">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {contracts.map((c) => {
                const d = daysUntil(c.fecha_renovacion);
                return (
                  <tr key={c.id} className="hover:bg-zinc-50" data-testid={`contract-list-row-${c.id}`}>
                    <td className="px-5 py-3"><Link to={`/clientes/${c.cliente_id}`} className="font-medium text-zinc-950 hover:underline">{c.cliente_nombre || "—"}</Link></td>
                    <td className="px-3 py-3 text-zinc-700">{c.comercializadora}</td>
                    <td className="px-3 py-3 font-mono text-xs">{c.tarifa}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{c.potencia_contratada} kW</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-600">{formatDate(c.fecha_inicio)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatDate(c.fecha_renovacion)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-mono text-xs ${d < 0 ? "text-rose-600" : d <= 30 ? "text-rose-600" : d <= 90 ? "text-amber-600" : "text-zinc-600"}`}>{d}d</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{formatEUR(c.importe_anual)}</td>
                  </tr>
                );
              })}
              {contracts.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-zinc-500 text-sm">Sin contratos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
