import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatEUR, formatDate, CLIENT_STATE_MAP, CLIENT_STATES } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Eye, Search } from "lucide-react";
import { Input } from "../components/ui/input";

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/contracts").then((r) => setContracts(r.data)); }, []);

  const filteredContracts = contracts.filter((c) => {
    if (!q) return true;
    
    const query = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!query) return true;

    const normalizeStr = (s) => {
      if (!s) return "";
      return String(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s\-_]+/g, "");
    };

    const targetQuery = query.replace(/[\s\-_]+/g, "");

    // Fields to search:
    const fields = [
      c.cliente_nombre,
      c.cliente_nif,
      c.cliente_telefono,
      c.cliente_email,
      c.cups,
      c.direccion,
      c.cliente_direccion,
      c.comercializadora_actual,
      c.comercializadora,
      c.comercializadora_anterior,
      c.tarifa,
      String(c.potencia_contratada || ""),
      String(c.consumo_anual || ""),
      formatDate(c.cliente_created_at),
      CLIENT_STATE_MAP[c.estado]?.label || ""
    ];

    return fields.some(f => normalizeStr(f).includes(targetQuery));
  });

  return (
    <>
      <Topbar title="Contratos" subtitle={`${filteredContracts.length} de ${contracts.length} contratos`} />
      <div className="p-6 md:p-8 anim-fadeup">
        {/* Buscador Único */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shadow-sm">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente, NIF/CIF, teléfono, CUPS, dirección, comercializadora..."
              className="pl-9 h-9 border-zinc-200 text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="contracts-search-input"
            />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-md overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold border-b border-zinc-200">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">CUPS</th>
                <th className="text-left px-3 py-3">Dirección</th>
                <th className="text-left px-3 py-3">Comercializadora</th>
                <th className="text-left px-3 py-3">Tarifa / Potencia</th>
                <th className="text-left px-3 py-3">Fecha Entrada</th>
                <th className="text-left px-3 py-3">Estado</th>
                <th className="text-right px-3 py-3">Consumo Anual</th>
                <th className="text-center px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredContracts.map((c) => {
                const stateInfo = CLIENT_STATE_MAP[c.estado] || CLIENT_STATE_MAP["nuevo_lead"];
                return (
                  <tr key={c.id} className="hover:bg-zinc-50" data-testid={`contract-list-row-${c.id}`}>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Link to={`/clientes/${c.cliente_id}`} className="font-semibold text-zinc-950 hover:underline hover:text-amber-600 transition-colors uppercase">
                        {c.cliente_nombre || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-650 uppercase whitespace-nowrap">{c.cups || "—"}</td>
                    <td className="px-3 py-3 text-zinc-700 text-xs truncate max-w-[180px] uppercase whitespace-nowrap" title={c.direccion || c.cliente_direccion || ""}>
                      {c.direccion || c.cliente_direccion || "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs">
                        <span className="font-semibold text-zinc-800 uppercase">{c.comercializadora_actual || c.comercializadora}</span>
                        {c.comercializadora_anterior && (
                          <span className="text-[10px] text-zinc-400 ml-1.5 uppercase">
                            (ANT: {c.comercializadora_anterior})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-zinc-750">
                        <span className="font-semibold uppercase">{c.tarifa}</span>
                        <span className="text-[10px] text-zinc-400 ml-1.5 uppercase">{c.potencia_contratada} KW</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-650 uppercase whitespace-nowrap">
                      {formatDate(c.cliente_created_at)}
                    </td>
                    <td className="px-3 py-3 text-left whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${stateInfo.color}`}>
                        {stateInfo.label.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-zinc-700 whitespace-nowrap">
                      {c.consumo_anual ? `${c.consumo_anual.toLocaleString()} KWH` : "—"}
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      <Link 
                        to={`/clientes/${c.cliente_id}`} 
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded transition-colors shadow-sm"
                      >
                        <Eye className="w-3 h-3" /> VER FICHA
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-zinc-500 text-sm uppercase">
                    SIN CONTRATOS QUE COINCIDAN CON LOS FILTROS
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
