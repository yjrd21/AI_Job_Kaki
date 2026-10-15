import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  History,
  Users,
  UserRound,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../features/auth/presentation/AuthProvider";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyse", label: "Analyse Job", icon: Sparkles },
  { to: "/history", label: "Job History", icon: History },
  { to: "/profiles", label: "Candidate Profiles", icon: Users },
  { to: "/account", label: "Account", icon: UserRound },
] as const;

function currentNavigationPath(pathname: string) {
  // Detail and result screens belong to Job History, not an unlabelled section.
  if (pathname.startsWith("/jobs/")) return "/history";
  return navigation.find((item) => pathname === item.to || pathname.startsWith(item.to + "/"))?.to;
}

export function AppShell() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const activePath = currentNavigationPath(location.pathname);
  const selected = navigation.find((item) => item.to === activePath);

  return (
    <div className="app-shell">
      {open && (
        <button
          className="app-shell__scrim"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`app-sidebar ${open ? "app-sidebar--open" : ""}`} aria-label="Application sidebar">
        <div className="app-sidebar__brand-row">
          <NavLink className="app-sidebar__brand" to="/dashboard" onClick={() => setOpen(false)}>
            <span className="app-sidebar__brand-mark" aria-hidden="true">K</span>
            <strong>AI Job Kaki</strong>
          </NavLink>
          <button className="app-sidebar__close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Main navigation" className="app-sidebar__nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              aria-current={activePath === to ? "page" : undefined}
              className={`app-sidebar__nav-link ${activePath === to ? "app-sidebar__nav-link--active" : ""}`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar__account">
          <div className="app-sidebar__account-summary">
            <div className="app-sidebar__avatar" aria-hidden="true">{auth.name?.charAt(0) || "K"}</div>
            <div className="app-sidebar__account-copy">
              <div className="app-sidebar__account-name">{auth.name || "JobKaki user"}</div>
              <div className="app-sidebar__account-plan">Personal workspace</div>
            </div>
          </div>
          <button type="button" onClick={() => void auth.logout()} className="app-sidebar__logout">
            <LogOut size={15} aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>
      <div className="app-shell__workspace">
        <header className="app-shell__header">
          <div className="app-shell__header-start">
            <button type="button" className="app-shell__menu" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open}>
              <Menu size={22} />
            </button>
            <span className="app-shell__page-name">{selected?.label || "AI Job Kaki"}</span>
          </div>
          <div className="app-shell__header-actions">
            <a href="https://github.com/yjrd21/AI_Job_Kaki" target="_blank" rel="noreferrer" aria-label="Help and project source">
              <HelpCircle size={19} />
            </a>
            <span className="app-shell__header-avatar" aria-hidden="true">{auth.name?.charAt(0) || "K"}</span>
          </div>
        </header>
        <main id="main-content" className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
