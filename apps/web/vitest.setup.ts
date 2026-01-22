import "@testing-library/jest-dom/vitest";

// Set Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-12345678";
