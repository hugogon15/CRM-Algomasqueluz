import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ROLES, ROLE_MAP, formatDate } from "../lib/constants";
import Topbar from "../components/layout/Topbar";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

const ALL_PERMS = [
  "/dashboard",
  "/clientes",
  "/pipeline",
  "/mapa",
  "/contratos",
  "/renovaciones",
  "/documentos",
  "/documentacion",
  "/mensajes",
  "/usuarios"
];

const DEFAULT_NON_ADMIN_PERMS = [
  "/dashboard",
  "/clientes",
  "/pipeline",
  "/mapa",
  "/contratos",
  "/renovaciones",
  "/documentos",
  "/documentacion",
  "/mensajes"
];

const AVAILABLE_PERMISSIONS = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/clientes", label: "Clientes" },
  { value: "/pipeline", label: "Pipeline" },
  { value: "/mapa", label: "Mapa Clientes" },
  { value: "/contratos", label: "Contratos" },
  { value: "/renovaciones", label: "Renovaciones" },
  { value: "/documentos", label: "Documentos / OCR" },
  { value: "/documentacion", label: "Documentación" },
  { value: "/mensajes", label: "Mensajes" },
  { value: "/usuarios", label: "Equipo (Gestión)" }
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "comercial", permissions: [...DEFAULT_NON_ADMIN_PERMS] });

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ email: "", password: "", name: "", role: "comercial", permissions: [] });

  const load = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };
  useEffect(() => { load(); }, []);

  const handleRoleChange = (role) => {
    const nextPerms = role === "admin" ? [...ALL_PERMS] : [...DEFAULT_NON_ADMIN_PERMS];
    setForm({ ...form, role, permissions: nextPerms });
  };

  const handleEditRoleChange = (role) => {
    const nextPerms = role === "admin" ? [...ALL_PERMS] : [...DEFAULT_NON_ADMIN_PERMS];
    setEditForm({ ...editForm, role, permissions: nextPerms });
  };

  const submit = async () => {
    try {
      await api.post("/auth/register", form);
      toast.success("Miembro de equipo creado con éxito");
      setOpen(false);
      setForm({ email: "", password: "", name: "", role: "comercial", permissions: [...DEFAULT_NON_ADMIN_PERMS] });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error creando usuario");
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      role: u.role || "comercial",
      password: "", // Keep blank initially
      permissions: Array.isArray(u.permissions) ? u.permissions : (u.role === "admin" ? [...ALL_PERMS] : [...DEFAULT_NON_ADMIN_PERMS])
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        permissions: editForm.permissions
      };
      if (editForm.password && editForm.password.trim() !== "") {
        payload.password = editForm.password;
      }
      await api.patch(`/users/${editingUser.id}`, payload);
      toast.success("Miembro de equipo actualizado");
      setEditOpen(false);
      setEditingUser(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error actualizando usuario");
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar miembro del equipo?")) return;
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nuevo miembro</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Nombre completo</Label><Input className="mt-1 h-9 border-zinc-200" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="new-user-name" /></div>
                <div className="col-span-2"><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label><Input type="email" className="mt-1 h-9 border-zinc-200" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="new-user-email" /></div>
                <div><Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Contraseña</Label><Input type="password" className="mt-1 h-9 border-zinc-200" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="new-user-password" /></div>
                <div>
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Rol</Label>
                  <Select value={form.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="new-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 border-t border-zinc-100 pt-3">
                  <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Permisos de Acceso</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isChecked = form.permissions?.includes(perm.value);
                      return (
                        <label key={perm.value} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg hover:bg-zinc-50 border border-zinc-100">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const nextPerms = checked
                                ? [...(form.permissions || []), perm.value]
                                : (form.permissions || []).filter(p => p !== perm.value);
                              setForm({ ...form, permissions: nextPerms });
                            }}
                            className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                          />
                          <span className="text-zinc-750 font-semibold">{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
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
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(u)} 
                        className="text-zinc-400 hover:text-zinc-950 p-1 transition-colors"
                        title="Editar miembro"
                        data-testid={`edit-user-${u.id}`}
                      >
                        <UserCog className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => remove(u.id)} 
                        className="text-zinc-400 hover:text-rose-600 p-1 transition-colors" 
                        data-testid={`delete-user-${u.id}`}
                        title="Eliminar miembro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT USER DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar miembro de equipo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Nombre completo</Label>
              <Input 
                className="mt-1 h-9 border-zinc-200" 
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                data-testid="edit-user-name" 
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Email</Label>
              <Input 
                type="email" 
                className="mt-1 h-9 border-zinc-200" 
                value={editForm.email} 
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                data-testid="edit-user-email" 
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Nueva Contraseña (opcional)</Label>
              <Input 
                type="password" 
                className="mt-1 h-9 border-zinc-200" 
                placeholder="Dejar vacío para no cambiar"
                value={editForm.password} 
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} 
                data-testid="edit-user-password" 
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Rol</Label>
              <Select value={editForm.role} onValueChange={handleEditRoleChange}>
                <SelectTrigger className="mt-1 h-9 border-zinc-200" data-testid="edit-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 border-t border-zinc-100 pt-3">
              <Label className="text-[11px] uppercase tracking-[0.08em] font-semibold text-zinc-500">Permisos de Acceso</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = editForm.permissions?.includes(perm.value);
                  return (
                    <label key={perm.value} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg hover:bg-zinc-50 border border-zinc-100">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const nextPerms = checked
                            ? [...(editForm.permissions || []), perm.value]
                            : (editForm.permissions || []).filter(p => p !== perm.value);
                          setEditForm({ ...editForm, permissions: nextPerms });
                        }}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-0"
                      />
                      <span className="text-zinc-750 font-semibold">{perm.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditingUser(null); }}>Cancelar</Button>
            <Button onClick={saveEdit} className="bg-zinc-950 hover:bg-zinc-800 text-white" data-testid="edit-user-submit">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
