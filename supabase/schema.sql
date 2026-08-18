-- ==============================================================================
-- Schema do Supabase para o Monitor de Nível dos Rios – Rio do Sul
-- ==============================================================================

-- 1. Tabela de Estações de Monitoramento
CREATE TABLE IF NOT EXISTS public.monitoring_stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    reference_url TEXT NOT NULL DEFAULT 'https://defesacivil.riodosul.sc.gov.br/',
    attention_threshold NUMERIC(4, 2),
    alert_threshold NUMERIC(4, 2),
    emergency_threshold NUMERIC(4, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserção dos 3 Pontos de Monitoramento Confirmados
INSERT INTO public.monitoring_stations (
    id,
    name,
    aliases,
    reference_url
)
VALUES 
    (
        'ponte-dom-tito-buss', 
        'Ponte Dom Tito Buss', 
        ARRAY[
            'Ponte Dom Tito Buss',
            'Dom Tito Buss',
            'Tito Buss'
        ],
        'https://defesacivil.riodosul.sc.gov.br/'
    ),
    (
        'ponte-ricardo-kanitz', 
        'Ponte Ricardo Kanitz – Rio Itajaí do Sul', 
        ARRAY[
            'Ponte Ricardo Kanitz',
            'Ponte Hannelore Hartmann Eyng',
            'Rio Itajaí do Sul',
            'Ricardo Kanitz',
            'Hannelore Hartmann Eyng'
        ],
        'https://defesacivil.riodosul.sc.gov.br/'
    ),
    (
        'ponte-br-470', 
        'Ponte BR-470 – Rio Itajaí do Oeste', 
        ARRAY[
            'Ponte BR-470',
            'BR-470',
            'Rio Itajaí do Oeste',
            'Ponte BR 470',
            'BR 470'
        ],
        'https://defesacivil.riodosul.sc.gov.br/'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    aliases = EXCLUDED.aliases,
    reference_url = EXCLUDED.reference_url;


-- 2. Tabela de Leituras dos Níveis dos Rios
CREATE TABLE IF NOT EXISTS public.river_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    station_id TEXT NOT NULL
        REFERENCES public.monitoring_stations(id)
        ON DELETE CASCADE,

    level_meters NUMERIC(5, 2) NOT NULL,

    situation TEXT NOT NULL DEFAULT 'normal'
        CHECK (
            situation IN (
                'normal',
                'atencao',
                'alerta',
                'emergencia',
                'aguardando'
            )
        ),

    read_at TIMESTAMPTZ NOT NULL,

    trend TEXT NOT NULL DEFAULT 'indeterminado'
        CHECK (
            trend IN (
                'subindo',
                'estavel',
                'baixando',
                'indeterminado'
            )
        ),

    variation_meters NUMERIC(5, 2),

    source_url TEXT NOT NULL
        DEFAULT 'https://defesacivil.riodosul.sc.gov.br/',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3. Índices

-- Busca eficiente da leitura mais recente de cada estação
CREATE INDEX IF NOT EXISTS idx_river_readings_station_read_at
ON public.river_readings (
    station_id,
    read_at DESC
);

-- Impede duplicação da mesma leitura
CREATE UNIQUE INDEX IF NOT EXISTS idx_river_readings_unique_reading
ON public.river_readings (
    station_id,
    read_at
);


-- 4. Row Level Security

ALTER TABLE public.monitoring_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.river_readings ENABLE ROW LEVEL SECURITY;


-- Remove as políticas caso o script seja executado novamente
DROP POLICY IF EXISTS "Estações públicas abertas para leitura"
ON public.monitoring_stations;

DROP POLICY IF EXISTS "Leituras públicas abertas para leitura"
ON public.river_readings;


-- Leitura pública dos dados
CREATE POLICY "Estações públicas abertas para leitura"
ON public.monitoring_stations
FOR SELECT
USING (true);


CREATE POLICY "Leituras públicas abertas para leitura"
ON public.river_readings
FOR SELECT
USING (true);


-- 5. Supabase Realtime
-- Adiciona river_readings à publicação apenas se ainda não estiver presente.

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'river_readings'
    ) THEN

        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.river_readings;

    END IF;

END $$;