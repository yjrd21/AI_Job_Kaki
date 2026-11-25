import type { MouseEvent, ReactNode } from "react";
import {
  History,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const defaultNavigationItems: readonly NavigationItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyse", label: "Analyse Job", icon: Sparkles },
  { to: "/history", label: "Job History", icon: History },
  { to: "/profiles", label: "Candidate Profiles", icon: Users },
  { to: "/account", label: "Account", icon: UserRound },
];

type AuthenticatedAppLayoutProps = {
  pathname: string;
  userName: string | null;
  isNavigationOpen: boolean;
  onNavigate: (path: string) => void;
  onOpenNavigation: () => void;
  onCloseNavigation: () => void;
  onLogout: () => void;
  children: ReactNode;
  navigationItems?: readonly NavigationItem[];
  brandName?: string;
  helpUrl?: string;
};

function activeNavigationPath(
  pathname: string,
  items: readonly NavigationItem[],
) {
  if (pathname.startsWith("/jobs/")) return "/history";
  return items.find(
    ({ to }) => pathname === to || pathname.startsWith(`${to}/`),
  )?.to;
}

function handleNavigationClick(
  event: MouseEvent<HTMLAnchorElement>,
  path: string,
  onNavigate: (path: string) => void,
  onCloseNavigation: () => void,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  onNavigate(path);
  onCloseNavigation();
}

function Sidebar({
  items,
  activePath,
  userName,
  brandName,
  isOpen,
  onNavigate,
  onClose,
  onLogout,
}: {
  items: readonly NavigationItem[];
  activePath: string | undefined;
  userName: string;
  brandName: string;
  isOpen: boolean;
  onNavigate: (path: string) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const avatar = userName.charAt(0) || "K";

  return (
    <aside
      className={`app-sidebar ${isOpen ? "app-sidebar--open" : ""}`}
      aria-label="Application sidebar"
    >
      <div className="app-sidebar__brand-row">
        <a
          className="app-sidebar__brand"
          href="/dashboard"
          onClick={(event) =>
            handleNavigationClick(event, "/dashboard", onNavigate, onClose)
          }
        >
          <span className="app-sidebar__brand-mark" aria-hidden="true">
            K
          </span>
          <strong>{brandName}</strong>
        </a>
        <button
          className="app-sidebar__close"
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>
      <nav aria-label="Main navigation" className="app-sidebar__nav">
        {items.map(({ to, label, icon: Icon }) => (
          <a
            key={to}
            href={to}
            onClick={(event) =>
              handleNavigationClick(event, to, onNavigate, onClose)
            }
            aria-current={activePath === to ? "page" : undefined}
            className={`app-sidebar__nav-link ${activePath === to ? "app-sidebar__nav-link--active" : ""}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="app-sidebar__account">
        <div className="app-sidebar__account-summary">
          <div className="app-sidebar__avatar" aria-hidden="true">
            {avatar}
          </div>
          <div className="app-sidebar__account-copy">
            <div className="app-sidebar__account-name">{userName}</div>
            <div className="app-sidebar__account-plan">Personal workspace</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="app-sidebar__logout"
        >
          <LogOut size={15} aria-hidden="true" /> Log out
        </button>
      </div>
    </aside>
  );
}

function Header({
  pageName,
  brandName,
  userName,
  helpUrl,
  isNavigationOpen,
  onOpenNavigation,
}: {
  pageName: string;
  brandName: string;
  userName: string;
  helpUrl: string;
  isNavigationOpen: boolean;
  onOpenNavigation: () => void;
}) {
  return (
    <header className="app-shell__header">
      <div className="app-shell__header-start">
        <button
          type="button"
          className="app-shell__menu"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          aria-expanded={isNavigationOpen}
        >
          <Menu size={22} />
        </button>
        <span className="app-shell__page-name">{pageName || brandName}</span>
      </div>
      <div className="app-shell__header-actions">
        <a
          href={helpUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Help and project source"
        >
          <HelpCircle size={19} />
        </a>
        <span className="app-shell__header-avatar" aria-hidden="true">
          {userName.charAt(0) || "K"}
        </span>
      </div>
    </header>
  );
}

export function AuthenticatedAppLayout({
  pathname,
  userName,
  isNavigationOpen,
  onNavigate,
  onOpenNavigation,
  onCloseNavigation,
  onLogout,
  children,
  navigationItems = defaultNavigationItems,
  brandName = "AI Job Kaki",
  helpUrl = "https://github.com/yjrd21/AI_Job_Kaki",
}: AuthenticatedAppLayoutProps) {
  const displayName = userName || "JobKaki user";
  const activePath = activeNavigationPath(pathname, navigationItems);
  const pageName = navigationItems.find(({ to }) => to === activePath)?.label;

  return (
    <div className="app-shell">
      {isNavigationOpen && (
        <button
          type="button"
          className="app-shell__scrim"
          onClick={onCloseNavigation}
          aria-label="Close navigation overlay"
        />
      )}
      <Sidebar
        items={navigationItems}
        activePath={activePath}
        userName={displayName}
        brandName={brandName}
        isOpen={isNavigationOpen}
        onNavigate={onNavigate}
        onClose={onCloseNavigation}
        onLogout={onLogout}
      />
      <div className="app-shell__workspace">
        <Header
          pageName={pageName ?? ""}
          brandName={brandName}
          userName={displayName}
          helpUrl={helpUrl}
          isNavigationOpen={isNavigationOpen}
          onOpenNavigation={onOpenNavigation}
        />
        <main id="main-content" className="app-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
