import type { User } from "@/server/db/types"
import { avatarTheme, displayName, initials } from "@/lib/format"

export function PlayerAvatar({ user, detail }: { user: User; detail?: string }) {
  return (
    <div className="avatar-row">
      <span className="avatar" style={avatarTheme(user)}>
        {user.avatarUrl ? <span aria-hidden className="avatar-image" style={{ backgroundImage: `url(${user.avatarUrl})` }} /> : initials(user)}
      </span>
      <span>
        <strong>{displayName(user)}</strong>
        {detail ? <small className="subtle" style={{ display: "block" }}>{detail}</small> : null}
      </span>
    </div>
  )
}
