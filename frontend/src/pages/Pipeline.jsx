import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { api } from "../lib/api";
import { CRM_STATES, STATE_MAP, formatEUR } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function Pipeline() {
  const [clients, setClients] = useState([]);

  const load = async () => {
    const { data } = await api.get("/clients");
    setClients(data);
  };
  useEffect(() => { load(); }, []);

  const columns = CRM_STATES.map((s) => ({
    ...s,
    items: clients.filter((c) => c.estado === s.value),
  }));

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const fromState = result.source.droppableId;
    const toState = result.destination.droppableId;
    if (fromState === toState) return;

    const clientId = result.draggableId;
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, estado: toState } : c)));
    try {
      await api.patch(`/clients/${clientId}`, { estado: toState });
      toast.success(`Movido a ${STATE_MAP[toState]?.label}`);
    } catch {
      toast.error("Error al mover");
      load();
    }
  };

  return (
    <>
      <Topbar title="Pipeline Comercial" subtitle="Arrastra y suelta clientes entre estados" />
      <div className="p-6 md:p-8 anim-fadeup">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2" data-testid="kanban-board">
            {columns.map((col) => (
              <div key={col.value} className="w-72 shrink-0">
                <div className="bg-zinc-100 rounded-md px-3 py-2.5 flex items-center justify-between border border-zinc-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-block w-2 h-2 rounded-full ${col.color.split(" ")[0].replace("bg-", "bg-").replace("-50", "-500")}`} />
                    <span className="text-xs font-semibold text-zinc-950 truncate">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 rounded-full px-1.5">{col.items.length}</span>
                </div>
                <Droppable droppableId={col.value}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`mt-2 min-h-[400px] space-y-2 p-1 rounded-md transition-colors ${snapshot.isDraggingOver ? "bg-zinc-100" : ""}`}
                      data-testid={`kanban-column-${col.value}`}
                    >
                      {col.items.map((c, idx) => (
                        <Draggable key={c.id} draggableId={c.id} index={idx}>
                          {(prov, snap) => (
                            <Link
                              to={`/clientes/${c.id}`}
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`block bg-white border rounded-md p-3 hover:-translate-y-[1px] transition-transform shadow-sm ${snap.isDragging ? "border-zinc-900 shadow-md" : "border-zinc-200"}`}
                              data-testid={`kanban-card-${c.id}`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                                  <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-zinc-950 truncate">{c.nombre}</div>
                                  <div className="text-[10px] text-zinc-500 mt-0.5">{c.provincia}</div>
                                </div>
                              </div>
                              {c.cups && <div className="mt-2 font-mono text-[10px] text-zinc-500 truncate">{c.cups}</div>}
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500">{c.comercial_name || "Sin asignar"}</span>
                                {c.tiene_ahorro && <span className="text-[10px] font-mono font-semibold text-emerald-700">{formatEUR(c.ahorro_estimado)}</span>}
                              </div>
                            </Link>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </>
  );
}
