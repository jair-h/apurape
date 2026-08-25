export type PortType = "maritimo" | "aereo";

export interface Port {
  name: string;
  country: string;
  type: PortType;
  region?: string;
}

export const PORTS: Port[] = [
  /* ── PERÚ (origen principal) ──────────────────────────── */
  { name: "Callao",                  country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Paita",                   country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Matarani",                country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Salaverry",               country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Pisco",                   country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Ilo",                     country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Chimbote",                country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Iquitos",                 country: "Perú",           type: "maritimo", region: "Peru" },
  { name: "Lima (Jorge Chávez)",     country: "Perú",           type: "aereo",    region: "Peru" },

  /* ── SUDAMÉRICA ───────────────────────────────────────── */
  { name: "Santos",                  country: "Brasil",         type: "maritimo", region: "Sudamérica" },
  { name: "Paranaguá",               country: "Brasil",         type: "maritimo", region: "Sudamérica" },
  { name: "Itajaí",                  country: "Brasil",         type: "maritimo", region: "Sudamérica" },
  { name: "Río de Janeiro",          country: "Brasil",         type: "maritimo", region: "Sudamérica" },
  { name: "São Paulo (Guarulhos)",   country: "Brasil",         type: "aereo",    region: "Sudamérica" },
  { name: "Valparaíso",              country: "Chile",          type: "maritimo", region: "Sudamérica" },
  { name: "San Antonio",             country: "Chile",          type: "maritimo", region: "Sudamérica" },
  { name: "Santiago (Arturo Merino)",country: "Chile",          type: "aereo",    region: "Sudamérica" },
  { name: "Guayaquil",               country: "Ecuador",        type: "maritimo", region: "Sudamérica" },
  { name: "Quito (Mariscal Sucre)", country: "Ecuador",        type: "aereo",    region: "Sudamérica" },
  { name: "Buenaventura",            country: "Colombia",       type: "maritimo", region: "Sudamérica" },
  { name: "Cartagena",               country: "Colombia",       type: "maritimo", region: "Sudamérica" },
  { name: "Bogotá (El Dorado)",      country: "Colombia",       type: "aereo",    region: "Sudamérica" },
  { name: "Buenos Aires",            country: "Argentina",      type: "maritimo", region: "Sudamérica" },
  { name: "Rosario",                 country: "Argentina",      type: "maritimo", region: "Sudamérica" },
  { name: "Montevideo",              country: "Uruguay",        type: "maritimo", region: "Sudamérica" },
  { name: "La Guaira",               country: "Venezuela",      type: "maritimo", region: "Sudamérica" },
  { name: "Barranquilla",            country: "Colombia",       type: "maritimo", region: "Sudamérica" },

  /* ── CENTROAMÉRICA Y CARIBE ───────────────────────────── */
  { name: "Colón (Manzanillo)",      country: "Panamá",         type: "maritimo", region: "C.América" },
  { name: "Balboa (Ciudad Panamá)",  country: "Panamá",         type: "maritimo", region: "C.América" },
  { name: "Puerto Cortés",           country: "Honduras",       type: "maritimo", region: "C.América" },
  { name: "Puerto Quetzal",          country: "Guatemala",      type: "maritimo", region: "C.América" },
  { name: "Caldera",                 country: "Costa Rica",     type: "maritimo", region: "C.América" },
  { name: "Veracruz",                country: "México",         type: "maritimo", region: "C.América" },
  { name: "Manzanillo (MX)",        country: "México",         type: "maritimo", region: "C.América" },
  { name: "Altamira",                country: "México",         type: "maritimo", region: "C.América" },
  { name: "Ciudad de México (AICM)", country: "México",         type: "aereo",    region: "C.América" },

  /* ── NORTEAMÉRICA ─────────────────────────────────────── */
  { name: "Los Ángeles / Long Beach", country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Nueva York / Nueva Jersey", country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Miami",                   country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Filadelfia",              country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Savannah",                country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Houston",                 country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Seattle / Tacoma",        country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Baltimore",               country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Charleston",              country: "Estados Unidos", type: "maritimo", region: "Norteamérica" },
  { name: "Miami (MIA) Cargo",       country: "Estados Unidos", type: "aereo",    region: "Norteamérica" },
  { name: "Los Ángeles (LAX) Cargo", country: "Estados Unidos", type: "aereo",    region: "Norteamérica" },
  { name: "Nueva York (JFK) Cargo",  country: "Estados Unidos", type: "aereo",    region: "Norteamérica" },
  { name: "Vancouver",               country: "Canadá",         type: "maritimo", region: "Norteamérica" },
  { name: "Montreal",                country: "Canadá",         type: "maritimo", region: "Norteamérica" },
  { name: "Toronto (Pearson) Cargo", country: "Canadá",         type: "aereo",    region: "Norteamérica" },

  /* ── EUROPA ───────────────────────────────────────────── */
  { name: "Rotterdam",               country: "Países Bajos",   type: "maritimo", region: "Europa" },
  { name: "Ámsterdam (Schiphol) Cargo", country: "Países Bajos", type: "aereo",  region: "Europa" },
  { name: "Hamburgo",                country: "Alemania",       type: "maritimo", region: "Europa" },
  { name: "Fráncfort (FRA) Cargo",   country: "Alemania",       type: "aereo",    region: "Europa" },
  { name: "Amberes",                 country: "Bélgica",        type: "maritimo", region: "Europa" },
  { name: "Bruselas (BRU) Cargo",    country: "Bélgica",        type: "aereo",    region: "Europa" },
  { name: "Barcelona",               country: "España",         type: "maritimo", region: "Europa" },
  { name: "Valencia (ES)",           country: "España",         type: "maritimo", region: "Europa" },
  { name: "Algeciras",               country: "España",         type: "maritimo", region: "Europa" },
  { name: "Madrid (Barajas) Cargo",  country: "España",         type: "aereo",    region: "Europa" },
  { name: "Marsella",                country: "Francia",        type: "maritimo", region: "Europa" },
  { name: "Le Havre",                country: "Francia",        type: "maritimo", region: "Europa" },
  { name: "París (CDG) Cargo",       country: "Francia",        type: "aereo",    region: "Europa" },
  { name: "Génova",                  country: "Italia",         type: "maritimo", region: "Europa" },
  { name: "Livorno",                 country: "Italia",         type: "maritimo", region: "Europa" },
  { name: "Felixstowe",              country: "Reino Unido",    type: "maritimo", region: "Europa" },
  { name: "Southampton",             country: "Reino Unido",    type: "maritimo", region: "Europa" },
  { name: "Londres (Heathrow) Cargo", country: "Reino Unido",  type: "aereo",    region: "Europa" },
  { name: "Bremen / Bremerhaven",    country: "Alemania",       type: "maritimo", region: "Europa" },
  { name: "Pireo",                   country: "Grecia",         type: "maritimo", region: "Europa" },
  { name: "Lisboa",                  country: "Portugal",       type: "maritimo", region: "Europa" },
  { name: "Gdansk",                  country: "Polonia",        type: "maritimo", region: "Europa" },
  { name: "Copenhague",              country: "Dinamarca",      type: "maritimo", region: "Europa" },
  { name: "Gotemburgo",              country: "Suecia",         type: "maritimo", region: "Europa" },
  { name: "Helsinki",                country: "Finlandia",      type: "maritimo", region: "Europa" },
  { name: "Estambul",                country: "Turquía",        type: "maritimo", region: "Europa" },
  { name: "Haifa",                   country: "Israel",         type: "maritimo", region: "Oriente Medio" },

  /* ── ORIENTE MEDIO ────────────────────────────────────── */
  { name: "Jebel Ali (Dubái)",       country: "Emiratos Árabes Unidos", type: "maritimo", region: "Oriente Medio" },
  { name: "Dubái (DXB) Cargo",       country: "Emiratos Árabes Unidos", type: "aereo",    region: "Oriente Medio" },
  { name: "Abu Dhabi (Khalifa)",     country: "Emiratos Árabes Unidos", type: "maritimo", region: "Oriente Medio" },
  { name: "Salalah",                 country: "Omán",           type: "maritimo", region: "Oriente Medio" },
  { name: "Dammam (King Abdulaziz)", country: "Arabia Saudita", type: "maritimo", region: "Oriente Medio" },
  { name: "Doha (Hamad) Cargo",      country: "Catar",          type: "aereo",    region: "Oriente Medio" },
  { name: "Kuwait (KWI) Cargo",      country: "Kuwait",         type: "aereo",    region: "Oriente Medio" },

  /* ── ASIA ─────────────────────────────────────────────── */
  { name: "Shanghai",                country: "China",          type: "maritimo", region: "Asia" },
  { name: "Ningbo-Zhoushan",         country: "China",          type: "maritimo", region: "Asia" },
  { name: "Shenzhen (Yantian)",      country: "China",          type: "maritimo", region: "Asia" },
  { name: "Guangzhou (Nansha)",      country: "China",          type: "maritimo", region: "Asia" },
  { name: "Tianjin",                 country: "China",          type: "maritimo", region: "Asia" },
  { name: "Qingdao",                 country: "China",          type: "maritimo", region: "Asia" },
  { name: "Hong Kong",               country: "China",          type: "maritimo", region: "Asia" },
  { name: "Hong Kong (HKG) Cargo",   country: "China",          type: "aereo",    region: "Asia" },
  { name: "Shanghái (PVG) Cargo",    country: "China",          type: "aereo",    region: "Asia" },
  { name: "Busan",                   country: "Corea del Sur",  type: "maritimo", region: "Asia" },
  { name: "Incheon (ICN) Cargo",     country: "Corea del Sur",  type: "aereo",    region: "Asia" },
  { name: "Tokio / Yokohama",        country: "Japón",          type: "maritimo", region: "Asia" },
  { name: "Kobe / Osaka",            country: "Japón",          type: "maritimo", region: "Asia" },
  { name: "Tokio (Narita) Cargo",    country: "Japón",          type: "aereo",    region: "Asia" },
  { name: "Singapur",                country: "Singapur",       type: "maritimo", region: "Asia" },
  { name: "Singapur (Changi) Cargo", country: "Singapur",       type: "aereo",    region: "Asia" },
  { name: "Port Klang",              country: "Malasia",        type: "maritimo", region: "Asia" },
  { name: "Tanjung Pelepas",         country: "Malasia",        type: "maritimo", region: "Asia" },
  { name: "Tanjung Priok (Yakarta)", country: "Indonesia",      type: "maritimo", region: "Asia" },
  { name: "Manila",                  country: "Filipinas",      type: "maritimo", region: "Asia" },
  { name: "Bangkok / Laem Chabang",  country: "Tailandia",      type: "maritimo", region: "Asia" },
  { name: "Ho Chi Minh (Cát Lái)",   country: "Vietnam",        type: "maritimo", region: "Asia" },
  { name: "Mumbai (Nhava Sheva)",    country: "India",          type: "maritimo", region: "Asia" },
  { name: "Chennai / Madras",        country: "India",          type: "maritimo", region: "Asia" },
  { name: "Delhi (Indira Gandhi) Cargo", country: "India",      type: "aereo",    region: "Asia" },
  { name: "Colombo",                 country: "Sri Lanka",      type: "maritimo", region: "Asia" },
  { name: "Chittagong",              country: "Bangladés",      type: "maritimo", region: "Asia" },
  { name: "Karachi",                 country: "Pakistán",       type: "maritimo", region: "Asia" },

  /* ── AFRICA ───────────────────────────────────────────── */
  { name: "Durban",                  country: "Sudáfrica",      type: "maritimo", region: "África" },
  { name: "Ciudad del Cabo",         country: "Sudáfrica",      type: "maritimo", region: "África" },
  { name: "Johannesburgo (JNB) Cargo", country: "Sudáfrica",   type: "aereo",    region: "África" },
  { name: "Mombasa",                 country: "Kenia",          type: "maritimo", region: "África" },
  { name: "Nairobi (NBO) Cargo",     country: "Kenia",          type: "aereo",    region: "África" },
  { name: "Dar es Salaam",           country: "Tanzania",       type: "maritimo", region: "África" },
  { name: "Lagos / Apapa",           country: "Nigeria",        type: "maritimo", region: "África" },
  { name: "Abiyán",                  country: "Costa de Marfil", type: "maritimo", region: "África" },
  { name: "Casablanca",              country: "Marruecos",      type: "maritimo", region: "África" },
  { name: "Alejandría",              country: "Egipto",         type: "maritimo", region: "África" },
  { name: "El Cairo (CAI) Cargo",    country: "Egipto",         type: "aereo",    region: "África" },
  { name: "Adis Abeba (ADD) Cargo",  country: "Etiopía",        type: "aereo",    region: "África" },

  /* ── OCEANÍA ──────────────────────────────────────────── */
  { name: "Sídney",                  country: "Australia",      type: "maritimo", region: "Oceanía" },
  { name: "Melbourne",               country: "Australia",      type: "maritimo", region: "Oceanía" },
  { name: "Brisbane",                country: "Australia",      type: "maritimo", region: "Oceanía" },
  { name: "Sídney (SYD) Cargo",      country: "Australia",      type: "aereo",    region: "Oceanía" },
  { name: "Auckland",                country: "Nueva Zelanda",  type: "maritimo", region: "Oceanía" },
];

export const PERU_PORTS = PORTS.filter(p => p.region === "Peru");

export function formatPort(port: Port): string {
  return `${port.name} (${port.country})`;
}
