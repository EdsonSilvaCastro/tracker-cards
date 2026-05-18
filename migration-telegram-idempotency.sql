-- Tabla para deduplicar updates de Telegram y evitar procesar el mismo mensaje dos veces
-- (Telegram dispara reintentos si no recibe 200 OK rápido)

CREATE TABLE processed_telegram_updates (
  update_id    BIGINT       PRIMARY KEY,
  chat_id      BIGINT       NOT NULL,
  message_text TEXT,
  processed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_telegram_chat ON processed_telegram_updates(chat_id);

-- Limpieza manual de registros viejos (>30 días):
-- DELETE FROM processed_telegram_updates WHERE processed_at < NOW() - INTERVAL '30 days';
