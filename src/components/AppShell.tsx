"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { User } from "@/server/db/types"
import { avatarTheme, displayName, initials } from "@/lib/format"

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">P</span>
            <span>Agile Pong</span>
          </Link>
          <nav className="nav" aria-label="Main navigation">
            <NavLink active={pathname === "/"} href="/">Home</NavLink>
            <NavLink active={pathname === "/matches/new"} href="/matches/new">New match</NavLink>
            <NavLink active={pathname.startsWith("/matches") && pathname !== "/matches/new"} href="/matches">Matches</NavLink>
            <NavLink active={pathname.startsWith("/leaderboard")} href="/leaderboard">Leaderboard</NavLink>
            <NavLink active={pathname.startsWith("/players")} href="/players">Players</NavLink>
          </nav>
          <div className="topbar-actions">
            <Link aria-current={pathname.startsWith("/profile") ? "page" : undefined} className={`profile-chip${pathname.startsWith("/profile") ? " active" : ""}`} href="/profile">
              <span className="profile-chip-avatar" style={avatarTheme(user)}>{user.avatarUrl ? <span aria-hidden className="avatar-image" style={{ backgroundImage: `url(${user.avatarUrl})` }} /> : initials(user)}</span>
              <span>{displayName(user)}</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  )
}

function NavLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link aria-current={active ? "page" : undefined} className={active ? "active" : undefined} href={href}>
      {children}
    </Link>
  )
}
