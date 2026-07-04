const env = {
  AI_API_KEY: process.env.AI_API_KEY,
  AI_BASE_URL: process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1",
  AI_MODEL: process.env.AI_MODEL ?? "openai/gpt-4o-mini",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SERPAPI_KEY: process.env.SERPAPI_KEY,
  WORLD_NEWS_API_KEY: process.env.WORLD_NEWS_API_KEY,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  NETLIFY_API_TOKEN: process.env.NETLIFY_API_TOKEN,
  OMDB_API_KEY: process.env.OMDB_API_KEY,
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
  ADOPT_A_PET_KEY: process.env.ADOPT_A_PET_KEY,
  EBAY_APP_ID: process.env.EBAY_APP_ID,
  GYAZO_ACCESS_TOKEN: process.env.GYAZO_ACCESS_TOKEN,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
};

export function hasEnv(name: keyof typeof env) {
  return Boolean(env[name]);
}

export { env };
