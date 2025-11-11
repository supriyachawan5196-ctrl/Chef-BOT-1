
import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import { Recipe, Source, VideoSearchResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        recipeName: {
            type: Type.STRING,
            description: "The name of the recipe."
        },
        description: {
            type: Type.STRING,
            description: "A short, warm, and loving description of the dish, as if a master chef is describing it."
        },
        ingredients: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "A list of ingredients with quantities."
        },
        instructions: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "Step-by-step instructions to prepare the dish."
        },
    },
    required: ["recipeName", "description", "ingredients", "instructions"]
};

export const fetchRecipe = async (dish: string, language: string): Promise<Omit<Recipe, 'image' | 'sources'>> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are Chef BOT, a world-class master chef. Provide a complete, expertly crafted recipe for "${dish}" in ${language}. Your tone should be warm, professional, knowledgeable, and engaging.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema,
            },
        });
        
        const text = response.text.trim();
        const recipeData = JSON.parse(text);

        return recipeData;
    } catch (error) {
        console.error("Error fetching recipe from Gemini API:", error);
        throw new Error("Failed to fetch recipe.");
    }
};

export const generateDishImage = async (dish: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: `Generate a high-quality, delicious-looking, professional photo of the dish: ${dish}. The image should be appetizing and well-lit.` }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response?.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            return `data:image/png;base64,${imagePart.inlineData.data}`;
        }
       
       console.warn(`No image data found in Gemini API response for dish: "${dish}". Using fallback image.`);
       return `https://picsum.photos/seed/${dish}/600/400`;
    } catch (error) {
        console.error("Error generating image from Gemini API:", error);
        return `https://picsum.photos/seed/${dish}/600/400`;
    }
}

export const fetchSources = async (dish: string, language: string): Promise<VideoSearchResult> => {
    try {
        const prompt = `You are an expert source finder for a recipe chatbot, Chef BOT. Your task is to find sources for the recipe "${dish}". You must follow these rules with extreme precision.

**CRITICAL RULES:**

1.  **URL Validity:** You MUST ONLY provide URLs that are 100% working. Each URL must be:
    - Active and public (not private, not deleted).
    - Clickable and lead to the correct page.
    - NOT a broken link (404 error).
    - NOT a YouTube channel homepage.
    - NOT a YouTube playlist link.
    - If you have any doubt about a link's validity, DO NOT include it.

2.  **Source Relevance:** The source MUST be a direct match for the recipe "${dish}". It can be a YouTube tutorial video or a trusted cooking blog page. No unrelated content.

3.  **Quantity:** Provide a maximum of 3 valid links. Do not provide more. Do not include duplicates.

4.  **No Valid Links Found:** If you cannot find any working, relevant links that meet ALL the above criteria, you MUST respond with \`{"noMatches": true}\`. Do not invent or provide fake links.

5.  **Output Format:** Respond ONLY with a single, valid JSON object. Do not add any text before or after the JSON.
    - For exact matches: \`{"exactMatches": [{"title": "...", "url": "..."}, ...]}}\`
    - If no exact matches but related matches exist: \`{"relatedMatches": [{"title": "Related: ...", "url": "..."}, ...]}}\`
    - If absolutely no working links are found: \`{"noMatches": true}\`

Find up to 3 sources for "${dish}" in ${language} (or English if not available) now.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        let text = response.text.trim();
        // The model might return the JSON inside a markdown code block, so we strip it.
        const jsonMatch = text.match(/```(json)?\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[2]) {
            text = jsonMatch[2];
        }
        
        const result = JSON.parse(text);
        
        if (result.exactMatches && Array.isArray(result.exactMatches) && result.exactMatches.length > 0) {
            return { type: 'exact', sources: result.exactMatches };
        } else if (result.relatedMatches && Array.isArray(result.relatedMatches) && result.relatedMatches.length > 0) {
            return { type: 'related', sources: result.relatedMatches };
        } else {
            return { type: 'none', sources: [] };
        }
    } catch(error) {
        console.error("Error fetching sources from Gemini API:", error);
        return { type: 'none', sources: [] };
    }
}

export const getGeneralResponse = async (query: string, language: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are Chef BOT, a helpful master chef. Use your search tool to find the most accurate and up-to-date information to answer the user's question. Answer in a friendly and helpful tone in ${language}. Question: "${query}"`,
            config: {
                tools: [{googleSearch: {}}]
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting general response from Gemini API:", error);
        throw new Error("Failed to get a response.");
    }
};

export const startChatWithRecipe = (recipe: Recipe, language: string): Chat => {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are Chef BOT, a friendly and knowledgeable master chef. The user is currently viewing a recipe for ${recipe.recipeName}. Your role is to answer their questions about this specific recipe. Be helpful and provide clear, concise answers in ${language}. Here is the recipe for your reference: Ingredients: ${recipe.ingredients.join(', ')}; Instructions: ${recipe.instructions.join(' ')}`,
      },
    });
    return chat;
};

export const suggestAlternatives = async (dishName: string, language: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user asked for a recipe for "${dishName}", but it was not found. Suggest 3 similar or alternative dishes they might like. Respond in ${language} with only a JSON array of strings, like ["Dish 1", "Dish 2", "Dish 3"].`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const text = response.text.trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error suggesting alternatives from Gemini API:", error);
        return [];
    }
};
