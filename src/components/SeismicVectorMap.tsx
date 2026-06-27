import React, { useState } from "react";
import { Globe, Activity, Compass, AlertTriangle, Info, MapPin } from "lucide-react";

interface SeismicGoogleMapProps {
  selectedEarthquake: any | null;
  earthquakes: any[];
  onSelectEarthquake: (eq: any) => void;
}

// Bounding box for mapping coordinates to SVG (800x400)
// Longitude: -180 to 180 -> Width: 800
// Latitude: -60 to 80 -> Height: 400
const getSvgCoords = (lat: number, lng: number) => {
  const clampedLat = Math.max(-60, Math.min(80, Number(lat) || 0));
  const clampedLng = Math.max(-180, Math.min(180, Number(lng) || 0));
  
  const x = ((clampedLng + 180) / 360) * 800;
  const y = 400 - ((clampedLat + 60) / 140) * 400;
  return { x, y };
};

export default function SeismicGoogleMap({
  selectedEarthquake,
  earthquakes,
  onSelectEarthquake
}: SeismicGoogleMapProps) {
  const [hoveredEq, setHoveredEq] = useState<any | null>(null);

  // Simplified vector polygons representing continents on an 800x400 coordinate canvas
  const continents = [
    {
      name: "North America",
      points: "100,80 150,70 250,80 240,150 180,180 150,220 140,220 120,180 100,120"
    },
    {
      name: "South America",
      points: "150,220 180,230 210,260 210,300 180,360 170,380 160,350 150,280 140,240"
    },
    {
      name: "Eurasia",
      points: "320,80 350,60 450,60 650,60 750,80 720,150 650,180 550,150 450,150 380,120 340,110"
    },
    {
      name: "Africa",
      points: "380,160 440,165 480,200 480,240 440,300 420,340 400,320 380,260 360,200"
    },
    {
      name: "Australia",
      points: "650,280 700,280 720,320 680,340 640,310"
    },
    {
      name: "Greenland",
      points: "230,40 270,45 250,70"
    }
  ];

  // Stylized plates boundaries (Cinturón de fuego, Mid-Atlantic, etc.)
  const plateBoundaries = [
    // Cinturón de Fuego del Pacífico (Ring of Fire)
    "150,370 145,300 140,240 135,180 115,80 210,65 300,55 450,55 580,70 680,80 720,150 710,240 700,280 640,310 610,380",
    // Mid-Atlantic Ridge
    "260,40 280,120 310,200 300,300 330,380",
    // Caribbean Plate boundary
    "145,220 220,220 220,245 148,245"
  ];

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col" id="seismic-radar-map-parent">
      
      {/* Header Panel */}
      <div className="p-3 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-rose-500 animate-spin" style={{ animationDuration: "12s" }} />
              Mapa de Sismología Global
            </h3>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Localización vectorial USGS • Conexión offline-ready • Sin rastreadores de terceros
          </p>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 bg-slate-900 px-2 py-1 rounded border border-slate-850 text-[9px] font-mono">
          <span className="text-slate-500">Intensidad:</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> ≥6.0</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span> 5.0-5.9</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> 4.0-4.9</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Minor</span>
        </div>
      </div>

      {/* Main Vector Map Stage */}
      <div className="relative bg-slate-950 overflow-hidden select-none" style={{ aspectRatio: "2/1" }}>
        
        {/* Decorative Grid overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950/90 to-slate-950 opacity-60 pointer-events-none" />

        <svg
          viewBox="0 0 800 400"
          className="w-full h-full cursor-crosshair opacity-90 transition-all"
        >
          {/* Fine technical grids */}
          <defs>
            <pattern id="seismicGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#seismicGrid)" />

          {/* Equator & Meridian line markers */}
          <line x1="0" y1="200" x2="800" y2="200" stroke="rgba(244, 63, 94, 0.15)" strokeWidth="1" strokeDasharray="5,5" />
          <line x1="400" y1="0" x2="400" y2="400" stroke="rgba(244, 63, 94, 0.15)" strokeWidth="1" strokeDasharray="5,5" />
          
          <text x="12" y="196" fill="rgba(148, 163, 184, 0.25)" fontSize="8" fontFamily="monospace">ECUADOR</text>
          <text x="396" y="390" fill="rgba(148, 163, 184, 0.25)" fontSize="8" fontFamily="monospace" textAnchor="end">MERIDIANO DE GREENWICH</text>

          {/* Continents Outlines */}
          {continents.map((continent) => (
            <polygon
              key={continent.name}
              points={continent.points}
              fill="rgba(30, 41, 59, 0.4)"
              stroke="rgba(71, 85, 105, 0.4)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          ))}

          {/* Tectonic Plate Boundaries */}
          {plateBoundaries.map((boundary, i) => (
            <polyline
              key={i}
              points={boundary}
              fill="none"
              stroke="rgba(239, 68, 68, 0.25)"
              strokeWidth="1.2"
              strokeDasharray="4,4"
            />
          ))}

          {/* Plotted Earthquakes */}
          {earthquakes.map((eq) => {
            const lat = Number(eq.latitude);
            const lng = Number(eq.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            const { x, y } = getSvgCoords(lat, lng);
            const isSelected = selectedEarthquake?.id === eq.id;
            const isHovered = hoveredEq?.id === eq.id;
            
            // Proportional sizing
            const magnitude = Number(eq.magnitude) || 3.0;
            const radius = isSelected ? 8 + magnitude * 1.5 : 3 + magnitude * 1.2;

            // Warning colors
            let pinColor = "rgba(16, 185, 129, 0.85)"; // green
            let strokeColor = "#10b981";
            if (eq.alertColor === "red") {
              pinColor = "rgba(244, 63, 94, 0.85)";
              strokeColor = "#f43f5e";
            } else if (eq.alertColor === "orange") {
              pinColor = "rgba(249, 115, 22, 0.85)";
              strokeColor = "#f97316";
            } else if (eq.alertColor === "yellow") {
              pinColor = "rgba(245, 158, 11, 0.85)";
              strokeColor = "#f59e0b";
            }

            return (
              <g
                key={eq.id}
                className="cursor-pointer group"
                onClick={() => onSelectEarthquake(eq)}
                onMouseEnter={() => setHoveredEq(eq)}
                onMouseLeave={() => setHoveredEq(null)}
              >
                {/* Active epicenter pulse waves */}
                {isSelected && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r={radius * 2.8}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="1"
                      className="animate-ping"
                      style={{ animationDuration: "2.5s" }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={radius * 1.8}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="1"
                      className="animate-pulse"
                    />
                  </>
                )}

                {/* Sismo Marker dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={pinColor}
                  stroke={isSelected || isHovered ? "#ffffff" : strokeColor}
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                  className="transition-all duration-300"
                />

                {/* Interactive Tooltip (simulated standard SVG title fallback) */}
                <title>{`${eq.place} (M ${magnitude.toFixed(1)})`}</title>
              </g>
            );
          })}
        </svg>

        {/* Floating Instruction overlay */}
        <div className="absolute bottom-2 left-2 bg-slate-950/90 border border-slate-850 px-2 py-1 rounded-lg flex items-center gap-1.5 max-w-[280px]">
          <Info className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <p className="text-[9px] text-slate-300 leading-normal">
            Los sismos se grafican de forma nativa. Haz clic en un sismo del mapa o de la lista para enfocar el epicentro.
          </p>
        </div>

        {/* Selected or Hovered details tooltip inside map */}
        {(selectedEarthquake || hoveredEq) && (
          <div className="absolute top-2 right-2 bg-slate-950/95 border border-slate-800 p-2 rounded-lg max-w-[200px] shadow-2xl backdrop-blur-sm">
            {(() => {
              const eq = hoveredEq || selectedEarthquake;
              let alertText = "Minor";
              let colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
              if (eq.alertColor === "red") {
                alertText = "Fuerte / Peligroso";
                colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
              } else if (eq.alertColor === "orange") {
                alertText = "Moderado / Alto";
                colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/20";
              } else if (eq.alertColor === "yellow") {
                alertText = "Leve / Sensible";
                colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
              }

              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[9px] font-mono text-slate-400 truncate max-w-[120px]">{eq.place}</span>
                    <span className="text-[10px] font-mono font-black text-white bg-rose-600/30 px-1 py-0.2 rounded border border-rose-500/20 shrink-0">
                      M {Number(eq.magnitude).toFixed(1)}
                    </span>
                  </div>
                  <div className={`text-[8px] font-mono px-1.5 py-0.5 rounded border text-center font-bold ${colorClass}`}>
                    {alertText}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Selected Sismo Card detailed overlay bottom strip */}
      {selectedEarthquake && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-850 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Activity className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono text-rose-400 uppercase tracking-widest font-bold">EPICENTRO SELECCIONADO</span>
              <span className="text-xs font-black text-white truncate max-w-[280px] sm:max-w-[400px]">{selectedEarthquake.place}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedEarthquake.isLocal && (
              <span className="text-[8px] bg-rose-600/20 text-rose-400 border border-rose-500/30 font-bold px-1.5 py-0.5 rounded uppercase animate-bounce">
                Cerca de Venezuela
              </span>
            )}
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Prof: {Number(selectedEarthquake.depth || 10).toFixed(0)} km
            </span>
            <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-black">
              M {Number(selectedEarthquake.magnitude).toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
