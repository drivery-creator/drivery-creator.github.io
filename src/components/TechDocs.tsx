import React from "react";
import { 
  FileText, 
  Cpu, 
  MapPin, 
  Zap, 
  Compass, 
  Server, 
  Network, 
  Database, 
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function TechDocs() {
  return (
    <div className="space-y-8 text-slate-100" id="tech-docs-root">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-emerald-400" />
          Análisis Arquitectónico y Diagnóstico de Drivery
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Documentación técnica ejecutiva, detección de cuellos de botella y propuestas de optimización de nivel Senior.
        </p>
      </div>

      {/* 1. Resumen Técnico Ejecutivo */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-emerald-400 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          1. Resumen Técnico Ejecutivo del Workflow
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          <strong>Drivery - Red de Rescate</strong> opera como un agregador de movilidad con un canal de prevención humanitaria activa en Caracas. Su ecosistema de integración se estructura en 5 etapas principales:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Database className="h-4 w-4 text-emerald-400" />
              <span className="text-sm">A. Ingesta y Scraping (Supabase)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Un cron job en base de datos (<code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">pg_cron</code>) extrae periódicamente registros de <em>desaparecidosterremotovenezuela.com</em>. Aplica filtros de expresiones regulares (RegEx) para sanear strings, insertando registros con el prefijo único <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">vtb_</code> e inyectando contexto semántico libre en <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">ia_referencia</code>.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Compass className="h-4 w-4 text-blue-400" />
              <span className="text-sm">B. GPS de Alta Prioridad en Cliente</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El cliente web inicia sincronizando la base local en memoria (<code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">listaDesaparecidosBackend</code>). Mediante la API <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">navigator.geolocation.watchPosition</code> con alta precisión activa, el dispositivo móvil rastrea en tiempo real la ruta del chofer.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <MapPin className="h-4 w-4 text-red-400" />
              <span className="text-sm">C. Geocercas y Matching Localizado</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evaluación bidireccional en ruta: <strong>numérica</strong> (tolerancia matemática de 0.015° de distancia euclidiana para coordenadas directas) y <strong>sintáctica</strong> (cruce de palabras clave de zonas como <em>"El Paraíso"</em> o <em>"San Martín"</em> en <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">ia_referencia</code> con lat/lng preestablecidas). Un acoplamiento (match) activa la alerta roja interactiva.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm">D. Pipeline Inteligente (RPC & Storage)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El botón <strong>Verde</strong> invoca la función <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">buscar_desaparecido_con_groq</code> que usa IA para contrastar lenguaje natural del chofer con registros históricos del scraper. El botón <strong>Rojo</strong> registra un PIN instantáneo con la geolocalización actual. Soporta captura de cámara en Supabase Storage y transcripción de voz procesada sintácticamente por IA.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Cuellos de Botella */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          2. Identificación de Cuellos de Botella (Debilidades de Escalabilidad)
        </h3>

        <div className="space-y-3">
          <div className="bg-slate-900/40 p-4 rounded-xl border border-rose-950/40 flex gap-3">
            <div className="bg-rose-950/40 text-rose-400 p-2 h-fit rounded-lg mt-1">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Fragilidad y Costo de CPU en el Parseo Semántico Local</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Buscar subcadenas como <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">"El Paraíso"</code> o <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">"San Martín"</code> sobre textos no estructurados en la memoria del cliente es ineficiente y propenso a fallas por variaciones tipográficas (p.ej., acentos, minúsculas, nombres alternativos o errores de escritura). Adicionalmente, computar distancias euclidianas recursivamente en JavaScript sobre un arreglo creciente en cada trigger del GPS drena rápidamente la batería de los smartphones.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-rose-950/40 flex gap-3">
            <div className="bg-rose-950/40 text-rose-400 p-2 h-fit rounded-lg mt-1">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Inviabilidad en Carga Inicial (Saturación de Memoria)</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Descargar de manera síncrona en el cliente todo el historial de reportes activos identificados con <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">vtb_%</code> causa un consumo masivo de ancho de banda. En redes móviles móviles típicas de Caracas (3G/4G inestables), esto resultará en latencias de carga prolongadas, timeouts del cliente y un consumo insostenible de memoria RAM en el dispositivo del usuario final a medida que el scraper sume más registros históricos.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-rose-950/40 flex gap-3">
            <div className="bg-rose-950/40 text-rose-400 p-2 h-fit rounded-lg mt-1">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Dependencia de WebSocket y Carga en Base de Datos por pg_cron</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                El canal en tiempo real mediante <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">supabase.channel</code> asume una conexión persistente sin microcortes, lo cual es irreal en ruta móvil. Por otra parte, delegar el filtrado RegEx intensivo y periódico sobre strings de páginas externas a un script disparado por <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">pg_cron</code> eleva el uso de CPU de la base de datos central de Supabase de manera innecesaria, compitiendo directamente con las queries operacionales de Drivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Mejoras de Arquitectura Proactivas */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-blue-400 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          3. Propuestas de Arquitectura de Software Recomendadas
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          Para solucionar estos cuellos de botella y preparar la plataforma para una escala de producción nacional, se proponen las siguientes tres mejoras de arquitectura utilizando el ecosistema nativo de Supabase:
        </p>

        <div className="space-y-4">
          {/* Propuesta 1 */}
          <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
                MEJORA 1 - GEOLOCALIZACIÓN
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                PostGIS + Index GIST <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">Indexación Espacial con PostGIS y Queries RPC de Rango</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Activar la extensión <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">postgis</code> en la base de datos de Supabase. Añadir una columna de geoposicionamiento geométrico indexada:
              <br />
              <code className="block bg-slate-950 p-2 rounded text-blue-300 text-[11px] mt-2 font-mono whitespace-pre-wrap">
                ALTER TABLE reportes_avistamiento ADD COLUMN geom geography(Point, 4326);{"\n"}
                CREATE INDEX idx_reportes_geom ON reportes_avistamiento USING GIST(geom);
              </code>
              <br />
              Crear una función SQL (RPC) llamada <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">buscar_alertas_cercanas(lng, lat, radio_metros)</code>. El dispositivo del conductor consumirá esta RPC a demanda de su posición GPS (devolviendo solo los 5 casos más cercanos en su radio), liberando al navegador de procesar cálculos euclidianos repetitivos en memoria y reduciendo drásticamente el tráfico de red de un listado global.
            </p>
          </div>

          {/* Propuesta 2 */}
          <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-500/20">
                MEJORA 2 - INGESTA DE IA
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                Supabase Edge Functions + LLM Structuring <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">Desacoplamiento de Scraping e Inferencia en Edge Functions</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mudar la lógica pesada del scraper y expresiones regulares fuera de la base de datos Postgres. Reemplazar el <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">pg_cron</code> por un Cron Trigger de <strong>Supabase Edge Functions</strong> (escritas en TypeScript / Deno). 
              <br />
              Al ejecutarse la Edge Function, esta extrae los textos del portal <em>desaparecidosterremotovenezuela.com</em> y realiza una llamada inmediata a un LLM (como Gemini) utilizando JSON estructurado. El modelo traduce el texto descriptivo del avistamiento y determina una estimación de coordenadas (latitud y longitud asociadas a plazas, calles o distritos de Caracas) en el momento exacto de la ingesta, guardando el registro ya georreferenciado de manera asíncrona.
            </p>
          </div>

          {/* Propuesta 3 */}
          <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-500/20">
                MEJORA 3 - RESILIENCIA OFFLINE
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                Service Worker + Sync Queue <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">Cola de Transacciones Sincrónicas con Persistencia en Cliente</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dado el escenario de cortes de cobertura móvil o saturación celular en Caracas, se debe implementar una arquitectura <strong>Offline-First</strong> para el conductor en ruta.
              <br />
              Los reportes interactivos ("¡LO VI AQUÍ!" y fotos) se almacenarán inmediatamente en un almacenamiento local como <strong>IndexedDB</strong> o <strong>localStorage</strong> mediante un estado de sincronización pendiente. Un Service Worker integrado en la aplicación web registrará una cola de sincronización en segundo plano (<code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Background Sync API</code>). Cuando el celular recupere señal móvil estable de datos, el Service Worker disparará automáticamente la carga ordenada de fotos al Storage de Supabase e insertará las coordenadas acumuladas en la cola de reportes con backoff exponencial.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
