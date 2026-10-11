import * as analysisService from '../services/analysisService.js';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_HISTORY = 10;
const MAX_CONTENT = 4000;

// Preguntas por usuario en la última hora (en memoria: se reinicia al reiniciar el servidor).
const askedAt = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const recent = (askedAt.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    const retryMin = Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 60000);
    askedAt.set(userId, recent);
    return { limited: true, retryMin };
  }
  recent.push(now);
  askedAt.set(userId, recent);
  return { limited: false };
}

// Solo turnos de texto user/assistant, los últimos MAX_HISTORY, empezando por un turno del usuario.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const clean = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }))
    .slice(-MAX_HISTORY);
  while (clean.length && clean[0].role !== 'user') clean.shift();
  return clean;
}

export const analyzeFinances = async (req, res) => {
  try {
    const { question, history } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: 'El campo "question" es requerido' });
    }
    if (question.length > MAX_CONTENT) {
      return res.status(400).json({ success: false, error: `La pregunta no puede pasar de ${MAX_CONTENT} caracteres` });
    }

    const limit = checkRateLimit(req.user.id);
    if (limit.limited) {
      return res.status(429).json({
        success: false,
        error: `Llegaste al límite de ${RATE_LIMIT} preguntas por hora. Intenta de nuevo en ${limit.retryMin} min.`,
      });
    }

    const answer = await analysisService.analyzeFinances(req.user.id, question.trim(), sanitizeHistory(history));
    res.json({ success: true, data: { answer } });
  } catch (error) {
    console.error('Error running financial analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
