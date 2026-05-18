import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ROLES, ROLE_MAP, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "comercial" });

  const load = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await api.post("/auth/register", form);
      toast.success("Usuario creado");
      setOpen(false);
      setForm({ email: "", password: "", name: "", role: "comercial" });
      load();
    } catch (e) {
      toast.error("Error creando usuario");
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar usuario?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Usuario eliminado");
      load();
    } catch {
      toast.error("Error eliminando");
    }
  };

  return (
    <>
      <Topbar
        title="Equipo"
        subtitle={`${users.length} miembros del equipo`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold" data-testid="users-new-button">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Nuevo miembro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo miembro</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Nombre completo</Label><Input className="mt-1 h-9 border-zinc-200" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="new-user-name" /></div>
                <div className="col-span-2"><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label><Input type="email" className="mt-1 h-9 border-zinc-200" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="new-user-email" /></div>
                <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Contraseña</Label><Input type="password" className="mt-1 h-9 border-zinc-200" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="new-user-password" /></div>
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="new-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} className="bg-zinc-950 hover:bg-zinc-800 text-white" data-testid="new-user-submit">Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 md:p-8 anim-fadeup">
        <div className="bg-white border border-zinc-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Miembro</th>
                <th className="text-left px-3 py-3">Email</th>
                <th className="text-left px-3 py-3">Rol</th>
                <th className="text-left px-3 py-3">Alta</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50" data-testid={`user-row-${u.id}`}>
                  <td className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-semibold text-zinc-600">{u.name?.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>}
                    </div>
                    <span className="font-medium text-zinc-950">{u.name}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-700">{u.email}</td>
                  <td className="px-3 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.06em] font-semibold border border-zinc-200 bg-zinc-50 text-zinc-700">{ROLE_MAP[u.role]?.label}</span></td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-600">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => remove(u.id)} className="text-zinc-400 hover:text-rose-600 p-1" data-testid={`delete-user-${u.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
