import { AppShell } from "@/components/AppShell"
import { Leaderboard } from "@/components/Leaderboard"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function LeaderboardPage() {
  const user = await requireUser()
  const [users, ratings] = await Promise.all([db.getUsers(), db.getRatings()])

  return (
    <AppShell user={user}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Rankings</p>
          <h1>Leaderboard</h1>
          <p className="subtle">Singles and doubles are separated so nobody can hide behind a perfect teammate.</p>
        </div>
      </div>
      <div className="grid two">
        <section className="panel" id="singles">
          <h2>Singles</h2>
          <Leaderboard kind="singles" pageSize={4} paginated ratings={ratings} users={users} />
        </section>
        <section className="panel" id="doubles">
          <h2>Doubles</h2>
          <Leaderboard kind="doubles" pageSize={4} paginated ratings={ratings} users={users} />
        </section>
      </div>
    </AppShell>
  )
}
