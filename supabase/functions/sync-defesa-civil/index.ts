// ==============================================================================
// Supabase Edge Function: sync-defesa-civil
// Objetivo: consumir a API pública oficial da Defesa Civil de Rio do Sul
// sem scraping de HTML.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFESA_CIVIL_URL = "https://defesacivil.riodosul.sc.gov.br/";
const ASTHON_PUBLIC_BASE_URL = "https://public.asthon.com.br/public";
const CITY_ID = "4214805";

export const MONITORED_STATIONS_MAP: Record<string, string[]> = {
  "ponte-dom-tito-buss": [
    "Ponte Dom Tito Buss",
    "ponte dom tito buss",
    "dom tito buss",
    "tito buss",
  ],
  "ponte-ricardo-kanitz": [
    "Ponte Ricardo Kanitz - Rio Itajaí do Sul",
    "Ponte Ricardo Kanitz",
    "ricardo kanitz",
    "ponte hannelore hartmann eyng",
    "hannelore hartmann eyng",
    "rio itajai do sul",
    "itajai do sul",
  ],
  "ponte-br-470": [
    "Ponte BR 470",
    "Ponte BR-470",
    "ponte br-470",
    "ponte br 470",
    "br-470",
    "br 470",
    "rio itajai do oeste",
    "itajai do oeste",
  ],
};

const PREFERRED_STATION_NAMES: Record<string, string[]> = {
  "ponte-dom-tito-buss": [
    "Ponte Dom Tito Buss",
    "Dom Tito Buss",
  ],
  "ponte-ricardo-kanitz": [
    "Ponte Ricardo Kanitz - Rio Itajaí do Sul",
    "Ponte Ricardo Kanitz",
  ],
  "ponte-br-470": [
    "Ponte BR 470",
    "Ponte BR-470",
    "BR 470",
    "BR-470",
  ],
};

export type SituationType = "normal" | "atencao" | "alerta" | "emergencia" | "aguardando";
export type TrendType = "subindo" | "estavel" | "baixando" | "indeterminado";

interface DecimalThresholds {
  attention: number | null;
  alert: number | null;
  emergency: number | null;
}

interface StationThresholdRecord {
  id: string;
  attention_threshold: number | null;
  alert_threshold: number | null;
  emergency_threshold: number | null;
}

interface SyncReading {
  stationId: string;
  sourceStationId: string;
  levelMeters: number;
  readAt: string;
  trend: TrendType;
  situation: SituationType;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNonEmptyString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function listStationPayloads(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["stations", "data", "items", "results", "records"]) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

function mapApiSituation(value: unknown): SituationType | null {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const text = typeof value === "number" ? String(value) : value;
  const normalized = normalizeText(text);

  if (/emergencia|critico|critica|crítico|crítica/.test(normalized)) return "emergencia";
  if (/alerta|risco|grave/.test(normalized)) return "alerta";
  if (/atencao|atenção|observacao|observação/.test(normalized)) return "atencao";
  if (/normal|estavel|estável|ok/.test(normalized)) return "normal";

  if (typeof value === "number") {
    if (value >= 3) return "emergencia";
    if (value >= 2) return "alerta";
    if (value >= 1) return "atencao";
    return "normal";
  }

  return null;
}

function extractThresholdsFromCandidate(node: unknown): DecimalThresholds {
  const empty: DecimalThresholds = { attention: null, alert: null, emergency: null };
  if (!node || typeof node !== "object") return empty;

  const obj = node as Record<string, unknown>;
  const thresholdKeys = [
    ["attention_threshold", "attentionThreshold"],
    ["alert_threshold", "alertThreshold"],
    ["emergency_threshold", "emergencyThreshold"],
  ] as const;

  for (const [primary, fallback] of thresholdKeys) {
    const value = toNumber(obj[primary] ?? obj[fallback]);
    if (value !== null) {
      if (primary === "attention_threshold" || fallback === "attentionThreshold") {
        empty.attention = value;
      }
      if (primary === "alert_threshold" || fallback === "alertThreshold") {
        empty.alert = value;
      }
      if (primary === "emergency_threshold" || fallback === "emergencyThreshold") {
        empty.emergency = value;
      }
    }
  }

  const nested = obj.thresholds;
  if (nested && typeof nested === "object") {
    const thresholds = nested as Record<string, unknown>;
    empty.attention ??= toNumber(thresholds.attention ?? thresholds.atencao ?? thresholds.attention_threshold);
    empty.alert ??= toNumber(thresholds.alert ?? thresholds.alerta ?? thresholds.alert_threshold);
    empty.emergency ??= toNumber(thresholds.emergency ?? thresholds.emergencia ?? thresholds.emergency_threshold);
  }

  return empty;
}

function getNestedValue(source: unknown, keys: string[]): unknown {
  if (!source || typeof source !== "object") return null;

  const obj = source as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined) return value;
  }
  return null;
}

function aliasMatches(name: string, aliases: string[]): boolean {
  const normalizedName = normalizeText(name);
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) continue;
    if (normalizedName === normalizedAlias) return true;
    if (normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName)) return true;
  }
  return false;
}

function resolveInternalStationId(rawName: string, showInPanel?: boolean): string | null {
  if (!rawName) return null;

  const input = normalizeText(rawName);
  const candidates: Array<{ internalId: string; score: number }> = [];

  for (const [internalId, aliases] of Object.entries(MONITORED_STATIONS_MAP)) {
    const nameVariants = [...(PREFERRED_STATION_NAMES[internalId] ?? []), ...aliases];

    for (const alias of nameVariants) {
      const normalizedAlias = normalizeText(alias);
      if (!normalizedAlias) continue;

      if (input === normalizedAlias) {
        const score = (PREFERRED_STATION_NAMES[internalId]?.includes(alias) ? 100 : 60) + (showInPanel ? 20 : 0);
        candidates.push({ internalId, score });
        continue;
      }

      if (input.includes(normalizedAlias) || normalizedAlias.includes(input)) {
        const score = (PREFERRED_STATION_NAMES[internalId]?.includes(alias) ? 80 : 50) + (showInPanel ? 20 : 0);
        candidates.push({ internalId, score });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].internalId;
}

function getStationNameCandidates(entry: Record<string, unknown>): string[] {
  const rawName = firstNonEmptyString(entry, ["name", "title", "display_name", "station_name", "label"]);
  const aliasValues = [
    ...(Array.isArray(entry.aliases) ? entry.aliases.filter((value): value is string => typeof value === "string") : []),
    ...(Array.isArray(entry.names) ? entry.names.filter((value): value is string => typeof value === "string") : []),
  ];

  return [rawName, ...aliasValues].filter((value): value is string => Boolean(value));
}

function getBestNameMatchScore(candidateNames: string[], targetNames: string[]): number {
  let bestScore = 0;

  for (const candidateName of candidateNames) {
    const normalizedCandidate = normalizeText(candidateName);
    if (!normalizedCandidate) continue;

    for (const targetName of targetNames) {
      const normalizedTarget = normalizeText(targetName);
      if (!normalizedTarget) continue;

      if (normalizedCandidate === normalizedTarget) {
        bestScore = Math.max(bestScore, 100);
        continue;
      }

      if (normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate)) {
        bestScore = Math.max(bestScore, 75);
      }
    }
  }

  return bestScore;
}

function findBestStationMatchForInternalId(stationEntries: unknown[], internalId: string): string | null {
  const preferredNames = PREFERRED_STATION_NAMES[internalId] ?? [];
  const aliasNames = MONITORED_STATIONS_MAP[internalId] ?? [];

  let bestCandidate: { stationId: string; score: number; showInPanel: boolean } | null = null;

  for (const entry of stationEntries) {
    if (!entry || typeof entry !== "object") continue;

    const item = entry as Record<string, unknown>;
    const stationIdValue = firstNonEmptyString(item, ["station_id", "stationId", "id", "uuid", "source_id"]);
    if (!stationIdValue) continue;

    const candidateNames = getStationNameCandidates(item);
    const showInPanel = item.show_in_panel === true;

    const preferredScore = getBestNameMatchScore(candidateNames, preferredNames);
    if (preferredScore > 0) {
      const score = preferredScore + (showInPanel ? 25 : 0);
      if (!bestCandidate || score > bestCandidate.score || (score === bestCandidate.score && showInPanel && !bestCandidate.showInPanel)) {
        bestCandidate = { stationId: stationIdValue, score, showInPanel };
      }
      continue;
    }

    const aliasScore = getBestNameMatchScore(candidateNames, aliasNames);
    if (aliasScore > 0) {
      const score = aliasScore + (showInPanel ? 10 : 0);
      if (!bestCandidate || score > bestCandidate.score || (score === bestCandidate.score && showInPanel && !bestCandidate.showInPanel)) {
        bestCandidate = { stationId: stationIdValue, score, showInPanel };
      }
    }
  }

  return bestCandidate?.stationId ?? null;
}

export function resolveStationUuidMap(catalogPayload: unknown): Map<string, string> {
  const stationEntries = listStationPayloads(catalogPayload);
  const result = new Map<string, string>();

  for (const internalId of Object.keys(MONITORED_STATIONS_MAP)) {
    const sourceStationId = findBestStationMatchForInternalId(stationEntries, internalId);
    if (sourceStationId) {
      result.set(internalId, sourceStationId);
    }
  }

  return result;
}

export function validateStationResolutionCatalog(catalogPayload: unknown): Record<string, string> {
  return Object.fromEntries(resolveStationUuidMap(catalogPayload).entries());
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json, text/plain, */*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao consultar ${url}`);
  }

  return await response.json();
}

function calculateTrend(previousLevel: number | null, currentLevel: number): TrendType {
  if (previousLevel === null) return "indeterminado";

  const difference = Number((currentLevel - previousLevel).toFixed(2));
  if (difference > 0) return "subindo";
  if (difference < 0) return "baixando";
  return "estavel";
}

function deriveSituationFromThresholds(levelMeters: number, thresholds: DecimalThresholds): SituationType {
  if (thresholds.emergency !== null && levelMeters >= thresholds.emergency) return "emergencia";
  if (thresholds.alert !== null && levelMeters >= thresholds.alert) return "alerta";
  if (thresholds.attention !== null && levelMeters >= thresholds.attention) return "atencao";
  if (thresholds.alert !== null && levelMeters > 0) return "normal";
  return "aguardando";
}

if (import.meta.main) {
  serve(async () => {
    const errors: string[] = [];
    const readings: Array<{ stationId: string; sourceStationId: string; levelMeters: number; readAt: string; trend: TrendType }> = [];

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados.");
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const stationCatalogUrl = `${ASTHON_PUBLIC_BASE_URL}/city-site/stations?city_id=${CITY_ID}&_v=2`;
      const liveUrl = `${ASTHON_PUBLIC_BASE_URL}/stations/live?city_id=${CITY_ID}&_v=2`;
      const panelUrl = `${ASTHON_PUBLIC_BASE_URL}/panel?city_id=${CITY_ID}&include_geometry=false&_v=2`;

      const [catalogPayload, livePayload, panelPayload] = await Promise.allSettled([
        fetchJson(stationCatalogUrl),
        fetchJson(liveUrl),
        fetchJson(panelUrl),
      ]);

      if (catalogPayload.status === "rejected") {
        throw new Error(`Falha ao consultar catálogo de estações: ${catalogPayload.reason?.message ?? catalogPayload.reason}`);
      }

      if (livePayload.status === "rejected") {
        throw new Error(`Falha ao consultar live feed: ${livePayload.reason?.message ?? livePayload.reason}`);
      }

      const resolvedStationUuidMap = resolveStationUuidMap(catalogPayload.value);
      const missingStations = Object.keys(MONITORED_STATIONS_MAP).filter((internalId) => !resolvedStationUuidMap.has(internalId));

      const sourceToInternal = new Map<string, string>();
      for (const [internalId, sourceStationId] of resolvedStationUuidMap.entries()) {
        sourceToInternal.set(sourceStationId, internalId);
      }

      const liveRecords = listStationPayloads(livePayload.value);
      let validCount = 0;
      let insertedCount = 0;
      let duplicateCount = 0;

      const dbStationThresholds = await supabase
        .from("monitoring_stations")
        .select("id, attention_threshold, alert_threshold, emergency_threshold")
        .in("id", Object.keys(MONITORED_STATIONS_MAP));

      if (dbStationThresholds.error) {
        errors.push(`Falha ao consultar thresholds do banco: ${dbStationThresholds.error.message}`);
      }

      const thresholdMap = new Map<string, DecimalThresholds>();
      for (const row of (dbStationThresholds.data ?? []) as StationThresholdRecord[]) {
        thresholdMap.set(row.id, {
          attention: row.attention_threshold ?? null,
          alert: row.alert_threshold ?? null,
          emergency: row.emergency_threshold ?? null,
        });
      }

      const panelRecords = listStationPayloads(panelPayload.status === "fulfilled" ? panelPayload.value : []);
      const panelBySource = new Map<string, Record<string, unknown>>();

      for (const entry of panelRecords) {
        if (!entry || typeof entry !== "object") continue;
        const item = entry as Record<string, unknown>;
        const sourceId = firstNonEmptyString(item, ["station_id", "stationId", "id", "uuid"]);
        if (sourceId) panelBySource.set(sourceId, item);
      }

      for (const liveRecord of liveRecords) {
        if (!liveRecord || typeof liveRecord !== "object") continue;

        const record = liveRecord as Record<string, unknown>;
        const sourceStationId = firstNonEmptyString(record, ["station_id", "stationId", "id", "uuid"]);
        const levelMetersValue = toNumber(getNestedValue(record, ["level_m", "levelMeters", "level_meters"]));
        const readAtValue = firstNonEmptyString(record, ["last_reading_at", "read_at", "updated_at", "timestamp"]);

        if (!sourceStationId || levelMetersValue === null || !readAtValue) {
          errors.push(`Registro live ignorado por ausência de station_id, level_m ou last_reading_at: ${JSON.stringify(record)}`);
          continue;
        }

        const internalStationId = sourceToInternal.get(sourceStationId);
        if (!internalStationId) {
          continue;
        }

        if (!Number.isFinite(levelMetersValue) || levelMetersValue < 0 || levelMetersValue > 30) {
          errors.push(`Leitura inválida para ${sourceStationId}: nível ${levelMetersValue}`);
          continue;
        }

        const candidateDate = new Date(readAtValue);
        if (Number.isNaN(candidateDate.getTime())) {
          errors.push(`Leitura inválida para ${sourceStationId}: timestamp ${readAtValue}`);
          continue;
        }

        const previousReadingRows = await supabase
          .from("river_readings")
          .select("level_meters, read_at")
          .eq("station_id", internalStationId)
          .lt("read_at", readAtValue)
          .order("read_at", { ascending: false })
          .limit(1);

        if (previousReadingRows.error) {
          errors.push(`Falha ao consultar leitura anterior para ${internalStationId}: ${previousReadingRows.error.message}`);
        }

        const previousLevel = previousReadingRows.data && previousReadingRows.data.length > 0
          ? toNumber(previousReadingRows.data[0].level_meters)
          : null;

        const trend = calculateTrend(previousLevel, levelMetersValue);
        let situation: SituationType = "aguardando";

        const directApiSituation = mapApiSituation(getNestedValue(record, ["situation", "status", "risk_level", "state", "alert_level", "current_situation"]))
          ?? mapApiSituation(getNestedValue(panelBySource.get(sourceStationId) ?? {}, ["situation", "status", "risk_level", "state", "alert_level", "current_situation"]))
          ?? mapApiSituation(getNestedValue(panelBySource.get(sourceStationId) ?? {}, ["level_status", "station_status", "condition"]))
          ?? mapApiSituation(getNestedValue(panelBySource.get(sourceStationId) ?? {}, ["classification"]))
          ?? mapApiSituation(getNestedValue(panelBySource.get(sourceStationId) ?? {}, ["risk"]))
          ?? mapApiSituation(getNestedValue(record, ["risk", "classification"]))
          ?? mapApiSituation(getNestedValue(record, ["situation_name"]))
          ?? null;

        if (directApiSituation) {
          situation = directApiSituation;
        } else {
          const thresholds = thresholdMap.get(internalStationId) ?? {
            attention: null,
            alert: null,
            emergency: null,
          };
          const thresholdSituation = deriveSituationFromThresholds(levelMetersValue, thresholds);
          if (thresholdSituation !== "aguardando") {
            situation = thresholdSituation;
          }
        }

        validCount += 1;

        const payload = {
          station_id: internalStationId,
          level_meters: Number(levelMetersValue.toFixed(2)),
          situation,
          read_at: readAtValue,
          trend,
          variation_meters: previousLevel === null ? null : Number((levelMetersValue - previousLevel).toFixed(2)),
          source_url: DEFESA_CIVIL_URL,
        };

        const { data, error: insertError } = await supabase
          .from("river_readings")
          .upsert(payload, {
            onConflict: "station_id,read_at",
            ignoreDuplicates: true,
          })
          .select();

        if (insertError) {
          errors.push(`Erro ao gravar ${internalStationId}: ${insertError.message}`);
          continue;
        }

        if (data && data.length > 0) {
          insertedCount += 1;
        } else {
          duplicateCount += 1;
        }

        readings.push({
          stationId: internalStationId,
          sourceStationId,
          levelMeters: Number(levelMetersValue.toFixed(2)),
          readAt: readAtValue,
          trend,
          situation,
        });
      }

      return new Response(
        JSON.stringify(
          {
            success: true,
            stationsResolved: resolvedStationUuidMap.size,
            liveRecordsReceived: liveRecords.length,
            valid: validCount,
            inserted: insertedCount,
            duplicates: duplicateCount,
            missingStations,
            readings: readings.map((reading) => ({
              stationId: reading.stationId,
              sourceStationId: reading.sourceStationId,
              levelMeters: reading.levelMeters,
              readAt: reading.readAt,
              trend: reading.trend,
              situation: reading.situation,
            })),
            errors,
          },
          null,
          2
        ),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[sync-defesa-civil] Erro fatal:", error);
      return new Response(
        JSON.stringify(
          {
            success: false,
            stationsResolved: 0,
            liveRecordsReceived: 0,
            valid: 0,
            inserted: 0,
            duplicates: 0,
            missingStations: [],
            readings: [],
            errors: [error instanceof Error ? error.message : String(error)],
          },
          null,
          2
        ),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  });
}
