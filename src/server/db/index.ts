import { mockRepository } from "./mock-repository"
import { supabaseRepository } from "./supabase-repository"

export const isMockDataEnabled = process.env.NODE_ENV !== "production" && process.env.DATA_BACKEND === "mock"

export const db = isMockDataEnabled ? mockRepository : supabaseRepository
