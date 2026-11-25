import type { CandidateContextForm } from "../../application/contracts/presenters/CandidateContextPresenterContract";
import type { CandidateContext } from "../../domain/models/CandidateContext";
import type { CandidateContextController } from "./CandidateContextController";
import type {
  PrimaryContextPresentation,
  ProfilePresentation,
} from "../presenters/CandidateContextPresenter";
import type { ProfileEditorPresenter } from "../presenters/ProfileEditorPresenter";
import { fileToBase64 } from "../views/utils/fileUtils";

export class ProfileEditorController {
  constructor(
    private readonly candidateContextController: CandidateContextController<
      PrimaryContextPresentation,
      ProfilePresentation[]
    >,
  ) {}

  validateProfile(input: unknown) {
    return this.candidateContextController.validateProfile(input);
  }

  async loadProfile(
    userId: string | null,
    profileId: string,
    presenter: ProfileEditorPresenter,
  ) {
    const request = presenter.beginProfileLoad();
    let context: CandidateContext;
    try {
      if (!userId || !profileId) {
        throw new Error(
          "A user and profile ID are required to load a profile.",
        );
      }
      context = await this.candidateContextController.getContext(
        userId,
        profileId,
      );
    } catch (error) {
      presenter.presentProfileFailure(request, error);
      return;
    }
    presenter.presentProfile(
      request,
      this.candidateContextController.getEditorValues(context),
      context.cvFileName,
    );
  }

  async chooseCv(file: File | null, presenter: ProfileEditorPresenter) {
    const selection = presenter.beginFileSelection();
    if (!file) return;

    presenter.presentFileLoading(selection);
    try {
      presenter.presentCv(selection, {
        name: file.name,
        content: await fileToBase64(file),
      });
    } catch (error) {
      presenter.presentFileFailure(selection, error);
    }
  }

  async saveProfile(
    userId: string | null,
    profileId: string | undefined,
    values: CandidateContextForm,
    presenter: ProfileEditorPresenter,
  ) {
    const state = presenter.getSnapshot();
    if (state.cvLoading || state.fileError) return false;

    const request = presenter.beginSave();
    try {
      if (!userId) {
        throw new Error("Saving a profile requires an authenticated user.");
      }
      const input = this.candidateContextController.prepareProfile(
        values,
        presenter.getSnapshot().cv,
      );
      await this.candidateContextController.saveContext(
        userId,
        input,
        profileId,
      );
      return presenter.presentSaveSuccess(request);
    } catch (error) {
      presenter.presentSaveFailure(request, error);
      return false;
    }
  }
}
