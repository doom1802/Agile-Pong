import { AppShell } from "@/components/AppShell"
import { AvatarPicker } from "@/components/AvatarPicker"
import { UserPreferences } from "@/components/UserPreferences"
import { logout, saveProfile } from "@/server/actions"
import { requireUser } from "@/server/auth"
import { avatarTheme, initials } from "@/lib/format"
import Link from "next/link"

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <AppShell user={user}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Your profile</h1>
          <p className="subtle">This is what colleagues see around matches and leaderboards.</p>
        </div>
      </div>
      <section className="panel">
        <form action={saveProfile} className="form">
          <div className="grid two">
            <label className="field">
              <span>First name</span>
              <input className="input" defaultValue={user.firstName} name="firstName" />
            </label>
            <label className="field">
              <span>Last name</span>
              <input className="input" defaultValue={user.lastName} name="lastName" />
            </label>
          </div>
          <div className="grid two">
            <label className="field">
              <span>Nickname</span>
              <input className="input" defaultValue={user.nickname} name="nickname" />
            </label>
            <label className="field">
              <span>Usual office</span>
              <input className="input" defaultValue={user.officeLocation} name="officeLocation" placeholder="Torino, Milano, Remote..." />
            </label>
          </div>
          <AvatarPicker defaultValue={user.avatarUrl} fallback={initials(user)} fallbackStyle={avatarTheme(user)} />
          <button className="button" type="submit">
            Save changes
          </button>
        </form>
      </section>
      <section className="panel account-panel">
        <div>
          <p className="eyebrow">Preferences</p>
          <h2>Theme and language</h2>
          <p className="subtle">Display settings live here so the top bar stays clean.</p>
        </div>
        <UserPreferences />
      </section>
      <section className="panel account-panel">
        <div>
          <p className="eyebrow">Achievements</p>
          <h2>Badges</h2>
          <p className="subtle">See your unlocked badges and the next goals to chase.</p>
        </div>
        <Link className="button secondary" href="/badges">
          View badges
        </Link>
      </section>
      <section className="panel account-panel">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Session</h2>
          <p className="subtle">Logout is here so the top bar stays focused on navigation.</p>
        </div>
        <form action={logout}>
          <button className="button secondary" type="submit">
            Logout
          </button>
        </form>
      </section>
    </AppShell>
  )
}
