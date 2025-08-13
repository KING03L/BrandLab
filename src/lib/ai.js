// src/lib/ai.js
// npm i @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';

// .env (Vite) expected:
// VITE_GEMINI_API_KEY=...

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;

export const getGemini = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export const improveDescription = async ({ name, description, type, condition }) => {
  const prompt = `
You are an e-commerce copy expert. Improve this product description for clarity, trust, and conversion.
Keep it under 140 words. Use concise, benefit-led language. Maintain factual correctness.

Name: ${name}
Type: ${type}
Condition: ${condition ?? 'N/A'}
Current Description: ${description}
`;
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const suggestPrice = async ({ name, type, paymentMethod, currency, baselinePrice, condition }) => {
  const prompt = `
Act as a pricing strategist. Suggest a fair price for the item below in ${currency}.
Return only a number (no currency symbol, no text), using dot for decimals.

- Name: ${name}
- Type: ${type}
- Condition: ${condition ?? 'N/A'}
- Payment Method: ${paymentMethod}
- Currency: ${currency}
- Seller baseline: ${baselinePrice || 'N/A'}
Consider market norms and typical online marketplace ranges.
`;
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  // Extract the first numeric value
  const text = result.response.text().trim();
  const num = parseFloat((text.match(/-?\d+(\.\d+)?/) || [])[0]);
  return Number.isFinite(num) ? num : null;
};

export const generateAltText = async ({ name, type }) => {
  const prompt = `
Generate a short, accessible alt text for a product image (max 12 words).
Name: ${name}
Type: ${type}
Return only the alt text.
`;
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};
