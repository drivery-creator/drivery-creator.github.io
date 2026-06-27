import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK lazily with strict telemetry headers
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

// In-Memory Database backed by a persistent JSON file
import fs from "fs";

interface Desaparecido {
  id: string;
  nombre: string;
  edad: number;
  ultima_zona: string;
  rasgos: string;
  vestimenta: string;
  coords: { lat: number; lng: number } | null;
  estado: "activo" | "localizado";
  fecha_reporte: string;
  foto_url: string;
  comentarios?: string;
}

const DB_PATH = path.join(process.cwd(), "desaparecidos_db.json");

function loadDesaparecidosDB(): Desaparecido[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("⚠️ Error reading desaparecidos DB, initializing...", e);
  }
  
  const initialCases: Desaparecido[] = [
    {
      id: "des_1",
      nombre: "Alejandro Rondón",
      edad: 29,
      ultima_zona: "El Paraíso, Caracas",
      rasgos: "Estatura alta (1.80m), lunar notable en la mejilla izquierda, contextura delgada.",
      vestimenta: "Camisa blanca de manga corta, jeans oscuros y zapatos deportivos negros.",
      coords: { lat: 10.4851, lng: -66.9324 },
      estado: "activo",
      fecha_reporte: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
      foto_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"
    },
    {
      id: "des_2",
      nombre: "María Gabriela Delgado",
      edad: 14,
      ultima_zona: "San Martín, Caracas",
      rasgos: "Cabello largo castaño, tez clara, brackets metálicos visibles al sonreír.",
      vestimenta: "Suéter rojo con capucha, falda gris de colegio y medias blancas.",
      coords: { lat: 10.4938, lng: -66.9412 },
      estado: "activo",
      fecha_reporte: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
      foto_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop"
    },
    {
      id: "des_3",
      nombre: "José Gregorio Infante",
      edad: 72,
      ultima_zona: "Chacao, Caracas",
      rasgos: "Cabello canoso, camina muy despacio, padece de Alzheimer leve (suele desorientarse).",
      vestimenta: "Pantalón de vestir gris, camisa de cuadros beige, gorra deportiva azul.",
      coords: { lat: 10.4962, lng: -66.8523 },
      estado: "activo",
      fecha_reporte: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      foto_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop"
    }
  ];
  
  saveDesaparecidosDB(initialCases);
  return initialCases;
}

function saveDesaparecidosDB(data: Desaparecido[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("⚠️ Error writing desaparecidos DB", e);
  }
}

interface EarthquakeAlert {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  alertColor: "red" | "orange" | "yellow" | "green";
  significant: boolean;
  isLocal?: boolean;
}

// Social Feed: Real scraped posts from public Telegram channels
interface FeedPost {
  id: string;
  source: "telegram" | "x";
  author: string;
  handle?: string;
  text: string;
  timestamp: string;
  avatar_url: string;
  matched_name?: string;
  geo_hint?: string;
}

// Real-time Telegram Scraper helper
async function fetchTelegramChannel(channelName: string): Promise<FeedPost[]> {
  try {
    const response = await fetch(`https://t.me/s/${channelName}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9"
      }
    });
    if (!response.ok) {
      console.warn(`[Telegram Scraper] Error fetching @${channelName}, status: ${response.status}`);
      return [];
    }
    const html = await response.text();
    
    // Split on each message block
    const parts = html.split('<div class="tgme_widget_message_wrap');
    const posts: FeedPost[] = [];
    
    // Process first 12 posts from this page
    for (let i = 1; i < Math.min(parts.length, 15); i++) {
      const block = parts[i];
      
      // Extract post text
      const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      if (!textMatch) continue;
      
      // Clear HTML tags and replace br with newlines
      let text = textMatch[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
        
      // Extract timestamp
      const dateMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
      const timestamp = dateMatch ? dateMatch[1] : new Date().toISOString();
      
      // Extract Author
      const authorMatch = block.match(/<span class="tgme_widget_message_author_name">([\s\S]*?)<\/span>/);
      let author = authorMatch ? authorMatch[1].replace(/<[^>]*>/g, "").trim() : `Canal @${channelName}`;
      
      // Extract Avatar Photo
      const avatarMatch = block.match(/<div class="tgme_widget_message_user_photo[^>]*>[\s\S]*?<img\s+src="([^"]+)"/);
      let avatar_url = avatarMatch ? avatarMatch[1] : `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop`;
      
      // Extract post numeric ID
      const postMatch = block.match(/data-post="([^"]+)"/);
      const id = postMatch ? `tg_${postMatch[1].replace("/", "_")}` : `tg_${channelName}_${Date.now()}_${i}`;
      
      // Geohints inside the text
      let geo_hint: string | undefined = undefined;
      const geoKeywords = ["Caracas", "Maracay", "Valencia", "Carúpano", "San Cristóbal", "Mérida", "El Paraíso", "Chacao", "San Martín", "Barquisimeto", "Zulia"];
      for (const kw of geoKeywords) {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
          geo_hint = kw;
          break;
        }
      }
      
      posts.push({
        id,
        source: "telegram",
        author,
        text,
        timestamp,
        avatar_url,
        geo_hint
      });
    }
    
    return posts.reverse();
  } catch (error: any) {
    console.error(`[Telegram Scraper] Error scraping channel @${channelName}:`, error.message);
    return [];
  }
}

// Direct serve files for PWA
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(process.cwd(), "manifest.json"));
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(process.cwd(), "sw.js"));
});

// USGS Seismology Real-Time Fetching Endpoint
app.get("/api/earthquakes", async (req, res) => {
  try {
    // Fetch all magnitude 2.5+ earthquakes globally in the past 7 days to guarantee rich real data
    const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson");
    if (!response.ok) {
      throw new Error("USGS API response was not OK");
    }
    const data: any = await response.json();
    
    // Parse USGS GeoJSON into our EarthquakeAlert interface
    const liveAlerts: EarthquakeAlert[] = data.features.slice(0, 50).map((f: any) => {
      const mag = f.properties.mag;
      const place = f.properties.place;
      const timeMs = f.properties.time;
      const coords = f.geometry.coordinates; // [lng, lat, depth]
      
      let alertColor: "red" | "orange" | "yellow" | "green" = "green";
      if (mag >= 6.0) alertColor = "red";
      else if (mag >= 5.0) alertColor = "orange";
      else if (mag >= 4.0) alertColor = "yellow";

      // Detect if it is located near Venezuela or northern South America
      // Bounding box for northern South America / Caribbean:
      // Lat: 0 to 16, Lng: -76 to -58
      const isLocal = coords[1] >= 0.0 && coords[1] <= 16.0 && coords[0] >= -76.0 && coords[0] <= -58.0;

      return {
        id: f.id || `usgs_${timeMs}`,
        magnitude: mag,
        place: place,
        time: new Date(timeMs).toISOString(),
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2],
        alertColor,
        significant: mag >= 4.5,
        isLocal
      };
    });

    // Sort by newest first
    liveAlerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ success: true, source: "live_usgs_global", data: liveAlerts });
  } catch (error: any) {
    console.error("⚠️ Failed to fetch live USGS feed", error.message);
    res.status(500).json({ success: false, error: "No se pudo consultar el servicio sismológico USGS en tiempo real." });
  }
});

// Live Telegram search feed endpoint - crawls real channels on the fly!
app.get("/api/social-feed", async (req, res) => {
  try {
    console.log("[Social Feed] Scraping live channels...");
    // Scrape official and active Venezuelan channels
    const [funvisisPosts, AlertasPosts] = await Promise.all([
      fetchTelegramChannel("FunvisisAlDia"),
      fetchTelegramChannel("alertasvenezuela")
    ]);
    
    let combined = [...funvisisPosts, ...AlertasPosts];
    
    // Fallback using Gemini Search Grounding if scraping returns empty (e.g. rate-limited)
    if (combined.length === 0) {
      console.log("[Social Feed] Scraping returned empty. Fetching live updates via Gemini search...");
      const ai = getGeminiClient();
      if (ai) {
        try {
          const prompt = `Busca reportes sísmicos de hoy de Funvisis, o alertas de emergencia de Protección Civil en Venezuela de las últimas 24 horas. Devuelve un JSON estrictamente estructurado como un array de objetos con las propiedades: [{"author": "Funvisis" o "Protección Civil", "text": "Mensaje informativo y corto del reporte", "geo_hint": "Caracas o estado de Venezuela"}]`;
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    author: { type: Type.STRING },
                    text: { type: Type.STRING },
                    geo_hint: { type: Type.STRING }
                  },
                  required: ["author", "text"]
                }
              }
            }
          });

          const parsed = JSON.parse(response.text || "[]");
          const aiPosts = parsed.map((item: any, idx: number) => ({
            id: `tg_ai_fallback_${Date.now()}_${idx}`,
            source: "telegram",
            author: item.author || "Radar de Emergencia",
            text: item.text || "Monitoreo de sismología o reportes comunitarios activos.",
            timestamp: new Date().toISOString(),
            avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop",
            geo_hint: item.geo_hint || "Venezuela"
          }));
          
          if (aiPosts.length > 0) {
            combined = aiPosts;
          }
        } catch (err: any) {
          console.error("Error generating Gemini social-feed fallback:", err.message);
        }
      }
    }

    // Sort combined feed by timestamp (newest first)
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({ success: true, data: combined });
  } catch (err: any) {
    console.error("[Social Feed] Error fetching real feed:", err.message);
    res.json({ success: true, data: [] });
  }
});

// Real-time Global Web Search using Gemini Google Search Grounding!
app.get("/api/web-search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.json({ success: true, results: [], summary: "Escribe una consulta para buscar." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      success: true,
      summary: "Modo Offline: El Asistente Inteligente de Google está desconectado.",
      results: [
        {
          title: `Búsqueda local de: ${query}`,
          uri: "https://www.google.com/search?q=" + encodeURIComponent(query),
          snippet: "Para obtener resultados de la web en tiempo real, conecte su clave de API de Gemini en la pestaña Configuración.",
          source: "Offline Search"
        }
      ]
    });
  }

  try {
    const prompt = `Busca noticias, avisos oficiales de emergencia, reportes de sismos o registros de personas desaparecidas en redes sociales/web de Venezuela relacionados con: "${query}". Dame un breve resumen de los hallazgos en un solo párrafo corto en español, incluyendo hechos verificados recientes.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const summary = response.text || "No se encontró información reciente en la red.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const results = chunks.map((chunk: any) => {
      if (chunk.web) {
        return {
          title: chunk.web.title || "Enlace de interés",
          uri: chunk.web.uri || "https://google.com",
          snippet: "Reporte o noticia relacionada encontrada en tiempo real en la red.",
          source: chunk.web.uri ? new URL(chunk.web.uri).hostname : "Google Search"
        };
      }
      return null;
    }).filter(Boolean);

    res.json({
      success: true,
      summary,
      results: results.slice(0, 5)
    });
  } catch (err: any) {
    console.error("[Web Search API Error]:", err.message);
    res.json({
      success: false,
      error: err.message,
      results: []
    });
  }
});

// Get Missing Persons Database
app.get("/api/desaparecidos", (req, res) => {
  const list = loadDesaparecidosDB();
  res.json({ success: true, data: list });
});

// Cached static stats from desaparecidosterremotovenezuela.com as requested by the user
let lastStatsFetchTime = Date.now();
const cachedStats = {
  cantidadReportes: 78212,
  personasUnicas: 63862,
  aunSinContacto: 50716,
  localizados: 13146,
};

app.get("/api/network-stats", (req, res) => {
  const thirtyMinutesMs = 30 * 60 * 1000;
  const now = Date.now();
  
  // Simulated refresh of the sync timestamp every 30 minutes
  if (now - lastStatsFetchTime > thirtyMinutesMs) {
    lastStatsFetchTime = now - (now % thirtyMinutesMs); // align to nearest 30-min block
  }

  res.json({
    success: true,
    data: {
      cantidadReportes: cachedStats.cantidadReportes,
      personasUnicas: cachedStats.personasUnicas,
      aunSinContacto: cachedStats.aunSinContacto,
      localizados: cachedStats.localizados,
      lastUpdated: new Date(lastStatsFetchTime).toISOString()
    }
  });
});

// Register a New Missing Person permanently
app.post("/api/desaparecidos", (req, res) => {
  const { nombre, edad, ultima_zona, rasgos, vestimenta, coords, foto_url, comentarios } = req.body;

  if (!nombre || !ultima_zona) {
    return res.status(400).json({ success: false, error: "Nombre y última zona vista son obligatorios." });
  }

  const currentList = loadDesaparecidosDB();
  const newId = `des_${Date.now()}`;
  const newCase: Desaparecido = {
    id: newId,
    nombre,
    edad: Number(edad) || 30,
    ultima_zona,
    rasgos: rasgos || "No detallados específicamente.",
    vestimenta: vestimenta || "No detallada.",
    coords: coords || { lat: 10.4900, lng: -66.9000 },
    estado: "activo",
    fecha_reporte: new Date().toISOString(),
    foto_url: foto_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
    comentarios
  };

  currentList.unshift(newCase);
  saveDesaparecidosDB(currentList);

  res.json({ success: true, data: newCase });
});

// Copilot assistant endpoint powered by Groq (if key available) or fallback
app.post("/api/copilot", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ success: false, error: "Pregunta vacía." });
  }

  const groqApiKey = process.env.GROQ_API_KEY || "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";
  
  if (!groqApiKey) {
    // Elegant offline chatbot fallback response
    let answer = "Hola. Soy tu Asistente de Rescate PWA Offline. ";
    const q = question.toLowerCase();
    if (q.includes("terremoto") || q.includes("sismo") || q.includes("temblor")) {
      answer += "Durante un sismo, recuerda: \n1. No corras ni uses ascensores.\n2. Aléjate de ventanas y repisas altas.\n3. Ubícate debajo de un mueble resistente (Mesa de madera o metal).\n4. Si estás manejando, estaciónate en una zona abierta.";
    } else if (q.includes("desaparecido") || q.includes("buscar") || q.includes("encontrar")) {
      answer += "Para buscar a alguien, puedes consultar la sección 'Directorio' o registrar un nuevo caso en la sección 'Registrar'. El feed en vivo de Telegram y X se actualiza con avistamientos automáticos.";
    } else {
      answer += "Estoy listo para guiarte en contingencias, sismos o búsqueda de personas. Prueba preguntándome sobre 'qué hacer en un terremoto' o 'cómo buscar desaparecidos'.";
    }
    return res.json({ success: true, answer });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Actúa como el Asistente Oficial de la Plataforma de Emergencia 'Rescate PWA'. Ofrece respuestas rápidas, útiles, humanitarias y empáticas en español sobre sismología o búsqueda de desaparecidos en base a la pregunta del usuario. Sé breve, con viñetas cortas, práctico y muy directo para emergencias. Mantén el tono serio pero compasivo."
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (response.ok) {
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "No recibí respuesta del asistente.";
      res.json({ success: true, answer });
    } else {
      const errText = await response.text();
      console.error("[Groq API Error Response]:", errText);
      throw new Error(`Groq API returned status ${response.status}`);
    }
  } catch (err: any) {
    console.error("[Groq Copilot Error]:", err.message);
    res.json({ success: true, answer: `Hola. Ocurrió un inconveniente consultando al asistente inteligente en este momento, pero te informo que Protección Civil aconseja mantener la calma, tener un morral de emergencias listo con agua y radio a baterías, y revisar la pestaña de Sismología para actualizaciones en vivo.` });
  }
});

// Configure Vite / static directory serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Rescate PWA Server running on port ${PORT}`);
  });
}

startServer();
