/**
 * Contenido estático compartido (biografía, estadísticas de carrera, galería
 * y enlaces oficiales). Es el único "proveedor" de copy del sitio: los
 * componentes SOLO leen de aquí, así evitamos datos duplicados entre módulos.
 *
 * Fuentes:
 *  - Datos de carrera: Wikipedia (infobox de Marco Bezzecchi, verificada)
 *  - Fotos: Wikimedia Commons, licencias libres con atribución de autor.
 */

const commons = (file: string, width = 1600): string =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

export interface TimelineEntry {
  id: string;
  period: string;
  era: 'Moto3' | 'Moto2' | 'MotoGP';
  team: string;
  title: string;
  description: string;
  highlights: string[];
  stat: { value: string; label: string };
  image?: string;
  imageAlt?: string;
  credit?: string;
  current?: boolean;
}

/** Trayectoria verificada: Moto3 (2015-18) → Moto2 (2019-21) → MotoGP (2022-). */
export const TIMELINE: TimelineEntry[] = [
  {
    id: 'moto3',
    period: '2015 – 2018',
    era: 'Moto3',
    team: 'Mahindra / KTM',
    title: 'Debut en el Mundial',
    description:
      'Rimini (Italia, 12/11/1998) entra en el Mundial de velocidad en 2015 con Mahindra y crece con KTM. Cierra su etapa Moto3 en 2018 con su mejor clasificación: 3º con 214 puntos.',
    highlights: ['3 victorias', '10 podios', '2 poles', 'Mejor: 3º en 2018 (214 pts)'],
    stat: { value: '40', label: 'salidas' },
    image: commons('Marco Bezzecchi 2018.jpg', 1200),
    imageAlt: 'Marco Bezzecchi con su motocicleta de Moto3 en 2018',
    credit: 'Foto: Box Repsol · CC BY 2.0 · Wikimedia Commons',
  },
  {
    id: 'moto2',
    period: '2019 – 2021',
    era: 'Moto2',
    team: 'KTM / Kalex',
    title: 'Salto a Moto2',
    description:
      'Tres temporadas en la antecámara de la reina con KTM y Kalex. Termina su ciclo en 2021 con el 3º puesto del Mundial y 214 puntos, sumando 14 podios en 52 salidas.',
    highlights: ['3 victorias', '14 podios', '2 poles', '1 vuelta rápida', '3º en 2021 (214 pts)'],
    stat: { value: '52', label: 'salidas' },
  },
  {
    id: 'motogp-2022',
    period: '2022',
    era: 'MotoGP',
    team: 'VR46 Racing Team · Ducati',
    title: 'Llegada a la clase reina',
    description:
      'Debut en MotoGP con el equipo VR46 de Valentino Rossi. Reconocido como Rookie of the Year y miembro de la VR46 Riders Academy.',
    highlights: ['Rookie of the Year 2022', 'Ducati Desmosedici', 'VR46 Racing Team'],
    stat: { value: '2022', label: 'debut MotoGP' },
  },
  {
    id: 'motogp-2023',
    period: '2023',
    era: 'MotoGP',
    team: 'VR46 Racing Team · Ducati',
    title: 'Primera victoria en la clase reina',
    description:
      'Se impone en el GP de Argentina para lograr su primer triunfo en MotoGP y convierte al VR46 en una cita obligada del podio.',
    highlights: ['1ª victoria MotoGP: Argentina', 'Piloto de la VR46 Riders Academy', 'Ducati'],
    stat: { value: '1ª', label: 'victoria MotoGP' },
    image: commons('Marco bezzecchi 2023.jpg', 1400),
    imageAlt: 'Marco Bezzecchi enseñando su casco especial en Mugello 2023',
    credit: 'Foto: René Pierotti · CC BY-SA 4.0 · Wikimedia Commons',
  },
  {
    id: 'motogp-2024',
    period: '2024',
    era: 'MotoGP',
    team: 'VR46 Racing Team · Ducati',
    title: 'Consolidación con el VR46',
    description:
      'Última temporada con el equipo VR46 y Ducati antes del salto a un equipo de fábrica, acumulando experiencia de desarrollo en la élite.',
    highlights: ['VR46 Racing Team', 'Ducati Desmosedici', 'Temporada completa'],
    stat: { value: '4ª', label: 'temporada' },
  },
  {
    id: 'aprilia-2025',
    period: '2025',
    era: 'MotoGP',
    team: 'Aprilia Racing',
    title: 'Salto a fábrica con Aprilia',
    description:
      'Fichaje por el equipo oficial de Aprilia. Logra su primera victoria con la marca en el GP de Gran Bretaña y cierra el Mundial en 3ª posición con 353 puntos.',
    highlights: ['1ª victoria con Aprilia (GBR)', '3º en el Mundial 2025 (353 pts)', 'Aprilia RS-GP25'],
    stat: { value: '353', label: 'puntos 2025' },
    image: commons('MotoGP 2025 Malaysian Grand Prix - Aprilia Racing - Marco Bezzecchi.jpg', 1600),
    imageAlt: 'Marco Bezzecchi con la Aprilia de Racing en el GP de Malasia 2025',
    credit: 'Foto: Liauzh · CC BY-SA 4.0 · Wikimedia Commons',
  },
  {
    id: 'aprilia-2026',
    period: '2026',
    era: 'MotoGP',
    team: 'Aprilia Racing · #72',
    title: 'El Mundial en juego con la RS-GP26',
    description:
      'Segunda temporada en Aprilia Racing como compañero de Jorge Martín, con la Aprilia RS-GP26 y un contrato renovado hasta 2028. En 2026 vuelve a pelear de frente por el título.',
    highlights: ['#72 · Aprilia RS-GP26', 'Compañero: Jorge Martín #89', 'Contrato hasta 2028'],
    stat: { value: '#72', label: 'número' },
    current: true,
  },
];

export interface CareerStat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  note: string;
}

/** Totales de carrera verificados (Wikipedia, infobox): MotoGP + Moto2 + Moto3. */
export const CAREER_STATS: CareerStat[] = [
  { id: 'starts', label: 'Grandes Premios', value: 189, note: '97 en MotoGP · 52 en Moto2 · 40 en Moto3' },
  { id: 'wins', label: 'Victorias', value: 17, note: '11 en MotoGP · 3 en Moto2 · 3 en Moto3' },
  { id: 'podiums', label: 'Podios', value: 53, note: '29 en MotoGP · 14 en Moto2 · 10 en Moto3' },
  { id: 'poles', label: 'Poles', value: 17, note: '13 en MotoGP · 2 en Moto2 · 2 en Moto3' },
  { id: 'fl', label: 'Vueltas rápidas', value: 10, note: '9 en MotoGP · 1 en Moto2' },
  { id: 'titles', label: 'Títulos mundiales', value: 0, note: 'Objetivo 2026 con Aprilia Racing' },
];

export interface GalleryItem {
  id: string;
  src: string;
  srcLarge: string;
  alt: string;
  caption: string;
  year: string;
  author: string;
  license: string;
  sourceUrl: string;
}

const commonsInfo = (file: string): string => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

const galleryFile = (file: string, caption: string, year: string, author: string, license: string): GalleryItem => ({
  id: file,
  src: commons(file, 1400),
  srcLarge: commons(file, 2000),
  alt: caption,
  caption,
  year,
  author,
  license,
  sourceUrl: commonsInfo(file),
});

/** Fotografía de carreras con licencia libre (todas con atribución visible). */
export const GALLERY: GalleryItem[] = [
  galleryFile(
    'MotoGP 2025 Malaysian Grand Prix - Aprilia Racing - Marco Bezzecchi.jpg',
    'Bezzecchi con la Aprilia Racing en el GP de Malasia 2025',
    '2025',
    'Liauzh',
    'CC BY-SA 4.0',
  ),
  galleryFile(
    'Marco Bezzecchi GP San Marino 2025.jpg',
    'San Marino 2025: victoria en la Sprint y 2º en la carrera larga',
    '2025',
    'René 2782',
    'CC BY-SA 4.0',
  ),
  galleryFile(
    'Marco Bezzecchi at the 2025 Malaysian motorcycle Grand Prix.jpg',
    'Bezzecchi en el paddock del GP de Malasia 2025',
    '2025',
    'Denkmit',
    'CC BY-SA 4.0',
  ),
  galleryFile('Marco bezzecchi 2023.jpg', 'Casco especial de Bezzecchi en Mugello 2023', '2023', 'René Pierotti', 'CC BY-SA 4.0'),
  galleryFile(
    'Marco-bezzecchi-domina-il-gp-dindia-marco bez-1.webp',
    'Bezzecchi en el fin de semana del GP de India 2023',
    '2023',
    'WheelChair72',
    'CC BY-SA 4.0',
  ),
  galleryFile(
    'Marco Bezzecchi at the 2023 Japanese motorcycle Grand Prix.jpg',
    'Bezzecchi en el GP de Japón 2023',
    '2023',
    'Simon Patterson',
    'CC BY-SA 4.0',
  ),
  galleryFile(
    'Marco Bezzecchi al GP di San Marino 2022.jpg',
    'Bezzecchi en el GP de San Marino 2022, su primera temporada de MotoGP',
    '2022',
    'René 2782',
    'CC BY-SA 4.0',
  ),
  galleryFile('Marco Bezzecchi 2018.jpg', 'Bezzecchi en Moto3 durante la temporada 2018', '2018', 'Box Repsol', 'CC BY 2.0'),
];

export interface SocialLink {
  id: string;
  label: string;
  handle?: string;
  href: string;
  external?: boolean;
}

export const SOCIALS: SocialLink[] = [
  { id: 'web', label: 'Web oficial', handle: 'simplythebez.com', href: 'https://simplythebez.com', external: true },
  { id: 'ig', label: 'Instagram', handle: '@marcobez72', href: 'https://www.instagram.com/marcobez72/', external: true },
  {
    id: 'aprilia',
    label: 'Aprilia Racing',
    handle: 'Ficha oficial',
    href: 'https://www.aprilia.com/en_EN/aprilia-racing/moto-gp/riders/marco-bezzecchi/',
    external: true,
  },
  {
    id: 'motogp',
    label: 'MotoGP',
    handle: 'Ficha del piloto',
    href: 'https://www.motogp.com/en/riders/marco-bezzecchi/e622ec5b-5ccf-457c-a67f-ec028f0ddf6e',
    external: true,
  },
  { id: 'wiki', label: 'Wikipedia', handle: 'Ficha biográfica', href: 'https://en.wikipedia.org/wiki/Marco_Bezzecchi', external: true },
];

export interface NavLink {
  id: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'marcador', label: 'Marcador' },
  { id: 'trayectoria', label: 'Trayectoria' },
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'galeria', label: 'Galería' },
];
