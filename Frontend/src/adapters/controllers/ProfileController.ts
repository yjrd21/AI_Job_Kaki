import type { CandidateContextController } from "./CandidateContextController";
import type { CandidateContext } from "../../domain/models/CandidateContext";
import type {
  PrimaryContextPresentation,
  ProfilePresentation,
} from "../presenters/CandidateContextPresenter";
import type { ProfilePresenter } from "../presenters/ProfilePresenter";

export class ProfileController {
  constructor(
    private readonly candidateContextController: CandidateContextController<
      PrimaryContextPresentation,
      ProfilePresentation[]
    >,
  ) {}

  async loadProfiles(userId: string | null, presenter: ProfilePresenter) {
    const request = presenter.beginLoad();
    let contexts: CandidateContext[];
    try {
      if (!userId) {
        throw new Error("Profiles require an authenticated user.");
      }
      contexts = await this.candidateContextController.listContexts(userId);
    } catch (error) {
      presenter.presentLoadFailure(request, error);
      return;
    }
    presenter.presentProfiles(
      request,
      this.candidateContextController.getProfiles(contexts),
    );
  }

  async deleteProfile(
    userId: string | null,
    profileId: string,
    presenter: ProfilePresenter,
  ) {
    const request = presenter.beginDelete();
    try {
      if (!userId) {
        throw new Error("Deleting a profile requires an authenticated user.");
      }
      await this.candidateContextController.deleteContext(userId, profileId);
      if (!presenter.presentDeleteSuccess(request)) return;
      await this.loadProfiles(userId, presenter);
    } catch (error) {
      presenter.presentDeleteFailure(request, error);
    }
  }
}
