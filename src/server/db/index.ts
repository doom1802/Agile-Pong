import { mockRepository } from "./mock-repository"
import { supabaseRepository } from "./supabase-repository"

const useMockData = process.env.NODE_ENV !== "production" && process.env.DATA_BACKEND === "mock"

export const db = useMockData ? mockRepository : supabaseRepository
