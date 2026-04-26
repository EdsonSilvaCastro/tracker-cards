# Configuración: Anthropic API + Bot de Telegram

## 1. Anthropic API (Claude)

1. Ve a [console.anthropic.com](https://console.anthropic.com) e inicia sesión.
2. Crea un workspace si es la primera vez.
3. Carga saldo prepagado (mínimo $5 USD) en **Billing → Add credits**.
4. **Pon un límite mensual de gasto** para protección:  
   Billing → Spending limits → configurar en `$5 USD/mes`.
5. Genera una API key:  
   **API Keys → Create Key** → copia el valor `sk-ant-...`.
6. Agrégala a `credit-card-tracker/backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
7. Instala la dependencia (solo una vez):
   ```bash
   cd credit-card-tracker/backend
   npm install @anthropic-ai/sdk
   ```

---

## 2. Bot de Telegram

### 2.1 Crear el bot
1. Abre Telegram, busca **@BotFather** e inicia el chat.
2. Escribe `/newbot` y sigue los prompts para asignar nombre y username (ej. `MisGastosBot`).
3. BotFather te dará el token: `123456:ABC-DEF...`
4. Agrégalo a `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```

### 2.2 Obtener tu chat_id
1. Mándale cualquier mensaje al bot recién creado (ej. "hola").
2. Abre en el navegador:
   ```
   https://api.telegram.org/bot<TU_TOKEN>/getUpdates
   ```
3. En la respuesta JSON busca `"chat":{"id": 123456789}`. Ese número es tu `chat_id`.
4. Agrégalo a `.env`:
   ```
   TELEGRAM_AUTHORIZED_CHAT_ID=123456789
   ```

### 2.3 Configurar el webhook
Una vez que tu backend esté desplegado con HTTPS, ejecuta:

```bash
curl -F "url=https://TU_DOMINIO/api/telegram/webhook" \
     https://api.telegram.org/bot<TU_TOKEN>/setWebhook
```

Debes ver: `{"ok":true,"result":true,"description":"Webhook was set"}`.

> En desarrollo local puedes usar [ngrok](https://ngrok.com):
> ```bash
> ngrok http 3001
> # Copia la URL https://xxxx.ngrok.io y úsala en setWebhook
> ```

### 2.4 Reiniciar el backend
```bash
cd credit-card-tracker/backend
npm run dev
```

---

## 3. Verificar la instalación

1. Manda al bot: `"500 amex platinum en salidas finde"`
2. Deberías recibir confirmación con monto, tarjeta, billing cycle y match si aplica.
3. Verifica en la app web que el gasto aparece en Monthly Overview.

---

## Notas de seguridad

- **Nunca commitees** `.env` ni compartas el `ANTHROPIC_API_KEY` ni el `TELEGRAM_BOT_TOKEN`.
- El endpoint `/api/telegram/webhook` usa `TELEGRAM_AUTHORIZED_CHAT_ID` para rechazar mensajes de otros usuarios.
- Si sospechas que tu token fue expuesto, revócalo en @BotFather con `/revoke` y genera uno nuevo.
