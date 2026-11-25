import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Plus, Trash2 } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import {
  Loading,
  ErrorNotice,
  EmptyState,
} from "../components/composed/Feedback";
import type { ProfileController } from "../../controllers/ProfileController";
import { ProfilePresenter } from "../../presenters/ProfilePresenter";

// Display saved candidate profiles with editing and deletion actions.
export function ProfilePage({
  profileController,
}: {
  profileController: ProfileController;
}) {
  const userId = useAuthContext().session.userId;
  const [presenter] = useState(() => new ProfilePresenter());
  const view = useSyncExternalStore(presenter.subscribe, presenter.getSnapshot);
  const loadProfiles = useCallback(
    () => void profileController.loadProfiles(userId, presenter),
    [profileController, presenter, userId],
  );
  // The protected route remounts when the authenticated user changes.
  useEffect(() => {
    loadProfiles();
    return () => presenter.cancelRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Load once per page mount.
  }, []);

  const onDelete = (id: string) => {
    if (
      window.confirm(
        "Delete this candidate profile? Existing job submissions may still reference it.",
      )
    ) {
      void profileController.deleteProfile(userId, id, presenter);
    }
  };

  return (
    <div>
      <p className="eyebrow mb-4">YOUR CAREER DIRECTIONS</p>
      <div className="flex flex-wrap justify-between items-end gap-5 mb-10">
        <div>
          <h1 className="display-title mb-3">Candidate profiles</h1>
          <p className="muted max-w-xl leading-relaxed">
            Different ambitions deserve different perspectives. Build a profile
            for each direction you're exploring.
          </p>
        </div>
        <Link className="btn btn-primary" to="/profiles/new">
          <Plus size={17} /> Create a profile
        </Link>
      </div>
      {view.profiles.status === "loading" ? (
        <Loading />
      ) : view.profiles.status === "error" ? (
        <ErrorNotice error={view.profiles.error} retry={loadProfiles} />
      ) : !view.profiles.data.length ? (
        <EmptyState
          title="Start with your first profile"
          detail="Add a role, preferences and deal-breakers to make your analyses more personal."
          action={
            <Link className="btn btn-primary" to="/profiles/new">
              Create profile <ArrowRight size={15} />
            </Link>
          }
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {view.profiles.data.map((p) => (
            <article className="card p-7" key={p.id}>
              <div className="flex justify-between gap-3 items-start mb-6">
                <span className="eyebrow">PROFILE {p.number}</span>
                <span className="status">ACTIVE</span>
              </div>
              <h2 className="section-title mb-3">{p.title}</h2>
              <p className="text-sm muted mb-5 flex gap-2 items-center">
                <FileText size={15} />
                {p.cvLabel}
              </p>
              <div className="rule mb-5" />
              <div className="grid grid-cols-2 gap-4 mb-7">
                <div>
                  <p className="text-xs muted mb-1">Preferences</p>
                  <p className="text-sm font-medium">{p.preferencesLabel}</p>
                </div>
                <div>
                  <p className="text-xs muted mb-1">Updated</p>
                  <p className="text-sm font-medium">{p.updatedAt}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Link className="btn btn-outline" to={p.href}>
                  View and edit <ArrowRight size={15} />
                </Link>
                <button
                  disabled={view.deleting}
                  aria-label="Delete profile"
                  title="Delete profile"
                  className="p-2 text-[#955b4c] hover:bg-red-50 rounded"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {view.deleteError !== null && (
        <div className="mt-5">
          <ErrorNotice error={view.deleteError} />
        </div>
      )}
    </div>
  );
}
