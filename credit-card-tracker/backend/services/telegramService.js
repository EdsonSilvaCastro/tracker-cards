const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendMessage(chatId, text, options = {}) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error(`Telegram sendMessage failed (chat_id=${chatId}):`, json);
  }
  return json;
}

export function isAuthorized(chatId) {
  return String(chatId) === String(process.env.TELEGRAM_AUTHORIZED_CHAT_ID);
}
