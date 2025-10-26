export async function getCohereEmbedding(text: string): Promise<number[]> {
  const cohereApiKey = Deno.env.get("COHERE_API_KEY");
  
  if (!cohereApiKey) {
    throw new Error("COHERE_API_KEY not found");
  }

  try {
    const response = await fetch("https://api.cohere.ai/v1/embed",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cohereApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts: [text],
        model: "embed-english-v3.0",
        input_type: "search_document",
        embedding_types: ["float"]
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  } catch (error) {
    console.error("Cohere embedding error:", error);
    throw error;
  }
}
