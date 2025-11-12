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
        const prompt = `You are an expert YouTube link verifier for a recipe chatbot, Chef BOT. Your only job is to find up to 3 high-quality, working, and relevant YouTube video links for the recipe "${dish}". You must follow these rules with extreme precision.

**CRITICAL RULES FOR YOUTUBE LINK VALIDATION:**

1.  **USE ONLY youtu.be FORMAT:** All YouTube links MUST be in the short \`https://youtu.be/VIDEOID\` format.
    -   **Correct:** \`https://youtu.be/exampleVideoID\`
    -   **Incorrect:** \`https://www.youtube.com/watch?v=exampleVideoID\`, any redirect URLs, google/cloud URLs, or long tracking URLs.
    -   You MUST convert any valid YouTube link you find into this short format.

2.  **100% WORKING & RELEVANT LINKS GUARANTEE:** A link is only acceptable if it meets ALL of these conditions:
    -   It is a real, existing YouTube video.
    -   The link opens correctly and is not private, deleted, unavailable, or restricted.
    -   The video content is a direct tutorial or recipe for "${dish}".
    -   It is NOT a playlist, channel homepage, or unrelated vlog.
    -   If you have any doubt that a link is not perfect, DO NOT include it.

3.  **ACTION IF NO VALID VIDEOS EXIST:**
    -   If you cannot find any YouTube videos that meet all the above rules, you MUST respond with: \`{"noMatches": true}\`.
    -   Do NOT create fake links just to fill the list. It is better to return nothing than to return a bad link.

4.  **REQUIRED OUTPUT FORMAT:**
    -   You must respond ONLY with a single, valid JSON object. Do not add any text before or after it.
    -   For valid links: \`{"exactMatches": [{"title": "Video Title", "url": "https://youtu.be/VIDEOID"}, ...]}\`
    -   If no valid links are found: \`{"noMatches": true}\`

Now, perform your task for the recipe "${dish}", considering the preferred language ${language} (but English is also acceptable).`;
        
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