import { mockRepository } from "./mock-repository"
import { supabaseRepository } from "./supabase-repository"

export const db = process.env.DATA_BACKEND === "mock" ? mockRepository : supabaseRepository
