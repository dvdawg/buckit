export async function getHuggingFaceEmbedding(text: string): Promise<number[]> {
  const hfApiKey = Deno.env.get("HUGGINGFACE_API_KEY");
  
  if (!hfApiKey) {
    throw new Error("HUGGINGFACE_API_KEY not found");
  }

  try {
    const response = await fetch("https:
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error("Hugging Face embedding error:", error);
    throw error;
  }
}
