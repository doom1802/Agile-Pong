import { AppShell } from "@/components/AppShell"
import { MatchBuilder } from "@/components/MatchBuilder"
import { createMatch } from "@/server/actions"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const [users, ratings] = await Promise.all([db.getUsers(), db.getRatings()])

  return (
    <AppShell user={user}>
      <MatchBuilder action={createMatch} currentUser={user} error={params.error} ratings={ratings} users={users} />
    </AppShell>
  )
}
