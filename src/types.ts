export interface Desaparecido {
  id: string;
  nombre: string;
  edad: number;
  ultima_zona: string;
  rasgos: string;
  vestimenta: string;
  ia_referencia: string;
  coords: { lat: number; lng: number } | null;
  estado: "activo" | "localizado";
  fecha_reporte: string;
  foto_url: string;
}

export interface Avistamiento {
  id: string;
  id_desaparecido: string;
  lat: number;
  lng: number;
  fecha: string;
  tipo: "foto" | "nota_voz" | "manual";
  detalle: string;
  multimedia_url?: string;
  estado_salud?: string;
  vestimenta_detectada?: string;
}

export interface CaracasZone {
  name: string;
  lat: number;
  lng: number;
  radio: number; // in degrees representation
  color: string;
}
