// faq-create.js
import { supabase } from "../_shared/supabaseClient.js";
import parseRawFaq from "../_shared/parseRawFaq.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, question, answer, keywords, is_active = true, image_url, raw } = req.body;

    let finalCategory = category;
    let finalQuestion = question;
    let finalAnswer = answer;
    let finalKeywords = keywords;

    // If using raw text, parse it into structured fields
    if (raw) {
      const parsed = parseRawFaq(raw);
      finalCategory = parsed.category || finalCategory;
      finalQuestion = parsed.question || finalQuestion;
      finalAnswer = parsed.answer || finalAnswer;
      finalKeywords = parsed.keywords?.length ? parsed.keywords : finalKeywords;
    }

    // Validate required fields
    if (!finalQuestion || !finalAnswer) {
      return res.status(400).json({ error: "Question and answer are required" });
    }

    // Insert directly into Supabase (bypassing review)
    const { data, error } = await supabase
      .from("chatbot_faqs")
      .insert([
        {
          category: finalCategory || null,
          question: finalQuestion,
          answer: finalAnswer,
          keywords: finalKeywords || [],
          is_active,
          image_url: image_url || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("[FAQ CREATE ERROR]", error);
      return res.status(500).json({ error: "Failed to insert FAQ into database" });
    }

    // Return the inserted row immediately
    return res.status(201).json(data);

  } catch (err) {
    console.error("[FAQ CREATE UNHANDLED ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}