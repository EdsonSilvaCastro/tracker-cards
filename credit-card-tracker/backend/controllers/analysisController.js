import * as analysisService from '../services/analysisService.js';

export const analyzeFinances = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: 'El campo "question" es requerido' });
    }

    const answer = await analysisService.analyzeFinances(req.user.id, question.trim());
    res.json({ success: true, data: { answer } });
  } catch (error) {
    console.error('Error running financial analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
