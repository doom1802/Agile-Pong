import { AvatarPicker } from "@/components/AvatarPicker"
import { redirect } from "next/navigation"
import { saveProfile } from "@/server/actions"
import { requireUser } from "@/server/auth"
import { avatarTheme, initials } from "@/lib/format"

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser()
  const params = await searchParams

  if (user.officeLocation) {
    redirect("/")
  }

  return (
    <main className="auth-page">
      <section className="auth-panel panel">
        <p className="eyebrow">Profile</p>
        <h1 style={{ fontSize: 44 }}>Pick your table name</h1>
        {params.error === "invalid" ? <p className="pill gold">Complete every required profile field.</p> : null}
        {params.error === "avatar" ? <p className="pill gold">The profile photo could not be uploaded. Try another image.</p> : null}
        <ProfileForm error={params.error} user={user} />
      </section>
    </main>
  )
}

function ProfileForm({ error, user }: { error?: string; user: Awaited<ReturnType<typeof requireUser>> }) {
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
        <input
          aria-describedby={error === "nickname-taken" ? "onboarding-nickname-error" : undefined}
          aria-invalid={error === "nickname-taken"}
          className="input"
          defaultValue={user.nickname}
          name="nickname"
        />
        {error === "nickname-taken" ? <small className="field-error" id="onboarding-nickname-error" role="alert">That nickname is already taken.</small> : null}
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
