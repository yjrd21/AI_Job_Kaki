"""Isolated regressions for the supervised entry point; no model or service calls."""

import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".agents/skills/jobkaki-refinement/scripts/state.py"
SPEC = importlib.util.spec_from_file_location("refinement_state", SCRIPT)
workflow = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(workflow)


def package(kind, suffix="1"):
    data = {
        "id": kind + "-" + suffix,
        "topic": "Desktop test fixture",
        "summary": "Review this bounded package",
        "evidence": ["fixture://report"],
    }
    if kind == "findings":
        data["findings"] = [
            {"id": "F1", "summary": "Fixture finding", "evidence": ["fixture://source"]}
        ]
    elif kind == "tests":
        data.update(
            tests=["fixture://tests"],
            baseline="fixture-source-v1",
            checks=[{"command": "fixture baseline", "exit_code": 0}],
        )
    elif kind == "task":
        data["contract"] = contract(target="governance", finding_ids=[])
    elif kind == "phase_transition":
        data.update(from_phase="DISCOVERY_PREREQUISITES", to_phase="WORKFLOW_SETUP",
                    exit_evidence=["fixture://readiness"], deferred_items=[])
    elif kind == "merge":
        data.update(disposition="accepted_without_publication", source_identity="accepted-source")
    elif kind == "activation":
        data["safeguards"] = {k: ["fixture://negative-and-positive-control-tests"]
                              for k in workflow.SAFEGUARDS}
    else:
        data["planned_tests"] = ["Cover the reported behaviour"]
    return data


def contract(target="frontend", finding_ids=None, task_id="task-1", checkout="/fixture", base="a" * 40):
    return dict(id=task_id, target=target, scope="One explicitly approved task",
                acceptance_criteria=["Observable behaviour meets the approved contract"],
                finding_ids=["F1"] if finding_ids is None else finding_ids,
                checkout=checkout, baseline_head=base)


class TransitionTests(unittest.TestCase):
    def setUp(self):
        self.state = workflow.fresh_state("/fixture", {"head": "fixture-head", "working_tree": ""})

    def event(self, event_type, **data):
        envelope = {
            "type": event_type,
            "run_id": self.state["run_id"],
            "revision": self.state["revision"],
            "owner": "coordinator",
        }
        envelope.update(data)
        self.state = workflow.apply_event(self.state, envelope)

    def rejected(self, event_type, **data):
        before = copy.deepcopy(self.state)
        with self.assertRaises(workflow.StateError):
            self.event(event_type, **data)
        self.assertEqual(self.state, before)

    def review(self, kind, data=None):
        if not self.state["claim"]:
            self.event("CLAIM")
        if kind == "tests" and self.state["task"] is None:
            self.event("TASK_DEFINED", contract=contract())
        data = data or package(kind)
        if kind == "merge":
            data["candidate"] = self.state["candidate"]
        self.event("REVIEW_READY", kind=kind, package=data)

    def decide(self, approved=True, **overrides):
        pending = self.state["pending_review"]
        decision = {
            "review_id": pending["package"]["id"],
            "review_sha256": pending["sha256"],
            "approved": approved,
            "human_reply": "Approve this package" if approved else "Revise the tests",
            "source_reference": "fixture://human-response",
        }
        if pending["kind"] == "findings" and approved:
            decision["finding_ids"] = [f["id"] for f in pending["package"]["findings"]]
        decision.update(overrides)
        self.event("HUMAN_DECISION", **decision)

    def ready(self):
        self.review("findings")
        self.decide()
        self.review("tests")
        self.decide()

    def start_implementation(self):
        self.ready()
        self.event("CLAIM")
        self.event(
            "WORK_STARTED",
            readiness_evidence=["fixture://readiness"],
            execution_authorisation="fixture supervised task approval",
        )

    def capture(self, candidate="candidate", paths=None):
        paths = ["Frontend/src/view.tsx"] if paths is None else paths
        self.event("DIFF_CAPTURED", snapshot=dict(
            checkout=self.state["task"]["checkout"], base=self.state["task"]["baseline_head"],
            candidate=candidate, paths=paths, file_count=len(paths)))

    def finish_task(self, candidate="candidate"):
        self.capture(candidate)
        self.event("VERIFICATION_READY", candidate=candidate)
        self.event("VERIFIED", candidate=candidate, outcome="PASS", evidence=["fixture://verifier"])
        self.event("COMPLETE", summary="Task checked", evidence=["fixture://report"],
                   final_gate_evidence=["fixture://gate"])

    def accept_task(self):
        self.review("merge")
        self.decide()

    def test_pending_review_never_dispatches_implementation_or_accepts_trigger_as_approval(self):
        self.review("findings")
        self.assertEqual(workflow.next_action(self.state), "AWAIT_HUMAN_REVIEW")
        self.rejected("CLAIM")
        pending = self.state["pending_review"]
        self.rejected(
            "HUMAN_DECISION",
            review_id=pending["package"]["id"],
            review_sha256=pending["sha256"],
            approved=True,
            human_reply="Execute frontend refinement",
            source_reference="fixture://trigger",
        )
        self.decide()
        self.event("CLAIM")
        self.rejected(
            "WORK_STARTED", readiness_evidence=["fixture"], execution_authorisation="fixture"
        )
        self.rejected("WORKER_STARTED", role="implementer", worker_id="not-authorised")

    def test_approval_is_bound_to_the_review_digest_and_needs_readiness(self):
        self.review("findings")
        self.decide()
        self.review("tests")
        pending = self.state["pending_review"]
        self.rejected(
            "HUMAN_DECISION",
            review_id=pending["package"]["id"],
            review_sha256="different",
            approved=True,
            human_reply="Approve",
            source_reference="fixture://reply",
        )
        self.decide()
        self.assertEqual(workflow.next_action(self.state), "CHECK_READINESS")
        self.event("CLAIM")
        self.rejected("WORK_STARTED")
        self.event(
            "WORK_STARTED",
            readiness_evidence=["fixture://readiness"],
            execution_authorisation="fixture supervised approval",
        )
        self.assertEqual(self.state["stage"], "IMPLEMENTATION")

    def test_inadequate_tests_require_test_only_approval_and_renewed_review(self):
        self.review("findings")
        self.decide()
        self.review("tests")
        self.decide(False)
        self.assertEqual(workflow.next_action(self.state), "PROPOSE_TEST_ONLY_PREPARATION")
        self.event("CLAIM")
        self.rejected(
            "WORK_STARTED", readiness_evidence=["fixture"], execution_authorisation="fixture"
        )
        self.review("test_preparation")
        self.decide()
        self.assertEqual(workflow.next_action(self.state), "PREPARE_APPROVED_TESTS_ONLY")
        self.event("CLAIM")
        self.rejected(
            "WORK_STARTED", readiness_evidence=["fixture"], execution_authorisation="fixture"
        )
        self.event("WORKER_STARTED", role="implementer", worker_id="test-author")
        self.rejected("WORKER_STARTED", role="verifier", worker_id="test-verifier")
        self.event("WORKER_FINISHED", worker_id="test-author")
        self.event("WORKER_STARTED", role="verifier", worker_id="test-verifier")
        self.event("WORKER_FINISHED", worker_id="test-verifier")
        self.review("tests", package("tests", "revised"))
        self.assertEqual(workflow.next_action(self.state), "AWAIT_HUMAN_REVIEW")
        self.decide()
        self.assertEqual(self.state["stage"], "READY_FOR_IMPLEMENTATION")

    def test_unknown_baseline_failure_cannot_be_presented_as_ready(self):
        self.review("findings")
        self.decide()
        self.event("CLAIM")
        failing = package("tests")
        failing["checks"][0]["exit_code"] = 1
        self.rejected("REVIEW_READY", kind="tests", package=failing)
        failing["checks"][0].update(
            expected_defect=True, defect_reference="fixture://reported-defect"
        )
        self.review("tests", failing)
        self.assertEqual(self.state["stage"], "TEST_REVIEW")

    def test_claims_and_active_workers_prevent_duplicate_dispatch(self):
        self.event("CLAIM")
        self.event("WORKER_STARTED", role="discovery", worker_id="worker-1")
        self.assertEqual(workflow.next_action(self.state), "BUSY")
        self.rejected("CLAIM", owner="another-coordinator")
        self.rejected("WORKER_STARTED", role="discovery", worker_id="worker-2")
        self.rejected("RELEASE")
        self.event("WORKER_FINISHED", worker_id="worker-1")
        self.event("RELEASE")
        self.assertEqual(workflow.next_action(self.state), "DISPATCH_DISCOVERY")

    def test_discovery_packages_remain_bounded_and_keep_overflow_backlog(self):
        self.event("CLAIM")
        oversized = package("findings")
        oversized["findings"] = [
            {"id": str(n), "summary": "Separate decision", "evidence": ["fixture"]}
            for n in range(6)
        ]
        self.rejected("REVIEW_READY", kind="findings", package=oversized)
        valid = package("findings")
        valid["backlog"] = [{"id": "F2", "summary": "Next package"}]
        self.review("findings", valid)
        self.assertEqual({f["id"] for f in self.state["backlog"]}, {"F1", "F2"})

    def test_retry_rounds_and_unique_paths_survive_checkpoints(self):
        self.start_implementation()
        self.capture("initial")
        self.capture("reverted", paths=[])
        self.assertEqual(self.state["changed_paths"], [])
        self.rejected("PATHS_CHANGED", paths=["untrusted-list"])
        self.rejected("DIFF_CAPTURED", snapshot=dict(
            checkout="/fixture", base="a" * 40, candidate="too-large",
            paths=["file" + str(i) for i in range(11)], file_count=11))
        for round_number in range(4):
            candidate = "candidate-" + str(round_number)
            self.capture(candidate)
            self.event("VERIFICATION_READY", candidate=candidate)
            self.rejected("VERIFIED", candidate="wrong", outcome="PASS", evidence=["fixture"])
            self.event(
                "VERIFIED",
                candidate=candidate,
                outcome="FAIL",
                evidence=["fixture://verification"],
                findings=["V1"],
            )
            if round_number < 3:
                self.event("FIX_STARTED", finding_ids=["V1"])
        self.assertEqual(self.state["stage"], "FAILED")
        self.assertEqual(self.state["fix_retries"], 3)
        self.assertEqual(self.state["verification_rounds"], 4)
        self.assertEqual(workflow.next_action(self.state), "REPORT_TERMINAL")
        self.rejected("FIX_STARTED", finding_ids=["V1"])

    def test_changed_tests_return_to_review_without_resetting_accounting(self):
        self.start_implementation()
        self.capture("v1")
        self.event("VERIFICATION_READY", candidate="v1")
        self.event(
            "VERIFIED", candidate="v1", outcome="FAIL", evidence=["fixture"], findings=["V1"]
        )
        self.event("FIX_STARTED", finding_ids=["V1"])
        self.event("TESTS_CHANGED", reason="Coverage needs an approved additional case")
        self.assertEqual(self.state["stage"], "TEST_PREPARATION_PLAN")
        self.assertNotIn("tests", self.state["reviews"])
        self.assertEqual(self.state["fix_retries"], 1)
        self.assertEqual(self.state["verification_rounds"], 1)
        self.assertEqual(self.state["changed_paths"], ["Frontend/src/view.tsx"])
        self.rejected(
            "WORK_STARTED", readiness_evidence=["fixture"], execution_authorisation="fixture"
        )

    def test_backend_and_geometry_discrepancies_are_terminal_with_no_pr(self):
        for discrepancy in ("Backend contract discrepancy", "Screenshot geometry mismatch"):
            with self.subTest(discrepancy=discrepancy):
                self.setUp()
                self.event("CLAIM")
                self.rejected(
                    "BLOCKED",
                    summary=discrepancy,
                    evidence=["fixture"],
                    pr="https://example.test/pr",
                )
                self.event("BLOCKED", summary=discrepancy, evidence=["fixture"])
                self.assertIsNone(self.state["report"]["pr"])
                self.assertEqual(workflow.next_action(self.state), "REPORT_TERMINAL")
                self.rejected("CLAIM")

    def test_discrepancy_also_stops_a_run_awaiting_human_review(self):
        self.review("findings")
        self.event(
            "BLOCKED",
            summary="Screenshot geometry mismatch discovered at review",
            evidence=["fixture://dimensions"],
        )
        self.assertEqual(workflow.next_action(self.state), "REPORT_TERMINAL")
        self.assertIsNone(self.state["pending_review"])
        self.assertIsNone(self.state["report"]["pr"])

    def test_success_requires_final_verification_and_gate_evidence(self):
        self.start_implementation()
        self.rejected(
            "COMPLETE", summary="premature", evidence=["fixture"], final_gate_evidence=["fixture"]
        )
        self.capture("verified-candidate")
        self.event("VERIFICATION_READY", candidate="verified-candidate")
        self.event("VERIFIED", candidate="verified-candidate", outcome="PASS", evidence=["fixture"])
        self.rejected("COMPLETE", summary="missing gate", evidence=["fixture"])
        self.event(
            "COMPLETE",
            summary="Fixture-only completed run",
            evidence=["fixture"],
            final_gate_evidence=["fixture://gate"],
        )
        self.assertEqual(self.state["stage"], "MERGE_REVIEW_PREPARATION")
        self.assertEqual(self.state["backlog"][0]["status"], "open")
        self.accept_task()
        self.assertEqual(self.state["stage"], "PHASE_READINESS")
        self.assertEqual(self.state["backlog"][0]["status"], "resolved")
        self.assertEqual(len(self.state["completed_tasks"]), 1)

    def clean_topic(self, backlog=None):
        data = package("findings", "clean")
        data.update(findings=[], backlog=backlog or [])
        self.review("findings", data)

    def start_reviewed_task(self, target, task_id):
        data = package("task", task_id)
        data["contract"] = contract(target, [], task_id)
        self.review("task", data)
        self.decide()
        self.review("tests", package("tests", task_id))
        self.decide()
        self.event("CLAIM")
        self.event("WORK_STARTED", readiness_evidence=["fixture://readiness"],
                   execution_authorisation="fixture human-approved scope")

    def test_clean_topic_preserves_existing_backlog_and_never_completes_pipeline(self):
        self.review("findings")
        self.decide(False)
        self.clean_topic()
        self.assertEqual(self.state["stage"], "PHASE_READINESS")
        self.assertEqual(self.state["backlog"][0]["id"], "F1")
        self.assertEqual(workflow.next_action(self.state), "ASSESS_PHASE_READINESS")
        self.event("CLAIM")
        self.rejected("REVIEW_READY", kind="phase_transition", package=package("phase_transition"))
        self.event("CONTINUE_PHASE")
        self.event("RELEASE")
        self.assertEqual(workflow.next_action(self.state), "DISPATCH_DISCOVERY")

    def test_reobserved_resolved_or_deferred_finding_reopens_and_blocks_transition(self):
        for previous in ("resolved", "deferred"):
            with self.subTest(previous=previous):
                self.setUp()
                if previous == "resolved":
                    self.start_implementation()
                    self.finish_task()
                    self.accept_task()
                    self.event("CLAIM")
                else:
                    self.clean_topic([dict(id="F1", summary="Previously deferred issue")])
                    self.event("CLAIM")
                    self.event("BACKLOG_DECISION", finding_id="F1", disposition="deferred",
                               blocking=False, human_reply="Defer this optional finding",
                               source_reference="fixture://human", rationale="Outside approved scope",
                               evidence=["fixture://deferral"])
                self.event("CONTINUE_PHASE")
                data = package("findings", "reobserved")
                data["findings"][0].update(summary="Defect observed again", evidence=["fixture://new-failure"])
                self.review("findings", data)
                item = self.state["backlog"][0]
                self.assertEqual(item["status"], "open")
                self.assertTrue(item["blocking"])
                self.assertEqual(item["evidence"], ["fixture://new-failure"])
                self.assertEqual(item["prior_resolutions"][-1]["status"], previous)
                self.assertNotIn("resolution", item)
                self.decide(False)
                self.clean_topic()
                self.event("CLAIM")
                self.rejected("REVIEW_READY", kind="phase_transition", package=package("phase_transition"))

    def test_transition_rejection_and_separate_scope_approval(self):
        self.clean_topic()
        self.review("phase_transition")
        self.decide(False)
        self.assertEqual(self.state["phase"], "DISCOVERY_PREREQUISITES")
        self.assertEqual(self.state["stage"], "PHASE_READINESS")
        self.review("phase_transition")
        self.decide()
        self.assertEqual(self.state["phase"], "WORKFLOW_SETUP")
        self.assertEqual(self.state["stage"], "TASK_PLANNING")
        self.event("CLAIM")
        self.rejected("WORK_STARTED", readiness_evidence=["fixture"], execution_authorisation="fixture")
        self.rejected("REVIEW_READY", kind="task", package=dict(
            package("task"), contract=contract("backend", [])))
        self.review("task")
        self.decide(False)
        self.assertIsNone(self.state["task"])
        self.assertEqual(self.state["stage"], "TASK_PLANNING")

    def test_phase_skip_and_deferred_blocker_are_rejected(self):
        self.clean_topic([dict(id="B1", summary="Needs a design decision")])
        self.event("CLAIM")
        skipped = package("phase_transition")
        skipped["to_phase"] = "DESKTOP_PILOT"
        self.rejected("REVIEW_READY", kind="phase_transition", package=skipped)
        self.rejected("BACKLOG_DECISION", finding_id="B1", disposition="deferred", blocking=False)
        decision = dict(finding_id="B1", disposition="deferred", blocking=True,
                        human_reply="Defer this item; it still blocks readiness",
                        source_reference="fixture://human", rationale="Required state is missing",
                        evidence=["fixture://design"])
        self.event("BACKLOG_DECISION", **decision)
        self.rejected("REVIEW_READY", kind="phase_transition", package=package("phase_transition"))
        decision.update(blocking=False, human_reply="The approved scope excludes this optional state")
        self.event("BACKLOG_DECISION", **decision)
        self.rejected("REVIEW_READY", kind="phase_transition", package=package("phase_transition"))
        data = package("phase_transition")
        data["deferred_items"] = [dict(id="B1", rationale="Optional state excluded by approved scope")]
        self.review("phase_transition", data)
        self.decide()
        self.assertEqual(self.state["phase"], "WORKFLOW_SETUP")

    def test_full_simulated_pipeline_with_backend_merge_setup_and_activation(self):
        self.review("findings")
        self.decide()
        self.event("CLAIM")
        self.event("TASK_DEFINED", contract=contract("backend", task_id="backend-prerequisite"))
        self.review("tests")
        self.decide()
        self.event("CLAIM")
        self.event("WORK_STARTED", readiness_evidence=["fixture://service-baseline"],
                   execution_authorisation="fixture supervised backend approval")
        self.event("WORKER_STARTED", role="implementer", worker_id="backend-writer")
        self.event("WORKER_FINISHED", worker_id="backend-writer")
        self.capture("backend-candidate", ["Backend/service/Contract.java", "Backend/service/ContractTest.java"])
        self.event("VERIFICATION_READY", candidate="backend-candidate")
        self.event("WORKER_STARTED", role="verifier", worker_id="backend-verifier")
        self.event("WORKER_FINISHED", worker_id="backend-verifier")
        self.event("VERIFIED", candidate="backend-candidate", outcome="PASS", evidence=["fixture://service-checks"])
        self.event("COMPLETE", summary="Backend prerequisite checked", evidence=["fixture://report"],
                   final_gate_evidence=["fixture://gate"])
        self.review("merge")
        self.decide(False)
        self.assertEqual(self.state["backlog"][0]["status"], "open")
        self.accept_task()
        self.assertEqual(self.state["completed_tasks"][0]["contract"]["target"], "backend")
        self.review("phase_transition")
        self.decide()
        self.start_reviewed_task("governance", "setup-1")
        self.finish_task("setup-candidate")
        self.accept_task()
        data = package("phase_transition", "pilot")
        data.update(from_phase="WORKFLOW_SETUP", to_phase="DESKTOP_PILOT")
        self.review("phase_transition", data)
        self.decide()
        self.assertEqual(self.state["stage"], "ACTIVATION_PREPARATION")
        self.event("CLAIM")
        incomplete = package("activation")
        incomplete["safeguards"].pop("readonly_verification")
        self.rejected("REVIEW_READY", kind="activation", package=incomplete)
        self.rejected("REVIEW_READY", kind="task", package=package("task"))
        self.review("activation")
        self.decide(False)
        self.assertIsNone(self.state["activation"])
        self.review("activation")
        self.decide()
        self.event("CLAIM")
        bad = package("task")
        bad["contract"] = contract("backend", [], "pilot-backend")
        self.rejected("REVIEW_READY", kind="task", package=bad)
        self.event("RELEASE")
        self.start_reviewed_task("frontend", "pilot-1")
        self.finish_task("pilot-candidate")
        self.accept_task()
        self.assertEqual(self.state["stage"], "COMPLETED")
        self.assertEqual(len(self.state["completed_tasks"]), 3)
        self.assertEqual(workflow.next_action(self.state), "REPORT_TERMINAL")
        self.rejected("CLAIM")

    def test_task_contract_cannot_change_and_subset_approval_remains_bounded(self):
        data = package("findings")
        data["findings"].append(dict(id="F2", summary="Separate finding", evidence=["fixture"]))
        self.review("findings", data)
        self.decide(finding_ids=["F1"])
        self.event("CLAIM")
        self.rejected("TASK_DEFINED", contract=contract(finding_ids=["F1", "F2"]))
        self.event("TASK_DEFINED", contract=contract())
        self.rejected("TASK_DEFINED", contract=contract(task_id="changed"))
        self.review("tests")
        self.decide()
        self.event("CLAIM")
        self.event("WORK_STARTED", readiness_evidence=["fixture"], execution_authorisation="fixture")
        self.finish_task()
        self.accept_task()
        self.assertEqual({f["id"] for f in self.state["backlog"] if f["status"] == "open"}, {"F2"})
        self.event("CLAIM")
        self.rejected("REVIEW_READY", kind="phase_transition", package=package("phase_transition"))

    def test_new_candidate_invalidates_pass_and_keeps_round_count(self):
        self.start_implementation()
        self.capture("v1")
        self.event("VERIFICATION_READY", candidate="v1")
        self.event("VERIFIED", candidate="v1", outcome="PASS", evidence=["fixture"])
        self.capture("v2")
        self.assertEqual(self.state["stage"], "VERIFICATION")
        self.assertIsNone(self.state["verification"])
        self.assertEqual(self.state["verification_rounds"], 1)
        self.rejected("COMPLETE", summary="stale", evidence=["fixture"], final_gate_evidence=["fixture"])
        self.rejected("VERIFIED", candidate="v1", outcome="PASS", evidence=["fixture"])
        self.event("VERIFIED", candidate="v2", outcome="PASS", evidence=["fixture"])
        self.assertEqual(self.state["verification_rounds"], 2)

    def test_pilot_backend_discrepancy_stops_without_handoff(self):
        self.clean_topic()
        self.review("phase_transition")
        self.decide()
        self.start_reviewed_task("governance", "setup")
        self.finish_task()
        self.accept_task()
        data = package("phase_transition", "pilot")
        data.update(from_phase="WORKFLOW_SETUP", to_phase="DESKTOP_PILOT")
        self.review("phase_transition", data)
        self.decide()
        self.review("activation")
        self.decide()
        self.start_reviewed_task("frontend", "pilot")
        self.event("BLOCKED", summary="Backend mismatch", evidence=["fixture://contract"])
        self.rejected("CONTINUE_PHASE")
        self.rejected("WORKER_STARTED", role="implementer", worker_id="backend-fix")
        self.assertIsNone(self.state["report"]["pr"])


class CliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="jobkaki-state-test-")
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        subprocess.run(["git", "init", "--quiet", str(self.repo)], check=True, capture_output=True)
        subprocess.run(
            [
                "git",
                "-C",
                str(self.repo),
                "-c",
                "user.name=Fixture",
                "-c",
                "user.email=fixture@example.invalid",
                "-c",
                "core.hooksPath=/dev/null",
                "-c",
                "commit.gpgsign=false",
                "commit",
                "--quiet",
                "--allow-empty",
                "-m",
                "Isolated test baseline",
            ],
            check=True,
            capture_output=True,
        )

    def cli(self, command, event=None, success=True, owner=None):
        args = [sys.executable, "-B", str(SCRIPT), command, "--repo", str(self.repo)]
        if owner:
            args += ["--owner", owner]
        if event:
            event_file = self.repo / ".git" / "event.json"
            event_file.write_text(json.dumps(event))
            args += ["--file", str(event_file)]
        result = subprocess.run(args, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, success, result.stderr)
        return json.loads(result.stdout if success else result.stderr)

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.repo), *args], text=True).strip()

    def commit(self, message="Fixture changes"):
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                 "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false",
                 "commit", "--quiet", "--allow-empty", "-m", message)
        return self.git("rev-parse", "HEAD")

    def send(self, event_type, success=True, **data):
        state = self.cli("status")["state"]
        return self.cli("event", dict(type=event_type, run_id=state["run_id"],
                                     revision=state["revision"], owner="fixture-owner", **data),
                        success=success)

    def submit_review(self, kind, data=None):
        if not self.cli("status")["state"]["claim"]:
            self.send("CLAIM")
        data = data or package(kind)
        if kind == "merge":
            data["candidate"] = self.cli("status")["state"]["candidate"]
        return self.send("REVIEW_READY", kind=kind, package=data)

    def approve(self):
        pending = self.cli("status")["state"]["pending_review"]
        extra = {}
        if pending["kind"] == "findings":
            extra["finding_ids"] = [f["id"] for f in pending["package"]["findings"]]
        return self.send("HUMAN_DECISION", review_id=pending["package"]["id"],
                         review_sha256=pending["sha256"], approved=True,
                         human_reply="Approve the concrete fixture package",
                         source_reference="fixture://human", **extra)

    def implementation(self):
        self.cli("enter")
        self.submit_review("findings")
        self.approve()
        self.send("CLAIM")
        task = contract(checkout=str(self.repo.resolve()), base=self.git("rev-parse", "HEAD"))
        self.send("TASK_DEFINED", contract=task)
        self.submit_review("tests")
        self.approve()
        self.send("CLAIM")
        self.send("WORK_STARTED", readiness_evidence=["fixture://baseline"],
                  execution_authorisation="fixture supervised scope")

    def test_actual_diff_includes_committed_staged_unstaged_tests_deletions_and_renames(self):
        for name in ("tracked.txt", "deleted.txt", "old-name.txt", "reverted.txt"):
            (self.repo / name).write_text("baseline")
        self.git("add", ".")
        base = self.commit()
        (self.repo / "committed.txt").write_text("a committed addition")
        self.git("add", "committed.txt")
        self.commit()
        (self.repo / "tracked.txt").write_text("staged change")
        self.git("add", "tracked.txt")
        (self.repo / "tracked.txt").write_text("also unstaged")
        (self.repo / "deleted.txt").unlink()
        (self.repo / "old-name.txt").rename(self.repo / "new-name.txt")
        (self.repo / "reverted.txt").write_text("temporary edit")
        (self.repo / "reverted.txt").write_text("baseline")
        (self.repo / "tests").mkdir()
        (self.repo / "tests" / "unit.py").write_text("a genuine test still counts")
        snapshot = workflow.capture_diff(self.repo, base)
        self.assertEqual(set(snapshot["paths"]), {
            "committed.txt", "tracked.txt", "deleted.txt", "old-name.txt", "new-name.txt", "tests/unit.py"})
        self.assertEqual(snapshot["file_count"], 6)
        before = snapshot["candidate"]
        (self.repo / "tests" / "unit.py").write_text("changed test")
        self.assertNotEqual(workflow.capture_diff(self.repo, base)["candidate"], before)

    def test_cli_enforces_ten_actual_files_and_allows_reducing_scope(self):
        self.implementation()
        for i in range(10):
            (self.repo / ("file-" + str(i))).write_text("candidate")
        captured = self.cli("capture-diff", owner="fixture-owner")
        self.assertEqual(captured["state"]["diff"]["file_count"], 10)
        eleventh = self.repo / "eleventh-test.py"
        eleventh.write_text("this test cannot be omitted")
        blocked = self.cli("capture-diff", owner="fixture-owner", success=False)
        self.assertIn("10 changed files", blocked["error"])
        self.assertEqual(self.cli("status")["state"], captured["state"])
        self.send("VERIFICATION_READY", candidate=captured["state"]["candidate"], success=False)
        eleventh.unlink()
        # A path touched and removed is absent from the proposed review, not a lifetime budget entry.
        reduced = self.cli("capture-diff", owner="fixture-owner")
        self.assertEqual(reduced["state"]["diff"]["file_count"], 10)
        self.send("VERIFICATION_READY", candidate=reduced["state"]["candidate"])

    def test_cli_rejects_forged_path_lists_and_stale_verification_results(self):
        self.implementation()
        self.send("PATHS_CHANGED", paths=[], success=False)
        self.send("DIFF_CAPTURED", snapshot=dict(paths=[], file_count=0, candidate="forged"), success=False)
        (self.repo / "source.py").write_text("v1")
        saved = self.cli("capture-diff", owner="fixture-owner")["state"]
        self.send("VERIFICATION_READY", candidate=saved["candidate"])
        (self.repo / "source.py").write_text("v2")
        self.send("VERIFIED", candidate=saved["candidate"], outcome="PASS",
                  evidence=["fixture://stale-verification"], success=False)
        self.assertEqual(self.cli("status")["state"]["verification_rounds"], 0)

    def test_cli_candidate_drift_after_pass_requires_fresh_verification(self):
        self.implementation()
        (self.repo / "source.py").write_text("v1")
        saved = self.cli("capture-diff", owner="fixture-owner")["state"]
        self.send("VERIFICATION_READY", candidate=saved["candidate"])
        self.send("VERIFIED", candidate=saved["candidate"], outcome="PASS", evidence=["fixture://verifier"])
        self.cli("check-candidate")
        (self.repo / "source.py").write_text("v2")
        self.cli("check-candidate", success=False)
        self.send("COMPLETE", summary="stale completion", evidence=["fixture"],
                  final_gate_evidence=["fixture"], success=False)
        updated = self.cli("capture-diff", owner="fixture-owner")["state"]
        self.assertEqual(updated["stage"], "VERIFICATION")
        self.assertIsNone(updated["verification"])
        self.assertEqual(updated["verification_rounds"], 1)
        self.send("VERIFIED", candidate=updated["candidate"], outcome="PASS", evidence=["fixture://fresh"])
        self.cli("check-candidate")
        self.send("COMPLETE", summary="fresh completion", evidence=["fixture"],
                  final_gate_evidence=["fixture"])
        self.submit_review("merge")
        self.approve()
        resumed = self.cli("enter")
        self.assertEqual(resumed["state"]["stage"], "PHASE_READINESS")
        self.assertEqual(resumed["state"]["completed_tasks"][0]["verification_rounds"], 2)

    def test_diff_fingerprint_includes_untracked_modes_and_symlink_targets(self):
        base = self.git("rev-parse", "HEAD")
        source = self.repo / "script.sh"
        source.write_text("fixture")
        before = workflow.capture_diff(self.repo, base)
        source.chmod(0o755)
        self.assertNotEqual(before["candidate"], workflow.capture_diff(self.repo, base)["candidate"])
        (self.repo / "link").symlink_to("script.sh")
        before = workflow.capture_diff(self.repo, base)
        (self.repo / "link").unlink()
        (self.repo / "link").symlink_to("elsewhere")
        self.assertNotEqual(before["candidate"], workflow.capture_diff(self.repo, base)["candidate"])

    def test_legacy_state_is_reported_and_preserved(self):
        first = self.cli("enter")
        path = Path(first["state_file"])
        legacy = first["state"]
        legacy["schema_version"] = 1
        path.write_text(json.dumps(legacy))
        self.assertIn("legacy", self.cli("enter", success=False)["error"])
        self.assertEqual(json.loads(path.read_text()), legacy)

    def test_repeated_trigger_resumes_one_run_and_preserves_dirty_source(self):
        source = self.repo / "existing.txt"
        source.write_text("Pre-existing human work")
        first = self.cli("enter")
        second = self.cli("enter")
        self.assertEqual(first["state"], second["state"])
        self.assertEqual(first["state_file"], second["state_file"])
        self.assertEqual(first["next_action"], "DISPATCH_DISCOVERY")
        self.assertIn("existing.txt", first["state"]["baseline"]["working_tree"])
        self.assertEqual(source.read_text(), "Pre-existing human work")
        self.assertTrue(Path(first["artifact_directory"]).is_dir())

    def test_parallel_entry_creates_one_run(self):
        args = [sys.executable, "-B", str(SCRIPT), "enter", "--repo", str(self.repo)]
        processes = [
            subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            for _ in range(4)
        ]
        outputs = []
        for process in processes:
            stdout, stderr = process.communicate(timeout=15)
            self.assertEqual(process.returncode, 0, stderr)
            outputs.append(json.loads(stdout))
        self.assertEqual(len({value["state"]["run_id"] for value in outputs}), 1)

    def test_stale_update_and_corrupt_state_are_not_overwritten(self):
        first = self.cli("enter")
        event = {
            "type": "CLAIM",
            "run_id": first["state"]["run_id"],
            "revision": 0,
            "owner": "fixture-owner",
        }
        claimed = self.cli("event", event)
        self.cli("event", event, success=False)
        self.assertEqual(self.cli("status")["state"], claimed["state"])
        path = Path(first["state_file"])
        path.write_text("{corrupt")
        self.assertEqual(self.cli("enter", success=False)["next_action"], "REPORT_BLOCKER")
        self.assertEqual(path.read_text(), "{corrupt")

    def test_terminal_run_retains_report_on_repeated_trigger(self):
        state = self.cli("enter")["state"]
        for event in (
            {"type": "CLAIM", "owner": "fixture-owner"},
            {
                "type": "BLOCKED",
                "owner": "fixture-owner",
                "summary": "Backend discrepancy",
                "evidence": ["fixture://contract"],
            },
        ):
            event.update(run_id=state["run_id"], revision=state["revision"])
            state = self.cli("event", event)["state"]
        resumed = self.cli("enter")
        self.assertEqual(resumed["state"], state)
        self.assertEqual(resumed["next_action"], "REPORT_TERMINAL")
        self.assertIsNone(state["report"]["pr"])


if __name__ == "__main__":
    unittest.main()
