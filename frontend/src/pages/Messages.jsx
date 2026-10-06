import React, { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { 
  Plus, Search, Send, Paperclip, Smile, FileText, 
  X, Download, Hash, ChevronRight, MessageSquare, Trash2, Users
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function Messages() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  
  // CRM Users list for team direct messages & channel members management
  const [crmUsers, setCrmUsers] = useState([]);

  // Modals
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  
  const [createDmOpen, setCreateDmOpen] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  const [membersModalOpen, setMembersModalOpen] = useState(false);

  // Attachment state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState("");
  const chatEndRef = useRef(null);

  // Emojis quick selector popup
  const [emojiOpen, setEmojiOpen] = useState(false);
  const quickEmojis = ["👍", "❤️", "🔥", "⚡", "👏", "✔️", "📁", "💡", "😂", "🚀"];

  // Helper to get initials matching screenshot (first 2 letters of first name, or 'DM' for Hugo)
  const getInitials = (name) => {
    if (!name) return "DM";
    const cleanName = name.trim();
    if (cleanName === "Hugo Gonzalvez" || cleanName.toLowerCase() === "hugo" || cleanName.toLowerCase() === "hugo gon") {
      return "DM";
    }
    // Take first word and return first two letters
    const firstWord = cleanName.split(" ")[0];
    if (firstWord.length <= 1) return firstWord.toUpperCase();
    return firstWord.substring(0, 2).toUpperCase();
  };

  // Fetch Rooms
  const loadRooms = async (selectRoomId = null) => {
    try {
      const { data } = await api.get("/chats/rooms");
      setRooms(data || []);
      if (data && data.length > 0) {
        if (selectRoomId) {
          const matched = data.find(r => r.id === selectRoomId);
          setActiveRoom(matched || data[0]);
        } else if (!activeRoom) {
          setActiveRoom(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar las salas de conversación");
    }
  };

  // Fetch CRM Users
  const loadCrmUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setCrmUsers(data || []);
    } catch (e) {
      console.error("Error loading CRM users:", e);
    }
  };

  // Fetch Messages
  const loadMessages = async (roomId) => {
    if (!roomId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/chats/messages?room_id=${roomId}`);
      setMessages(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    loadCrmUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  // Realtime messages subscription
  useEffect(() => {
    if (!activeRoom) return;

    const channel = supabase
      .channel(`chat-room-${activeRoom.id}`)
      .on(
        "postgres_changes", 
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${activeRoom.id}` }, 
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  // Realtime rooms subscription (INSERT, UPDATE, DELETE)
  useEffect(() => {
    const channel = supabase
      .channel("chat-rooms-changes-all")
      .on(
        "postgres_changes", 
        { event: "INSERT", schema: "public", table: "chat_rooms" }, 
        (payload) => {
          setRooms((prev) => {
            if (prev.some(r => r.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        "postgres_changes", 
        { event: "UPDATE", schema: "public", table: "chat_rooms" }, 
        (payload) => {
          setRooms((prev) => prev.map(r => r.id === payload.new.id ? payload.new : r));
          setActiveRoom((curr) => curr && curr.id === payload.new.id ? payload.new : curr);
        }
      )
      .on(
        "postgres_changes", 
        { event: "DELETE", schema: "public", table: "chat_rooms" }, 
        (payload) => {
          setRooms((prev) => prev.filter(r => r.id !== payload.old.id));
          setActiveRoom((curr) => curr && curr.id === payload.old.id ? null : curr);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    const textToSend = messageText;
    const fileToSend = selectedFile;
    setMessageText("");
    setSelectedFile(null);
    setSelectedFileBase64("");

    try {
      const payload = {
        room_id: activeRoom.id,
        text: textToSend,
        sender_name: user?.name || "Hugo",
        attachment_url: fileToSend ? selectedFileBase64 : "",
        attachment_name: fileToSend ? fileToSend.name : "",
        attachment_type: fileToSend ? fileToSend.type : ""
      };

      const { data } = await api.post("/chats/messages", payload);
      
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // Simple simulator response for demo channels
      if (activeRoom.name === "general" && textToSend.toLowerCase().includes("hola")) {
        setTimeout(async () => {
          const simPayload = {
            room_id: activeRoom.id,
            text: "¡Hola! Estoy por aquí revisando unos contratos de Luz. ¿Necesitas ayuda con algún CUPS?",
            sender_name: "Ana García",
            attachment_url: "",
            attachment_name: "",
            attachment_type: ""
          };
          const { data: simData } = await api.post("/chats/messages", simPayload);
          setMessages((prev) => [...prev, simData]);
        }, 1500);
      }
    } catch (err) {
      toast.error("Error al enviar mensaje");
    }
  };

  // Create Channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const payload = {
        name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
        type: "channel",
        created_by: user?.id || null,
        members: [user?.id].filter(Boolean) // Creator is the first member
      };
      const { data } = await api.post("/chats/rooms", payload);
      toast.success(`Canal #${data.name} creado`);
      setCreateChannelOpen(false);
      setNewChannelName("");
      loadRooms(data.id);
    } catch (e) {
      toast.error("Error al crear canal");
    }
  };

  // Create or Activate DM Room with teammate
  const handleCreateDmWithUser = async (targetUser) => {
    const existing = rooms.find(r => r.type === "direct" && r.email === targetUser.email);
    if (existing) {
      setActiveRoom(existing);
      setCreateDmOpen(false);
      return;
    }
    
    try {
      const payload = {
        name: targetUser.name,
        type: "direct",
        email: targetUser.email,
        phone: targetUser.phone || "",
        created_by: user?.id || null,
        members: [user?.id, targetUser.id].filter(Boolean) // Both are members
      };
      const { data } = await api.post("/chats/rooms", payload);
      toast.success(`Chat directo con ${data.name} iniciado`);
      setCreateDmOpen(false);
      loadRooms(data.id);
    } catch (e) {
      toast.error("Error al iniciar chat");
    }
  };

  // Delete Room
  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await api.delete(`/chats/rooms/${roomToDelete.id}`);
      toast.success(`Conversación con "${roomToDelete.name}" eliminada`);
      setRooms(prev => prev.filter(r => r.id !== roomToDelete.id));
      if (activeRoom?.id === roomToDelete.id) {
        setActiveRoom(null);
      }
      setDeleteConfirmOpen(false);
      setRoomToDelete(null);
    } catch (e) {
      toast.error("Error al eliminar conversación");
    }
  };

  // Add Member to Channel
  const handleAddMember = async (targetUserId) => {
    const currentMembers = Array.isArray(activeRoom.members)
      ? activeRoom.members
      : crmUsers.map(u => u.id); // Default to all if not initialized
    
    if (currentMembers.includes(targetUserId)) return;
    const updatedMembers = [...currentMembers, targetUserId];

    try {
      const { data } = await api.patch(`/chats/rooms/${activeRoom.id}`, { members: updatedMembers });
      setRooms(prev => prev.map(r => r.id === activeRoom.id ? data : r));
      setActiveRoom(data);
      toast.success("Usuario añadido al canal");
    } catch (e) {
      toast.error("Error al añadir miembro");
    }
  };

  // Remove Member from Channel
  const handleRemoveMember = async (targetUserId) => {
    const currentMembers = Array.isArray(activeRoom.members)
      ? activeRoom.members
      : crmUsers.map(u => u.id); // Default to all if not initialized

    const updatedMembers = currentMembers.filter(id => id !== targetUserId);

    try {
      const { data } = await api.patch(`/chats/rooms/${activeRoom.id}`, { members: updatedMembers });
      setRooms(prev => prev.map(r => r.id === activeRoom.id ? data : r));
      setActiveRoom(data);
      toast.success("Usuario eliminado del canal");
    } catch (e) {
      toast.error("Error al eliminar miembro");
    }
  };

  // File selection helper
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 10MB");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFileBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Filter visibility based on current user's membership
  const isMember = (room) => {
    if (!room) return false;
    if (!user) return true;
    
    const userId = user.id || "";
    const userEmail = user.email || "";

    // DMs: Creator, target recipient email, or in members list
    if (room.type === "direct") {
      const isCreator = room.created_by === userId;
      const isRecipient = room.email === userEmail;
      const isListed = Array.isArray(room.members) && room.members.includes(userId);
      const isLegacy = !room.created_by && (!room.members || room.members.length === 0);
      return isCreator || isRecipient || isListed || isLegacy;
    }

    // Channels: If members is empty/null/undefined, it's public. Otherwise must be in members.
    if (room.type === "channel") {
      if (!room.members || !Array.isArray(room.members) || room.members.length === 0) {
        return true; // Public legacy channels
      }
      return room.members.includes(userId);
    }

    return true;
  };

  // Filter conversations
  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) && isMember(r)
  );

  const channels = filteredRooms.filter(r => r.type === "channel");
  const directMessages = filteredRooms.filter(r => r.type === "direct");

  // Teammates list to chat with (excluding logged in user)
  const otherTeammates = crmUsers.filter(u => u.email !== user?.email);

  // Active room members list
  const activeRoomMembers = activeRoom && Array.isArray(activeRoom.members) && activeRoom.members.length > 0
    ? crmUsers.filter(u => activeRoom.members.includes(u.id))
    : crmUsers; // Default to all if empty/legacy

  // Teammates that can be added (not currently members of activeRoom)
  const nonMembers = crmUsers.filter(u => 
    activeRoom && Array.isArray(activeRoom.members) && activeRoom.members.length > 0
      ? !activeRoom.members.includes(u.id)
      : false // If legacy, all are already members
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f5f8] text-zinc-900 font-sans">
      {/* 1. Global View Top Header Bar */}
      <div className="h-16 shrink-0 bg-white border-b border-zinc-200/80 px-6 flex items-center gap-2.5 z-20">
        <MessageSquare className="w-5 h-5 text-zinc-400" />
        <h2 className="font-display font-black text-lg text-zinc-950 tracking-tight leading-none">
          Mensajes
        </h2>
      </div>

      {/* 2. Chat Layout (Sidebar + Chat Area) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Slack Layout) */}
        <aside className="w-68 shrink-0 border-r border-zinc-200/80 bg-white flex flex-col overflow-y-auto">
          {/* Search bar inside sidebar */}
          <div className="p-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-zinc-50 font-medium"
              />
            </div>
          </div>

          {/* Navigation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
            {/* Channels list */}
            <div>
              <div className="p-2 flex items-center justify-between group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Canales</span>
                <button 
                  onClick={() => setCreateChannelOpen(true)}
                  className="p-1 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded transition-colors cursor-pointer border-none bg-transparent"
                  title="Crear canal"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-0.5">
                {channels.map((c) => {
                  const isActive = activeRoom?.id === c.id;
                  return (
                    <div 
                      key={c.id}
                      className="group/row flex items-center justify-between w-full rounded-xl pr-2 hover:bg-zinc-50"
                    >
                      <button
                        onClick={() => setActiveRoom(c)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all bg-transparent border-none cursor-pointer ${
                          isActive 
                            ? "text-[#ff5722]" 
                            : "text-zinc-650 hover:text-zinc-950"
                        }`}
                      >
                        <span className={`text-base font-semibold shrink-0 ${isActive ? "text-[#ff5722]" : "text-zinc-400"}`}>#</span>
                        <span className="truncate">{c.name}</span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomToDelete(c);
                          setDeleteConfirmOpen(true);
                        }}
                        className="opacity-0 group-hover/row:opacity-100 p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer border-none bg-transparent"
                        title="Eliminar canal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {channels.length === 0 && (
                  <span className="text-[10px] text-zinc-400 px-3 block">Ningún canal</span>
                )}
              </div>
            </div>

            {/* Direct Messages list */}
            <div>
              <div className="p-2 flex items-center justify-between group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-455">Mensajes Directos</span>
                <button 
                  onClick={() => setCreateDmOpen(true)}
                  className="p-1 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded transition-colors cursor-pointer border-none bg-transparent"
                  title="Nuevo mensaje directo"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-0.5">
                {directMessages.map((d) => {
                  const isActive = activeRoom?.id === d.id;
                  const initials = getInitials(d.name);

                  return (
                    <div 
                      key={d.id}
                      className="group/row flex items-center justify-between w-full rounded-xl pr-2 hover:bg-zinc-50"
                    >
                      <button
                        onClick={() => setActiveRoom(d)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all bg-transparent border-none cursor-pointer ${
                          isActive 
                            ? "text-[#ff5722]" 
                            : "text-zinc-650 hover:text-zinc-950"
                        }`}
                      >
                        {/* Changed initials background color to orange bg-[#ff5722] */}
                        <div className="w-6 h-6 rounded-lg bg-[#ff5722] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm select-none">
                          {initials}
                        </div>
                        <span className="truncate">{d.name}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomToDelete(d);
                          setDeleteConfirmOpen(true);
                        }}
                        className="opacity-0 group-hover/row:opacity-100 p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer border-none bg-transparent"
                        title="Eliminar conversación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {directMessages.length === 0 && (
                  <span className="text-[10px] text-zinc-400 px-3 block">Ningún mensaje directo</span>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Chat panel (Exactly like screenshot header/input/messages) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50">
          {activeRoom ? (
            <>
              {/* Custom Header replicating screenshot style */}
              <div className="h-16 shrink-0 bg-white border-b border-zinc-200/80 px-6 flex items-center justify-between z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2.5 min-w-0">
                  {activeRoom.type === "channel" ? (
                    <span className="text-zinc-400 font-semibold text-lg shrink-0 leading-none">#</span>
                  ) : (
                    /* Changed initials background color to orange bg-[#ff5722] */
                    <div className="w-7 h-7 rounded-lg bg-[#ff5722] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm select-none">
                      {getInitials(activeRoom.name)}
                    </div>
                  )}
                  <div className="flex items-baseline gap-2 min-w-0">
                    <h3 className="font-bold text-sm text-zinc-950 truncate leading-none">{activeRoom.name}</h3>
                    
                    {/* Render member count text clickably if it's a channel to allow managing members */}
                    {activeRoom.type === "channel" ? (
                      <button
                        onClick={() => setMembersModalOpen(true)}
                        className="text-[10px] text-zinc-400 hover:text-[#ff5722] font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent p-0"
                        title="Gestionar miembros del canal"
                      >
                        <span>
                          {Array.isArray(activeRoom.members) && activeRoom.members.length > 0
                            ? `${activeRoom.members.length} miembros`
                            : "Todos los miembros"
                          }
                        </span>
                        <Users className="w-3 h-3 text-zinc-400" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-semibold shrink-0">
                        {activeRoom.email || "Chat Privado"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Minimalist header - right side matches screenshot (empty/clean) */}
              </div>

              {/* Chat Messages Stream (Left-aligned, plain text, no bubbles, like Slack) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-zinc-450 text-xs font-semibold">
                    Cargando mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                    <MessageSquare className="w-10 h-10 text-zinc-300" />
                    <p className="text-xs font-bold">Este es el inicio de la conversación con {activeRoom.type === "channel" ? `#${activeRoom.name}` : activeRoom.name}</p>
                    <p className="text-[10px]">Envía un mensaje o adjunta un documento para comenzar.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const initials = getInitials(m.sender_name);

                    return (
                      <div 
                        key={m.id}
                        className="flex items-start gap-3.5 text-left group hover:bg-zinc-100/30 p-2 -mx-2 rounded-xl transition-colors"
                      >
                        {/* Avatar initials in squircle (Changed background color to orange bg-[#ff5722]) */}
                        <div className="w-9 h-9 rounded-xl bg-[#ff5722] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm select-none">
                          {initials}
                        </div>

                        {/* Message Content & Metadata aligned to the left */}
                        <div className="min-w-0 flex-1 leading-normal">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-xs text-zinc-900">{m.sender_name}</span>
                            <span className="text-[10px] text-zinc-400 font-normal">
                              {new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          
                          <p className="text-xs text-zinc-800 mt-1 whitespace-pre-wrap font-medium leading-relaxed">
                            {m.text}
                          </p>

                          {/* File Attachment */}
                          {m.attachment_url && (
                            <div className="mt-2.5 p-2.5 rounded-xl flex items-center justify-between gap-3 border border-zinc-200 bg-white text-zinc-800 max-w-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-5 h-5 shrink-0 text-[#ff5722]" />
                                <div className="min-w-0 text-left">
                                  <p className="font-bold text-[10px] truncate max-w-[180px] leading-tight">
                                    {m.attachment_name || "Documento"}
                                  </p>
                                  <span className="text-[8px] text-zinc-400 font-semibold block truncate">
                                    {m.attachment_type || "Formato desconocido"}
                                  </span>
                                </div>
                              </div>
                              <a 
                                href={m.attachment_url} 
                                download={m.attachment_name}
                                className="p-1.5 rounded-full hover:bg-zinc-50 text-zinc-650 transition-colors shrink-0"
                                title="Descargar documento"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar Footer (Replicating Screenshot capsule format) */}
              <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
                {selectedFile && (
                  <div className="mb-2 p-2 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2 max-w-sm anim-fadeup">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="min-w-0 leading-tight">
                        <p className="text-[10px] font-bold text-zinc-800 truncate">{selectedFile.name}</p>
                        <span className="text-[8px] text-zinc-400 font-medium">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedFile(null); setSelectedFileBase64(""); }}
                      className="p-1 text-zinc-450 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {/* Paperclip attachment button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-zinc-450 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer shrink-0 border-none bg-transparent"
                    title="Adjuntar documento"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  {/* Message text input area capsule */}
                  <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 bg-zinc-50">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Mensaje en ${activeRoom.type === "channel" ? `#${activeRoom.name}` : activeRoom.name}`}
                      className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm font-semibold text-zinc-800 placeholder-zinc-455"
                    />

                    {/* Emojis Selector */}
                    <div className="relative shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => setEmojiOpen(!emojiOpen)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent ${
                          emojiOpen ? "text-[#ff5722] bg-zinc-150" : "text-zinc-400 hover:text-zinc-950"
                        }`}
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      {emojiOpen && (
                        <div className="absolute bottom-10 right-0 bg-white border border-zinc-200 rounded-xl p-2 shadow-2xl flex items-center gap-1 z-50 anim-fadeup">
                          {quickEmojis.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => {
                                setMessageText((prev) => prev + e);
                                setEmojiOpen(false);
                              }}
                              className="w-7 h-7 flex items-center justify-center hover:bg-zinc-100 rounded-lg text-sm cursor-pointer transition-all active:scale-90 border-none bg-transparent"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="p-2.5 bg-[#ff5722] text-white hover:bg-[#e04d1e] rounded-xl transition-colors shadow-sm cursor-pointer shrink-0 border-none"
                    title="Enviar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-450 gap-2 bg-zinc-50">
              <MessageSquare className="w-12 h-12 text-zinc-300" />
              <p className="text-sm font-bold">Ninguna conversación seleccionada</p>
              <p className="text-xs font-semibold text-zinc-450">Selecciona un canal o mensaje directo de la barra lateral para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CHANNEL DIALOG */}
      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="max-w-md animate-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-950">Crear nuevo canal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label htmlFor="channel-name" className="text-xs uppercase tracking-wider font-bold text-zinc-450">Nombre del canal</Label>
              <div className="relative mt-1">
                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <Input
                  id="channel-name"
                  placeholder="ejemplo-canal"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="pl-9 h-9 border-zinc-200 font-semibold"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-semibold">Los canales sirven para organizar la comunicación por temáticas de equipo.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateChannelOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateChannel} className="bg-zinc-950 text-white hover:bg-zinc-800">Crear canal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE DIRECT MESSAGE CONTACT DIALOG (Cleaned & Team-driven) */}
      <Dialog open={createDmOpen} onOpenChange={setCreateDmOpen}>
        <DialogContent className="max-w-md animate-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-950">Iniciar chat con equipo</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-xs uppercase tracking-wider font-bold text-zinc-450 block mb-2">Selecciona un compañero de equipo</Label>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {otherTeammates.map((u) => {
                const initials = getInitials(u.name);
                return (
                  <button
                    key={u.id}
                    onClick={() => handleCreateDmWithUser(u)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all text-left group bg-transparent cursor-pointer"
                  >
                    {/* Changed initials background color to orange bg-[#ff5722] */}
                    <div className="w-8 h-8 rounded-lg bg-[#ff5722] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-950 truncate group-hover:text-[#ff5722] transition-colors">{u.name}</p>
                      <p className="text-[10px] text-zinc-400 font-semibold truncate uppercase tracking-wider">{u.role}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
                  </button>
                );
              })}
              {otherTeammates.length === 0 && (
                <p className="text-xs text-zinc-450 text-center py-4">No hay otros miembros de equipo registrados.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDmOpen(false)} className="w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm animate-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-950 text-left">¿Eliminar esta conversación?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-left">
            <p className="text-xs text-zinc-500 leading-normal">
              Esta acción eliminará el chat <strong>{roomToDelete?.name}</strong> y todo su historial de mensajes de manera permanente en el servidor. Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setRoomToDelete(null); }} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleDeleteRoom} className="bg-red-600 hover:bg-red-700 text-white flex-1">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE CHANNEL MEMBERS DIALOG */}
      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="max-w-md animate-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-zinc-950 text-left">
              Miembros de #{activeRoom?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 text-left space-y-4">
            {/* List current members */}
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-zinc-450 block mb-2">Miembros actuales ({activeRoomMembers.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeRoomMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-150">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#ff5722] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                        {getInitials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 truncate leading-none">{m.name}</p>
                        <p className="text-[9px] text-zinc-400 font-semibold truncate leading-none mt-1">{m.email}</p>
                      </div>
                    </div>
                    {/* Allow removing members (prevent user removing themselves unless wanted, or just allow it) */}
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                      title="Eliminar miembro del canal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add new members */}
            <div className="border-t border-zinc-150 pt-3">
              <Label className="text-xs uppercase tracking-wider font-bold text-zinc-455 block mb-2">Añadir al canal</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {nonMembers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#ff5722] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 truncate leading-none">{u.name}</p>
                        <p className="text-[9px] text-zinc-400 font-semibold truncate leading-none mt-1">{u.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(u.id)}
                      className="px-2.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer border-none shadow-sm"
                    >
                      Añadir
                    </button>
                  </div>
                ))}
                {nonMembers.length === 0 && (
                  <p className="text-[10px] text-zinc-400 text-center py-2 font-medium">Todos los miembros del equipo ya están en este canal.</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersModalOpen(false)} className="w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
