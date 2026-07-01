import { AppShell } from "@/components/AppShell"
import { MatchBuilder } from "@/components/MatchBuilder"
import { createMatch } from "@/server/actions"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const [users, ratings] = await Promise.all([db.getUsers(), db.getRatings()])
  const initialPlayerIds = shuffled(users.filter((candidate) => candidate.id !== user.id).map((candidate) => candidate.id)).slice(0, 3)

  return (
    <AppShell user={user}>
      <MatchBuilder action={createMatch} currentUser={user} error={params.error} initialPlayerIds={initialPlayerIds} ratings={ratings} users={users} />
    </AppShell>
  )
}

function shuffled<T>(values: T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}
