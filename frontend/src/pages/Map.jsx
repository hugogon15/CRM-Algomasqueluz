import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getClients } from "../lib/api";
import { CLIENT_STATE_MAP, CLIENT_STATES } from "../lib/constants";
import { MapPin, Search, RefreshCw, Layers, SlidersHorizontal, Menu } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import Sidebar from "../components/layout/Sidebar";

// Coordenadas aproximadas de las provincias españolas para posicionar a los clientes de forma automática
const PROVINCIA_COORDS = {
  "Madrid": [40.416775, -3.703790],
  "Barcelona": [41.385063, 2.173404],
  "Valencia": [39.469907, -0.376288],
  "Sevilla": [37.389092, -5.984459],
  "Zaragoza": [41.648823, -0.889085],
  "Málaga": [36.721261, -4.421265],
  "Murcia": [37.992240, -1.130654],
  "Palma": [39.569600, 2.650200],
  "Las Palmas": [28.123500, -15.436200],
  "Bilbao": [43.263012, -2.934989],
  "Alicante": [38.345170, -0.481006],
  "Córdoba": [37.888200, -4.779400],
  "Valladolid": [41.652251, -4.728547],
  "Vigo": [42.240600, -8.720700],
  "Gijón": [43.535700, -5.661500],
  "Granada": [37.177336, -3.598557],
  "A Coruña": [43.362300, -8.411500],
  "Vitoria": [42.846700, -2.671600],
  "Elche": [38.262200, -0.699300],
  "Oviedo": [43.361900, -5.849400],
  "Pamplona": [42.812500, -1.645800],
  "Cartagena": [37.605100, -0.986300],
  "Almería": [36.834000, -2.463700],
  "Santander": [43.462300, -3.809900]
};

// Coordenada central de España
const ESPANA_CENTRO = [40.463667, -3.74922];

// Límites geográficos para centrar y restringir la vista únicamente a España
// Incluye Península, Baleares y Canarias
const SPAIN_BOUNDS = [
  [26.0, -19.5], // Suroeste (Canarias)
  [44.5, 5.5]    // Noreste (Baleares/Cataluña)
];

// Polígonos de contorno de España (Península, Baleares, Canarias) para crear una máscara
const SPAIN_MAINLAND_OUTLINE = [
  [43.7, -9.0], // Galicia NW (Cabo Ortegal)
  [43.6, -7.5], // Foz
  [43.6, -6.0], // Cudillero
  [43.5, -5.6], // Gijón
  [43.4, -4.5], // Llanes
  [43.4, -3.8], // Santander
  [43.4, -3.0], // Bilbao
  [43.4, -1.8], // San Sebastián
  [43.0, -1.5], // Pyrenees / Roncesvalles
  [42.8, -0.8], // Pyrenees central
  [42.6, 0.5],  // Pyrenees eastern
  [42.4, 1.9],  // Pyrenees near Puigcerdà
  [42.4, 3.2],  // Cap de Creus (NE)
  [41.9, 3.2],  // Palamós
  [41.4, 2.2],  // Barcelona
  [40.8, 0.8],  // Tarragona / Salou
  [40.6, 0.6],  // Ebro Delta
  [39.9, 0.1],  // Castellón
  [39.5, -0.3], // Valencia
  [38.8, 0.2],  // Dénia / Cap de la Nau
  [38.3, -0.5], // Alicante
  [37.6, -0.7], // Cabo de Palos / Cartagena
  [37.2, -1.9], // Mojácar
  [36.7, -2.2], // Cabo de Gata
  [36.7, -3.5], // Almuñécar
  [36.7, -4.4], // Málaga
  [36.5, -4.8], // Marbella
  [36.0, -5.6], // Tarifa (Southmost Point)
  [36.5, -6.2], // Cádiz
  [37.2, -7.4], // Huelva / Guadiana river (Portugal border)
  [38.2, -7.3], // Olivenza border
  [39.0, -7.3], // Badajoz / Portalegre border
  [39.7, -7.3], // Valencia de Alcántara border
  [40.3, -6.8], // Ciudad Rodrigo border
  [41.3, -6.7], // Fermoselle border
  [41.8, -6.8], // Bragança border
  [42.1, -8.2], // Melgaço border
  [42.2, -8.9], // Vigo / Baiona
  [43.3, -9.3], // Cabo Fisterra
  [43.7, -9.0]  // Back to Galicia NW
];

const BALEARICS_OUTLINE = [
  [40.1, 3.7],
  [39.8, 4.4],
  [39.2, 3.4],
  [38.8, 1.4],
  [39.0, 1.2],
  [39.6, 2.3],
  [40.1, 3.7]
];

const CANARIES_OUTLINE = [
  [29.5, -13.3],
  [28.0, -14.2],
  [27.6, -18.2],
  [28.8, -18.0],
  [29.5, -13.3]
];

// Función para limpiar la dirección y estructurarla óptimamente para Nominatim
function getGeocodingQuery(direccion, provincia) {
  if (!direccion) return { query: "", postalCode: "" };
  
  // Extraer código postal (5 dígitos consecutivos)
  const cpMatch = direccion.match(/\b\d{5}\b/) || (provincia && provincia.match(/\b\d{5}\b/));
  const postalCode = cpMatch ? cpMatch[0] : "";
  
  // Limpiar partes de piso, puerta, escalera, etc. que confunden a Nominatim
  let streetPart = direccion;
  if (postalCode) {
    streetPart = streetPart.replace(postalCode, "");
  }
  
  streetPart = streetPart
    .replace(/,\s*(?:\d+\s*[ºªa-zA-Z]?|bajo|ático|atico|local|entresuelo|principal|izq|der|izda|dcha)\b.*/i, '')
    .replace(/\b(?:\d+\s*[ºª]\s*[a-zA-Z]?|bajo|ático|atico|local|entresuelo|principal|izq|der|izda|dcha)\b.*/i, '')
    .replace(/\b(?:piso|puerta|escalera|esq|bloque|portal)\s+\w+/gi, '')
    .replace(/\d+\s*[ºª]\s*\w?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Limpiar caracteres especiales colgantes al inicio y final
  streetPart = streetPart.replace(/^[,-\.\s]+|[,-\.\s]+$/g, '').trim();
  
  const parts = [];
  if (streetPart) parts.push(streetPart);
  if (postalCode) parts.push(postalCode);
  if (provincia && provincia !== postalCode) parts.push(provincia);
  parts.push("Spain");
  
  return {
    query: parts.join(", "),
    postalCode,
    streetPart
  };
}

// Mapeo de colores HEX brillantes para el mapa oscuro
const STATE_HEX_COLORS = {
  "nuevo_lead": "#3B82F6",          // Azul brillante
  "pendiente_estudio": "#F59E0B",   // Ámbar
  "sin_ahorro": "#71717a",          // Zinc
  "incompleto": "#A855F7",          // Púrpura
  "enviado_firma": "#6366F1",       // Índigo
  "incidencia": "#EC4899",          // Rosa
  "pendiente_activacion": "#8B5CF6",// Violeta
  "cliente_activo": "#10B981",      // Verde (activo)
  "renovacion": "#F97316",          // Naranja (renovación)
  "no_renovado": "#F43F5E",         // Rosa/Rojo
  "baja": "#EF4444"                 // Rojo (baja)
};

export default function ClientMap() {
  const navigate = useNavigate();

  useEffect(() => {
    window.navigateToClient = (id) => {
      navigate(`/clientes/${id}`);
    };
    window.openStreetView = (lat, lng, name, address) => {
      setSelectedStreetView({ lat, lng, name, address });
    };
    return () => {
      delete window.navigateToClient;
      delete window.openStreetView;
    };
  }, [navigate]);

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [coordinates, setCoordinates] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [stats, setStats] = useState({ total: 0, mapped: 0 });
  const [selectedStreetView, setSelectedStreetView] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const markersRef = useRef({});

  // Seleccionar y volar hacia un cliente en el mapa
  const handleClientSelect = (client) => {
    let lat = null;
    let lng = null;

    if (coordinates[client.id]) {
      lat = coordinates[client.id].lat;
      lng = coordinates[client.id].lng;
    } else if (PROVINCIA_COORDS[client.provincia]) {
      lat = PROVINCIA_COORDS[client.provincia][0];
      lng = PROVINCIA_COORDS[client.provincia][1];
    }

    if (lat !== null && lng !== null && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      map.flyTo([lat, lng], 16.5, {
        animate: true,
        duration: 1.2
      });

      const marker = markersRef.current[client.id];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 1200);
      }
    }
  };

  // Filtrar o desfiltrar por Leyenda de Estados
  const handleLegendClick = (stateValue) => {
    if (selectedState === stateValue) {
      setSelectedState(""); // Deseleccionar
    } else {
      setSelectedState(stateValue); // Seleccionar
    }
  };

  // Cargar clientes
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getClients();
      setClients(data);
      setFilteredClients(data);
      toast.success("Clientes cargados con éxito");
    } catch (err) {
      console.error(err);
      toast.error("Error cargando los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime database changes on public.clientes table
    const channel = supabase
      .channel("map-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        // Load data silently in background to keep screen live
        getClients().then(data => {
          setClients(data);
        }).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Geocodificación secuencial asíncrona respetando límites de Nominatim y con caché inteligente
  useEffect(() => {
    if (clients.length === 0) return;

    let active = true;

    async function geocodeAll() {
      const newCoords = { ...coordinates };
      let updated = false;

      // 1. Cargar caché válida de forma inmediata
      for (const c of clients) {
        if (!active) break;
        if (!c.direccion) continue;

        const cacheKey = `geo_cache_${c.id}`;
        const cachedStr = localStorage.getItem(cacheKey);

        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            const currentAddr = `${c.direccion} | ${c.provincia}`;
            // Si la dirección coincide con la del caché, usar las coordenadas
            if (cached && cached.lat && cached.lng && cached.address === currentAddr) {
              newCoords[c.id] = cached;
              updated = true;
            } else {
              localStorage.removeItem(cacheKey);
            }
          } catch (e) {
            localStorage.removeItem(cacheKey);
          }
        }
      }

      if (updated && active) {
        setCoordinates({ ...newCoords });
      }

      // 2. Geocodificar secuencialmente los que falten con rate limit y fallbacks
      for (const c of clients) {
        if (!active) break;
        if (!c.direccion) continue;

        const cacheKey = `geo_cache_${c.id}`;
        const cachedStr = localStorage.getItem(cacheKey);
        
        // Verificar si ya está en coordinates y coincide el caché
        if (newCoords[c.id]) {
          try {
            const cached = JSON.parse(cachedStr);
            if (cached && cached.address === `${c.direccion} | ${c.provincia}`) {
              continue; // Ya está cargado y es válido
            }
          } catch(e) {}
        }

        // Retraso de 1.2s para respetar la política de uso de Nominatim
        await new Promise((resolve) => setTimeout(resolve, 1200));

        try {
          const { query, postalCode } = getGeocodingQuery(c.direccion, c.provincia);
          if (!query) continue;

          let res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
            { headers: { "User-Agent": "AlgoMasQueLuz-CRM-Map/1.0" } }
          );

          if (!res.ok) continue;
          let data = await res.json();

          // Fallback 1: Si falla, intentar por código postal y provincia (muy exacto para CP)
          if ((!data || data.length === 0) && postalCode) {
            const fallbackQuery = `${postalCode}, ${c.provincia || ""}, Spain`;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fallbackQuery)}`,
              { headers: { "User-Agent": "AlgoMasQueLuz-CRM-Map/1.0" } }
            );
            if (res.ok) {
              data = await res.json();
            }
          }

          // Fallback 2: Si sigue fallando, intentar por provincia
          if ((!data || data.length === 0) && c.provincia) {
            const fallbackQuery = `${c.provincia}, Spain`;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fallbackQuery)}`,
              { headers: { "User-Agent": "AlgoMasQueLuz-CRM-Map/1.0" } }
            );
            if (res.ok) {
              data = await res.json();
            }
          }

          if (data && data[0] && active) {
            const currentAddr = `${c.direccion} | ${c.provincia}`;
            const loc = { 
              lat: parseFloat(data[0].lat), 
              lng: parseFloat(data[0].lon),
              address: currentAddr
            };
            localStorage.setItem(cacheKey, JSON.stringify(loc));
            
            setCoordinates((prev) => ({
              ...prev,
              [c.id]: loc
            }));
          }
        } catch (err) {
          console.warn(`Error al geocodificar dirección para ${c.nombre}:`, err);
        }
      }
    }

    geocodeAll();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  // Filtrar clientes
  useEffect(() => {
    let result = clients;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.nombre?.toLowerCase().includes(q) ||
          c.provincia?.toLowerCase().includes(q) ||
          c.direccion?.toLowerCase().includes(q) ||
          c.cups?.toLowerCase().includes(q)
      );
    }

    if (selectedState !== "") {
      result = result.filter((c) => c.estado === selectedState);
    }

    setFilteredClients(result);

    // Contar cuántos están mapeados (ya sea por geolocalización exacta o provincia de fallback)
    const mappedCount = result.filter(c => coordinates[c.id] || PROVINCIA_COORDS[c.provincia]).length;
    setStats({ total: result.length, mapped: mappedCount });
  }, [searchQuery, selectedState, clients, coordinates]);

  // Inicializar y actualizar Mapa Leaflet
  useEffect(() => {
    // Evitar inicializar si Leaflet no está cargado o el DOM no está listo
    if (!window.L || !mapRef.current || loading) return;

    const L = window.L;

    // Configurar iconos Leaflet para que no rompan
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    // Crear el mapa si no existe
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        maxBounds: SPAIN_BOUNDS,
        maxBoundsViscosity: 1.0,  // Restricción total e inquebrantable
        minZoom: 6.3,            // Incrementado para enfocar más a España y evitar ver Europa
        maxZoom: 18,
        zoomSnap: 0.1            // Permitir zoom fraccional preciso
      }).setView(ESPANA_CENTRO, 6.3);

      // Capa Satelital base con clase CSS dedicada para poder oscurecerla
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        className: "esri-satellite-tiles",
        attribution: '&copy; Esri &copy; DigitalGlobe &copy; GeoEye &copy; Earthstar Geographics &copy; CNES/Airbus DS &copy; USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Capa superior de nombres de ciudades y fronteras en blanco para orientación
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        attribution: '&copy; Esri &copy; HERE &copy; Garmin &copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Crear grupo para los marcadores
      markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    // Limpiar marcadores anteriores y vaciar el diccionario de referencias
    markersGroup.clearLayers();
    markersRef.current = {};

    // Crear un semillero para dispersar marcadores en la misma provincia (evitar colisiones exactas si caen en fallback)
    const provinceOffsets = {};

    // Añadir marcadores de clientes
    const bounds = L.latLngBounds();
    let hasPoints = false;

    filteredClients.forEach((c) => {
      const prov = c.provincia;
      
      let lat = null;
      let lng = null;

      // 1. Intentar resolver por geocodificación exacta de calle y código postal
      if (coordinates[c.id]) {
        lat = coordinates[c.id].lat;
        lng = coordinates[c.id].lng;
      } 
      // 2. Si no hay coordenadas exactas cargadas aún, usar fallback de capital de provincia
      else if (PROVINCIA_COORDS[prov]) {
        const baseCoords = PROVINCIA_COORDS[prov];
        if (!provinceOffsets[prov]) {
          provinceOffsets[prov] = 0;
        }
        const offsetIndex = provinceOffsets[prov]++;
        
        // Dispersión espiral
        const angle = offsetIndex * 0.5;
        const radius = 0.02 * Math.sqrt(offsetIndex);
        lat = baseCoords[0] + (Math.sin(angle) * radius);
        lng = baseCoords[1] + (Math.cos(angle) * radius);
      }

      if (lat !== null && lng !== null) {
        const markerColor = STATE_HEX_COLORS[c.estado] || "#F97316";
        const stateInfo = CLIENT_STATE_MAP[c.estado] || { label: c.estado, color: "#71717a" };

        // Crear marcador personalizado como un destello/pulso brillante en el mapa oscuro
        const customMarkerIcon = L.divIcon({
          className: "", // Limpiar clases por defecto de Leaflet para control total
          html: `
            <div class="destello-container" style="--destello-color: ${markerColor};">
              <div class="destello-ring"></div>
              <div class="destello-core"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        // Popup con dirección exacta detallada (incluyendo calle, número, código postal)
        const popupContent = `
          <div class="p-1 font-sans min-w-[200px]">
            <div class="flex items-center gap-1.5 mb-1.5">
              <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-sm" style="background-color: ${markerColor};"></span>
              <h4 class="font-bold text-xs text-zinc-950 leading-tight">${c.nombre}</h4>
            </div>
            <p class="text-[10px] text-zinc-500 mt-1 font-medium leading-normal flex items-start gap-1">
              <span class="shrink-0 mt-0.5 text-zinc-400">📍</span>
              <span>${c.direccion || "Sin dirección registrada"}${c.provincia ? ` (${c.provincia})` : ""}</span>
            </p>
            
            <div class="mt-2.5 flex items-center justify-between gap-2">
              <span class="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold text-white uppercase tracking-wider" style="background-color: ${markerColor}">
                ${stateInfo.label}
              </span>
            </div>
            
            <div class="mt-3 pt-2 border-t border-zinc-100 flex flex-col gap-1.5">
              <button onclick="window.openStreetView(${lat}, ${lng}, '${c.nombre.replace(/'/g, "\\'")}', '${(c.direccion || "").replace(/'/g, "\\'")}')" class="w-full text-center py-1.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-full text-[9px] font-bold tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer">
                <span>👁️</span> Ver Street View
              </button>
              <button onclick="window.navigateToClient('${c.id}')" class="w-full text-center py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded-full text-[9px] font-bold tracking-wide transition-colors shadow-sm cursor-pointer">
                Ver Ficha Completa →
              </button>
            </div>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: customMarkerIcon })
          .bindPopup(popupContent);
        
        markersGroup.addLayer(marker);
        // Guardar la referencia del marcador indexado por ID
        markersRef.current[c.id] = marker;
        bounds.extend([lat, lng]);
        hasPoints = true;
      }
    });

    // Si hay exactamente un único cliente filtrado (p. ej., por búsqueda exacta), volar directamente
    if (filteredClients.length === 1 && hasPoints) {
      const singleClient = filteredClients[0];
      let lat = null;
      let lng = null;

      if (coordinates[singleClient.id]) {
        lat = coordinates[singleClient.id].lat;
        lng = coordinates[singleClient.id].lng;
      } else if (PROVINCIA_COORDS[singleClient.provincia]) {
        lat = PROVINCIA_COORDS[singleClient.provincia][0];
        lng = PROVINCIA_COORDS[singleClient.provincia][1];
      }

      if (lat !== null && lng !== null) {
        map.flyTo([lat, lng], 16.5, { animate: true, duration: 1.2 });
        const marker = markersRef.current[singleClient.id];
        if (marker) {
          setTimeout(() => {
            marker.openPopup();
          }, 1200);
        }
      }
    } else if (hasPoints && filteredClients.length < clients.length) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      map.setView(ESPANA_CENTRO, 6.3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClients, loading, coordinates]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header superior */}
      <header className="h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Menu Drawer Trigger */}
          <div className="md:hidden shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <button 
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-none outline-none bg-transparent cursor-pointer"
                  title="Abrir menú"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-none bg-zinc-950 text-white overflow-hidden">
                <Sidebar className="h-full border-none pb-12" forceExpanded={true} />
              </SheetContent>
            </Sheet>
          </div>
          <MapPin className="w-5 h-5 text-zinc-900" />
          <h1 className="font-display font-bold text-base md:text-lg text-zinc-950">
            <span className="hidden sm:inline">Mapa Geográfico de Clientes</span>
            <span className="inline sm:hidden">Mapa de Clientes</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            title="Recargar clientes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Barra de Filtros y Búsqueda superior compacta y responsive */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 py-2.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center z-20 shadow-sm">
        {/* Buscador */}
        <div className="relative flex-1 md:max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar titular, dirección, CUPS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 p-0.5 text-xs font-bold font-sans"
              >
                ✕
              </button>
            )}
          </div>

          {/* Menú Flotante de Resultados de Búsqueda (Visible sólo cuando hay texto) */}
          {searchQuery.trim() !== "" && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white/98 backdrop-blur-md border border-zinc-200 rounded-xl shadow-xl max-h-52 overflow-y-auto p-1.5 space-y-0.5 z-[2000]">
              <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 px-2 py-1 border-b border-zinc-100">
                Resultados ({filteredClients.length})
              </div>
              {filteredClients.length === 0 ? (
                <div className="text-center py-4 text-zinc-400 text-xs italic">
                  Ningún cliente coincide
                </div>
              ) : (
                filteredClients.map((c) => {
                  const markerColor = STATE_HEX_COLORS[c.estado] || "#F97316";
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleClientSelect(c)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors flex items-center justify-between gap-3 border border-transparent hover:border-zinc-100 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-zinc-800 truncate">{c.nombre}</div>
                        <div className="text-[9px] text-zinc-400 truncate mt-0.5">📍 {c.direccion || "Sin dirección"}</div>
                      </div>
                      <span className="w-2 h-2 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: markerColor }}></span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Separador vertical en desktop */}
        <div className="hidden md:block w-px h-6 bg-zinc-200" />

        {/* Filtros de Estado */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
          <div className="shrink-0 flex items-center gap-1.5 text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtrar por Estado:</span>
          </div>

          {/* Lista Desplazable Horizontalmente */}
          <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none -mx-2 px-2">
            {CLIENT_STATES.map((s) => {
              const count = clients.filter(c => c.estado === s.value).length;
              const legendColor = STATE_HEX_COLORS[s.value] || "#F97316";
              const isSelected = selectedState === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => handleLegendClick(s.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 md:py-1.5 rounded-full border transition-all shrink-0 cursor-pointer text-[10px] md:text-[11px] font-semibold ${
                    isSelected
                      ? "bg-zinc-950 text-white border-zinc-950 shadow-md font-bold scale-[1.01]"
                      : "bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 border border-white/50 ${isSelected ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: legendColor }}
                  ></span>
                  <span className="whitespace-nowrap">{s.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedState && (
            <button
              onClick={() => setSelectedState("")}
              className="shrink-0 text-[10px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-full"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* El mapa en sí */}
        <div className="flex-1 h-full relative bg-zinc-100">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[2000] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 text-zinc-800 animate-spin" />
                <span className="text-sm font-semibold text-zinc-800">Cargando mapa de clientes...</span>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full z-0 bg-zinc-100" />
        </div>

        {/* Tarjeta de Cobertura / Estadísticas flotante en la parte inferior izquierda */}
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 z-[1000] pointer-events-auto bg-white/95 backdrop-blur-md border border-zinc-200 rounded-lg shadow px-2 py-1 md:px-3 md:py-1.5 text-[9px] md:text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Mapeados: {stats.mapped}/{stats.total} ({stats.total > 0 ? Math.round((stats.mapped / stats.total) * 100) : 0}%)</span>
        </div>
      </div>

      {/* Estilos CSS embebidos para animaciones premium de destellos y personalización de popups */}
      <style>{`
        /* Efecto destello (beacon) para los puntos de clientes */
        @keyframes destello-pulse-ring {
          0% {
            transform: scale(0.3);
            opacity: 0.95;
          }
          70%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        @keyframes destello-pulse-core {
          0% {
            transform: scale(0.8);
            box-shadow: 0 0 4px var(--destello-color), 0 0 10px var(--destello-color);
          }
          50% {
            transform: scale(1.15);
            box-shadow: 0 0 8px var(--destello-color), 0 0 20px var(--destello-color), 0 0 4px #fff;
          }
          100% {
            transform: scale(0.8);
            box-shadow: 0 0 4px var(--destello-color), 0 0 10px var(--destello-color);
          }
        }

        .destello-container {
          position: relative;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .destello-ring {
          position: absolute;
          width: 22px;
          height: 22px;
          border: 2px solid var(--destello-color);
          border-radius: 50%;
          animation: destello-pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
          pointer-events: none;
        }

        .destello-core {
          position: relative;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid #ffffff;
          animation: destello-pulse-core 2s ease-in-out infinite;
          background-color: var(--destello-color);
        }


        /* Satélite oscuro de alto contraste */
        .esri-satellite-tiles {
          filter: brightness(0.42) contrast(1.3) saturate(0.8) !important;
        }

        /* Rediseño premium de los Popups de Leaflet al estilo Folbee.io */
        .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          color: #09090b !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e4e4e7 !important;
          padding: 2px !important;
        }

        .leaflet-popup-content {
          margin: 12px 14px !important;
        }

        .leaflet-popup-tip {
          background: #ffffff !important;
          border: 1px solid #e4e4e7 !important;
          box-shadow: none !important;
        }

        /* Animación suave para la carga de capas de Leaflet */
        .leaflet-tile-container {
          transition: filter 0.5s ease-in-out;
        }

        /* Ocultar barra de desplazamiento para filtros en móvil */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Modal de Google Street View interactivo */}
      {selectedStreetView && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh] md:h-[70vh] animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50">
              <div>
                <span className="text-[9px] uppercase tracking-[0.08em] font-bold text-zinc-400">Referencia de Calle del Cliente</span>
                <h3 className="font-display font-bold text-sm md:text-base text-zinc-950 leading-tight">
                  {selectedStreetView.name}
                </h3>
                <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-1">
                  <span>📍</span> {selectedStreetView.address}
                </p>
              </div>
              
              <button 
                onClick={() => setSelectedStreetView(null)}
                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
                title="Cerrar vista de calle"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Contenido del Street View */}
            <div className="flex-1 bg-zinc-900 relative">
              <iframe
                title="Google Street View"
                src={`https://maps.google.com/maps?q=${selectedStreetView.lat},${selectedStreetView.lng}&cbll=${selectedStreetView.lat},${selectedStreetView.lng}&layer=c&output=svembed`}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>

            {/* Footer con opciones adicionales */}
            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
              <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium max-w-[50%] leading-snug">
                *Vista interactiva 360º de Google Maps. Arrastra con el cursor para girar la cámara.
              </span>
              <div className="flex items-center gap-2">
                <a 
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedStreetView.lat},${selectedStreetView.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-full text-xs font-bold tracking-wide transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  Abrir en Google Maps ↗
                </a>
                <button 
                  onClick={() => setSelectedStreetView(null)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
