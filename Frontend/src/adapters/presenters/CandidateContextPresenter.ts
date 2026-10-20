import { linesFromList } from "../views/utils/textUtils";
import type { CandidateContextFormContract } from "../../application/contracts/controllers/CandidateContextControllerContract";
import type { CandidateContext } from "../../domain/models/CandidateContext";
import type { CandidateContextPresenterContract } from "../../application/contracts/presenters/CandidateContextPresenterContract";
import { formatDate } from "../views/utils/dateUtils";

// Describe the ready and empty primary-context outcomes consumed by the dashboard.
export type PrimaryContextPresentation =
  | {
      state: "ready";
      heading: string;
      statusLabel: string;
      title: string;
      cvLabel: string;
      targetRoles: string;
      updatedAt: string;
      actionLabel: string;
      actionHref: string;
    }
  | {
      state: "empty";
      heading: string;
      message: string;
      actionLabel: string;
      actionHref: string;
    };

// Describe the labels and destinations used by saved profile cards.
export type ProfilePresentation = {
  id: string;
  number: string;
  title: string;
  cvLabel: string;
  preferencesLabel: string;
  updatedAt: string;
  href: string;
};

// Prepare primary-context labels, dates, and navigation without retaining UI state.
export class CandidateContextPresenter implements CandidateContextPresenterContract<
  PrimaryContextPresentation,
  ProfilePresentation[]
> {
  // Prepare list cards without exposing formatting decisions to the profiles page.
  presentProfiles(contexts: CandidateContext[]): ProfilePresentation[] {
    return contexts.map((context, index) => ({
      id: context.id,
      number: String(index + 1).padStart(2, "0"),
      title: context.targetRoles.join(" · ") || "Candidate profile",
      cvLabel: context.cvFileName || "No CV uploaded",
      preferencesLabel: `${context.preferences.length} listed`,
      updatedAt: formatDate(context.updatedAt),
      href: `/profiles/${encodeURIComponent(context.id)}`,
    }));
  }

  // Prepare multiline editor fields from a saved candidate context.
  presentEditor(context: CandidateContext): CandidateContextFormContract {
    return {
      roles: linesFromList(context.targetRoles),
      preferences: linesFromList(context.preferences),
      redFlags: linesFromList(context.redFlags),
    };
  }

  // Format the primary context selected by the application use case.
  presentPrimary(context: CandidateContext): PrimaryContextPresentation {
    return {
      state: "ready",
      heading: "Primary Context",
      statusLabel: "Ready",
      title: context.targetRoles[0] || "Candidate profile",
      cvLabel: context.cvFileName || "No CV uploaded",
      targetRoles: context.targetRoles.join(" · ") || "Not specified",
      updatedAt: formatDate(context.updatedAt),
      actionLabel: "View Primary Context →",
      actionHref: `/profiles/${encodeURIComponent(context.id)}`,
    };
  }

  // Prepare the dashboard action when the user has no candidate contexts.
  presentEmpty(): PrimaryContextPresentation {
    return {
      state: "empty",
      heading: "Primary Context",
      message: "No candidate profiles yet.",
      actionLabel: "Create Candidate Profile →",
      actionHref: "/profiles/new",
    };
  }
}
