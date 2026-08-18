export type SituationType = 'normal' | 'atencao' | 'alerta' | 'emergencia' | 'aguardando';

export type TrendType = 'subindo' | 'estavel' | 'baixando' | 'indeterminado';

export interface MonitoringStation {
  id: string;
  name: string;
  aliases: string[];
  referenceUrl: string;
  attentionThreshold?: number | null;
  alertThreshold?: number | null;
  emergencyThreshold?: number | null;
}

export interface RiverReading {
  id: string;
  stationId: string;
  levelMeters: number | null;
  situation: SituationType;
  readAt: string | null;
  trend: TrendType;
  variationMeters: number | null;
  sourceUrl?: string;
  createdAt: string;
}

export interface StationData {
  station: MonitoringStation;
  latestReading: RiverReading | null;
  previousReading?: RiverReading | null;
  isLoading: boolean;
  error?: string | null;
}

export const MONITORED_STATIONS: MonitoringStation[] = [
  {
    id: 'ponte-dom-tito-buss',
    name: 'Ponte Dom Tito Buss',
    aliases: ['Ponte Dom Tito Buss', 'Dom Tito Buss'],
    referenceUrl: 'https://defesacivil.riodosul.sc.gov.br/',
  },
  {
    id: 'ponte-ricardo-kanitz',
    name: 'Ponte Ricardo Kanitz – Rio Itajaí do Sul',
    aliases: [
      'Ponte Ricardo Kanitz',
      'Ponte Hannelore Hartmann Eyng',
      'Rio Itajaí do Sul',
      'Ricardo Kanitz',
      'Hannelore Hartmann Eyng',
    ],
    referenceUrl: 'https://defesacivil.riodosul.sc.gov.br/',
  },
  {
    id: 'ponte-br-470',
    name: 'Ponte BR-470 – Rio Itajaí do Oeste',
    aliases: [
      'Ponte BR-470',
      'BR-470',
      'Rio Itajaí do Oeste',
      'Ponte BR 470',
      'BR 470',
    ],
    referenceUrl: 'https://defesacivil.riodosul.sc.gov.br/',
  },
];

/**
 * Normaliza um texto para comparação (remove acentos, pontuação e converte para minúsculas)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Identifica o ID da estação correspondente a partir de um nome ou alias encontrado no portal da Defesa Civil
 */
export function resolveStationId(rawName: string): string | null {
  if (!rawName) return null;
  const normalizedInput = normalizeText(rawName);

  for (const station of MONITORED_STATIONS) {
    if (normalizeText(station.name).includes(normalizedInput) || normalizedInput.includes(normalizeText(station.name))) {
      return station.id;
    }
    for (const alias of station.aliases) {
      const normalizedAlias = normalizeText(alias);
      if (normalizedInput.includes(normalizedAlias) || normalizedAlias.includes(normalizedInput)) {
        return station.id;
      }
    }
  }

  return null;
}
