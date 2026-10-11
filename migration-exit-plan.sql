-- Plan de salida: supuestos del plan (1 por usuario) y cierres mensuales
-- Applied manually in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS exit_plan_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mes_inicio        TEXT NOT NULL CHECK (mes_inicio ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  saldo_inicial     DECIMAL(12,2) NOT NULL,
  retiro_inicial    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ingreso_neto      DECIMAL(12,2) NOT NULL,
  gasto_base        DECIMAL(12,2) NOT NULL,
  mes_normal        DECIMAL(12,2) NOT NULL,
  seguro_medico     DECIMAL(12,2) NOT NULL DEFAULT 0,
  aguinaldo         DECIMAL(12,2) NOT NULL DEFAULT 0,
  prima_vacacional  DECIMAL(12,2) NOT NULL DEFAULT 0,
  mes_prima         INTEGER NOT NULL CHECK (mes_prima BETWEEN 1 AND 12),
  sueldo_piso       DECIMAL(12,2) NOT NULL,
  meta_meses        INTEGER NOT NULL DEFAULT 9 CHECK (meta_meses IN (6, 9, 12)),
  viajes_en_pausa   BOOLEAN NOT NULL DEFAULT FALSE,
  -- [{ "month": "YYYY-MM", "amount": 30000, "label": "Vuelos Japón" }]
  retiros_planeados JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exit_plan_closings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month                TEXT NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  ahorrado             DECIMAL(12,2) NOT NULL,
  retiros              DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (retiros >= 0),
  hubo_viaje           BOOLEAN NOT NULL DEFAULT FALSE,
  abrio_compra_a_meses BOOLEAN NOT NULL DEFAULT FALSE,
  nota                 TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE TRIGGER update_exit_plan_config_updated_at
  BEFORE UPDATE ON exit_plan_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exit_plan_closings_updated_at
  BEFORE UPDATE ON exit_plan_closings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE exit_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_plan_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own exit plan config" ON exit_plan_config
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own exit plan closings" ON exit_plan_closings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
