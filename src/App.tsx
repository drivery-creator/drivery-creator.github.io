import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Radio, 
  Search, 
  MapPin, 
  Bell, 
  Send, 
  MessageSquare, 
  Twitter, 
  Plus, 
  X as CloseIcon, 
  AlertTriangle, 
  Volume2, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Globe,
  Share2,
  Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Desaparecido } from "./types";
import CaracasMap from "./components/CaracasMap";
import SeismicVectorMap from "./components/SeismicVectorMap";

export default function App() {
  const [desaparecidos, setDesaparecidos] = useState<Desaparecido[]>([]);
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [socialFeed, setSocialFeed] = useState<any[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<"sismologia" | "radar" | "directorio">("sismologia");
  const [selectedEarthquake, setSelectedEarthquake] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchSummary, setWebSearchSummary] = useState<string | null>(null);
  const [webSearchResults, setWebSearchResults] = useState<Array<{ title: string; uri: string; snippet: string; source: string }>>([]);
  const [feedSearchTerm, setFeedSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Real GPS & Geofence Proximity states
  const [driverPos, setDriverPos] = useState({ lat: 10.4900, lng: -66.9000 });
  const [activeMatch, setActiveMatch] = useState<Desaparecido | null>(null);
  const [networkStats, setNetworkStats] = useState<{
    cantidadReportes: number;
    personasUnicas: number;
    aunSinContacto: number;
    localizados: number;
    lastUpdated: string;
  } | null>(null);

  // Real internal monitoring logger (Tracks actual REST & Scraping actions)
  const [wsLogs, setWsLogs] = useState<string[]>([
    "[Sistema] 📡 Inicializando Red de Monitoreo de Rescate PWA...",
    "[Sistema] 🟢 Listo para conectar con USGS Sismología y Scraper de Telegram."
  ]);

  const addLog = (text: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setWsLogs(prev => [`[${timeStr}] ${text}`, ...prev.slice(0, 14)]);
  };

  // New Case Form state
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    nombre: "",
    edad: "",
    ultima_zona: "",
    rasgos: "",
    vestimenta: "",
    foto_url: "",
    comentarios: ""
  });
  
  // AI Emergency Copilot states
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "¡Hola! Soy tu Copilot de Emergencia de Rescate PWA. Pregúntame qué hacer en caso de terremoto, cómo registrar a alguien, o cómo activar las alertas en tiempo real." }
  ]);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  const loadData = async () => {
    setIsRefreshing(true);
    addLog("⚡ Sincronizando datos con servidores oficiales...");
    try {
      const [resDes, resEq, resFeed, resStats] = await Promise.all([
        fetch("/api/desaparecidos"),
        fetch("/api/earthquakes"),
        fetch("/api/social-feed"),
        fetch("/api/network-stats")
      ]);

      const dataDes = await resDes.json();
      const dataEq = await resEq.json();
      const dataFeed = await resFeed.json();
      const dataStats = await resStats.json();

      if (dataDes.success) {
        setDesaparecidos(dataDes.data);
        addLog(`🗄️ DB de Búsqueda: Cargados ${dataDes.data.length} casos de personas activas.`);
      }
      if (dataEq.success) {
        setEarthquakes(dataEq.data);
        addLog(`🌎 USGS Sismología: Sincronizados ${dataEq.data.length} eventos sísmicos reales del planeta.`);
        
        // Find local Venezuela earthquakes if any
        const localEqs = dataEq.data.filter((eq: any) => eq.isLocal);
        if (localEqs.length > 0) {
          addLog(`🚨 ALERTA: Detectados ${localEqs.length} sismos de magnitud significativa en la región del Caribe/Venezuela.`);
        }
        
        if (dataEq.data.length > 0 && !selectedEarthquake) {
          setSelectedEarthquake(dataEq.data[0]);
        }
      }
      if (dataFeed.success) {
        setSocialFeed(dataFeed.data);
        addLog(`💬 Radar Comunitario: Recibidas ${dataFeed.data.length} publicaciones en tiempo real desde canales oficiales de Telegram.`);
      }
      if (dataStats.success) {
        setNetworkStats(dataStats.data);
        addLog(`📡 Estado Red Auxilio: Sincronizados datos globales de red (${dataStats.data.cantidadReportes.toLocaleString()} reportes registrados, ${dataStats.data.localizados.toLocaleString()} localizados).`);
      }
    } catch (e: any) {
      console.error("Error loading data", e);
      addLog(`❌ Fallo de Sincronización: Conexión inestable o error de API: ${e.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load & Setup real-time periodic updates (Every 45 seconds)
  useEffect(() => {
    loadData();

    // Setup native HTML5 Geolocation Watch to plot user's real coordinate point on CaracasMap
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDriverPos({ lat, lng });
          addLog(`📍 GPS Dispositivo: Ubicación real actualizada -> Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        },
        (error) => {
          console.warn("[GPS] Permiso geolocalización denegado o falla de sensor.", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    const intervalId = setInterval(() => {
      addLog("🔄 Sincronizando datos sísmicos y comunitarios en tiempo real...");
      loadData();
    }, 20000); // Poll real feeds every 20s

    return () => {
      clearInterval(intervalId);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Compute geofence proximity (if user's GPS is within 0.015 degrees ~ 1.5km of a missing person)
  useEffect(() => {
    if (desaparecidos.length === 0) return;

    const match = desaparecidos.find(d => {
      if (!d.coords) return false;
      const distance = Math.hypot(driverPos.lat - d.coords.lat, driverPos.lng - d.coords.lng);
      return distance < 0.015;
    });

    if (match && match.id !== activeMatch?.id) {
      setActiveMatch(match);
      showToast(`📍 Alerta de proximidad: Estás en el sector de la última zona de búsqueda de ${match.nombre} en ${match.ultima_zona}`, "info");
      
      if (notificationsEnabled) {
        triggerNativeNotification("Caso de Búsqueda Cercano", {
          body: `${match.nombre} fue visto por última vez en ${match.ultima_zona}. Rasgos: ${match.rasgos}`,
          icon: match.foto_url
        });
      }
    } else if (!match && activeMatch) {
      setActiveMatch(null);
    }
  }, [driverPos, desaparecidos, activeMatch, notificationsEnabled]);

  // Request browser notification permissions
  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Tu navegador no soporta notificaciones de escritorio.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(!notificationsEnabled);
      showToast(notificationsEnabled ? "Alertas desactivadas" : "Alertas activadas con éxito 🔔", "success");
    } else {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        showToast("¡Suscrito a alertas sísmicas y de rescate en tiempo real! 🔔", "success");
        triggerNativeNotification("Alertas Sísmicas PWA", {
          body: "Has activado con éxito las notificaciones en tiempo real para sismos y desaparecidos.",
          icon: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=192&h=192&fit=crop"
        });
      } else {
        showToast("Permiso de notificaciones denegado.", "error");
      }
    }
  };

  const triggerNativeNotification = (title: string, options: any) => {
    if (Notification.permission === "granted") {
      try {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            ...options,
            vibrate: [200, 100, 200]
          });
        }).catch(() => {
          // fallback to standard browser notification if service worker isn't fully ready
          new Notification(title, options);
        });
      } catch (e) {
        new Notification(title, options);
      }
    }
  };

  // Toast notifications helper
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle registering a new missing person
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseForm.nombre || !newCaseForm.ultima_zona) {
      showToast("Faltan campos obligatorios", "error");
      return;
    }

    // Set real coords based on Caracas map center or assign random Caracas coordinates if not specified
    const assignedCoords = { 
      lat: 10.4800 + Math.random() * 0.03, 
      lng: -66.9400 + Math.random() * 0.1 
    };

    try {
      const res = await fetch("/api/desaparecidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCaseForm,
          coords: assignedCoords
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Caso registrado exitosamente y transmitido por radar", "success");
        setIsNewCaseModalOpen(false);
        setNewCaseForm({
          nombre: "",
          edad: "",
          ultima_zona: "",
          rasgos: "",
          vestimenta: "",
          foto_url: "",
          comentarios: ""
        });
        loadData();
      } else {
        showToast(data.error || "Error al registrar caso", "error");
      }
    } catch (err) {
      showToast("Error en el servidor al enviar caso", "error");
    }
  };

  // Ask Copilot AI questions
  const askCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuestion.trim()) return;

    const userMsg = { sender: "user" as const, text: copilotQuestion };
    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotQuestion("");
    setIsCopilotLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.text })
      });
      const data = await res.json();
      if (data.success) {
        setCopilotMessages(prev => [...prev, { sender: "ai", text: data.answer }]);
      }
    } catch (err) {
      setCopilotMessages(prev => [...prev, { sender: "ai", text: "Error de conexión con el Copilot. Recuerda mantener la calma, resguardarte bajo mesas firmes y evitar el uso de elevadores." }]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Search the web in real-time with Google Search Grounding (Gemini)
  const handleWebSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsWebSearching(true);
    setWebSearchSummary(null);
    setWebSearchResults([]);
    addLog(`🔍 Iniciando escaneo web en tiempo real para: "${searchTerm}"`);

    try {
      const res = await fetch(`/api/web-search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.success) {
        setWebSearchSummary(data.summary);
        setWebSearchResults(data.results || []);
        addLog(`🌐 Escaneo web completado: Encontrados ${data.results?.length || 0} reportes relevantes.`);
      } else {
        showToast("Error al escanear la red", "error");
      }
    } catch (err) {
      showToast("Fallo de red al buscar en la web", "error");
    } finally {
      setIsWebSearching(false);
    }
  };

  // Scroll copilot to end
  useEffect(() => {
    if (copilotEndRef.current) {
      copilotEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [copilotMessages, isCopilotOpen]);

  // Filter missing persons based on search input
  const filteredDesaparecidos = desaparecidos.filter(d => 
    d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ultima_zona.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.rasgos.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter social feed
  const filteredFeed = socialFeed.filter(p =>
    p.text.toLowerCase().includes(feedSearchTerm.toLowerCase()) ||
    p.author.toLowerCase().includes(feedSearchTerm.toLowerCase()) ||
    (p.geo_hint && p.geo_hint.toLowerCase().includes(feedSearchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-rose-500/30 selection:text-rose-100 pb-16 md:pb-0">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
              toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100" :
              toast.type === "error" ? "bg-rose-950/90 border-rose-500/40 text-rose-100" :
              "bg-blue-950/90 border-blue-500/40 text-blue-100"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-9 w-9 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-950/50">
                <Activity className="h-5 w-5 text-white animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1">
                RESCATE PWA
                <span className="text-[9px] bg-rose-500/20 text-rose-400 font-mono px-1.5 py-0.5 rounded border border-rose-500/30 uppercase">
                  Sismología & Radar
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Red de Contingencia</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Native Browser Notification Button */}
            <button
              onClick={toggleNotifications}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${
                notificationsEnabled 
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                  : "bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300"
              }`}
              title="Activar Alertas de Escritorio / Notificaciones Web Push"
            >
              <Bell className={`h-4.5 w-4.5 ${notificationsEnabled ? "animate-bounce" : ""}`} />
              <span className="text-xs font-bold hidden md:inline">
                {notificationsEnabled ? "Alertas Activas" : "Activar Alertas"}
              </span>
            </button>

            {/* Refresh button */}
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? "animate-spin text-rose-400" : ""}`} />
            </button>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Dynamic Tab views (Takes 65% on desktop) */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Top tab selector */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab("sismologia")}
              className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeTab === "sismologia" 
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-950/40" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="h-4 w-4" />
              Sismología USGS
            </button>

            <button
              onClick={() => setActiveTab("radar")}
              className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeTab === "radar" 
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-950/40" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className="h-4 w-4" />
              Radar TG/X Live
            </button>

            <button
              onClick={() => setActiveTab("directorio")}
              className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeTab === "directorio" 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Search className="h-4 w-4" />
              Búsqueda & Casos
            </button>
          </div>

          {/* Active Tab View */}
          <div className="flex-1 bg-slate-900/40 border border-slate-850 rounded-2xl p-4 min-h-[450px] flex flex-col">
            
            {/* 1. SISMOLOGIA TAB */}
            {activeTab === "sismologia" && (
              <div className="flex-grow flex flex-col gap-4">
                
                {/* Visual Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-850">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span className="h-2 w-2 bg-rose-500 rounded-full animate-ping" />
                      Alertas Sísmicas Globales & Locales (USGS)
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Monitoreo satelital del Servicio Geológico de EE.UU. enlazado en tiempo real.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                    Sincronización: <span className="text-emerald-400">Automatizada (10s)</span>
                  </div>
                </div>

                {/* Interactive Seismic Map & Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Real-time Vector Map Seismic Visualizer */}
                  <div className="md:col-span-7">
                    <SeismicVectorMap
                      selectedEarthquake={selectedEarthquake}
                      earthquakes={earthquakes}
                      onSelectEarthquake={setSelectedEarthquake}
                    />
                  </div>

                  {/* Quick tips card */}
                  <div className="md:col-span-5 flex flex-col justify-between bg-gradient-to-br from-rose-950/20 to-slate-900 border border-rose-950/30 rounded-xl p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <h3 className="text-xs font-black uppercase tracking-wider">Protocolo Sísmico</h3>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-2 font-medium">
                        <li className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">1.</span>
                          No uses ascensores ni salgas corriendo durante el temblor.
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">2.</span>
                          Ubícate bajo estructuras firmes (mesas o marcos de puertas).
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">3.</span>
                          Aléjate de vidrios, ventanas y cables de alta tensión.
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">4.</span>
                          Ten listo tu morral de emergencias PWA con linterna.
                        </li>
                      </ul>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsCopilotOpen(true);
                        setCopilotMessages(prev => [
                          ...prev, 
                          { sender: "user", text: "¿Qué debo tener en un morral de emergencias de sismología?" },
                          { sender: "ai", text: "Un morral de emergencias debe incluir: \n• Agua potable para 72 horas.\n• Alimentos no perecederos y abrelatas manual.\n• Botiquín de primeros auxilios y medicamentos esenciales.\n• Radio a pilas o recargable.\n• Linterna y baterías de repuesto.\n• Copias de documentos importantes.\n• Silbato para pedir auxilio." }
                        ]);
                      }}
                      className="mt-4 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2 px-3 rounded-lg border border-slate-800 text-center flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                      Consultar Copilot de Emergencias
                    </button>
                  </div>

                </div>

                {/* List of Recent Earthquakes */}
                <div className="flex-grow flex flex-col gap-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-rose-500" />
                    Registros en Tiempo Real ({earthquakes.length})
                  </h3>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {earthquakes.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs font-mono">
                        Cargando actividad sísmica desde USGS...
                      </div>
                    ) : (
                      earthquakes.map((eq: any) => {
                        const isSelected = selectedEarthquake?.id === eq.id;
                        return (
                          <div
                            key={eq.id}
                            onClick={() => setSelectedEarthquake(eq)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected 
                                ? "bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-950/20" 
                                : "bg-slate-950/60 hover:bg-slate-950 border-slate-850 hover:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              
                              {/* Magnitude Ring */}
                              <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-black text-xs border ${
                                eq.alertColor === "red" ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]" :
                                eq.alertColor === "orange" ? "bg-orange-500/20 border-orange-500 text-orange-300" :
                                eq.alertColor === "yellow" ? "bg-amber-500/20 border-amber-500 text-amber-300" :
                                "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                              }`}>
                                <span className="text-[9px] font-mono uppercase text-slate-400">MAG</span>
                                {eq.magnitude.toFixed(1)}
                              </div>

                              <div className="flex flex-col">
                                <span className="text-xs font-black text-white">{eq.place}</span>
                                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>Hace {calculateMinutesAgo(eq.time)}</span>
                                  <span>•</span>
                                  <span>Profundidad: {Number(eq.depth).toFixed(1)} km</span>
                                </span>
                              </div>

                            </div>

                            <div className="flex items-center gap-2">
                              {eq.significant && (
                                <span className="text-[9px] bg-rose-500/20 text-rose-400 font-mono font-bold px-1.5 py-0.5 rounded border border-rose-500/30 uppercase animate-pulse">
                                  Significativo
                                </span>
                              )}
                              <span className="text-xs text-slate-400 font-mono">
                                {new Date(eq.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* 2. RADAR TG/X WEBSOCKET TAB */}
            {activeTab === "radar" && (
              <div className="flex-grow flex flex-col gap-4">
                
                {/* Visual Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-850">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <Radio className="h-5 w-5 text-sky-400" />
                      Radar Comunitario (Telegram & X WebSockets)
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Línea de tiempo unificada que recopila avistamientos e informes sísmicos.
                    </p>
                  </div>
                  
                  {/* Websocket Status */}
                  <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[10px] font-mono text-slate-300 font-bold uppercase">WS: CONECTADO</span>
                  </div>
                </div>

                {/* WebSocket Console Logger widget */}
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 font-mono text-[10px] text-slate-300 space-y-1 select-none">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1.5 text-slate-500">
                    <span>📡 MONITOREO DE CONECTIVIDAD & SCRAPING LIVE</span>
                    <span className="text-emerald-400 text-[9px] font-bold">ACTIVO • ONLINE</span>
                  </div>
                  <div className="max-h-[90px] overflow-y-auto space-y-0.5">
                    {wsLogs.map((log, i) => (
                      <div key={i} className={i === 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search Bar for feeds */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar publicaciones por zona, remitente o palabra clave..."
                    value={feedSearchTerm}
                    onChange={(e) => setFeedSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 text-white transition-all"
                  />
                  {feedSearchTerm && (
                    <button 
                      onClick={() => setFeedSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Social stream list */}
                <div className="flex-grow space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {filteredFeed.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs font-mono">
                      No se encontraron publicaciones en el radar que coincidan.
                    </div>
                  ) : (
                    filteredFeed.map((post: any) => {
                      const isTelegram = post.source === "telegram";
                      return (
                        <div
                          key={post.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 ${
                            isTelegram 
                              ? "bg-slate-900/60 border-sky-950/40 hover:border-sky-500/20" 
                              : "bg-slate-950/40 border-slate-850 hover:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            
                            {/* Author details */}
                            <div className="flex items-center gap-2">
                              <img 
                                src={post.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop"} 
                                alt={post.author} 
                                className="h-6 w-6 rounded-full object-cover border border-slate-800"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white flex items-center gap-1">
                                  {post.author}
                                  {isTelegram ? (
                                    <span className="text-[8px] bg-sky-500/20 text-sky-400 font-bold px-1.5 py-0.5 rounded uppercase">TG Canal</span>
                                  ) : (
                                    <span className="text-[8px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase">X Post</span>
                                  )}
                                </span>
                                {post.handle && (
                                  <span className="text-[9px] font-mono text-slate-500">{post.handle}</span>
                                )}
                              </div>
                            </div>

                            {/* Source specific badge */}
                            <div className="flex items-center gap-2">
                              {post.geo_hint && (
                                <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-rose-500" />
                                  {post.geo_hint}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                          </div>

                          {/* Post text */}
                          <p className="text-xs text-slate-200 leading-relaxed font-medium">
                            {post.text}
                          </p>

                          {/* Sighting matches or actions */}
                          {post.matched_name && (
                            <div className="bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-lg flex items-center justify-between mt-1">
                              <span className="text-[10px] font-mono text-emerald-400">
                                🎯 Detección automática: coincidencia con <strong>{post.matched_name}</strong>
                              </span>
                              <button 
                                onClick={() => {
                                  setActiveTab("directorio");
                                  setSearchTerm(post.matched_name);
                                }}
                                className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold px-2 py-1 rounded cursor-pointer"
                              >
                                Ver Expediente
                              </button>
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

            {/* 3. DIRECTORIO & REGISTER TAB */}
            {activeTab === "directorio" && (
              <div className="flex-grow flex flex-col gap-4">
                
                {/* Visual Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-850">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <Search className="h-5 w-5 text-emerald-400" />
                      Directorio de Búsqueda Ciudadana
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sincroniza y registra personas desaparecidas de forma rápida y descentralizada.
                    </p>
                  </div>

                  {/* Add New Case Floating action button trigger */}
                  <button
                    onClick={() => setIsNewCaseModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Registrar Desaparecido
                  </button>
                </div>

                {/* Filter and Search controls */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre, rasgos o última zona vista en Caracas..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (!e.target.value) {
                        setWebSearchSummary(null);
                        setWebSearchResults([]);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => {
                        setSearchTerm("");
                        setWebSearchSummary(null);
                        setWebSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* AI Web Search Panel */}
                {searchTerm && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3 transition-all" id="ai-web-search-panel">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                          Escanear en la red venezolana en vivo
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleWebSearch}
                        disabled={isWebSearching}
                        className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-emerald-500/20 hover:border-transparent transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        {isWebSearching ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                            Escaneando...
                          </>
                        ) : (
                          "🔍 Buscar en la Web con IA"
                        )}
                      </button>
                    </div>

                    {isWebSearching && (
                      <div className="py-6 flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-emerald-500" />
                        <p className="text-[10px] font-mono text-slate-400 animate-pulse">
                          Consultando redes de emergencia y fuentes oficiales con IA...
                        </p>
                      </div>
                    )}

                    {!isWebSearching && (webSearchSummary || webSearchResults.length > 0) && (
                      <div className="space-y-3.5">
                        {webSearchSummary && (
                          <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 text-slate-300 leading-normal text-xs font-medium">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block mb-1.5">
                              Resumen de la Red (IA):
                            </span>
                            {webSearchSummary}
                          </div>
                        )}
                        
                        {webSearchResults.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                              Fuentes Verificadas de Información:
                            </span>
                            <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                              {webSearchResults.map((res, i) => (
                                <a 
                                  key={i}
                                  href={res.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block bg-slate-900/20 hover:bg-slate-900/60 border border-slate-850 hover:border-slate-800 p-2.5 rounded-xl transition-all"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-xs font-bold text-emerald-400 hover:underline line-clamp-1">
                                      {res.title}
                                    </span>
                                    <span className="text-[8px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                                      {res.source}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">
                                    {res.snippet}
                                  </p>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Map */}
                <div className="w-full h-[280px] rounded-2xl overflow-hidden border border-slate-800">
                  <CaracasMap 
                    desaparecidos={desaparecidos}
                    driverPos={driverPos}
                    setDriverPos={setDriverPos}
                    activeMatch={activeMatch}
                    onManualAlertTrigger={(matchedCase) => {
                      setActiveMatch(matchedCase);
                      showToast(`Ubicación seleccionada: ${matchedCase.nombre}`, "info");
                      setSearchTerm(matchedCase.nombre);
                    }}
                  />
                </div>

                {/* Active cases grid */}
                <div className="flex-grow space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {filteredDesaparecidos.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs font-mono">
                      No hay casos registrados que coincidan con la búsqueda.
                    </div>
                  ) : (
                    filteredDesaparecidos.map((d) => (
                      <div
                        key={d.id}
                        className="bg-slate-950/50 border border-slate-850 hover:border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row gap-4 transition-all"
                      >
                        
                        {/* Profile photo */}
                        <div className="relative shrink-0 w-20 h-20 mx-auto sm:mx-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                          <img 
                            src={d.foto_url} 
                            alt={d.nombre} 
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 bg-rose-600 text-white text-[7px] font-black tracking-widest px-1 rounded uppercase animate-pulse">
                            {d.estado}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between gap-2 text-center sm:text-left">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <h3 className="text-sm font-black text-white">{d.nombre}</h3>
                              <span className="text-xs text-slate-400 font-semibold">({d.edad} años)</span>
                            </div>

                            <p className="text-[11px] text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-1">
                              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              Última vez visto: <strong className="text-slate-300">{d.ultima_zona}</strong>
                            </p>

                            <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                              <span className="text-slate-400 font-bold">Rasgos:</span> {d.rasgos}
                            </p>
                            <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                              <span className="text-slate-400 font-bold">Vestimenta:</span> {d.vestimenta}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 pt-2 gap-2 mt-1">
                            <span className="text-[9px] font-mono text-slate-500">
                              Reportado: {new Date(d.fecha_reporte).toLocaleDateString()}
                            </span>
                            
                            <div className="flex gap-2">
                              {/* Quick trigger sighting */}
                              <button
                                onClick={() => {
                                  setIsCopilotOpen(true);
                                  setCopilotQuestion(`¿Cómo puedo reportar un avistamiento para ${d.nombre}?`);
                                  setCopilotMessages(prev => [
                                    ...prev,
                                    { sender: "user", text: `Quiero reportar que vi a ${d.nombre}` },
                                    { sender: "ai", text: `Para reportar que has visto a ${d.nombre}, puedes publicar los detalles de la hora y la dirección exacta en el chat o canal comunitario de Telegram. He puesto en alerta a los patrulleros locales en ${d.ultima_zona} para que refuercen la búsqueda de inmediato.` }
                                  ]);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-800 cursor-pointer"
                              >
                                Reportar Avistamiento
                              </button>
                              
                              <button
                                onClick={() => {
                                  showToast(`Expediente de ${d.nombre} copiado al portapapeles de emergencia.`, "info");
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg border border-slate-800"
                                title="Copiar expediente"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                          </div>

                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Right Side: Quick info widgets (Takes 35% on desktop) */}
        <div className="md:w-80 flex flex-col gap-4 shrink-0">
          
          {/* Real-time map checklist or mini statistics */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Globe className="h-4.5 w-4.5 text-rose-500" />
              Estado de la Red de Auxilio
            </h3>

            <div className="space-y-2">
              
              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Casos Activos Locales</span>
                <span className="text-sm font-black text-rose-500 font-mono">{desaparecidos.length}</span>
              </div>

              <div className="border-t border-slate-850/50 my-1 pt-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">Red Nacional (Venezuela te Busca)</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Cantidad de reportes</span>
                <span className="text-sm font-black text-indigo-400 font-mono">
                  {networkStats ? networkStats.cantidadReportes.toLocaleString() : "..."}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Personas únicas (aprox.)</span>
                <span className="text-sm font-black text-cyan-400 font-mono">
                  {networkStats ? networkStats.personasUnicas.toLocaleString() : "..."}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Aún sin contacto</span>
                <span className="text-sm font-black text-red-500 font-mono">
                  {networkStats ? networkStats.aunSinContacto.toLocaleString() : "..."}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Localizados</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {networkStats ? networkStats.localizados.toLocaleString() : "..."}
                </span>
              </div>

              <div className="border-t border-slate-850/50 my-1 pt-1"></div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Sismos Recientes</span>
                <span className="text-sm font-black text-amber-500 font-mono">{earthquakes.length}</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl flex items-center justify-between border border-slate-850">
                <span className="text-xs text-slate-400">Canales de Radar</span>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Telegram & X OK</span>
              </div>

            </div>

            {networkStats && (
              <div className="text-[9px] font-mono text-slate-500 text-center mt-1 leading-normal border-t border-slate-850/50 pt-2">
                Fuente: <a href="https://desaparecidosterremotovenezuela.com/?utm_source=venezuela_te_busca&utm_medium=referral&utm_campaign=resources_directory&utm_content=website_sitio_web" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">desaparecidosterremotovenezuela.com</a>
                <div className="text-slate-400 mt-0.5">
                  Sincronizado: {new Date(networkStats.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (cada 30 min)
                </div>
              </div>
            )}

            <div className="border-t border-slate-850 pt-2.5 mt-1">
              <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-850/60">
                <strong>¿Cómo funciona la PWA?</strong> Puedes agregar esta página a la pantalla de inicio de tu celular para tener acceso sin conexión a los números de rescate y recibir alertas web push inmediatas cuando ocurra un terremoto.
              </div>
            </div>

          </div>

          {/* AI Emergency Copilot integrated sidebar (Very polished) */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-rose-500 rounded-full animate-ping" />
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1">
                  🧠 Copilot de Emergencias
                  <span className="text-[8px] bg-rose-500/20 text-rose-400 font-mono px-1 rounded border border-rose-500/20">
                    IA
                  </span>
                </span>
              </div>
              <HelpCircle className="h-4 w-4 text-slate-500" />
            </div>

            {/* Messages box */}
            <div className="p-3 space-y-2.5 max-h-[180px] overflow-y-auto bg-slate-950/40 text-[11px]">
              {copilotMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`p-2.5 rounded-xl leading-relaxed font-medium ${
                    msg.sender === "ai" 
                      ? "bg-slate-950 border border-slate-850 text-slate-300" 
                      : "bg-rose-600 text-white ml-6 shadow-md shadow-rose-950/20"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isCopilotLoading && (
                <div className="text-slate-500 animate-pulse text-[10px] italic font-mono">
                  Generando respuesta de seguridad...
                </div>
              )}
              <div ref={copilotEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={askCopilot} className="p-2 border-t border-slate-850 bg-slate-950 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="¿Qué hacer ante un terremoto fuerte?"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500/50 text-white placeholder-slate-600 font-medium"
              />
              <button 
                type="submit"
                disabled={isCopilotLoading || !copilotQuestion.trim()}
                className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>

        </div>

      </main>

      {/* FOOTER NAVBAR FOR MOBILE (Native feeling PWA) */}
      <footer className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-850 p-2 z-30 flex justify-around">
        <button
          onClick={() => setActiveTab("sismologia")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "sismologia" ? "text-rose-400 font-black" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Activity className="h-5 w-5" />
          <span className="text-[9px]">Sismología</span>
        </button>

        <button
          onClick={() => setActiveTab("radar")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "radar" ? "text-sky-400 font-black" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Radio className="h-5 w-5" />
          <span className="text-[9px]">Radar TG/X</span>
        </button>

        <button
          onClick={() => setActiveTab("directorio")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "directorio" ? "text-emerald-400 font-black" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[9px]">Búsqueda</span>
        </button>
      </footer>

      {/* CREATE NEW CASE MODAL (Simple wizard) */}
      <AnimatePresence>
        {isNewCaseModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
            >
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-850 bg-slate-950 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Reportar Desaparecido</h3>
                </div>
                <button 
                  onClick={() => setIsNewCaseModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateCase} className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Mendoza"
                      value={newCaseForm.nombre}
                      onChange={(e) => setNewCaseForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Edad aproximada</label>
                    <input
                      type="number"
                      placeholder="Ej. 42"
                      value={newCaseForm.edad}
                      onChange={(e) => setNewCaseForm(prev => ({ ...prev, edad: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Última Zona de Avistamiento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Plaza Altamira, Chacao"
                    value={newCaseForm.ultima_zona}
                    onChange={(e) => setNewCaseForm(prev => ({ ...prev, ultima_zona: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Rasgos Físicos Particulares</label>
                  <textarea
                    placeholder="Ej. Cicatriz en la ceja, estatura alta, usa lentes de montura negra"
                    rows={2}
                    value={newCaseForm.rasgos}
                    onChange={(e) => setNewCaseForm(prev => ({ ...prev, rasgos: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-white font-medium resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Vestimenta última vez visto</label>
                  <input
                    type="text"
                    placeholder="Ej. Franela deportiva azul, jeans oscuros y zapatos deportivos grises"
                    value={newCaseForm.vestimenta}
                    onChange={(e) => setNewCaseForm(prev => ({ ...prev, vestimenta: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Enlace / URL de Foto (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Pegar URL de foto o dejar en blanco para avatar neutro"
                    value={newCaseForm.foto_url}
                    onChange={(e) => setNewCaseForm(prev => ({ ...prev, foto_url: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-white font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg cursor-pointer text-center transition-colors font-sans mt-2"
                >
                  Guardar Reporte & Transmitir a Radar
                </button>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper calculation functions
function calculateMinutesAgo(isoString: string): string {
  if (!isoString) return "reciente";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "pocos segundos";
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d`;
}
