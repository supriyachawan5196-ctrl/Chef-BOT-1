
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
            contents: `You are Chef Board, a world-class master chef. Use your search tool to find the most accurate and up-to-date information for a "${dish}" recipe. Provide a complete, expertly crafted recipe in ${language}. Your tone should be warm, professional, knowledgeable, and engaging. IMPORTANT: Your response MUST be a single, valid JSON object that follows this exact structure: {"recipeName": "string", "description": "string", "ingredients": ["string"], "instructions": ["string"]}. Do not include any text or formatting outside of this JSON object.`,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        let text = response.text.trim();
        // The model might return the JSON inside a markdown code block, so we strip it.
        const jsonMatch = text.match(/```(json)?\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[2]) {
            text = jsonMatch[2];
        }

        if (!text.trim().startsWith('{')) {
            throw new Error("Invalid recipe data received from API.");
        }
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
        const prompt = `You are a "Sources" helper for a recipe chatbot. For the recipe "${dish}", find exactly 3 high-quality, relevant sources.

**Rules:**
1.  **Sources:** Find sources in ${language} (or English). Sources can be YouTube video tutorials or food blog pages.
2.  **Quantity:** Return exactly 3 sources.
3.  **Relevance:** All sources must be for the specific recipe "${dish}". No unrelated content.
4.  **Quality:** Links must be working, from trusted YouTube channels or cooking blogs.
5.  **Fallback:** If you cannot find 3 exact matches, find 1-2 closely related sources (e.g., how to make a key ingredient, a major variation of the dish).
6.  **Output Format:** Respond ONLY with a valid JSON object. Do not include any other text.

**JSON Structure:**
- If you find 3 exact matches, use: \`{"exactMatches": [{"title": "...", "url": "..."}, ...]}}\`
- If you cannot find 3 exact matches, use: \`{"relatedMatches": [{"title": "Related: ...", "url": "..."}, ...]}}\`

Find sources for "${dish}" and return the JSON.`;
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
            contents: `You are Chef Board, a helpful master chef. Use your search tool to find the most accurate and up-to-date information to answer the user's question. Answer in a friendly and helpful tone in ${language}. Question: "${query}"`,
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
        systemInstruction: `You are Chef Board, a friendly and knowledgeable master chef. The user is currently viewing a recipe for ${recipe.recipeName}. Your role is to answer their questions about this specific recipe. Be helpful and provide clear, concise answers in ${language}. Here is the recipe for your reference: Ingredients: ${recipe.ingredients.join(', ')}; Instructions: ${recipe.instructions.join(' ')}`,
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
