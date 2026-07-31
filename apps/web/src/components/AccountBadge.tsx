import type { AccountUser } from "../lib/api.js";

interface AccountBadgeProps {
  user: AccountUser | null;
  loading: boolean;
  onSignOut: () => void;
}

export function AccountBadge({ user, loading, onSignOut }: AccountBadgeProps) {
  if (loading) return null;

  if (!user) {
    return (
      <a className="account-badge" href="/auth/github/login">
        Sign in with GitHub
      </a>
    );
  }

  return (
    <div className="account-badge">
      {user.avatarUrl && <img src={user.avatarUrl} alt="" className="account-avatar" />}
      <span>
        {user.displayName} · {user.rating}
      </span>
      <button type="button" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
