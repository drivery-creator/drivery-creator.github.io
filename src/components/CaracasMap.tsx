import React, { useState } from "react";
import { MapPin, Navigation, Compass, Radio, Map as MapIcon } from "lucide-react";
import { Desaparecido } from "../types";

interface CaracasMapProps {
  desaparecidos: Desaparecido[];
  driverPos: { lat: number; lng: number };
  setDriverPos: (pos: { lat: number; lng: number }) => void;
  activeMatch: Desaparecido | null;
  onManualAlertTrigger: (matchedCase: Desaparecido) => void;
}

// Bounding box of Caracas for coordinates conversion
const LAT_MIN = 10.4700;
const LAT_MAX = 10.5150;
const LNG_MIN = -66.9700;
const LNG_MAX = -66.8300;

export default function CaracasMap({
  desaparecidos,
  driverPos,
  setDriverPos,
  activeMatch,
  onManualAlertTrigger
}: CaracasMapProps) {
  const [mapMode, setMapMode] = useState<"dark" | "satellite">("dark");

  const routePoints = [
    { name: "Catia (Estación Plaza Sucre)", lat: 10.5050, lng: -66.9530 },
    { name: "Maternidad / Av. San Martín", lat: 10.4938, lng: -66.9412 },
    { name: "Plaza Madariaga, El Paraíso", lat: 10.4851, lng: -66.9324 },
    { name: "Chacao / Plaza Altamira", lat: 10.4962, lng: -66.8523 }
  ];

  // Map lat/lng coordinates directly to SVG space (1000x550)
  const getSvgCoords = (lat: number, lng: number) => {
    const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 1000;
    // Y-axis is inverted in SVG (top is LAT_MAX)
    const y = 550 - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 550;
    return { x, y };
  };

  // Convert click on SVG back to lat/lng for manual GPS teleport/inspection
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const relX = clickX / rect.width;
    const relY = clickY / rect.height;

    const clickedLng = LNG_MIN + relX * (LNG_MAX - LNG_MIN);
    const clickedLat = LAT_MIN + (1 - relY) * (LAT_MAX - LAT_MIN);

    setDriverPos({ lat: clickedLat, lng: clickedLng });
  };

  const carCoords = getSvgCoords(driverPos.lat, driverPos.lng);

  // Caracas pilot geofence boundaries coordinates mapping
  const geofences = [
    { name: "Catia", lat: 10.5050, lng: -66.9530, radius: 0.012, color: "rgba(239, 68, 68, 0.12)", border: "#ef4444" },
    { name: "San Martín", lat: 10.4938, lng: -66.9412, radius: 0.012, color: "rgba(249, 115, 22, 0.12)", border: "#f97316" },
    { name: "El Paraíso", lat: 10.4851, lng: -66.9324, radius: 0.014, color: "rgba(168, 85, 247, 0.12)", border: "#a855f7" },
    { name: "Chacao", lat: 10.4962, lng: -66.8523, radius: 0.012, color: "rgba(59, 130, 246, 0.12)", border: "#3b82f6" }
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="caracas-map-real">
      {/* Map Control Bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-850 flex flex-wrap gap-4 items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1">
              Mapa de Cobertura Caracas
            </h3>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Inspector: {driverPos.lat.toFixed(4)}°N | {driverPos.lng.toFixed(4)}°W • Clic para reposicionar
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex gap-1">
            <button
              onClick={() => setMapMode("dark")}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                mapMode === "dark" ? "bg-slate-850 text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Vectorial
            </button>
            <button
              onClick={() => setMapMode("satellite")}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                mapMode === "satellite" ? "bg-slate-850 text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Satélite
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Stage */}
      <div className="relative bg-slate-950 min-h-[220px] overflow-hidden select-none">
        
        {mapMode === "satellite" && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950/90 to-slate-950 opacity-40 mix-blend-overlay pointer-events-none" />
        )}

        <svg
          viewBox="0 0 1000 550"
          className="w-full h-full cursor-crosshair opacity-95 transition-all"
          onClick={handleMapClick}
        >
          {/* Map Grid Patterns */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.12)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="550" fill="url(#mapGrid)" />

          {/* El Ávila Mountains contour */}
          <path
            d="M 0 80 Q 150 40 300 110 T 600 70 T 900 120 T 1000 90 L 1000 0 L 0 0 Z"
            fill="rgba(15, 23, 42, 0.7)"
            stroke="rgba(51, 65, 85, 0.3)"
            strokeWidth="1"
          />
          <text x="500" y="30" fill="rgba(148, 163, 184, 0.2)" fontSize="10" fontFamily="monospace" textAnchor="middle" letterSpacing="3">
            ▲ CORDILLERA DE LA COSTA (EL ÁVILA)
          </text>

          {/* Rio Guaire Flow */}
          <path
            d="M 50 480 Q 200 450 350 410 T 650 350 T 950 340"
            fill="none"
            stroke="rgba(30, 58, 138, 0.3)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Major Highway: Autopista Francisco Fajardo */}
          <path
            d="M 20 280 Q 150 320 280 340 T 500 320 T 750 260 T 980 230"
            fill="none"
            stroke="rgba(71, 85, 105, 0.4)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Caracas Grid Zones Labels & Boundaries */}
          {geofences.map((gf) => {
            const { x, y } = getSvgCoords(gf.lat, gf.lng);
            const rSvg = (gf.radius / (LNG_MAX - LNG_MIN)) * 1000;
            const isDriverInside = Math.hypot(driverPos.lat - gf.lat, driverPos.lng - gf.lng) < gf.radius;

            return (
              <g key={gf.name}>
                <circle
                  cx={x}
                  cy={y}
                  r={rSvg}
                  fill={isDriverInside ? "rgba(16, 185, 129, 0.08)" : gf.color}
                  stroke={isDriverInside ? "#10b981" : gf.border}
                  strokeWidth={isDriverInside ? 2 : 1}
                  className={isDriverInside ? "animate-pulse" : ""}
                />

                {isDriverInside && (
                  <circle
                    cx={x}
                    cy={y}
                    r={rSvg + 15}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    opacity="0.3"
                    className="animate-ping"
                    style={{ animationDuration: "3s" }}
                  />
                )}

                <rect
                  x={x - 40}
                  y={y - rSvg - 10}
                  width="80"
                  height="16"
                  rx="3"
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={isDriverInside ? "#10b981" : "rgba(148, 163, 184, 0.2)"}
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - rSvg}
                  fill={isDriverInside ? "#34d399" : "#cbd5e1"}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {gf.name}
                </text>
              </g>
            );
          })}

          {/* Active Missing Persons case pins */}
          {desaparecidos.map((item) => {
            if (!item.coords) return null;
            const { x, y } = getSvgCoords(item.coords.lat, item.coords.lng);
            const isMatched = activeMatch?.id === item.id;

            return (
              <g
                key={item.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onManualAlertTrigger(item);
                }}
              >
                <circle cx={x} cy={y} r="20" fill="transparent" />

                {isMatched && (
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="2"
                    className="animate-ping"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isMatched ? "7" : "5"}
                  fill={isMatched ? "#ef4444" : "#f97316"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                
                <text
                  x={x}
                  y={y + 14}
                  fill="#f97316"
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {item.nombre.split(" ")[0]}
                </text>

                <title>{`${item.nombre} - Última zona: ${item.ultima_zona}`}</title>
              </g>
            );
          })}

          {/* Inspector's/User's GPS coordinate indicator */}
          <g transform={`translate(${carCoords.x}, ${carCoords.y})`}>
            <circle
              cx="0"
              cy="0"
              r="24"
              fill="rgba(16, 185, 129, 0.08)"
              stroke="rgba(16, 185, 129, 0.3)"
              strokeWidth="1"
              className="animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <circle
              cx="0"
              cy="0"
              r="10"
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10b981"
              strokeWidth="1.5"
            />
            <polygon
              points="0,-6 4,3 -4,3"
              fill="#ffffff"
            />
          </g>
        </svg>

        {/* Floating Instruction overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-850 px-2 py-1.5 rounded-lg flex items-center gap-1.5 max-w-[260px]">
          <Navigation className="h-3 w-3 text-emerald-400 shrink-0" />
          <p className="text-[9px] text-slate-300 leading-normal">
            Haz clic en el mapa para mover la posición de monitoreo y escanear coincidencias.
          </p>
        </div>

        <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-850 px-2 py-1 rounded flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
            GPS Live Ciudadano
          </span>
        </div>
      </div>

      {/* Control shortcuts */}
      <div className="p-3 bg-slate-950 border-t border-slate-850">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
          Centrar Inspector en Áreas de Búsqueda
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {routePoints.map((pt, i) => {
            const isActive = Math.hypot(driverPos.lat - pt.lat, driverPos.lng - pt.lng) < 0.003;
            return (
              <button
                key={i}
                onClick={() => {
                  setDriverPos({ lat: pt.lat, lng: pt.lng });
                }}
                className={`text-[10px] px-2 py-1 rounded font-bold transition-all border cursor-pointer ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                📍 {pt.name.split(" (")[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
