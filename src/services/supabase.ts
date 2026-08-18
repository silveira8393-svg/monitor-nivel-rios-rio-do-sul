import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MONITORED_STATIONS, RiverReading } from '../types/river';

export interface StationHistoryRow {
  id: string;
  stationId: string;
  levelMeters: number | null;
  variationMeters: number | null;
  readAt: string | null;
}

// Environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client only if credentials are configured
export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Service to query river readings from Supabase
 */
export const riverService = {
  /**
   * Check if Supabase connection is active and configured
   */
  isConfigured(): boolean {
    return isConfigured;
  },

  /**
   * Get Supabase configuration details (sanitized)
   */
  getConfigInfo() {
    return {
      isConfigured,
      url: supabaseUrl ? supabaseUrl.replace(/(https?:\/\/)(.*)/, '$1***') : 'Não configurado',
      hasKey: Boolean(supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key')),
    };
  },

  /**
   * Fetch the latest reading for each monitored station
   */
  async getLatestReadings(): Promise<Record<string, RiverReading | null>> {
    const results: Record<string, RiverReading | null> = {};

    MONITORED_STATIONS.forEach((station) => {
      results[station.id] = null;
    });

    if (!supabase) {
      return results;
    }

    try {
      for (const station of MONITORED_STATIONS) {
        const { data, error } = await supabase
          .from('river_readings')
          .select('*')
          .eq('station_id', station.id)
          .order('read_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn(`Erro ao buscar leitura mais recente para ${station.id}:`, error.message);
          continue;
        }

        if (!data) {
          continue;
        }

        results[station.id] = {
          id: data.id,
          stationId: data.station_id,
          levelMeters: data.level_meters,
          situation: data.situation || 'normal',
          readAt: data.read_at,
          trend: data.trend || 'estavel',
          variationMeters: data.variation_meters,
          sourceUrl: data.source_url,
          createdAt: data.created_at,
        };
      }

      return results;
    } catch (err) {
      console.error('Falha ao conectar com o Supabase:', err);
      return results;
    }
  },

  /**
   * Fetch the full historical series for a specific station in descending read_at order.
   */
  async getStationHistory(stationId: string): Promise<StationHistoryRow[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('river_readings')
        .select('id, station_id, level_meters, variation_meters, read_at')
        .eq('station_id', stationId)
        .order('read_at', { ascending: false });

      if (error) {
        console.error(`Erro ao buscar histórico para ${stationId}:`, error.message);
        throw error;
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        stationId: row.station_id,
        levelMeters: row.level_meters,
        variationMeters: row.variation_meters,
        readAt: row.read_at,
      }));
    } catch (err) {
      console.error('Falha ao carregar histórico da estação:', err);
      return [];
    }
  },

  /**
   * Subscribe to real-time updates from Supabase for river readings
   */
  subscribeToNewReadings(onNewReading: (reading: RiverReading) => void) {
    if (!supabase) {
      return () => {};
    }

    const channel = supabase
      .channel('river-readings-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'river_readings' },
        (payload) => {
          const row = payload.new;
          if (row) {
            const formatted: RiverReading = {
              id: row.id,
              stationId: row.station_id,
              levelMeters: row.level_meters,
              situation: row.situation || 'normal',
              readAt: row.read_at,
              trend: row.trend || 'estavel',
              variationMeters: row.variation_meters,
              sourceUrl: row.source_url,
              createdAt: row.created_at,
            };
            onNewReading(formatted);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
