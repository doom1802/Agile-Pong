import { AvatarPicker } from "@/components/AvatarPicker"
import { redirect } from "next/navigation"
import { saveProfile } from "@/server/actions"
import { requireUser } from "@/server/auth"
import { avatarTheme, initials } from "@/lib/format"

export default async function OnboardingPage() {
  const user = await requireUser()

  if (user.officeLocation) {
    redirect("/")
  }

  return (
    <main className="auth-page">
      <section className="auth-panel panel">
        <p className="eyebrow">Profile</p>
        <h1 style={{ fontSize: 44 }}>Pick your table name</h1>
        <ProfileForm user={user} />
      </section>
    </main>
  )
}

function ProfileForm({ user }: { user: Awaited<ReturnType<typeof requireUser>> }) {
  return (
    <form action={saveProfile} className="form">
      <label className="field">
        <span>First name</span>
        <input className="input" defaultValue={user.firstName} name="firstName" />
      </label>
      <label className="field">
        <span>Last name</span>
        <input className="input" defaultValue={user.lastName} name="lastName" />
      </label>
      <label className="field">
        <span>Nickname</span>
        <input className="input" defaultValue={user.nickname} name="nickname" />
      </label>
      <AvatarPicker defaultValue={user.avatarUrl} fallback={initials(user)} fallbackStyle={avatarTheme(user)} />
      <label className="field">
        <span>Usual office</span>
        <input className="input" defaultValue={user.officeLocation} name="officeLocation" placeholder="Torino, Milano, Remote..." />
      </label>
      <button className="button full" type="submit">
        Save profile
      </button>
    </form>
  )
}
