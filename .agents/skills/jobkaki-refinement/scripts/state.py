#!/usr/bin/env python3
"""Durable, local coordination for the supervised JobKaki skill; never executes agents."""

import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from uuid import uuid4


TERMINAL = {"BLOCKED", "FAILED", "COMPLETED"}
PHASES = ("DISCOVERY_PREREQUISITES", "WORKFLOW_SETUP", "DESKTOP_PILOT")
SAFEGUARDS = {
    "restricted_writes", "readonly_verification", "protected_paths", "approval_gate",
    "diff_budget", "retry_gate", "candidate_integrity", "browser_harness",
    "evidence_storage", "controlled_publication",
}
REVIEW_STAGES = {
    "findings": "FINDINGS_REVIEW",
    "tests": "TEST_REVIEW",
    "test_preparation": "TEST_PREPARATION_REVIEW",
    "task": "TASK_REVIEW",
    "phase_transition": "PHASE_TRANSITION_REVIEW",
    "merge": "MERGE_REVIEW",
    "activation": "ACTIVATION_REVIEW",
}
REVIEW_FROM = {
    "findings": {"DISCOVERY"},
    "tests": {"TEST_REVIEW_PREPARATION", "TEST_PREPARATION", "TEST_REVIEW"},
    "test_preparation": {"TEST_REVIEW_PREPARATION", "TEST_PREPARATION_PLAN"},
    "task": {"TASK_PLANNING"},
    "phase_transition": {"PHASE_READINESS"},
    "merge": {"MERGE_REVIEW_PREPARATION"},
    "activation": {"ACTIVATION_PREPARATION"},
}


class StateError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise StateError(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def trigger_reply(value):
    return isinstance(value, str) and " ".join(value.strip().rstrip(".!?").split()).lower() in {
        "execute frontend refinement",
        "$jobkaki-refinement",
    }


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def fresh_state(repo, baseline):
    return {
        "schema_version": 2,
        "revision": 0,
        "run_id": str(uuid4()),
        "repo": str(repo),
        "baseline": baseline,
        "stage": "DISCOVERY",
        "phase": PHASES[0],
        "task": None,
        "completed_tasks": [],
        "approved_finding_ids": [],
        "activation": None,
        "diff": None,
        "pending_review": None,
        "reviews": {},
        "decisions": [],
        "backlog": [],
        "claim": None,
        "workers": [],
        "changed_paths": [],
        "fix_retries": 0,
        "verification_rounds": 0,
        "verification": None,
        "report": None,
        "history": [],
    }


def next_action(state):
    if state["stage"] in TERMINAL:
        return "REPORT_TERMINAL"
    if state["claim"] or any(w["status"] == "active" for w in state["workers"]):
        return "BUSY"
    if state["pending_review"]:
        return "AWAIT_HUMAN_REVIEW"
    return {
        "DISCOVERY": "DISPATCH_DISCOVERY",
        "PHASE_READINESS": "ASSESS_PHASE_READINESS",
        "TASK_PLANNING": "PREPARE_TASK_SCOPE_REVIEW",
        "MERGE_REVIEW_PREPARATION": "PREPARE_HUMAN_MERGE_REVIEW",
        "ACTIVATION_PREPARATION": "PREPARE_ACTIVATION_REVIEW",
        "TEST_REVIEW_PREPARATION": "PREPARE_TEST_REVIEW",
        "TEST_PREPARATION_PLAN": "PROPOSE_TEST_ONLY_PREPARATION",
        "TEST_PREPARATION": "PREPARE_APPROVED_TESTS_ONLY",
        "READY_FOR_IMPLEMENTATION": "CHECK_READINESS",
        "IMPLEMENTATION": "RESUME_IMPLEMENTATION",
        "VERIFICATION": "DISPATCH_VERIFICATION",
        "VERIFICATION_FAILED": "FIX_SPECIFIC_FINDINGS",
        "FINAL_GATE": "CHECK_PUBLICATION_GATE",
    }[state["stage"]]


def review_package(kind, package):
    require(kind in REVIEW_STAGES, "Unknown review kind")
    require(isinstance(package, dict), "Review package must be an object")
    require(
        all(nonempty(package.get(k)) for k in ("id", "topic", "summary")),
        "Review needs id, topic and summary",
    )
    require(
        isinstance(package.get("evidence"), list)
        and package["evidence"]
        and all(map(nonempty, package["evidence"])),
        "Review needs accessible evidence references",
    )
    if kind == "findings":
        findings = package.get("findings")
        require(
            isinstance(findings, list) and len(findings) <= 5,
            "One discovery package may contain at most five findings",
        )
        require(
            all(
                isinstance(f, dict)
                and nonempty(f.get("id"))
                and nonempty(f.get("summary"))
                and f.get("evidence")
                for f in findings
            ),
            "Each finding needs id, summary and evidence",
        )
        require(len({f["id"] for f in findings}) == len(findings), "Finding IDs must be unique")
        require(isinstance(package.get("backlog", []), list), "Backlog must be a list")
    elif kind == "tests":
        require(
            isinstance(package.get("tests"), list) and package["tests"] and package.get("baseline"),
            "Test review needs tests and baseline identity/evidence",
        )
        checks = package.get("checks")
        require(isinstance(checks, list) and checks, "Test review needs baseline results")
        for check in checks:
            require(
                isinstance(check, dict)
                and nonempty(check.get("command"))
                and type(check.get("exit_code")) is int,
                "Each baseline result needs command and exit_code",
            )
            require(
                check["exit_code"] == 0
                or (
                    check.get("expected_defect") is True and nonempty(check.get("defect_reference"))
                ),
                "Unexplained baseline failures are BLOCKED",
            )
    elif kind == "test_preparation":
        require(
            isinstance(package.get("planned_tests"), list) and package["planned_tests"],
            "Test preparation needs its proposed test-only scope",
        )
    elif kind == "task":
        validate_task(package.get("contract"))
    elif kind == "phase_transition":
        require(package.get("from_phase") in PHASES and package.get("to_phase") in PHASES,
                "Transition needs source and destination phases")
        require(package.get("exit_evidence") and isinstance(package.get("deferred_items"), list),
                "Transition needs phase exit evidence and deferred-item explanations")
    elif kind == "merge":
        require(package.get("disposition") in {"merged", "accepted_without_publication"}
                and nonempty(package.get("source_identity")),
                "Human review needs merge/acceptance evidence and resulting source identity")
    elif kind == "activation":
        safeguards = package.get("safeguards")
        require(isinstance(safeguards, dict) and SAFEGUARDS <= safeguards.keys()
                and all(isinstance(safeguards[k], list) and safeguards[k]
                        and all(map(nonempty, safeguards[k])) for k in SAFEGUARDS),
                "Activation needs demonstrated evidence for every required safeguard")


def validate_task(contract):
    require(isinstance(contract, dict), "A frozen task contract is required")
    require(all(nonempty(contract.get(k)) for k in ("id", "scope", "checkout", "baseline_head")),
            "Task needs id, scope, isolated checkout and baseline commit")
    require(contract.get("target") in {"frontend", "backend", "governance"}, "Unknown task target")
    require(Path(contract["checkout"]).is_absolute()
            and str(Path(contract["checkout"]).resolve()) == contract["checkout"],
            "Task checkout must be an absolute canonical path")
    base = contract["baseline_head"]
    require(len(base) in {40, 64} and all(c in "0123456789abcdef" for c in base),
            "Task baseline must be a full immutable commit SHA, not a branch or HEAD")
    require(isinstance(contract.get("acceptance_criteria"), list) and contract["acceptance_criteria"]
            and all(map(nonempty, contract["acceptance_criteria"])), "Task needs frozen criteria")
    require(isinstance(contract.get("finding_ids"), list), "Task needs approved finding IDs")


def define_task(state, contract):
    validate_task(contract)
    require(state["task"] is None, "The current task contract is immutable")
    require(not any(t["contract"]["id"] == contract["id"] for t in state["completed_tasks"]),
            "Task IDs cannot be reused")
    if state["phase"] == "DISCOVERY_PREREQUISITES":
        require(contract["finding_ids"] and
                set(contract["finding_ids"]) == set(state["approved_finding_ids"]),
                "Prerequisite task must match the specifically approved findings")
    if state["phase"] == "WORKFLOW_SETUP":
        require(contract["target"] == "governance", "Workflow setup requires a governance task")
    if state["phase"] == "DESKTOP_PILOT":
        require(contract["target"] == "frontend" and state["activation"],
                "Pilot needs separate activation and a frontend-only task")
    state.update(task=copy.deepcopy(contract), changed_paths=[], diff=None,
                 verification=None, verification_rounds=0, fix_retries=0, report=None)
    for key in ("tests", "test_preparation"):
        state["reviews"].pop(key, None)


def merge_backlog(state, items, observed_ids=()):
    require(isinstance(items, list), "Backlog must be a list")
    by_id = {f["id"]: f for f in state["backlog"]}
    for item in items:
        require(isinstance(item, dict) and nonempty(item.get("id"))
                and nonempty(item.get("summary")), "Backlog items need stable IDs and summaries")
        if item["id"] not in by_id:
            by_id[item["id"]] = dict(item, status="open", blocking=True)
        elif item["id"] in observed_ids:
            existing = by_id[item["id"]]
            if existing["status"] in {"resolved", "deferred"}:
                existing.setdefault("prior_resolutions", []).append({
                    k: copy.deepcopy(existing.get(k))
                    for k in ("status", "blocking", "resolution", "evidence")
                })
            existing.update({k: copy.deepcopy(v) for k, v in item.items()
                             if k not in {"status", "blocking", "resolution", "prior_resolutions"}})
            existing.update(status="open", blocking=True)
            existing.pop("resolution", None)
    state["backlog"] = list(by_id.values())


def check_transition(state, package):
    index = PHASES.index(state["phase"])
    require(index < len(PHASES) - 1 and package["from_phase"] == state["phase"]
            and package["to_phase"] == PHASES[index + 1], "Cannot skip or reverse phases")
    require(state["task"] is None, "Complete and review the current task first")
    require(all(f["status"] == "resolved" or
                (f["status"] == "deferred" and not f["blocking"]) for f in state["backlog"]),
            "Unresolved prerequisites prevent phase advancement")
    deferred = {f["id"] for f in state["backlog"] if f["status"] == "deferred"}
    require(all(isinstance(f, dict) and nonempty(f.get("id"))
                and nonempty(f.get("rationale")) for f in package["deferred_items"])
            and {f["id"] for f in package["deferred_items"]} == deferred,
            "Explain every explicitly deferred nonblocking item")
    if state["phase"] == "WORKFLOW_SETUP":
        require(any(t["phase"] == "WORKFLOW_SETUP" for t in state["completed_tasks"]),
                "Workflow setup needs independently verified, human-reviewed work")


def capture_diff(checkout, base):
    """Read the complete proposed Git diff; never trust a caller's path list."""
    repo = Path(checkout).resolve()
    base = git(repo, "rev-parse", "--verify", base + "^{commit}")
    def raw(*args):
        return subprocess.check_output(["git", "-C", str(repo), *args])
    patch = raw("diff", "--no-ext-diff", "--no-textconv", "--binary", "--no-renames", base, "--")
    tracked = raw("diff", "--no-ext-diff", "--no-textconv", "--name-only", "--no-renames", "-z", base, "--")
    untracked = raw("ls-files", "--others", "--exclude-standard", "-z")
    decode = lambda data: [os.fsdecode(p) for p in data.split(b"\0") if p]
    paths = sorted(set(decode(tracked) + decode(untracked)))
    files = []
    for name in decode(untracked):
        path = repo / name
        content = os.fsencode(os.readlink(path)) if path.is_symlink() else path.read_bytes()
        files.append([name, path.lstat().st_mode, hashlib.sha256(content).hexdigest()])
    candidate = digest({"base": base, "patch": hashlib.sha256(patch).hexdigest(),
                        "untracked": sorted(files)})
    return {"checkout": str(repo), "base": base, "paths": paths,
            "file_count": len(paths), "candidate": candidate}


def apply_event(original, event):
    """Validate a transition on a copy so rejected events never alter saved state."""
    state = copy.deepcopy(original)
    require(isinstance(event, dict), "Event must be an object")
    require(event.get("run_id") == state["run_id"], "Event run_id does not match")
    require(
        type(event.get("revision")) is int and event["revision"] == state["revision"],
        "Stale event revision; reload status",
    )
    require(state["stage"] not in TERMINAL, "Terminal runs cannot resume or reset automatically")
    kind = event.get("type")
    owner = event.get("owner")
    if kind == "CLAIM":
        require(nonempty(owner), "CLAIM needs an owner ID")
        require(not state["claim"], "BUSY: another coordinator or worker owns this run")
        require(
            not any(w["status"] == "active" for w in state["workers"]),
            "BUSY: an existing worker must be resolved first",
        )
        require(not state["pending_review"], "Human approval is pending; no worker may start")
        state["claim"] = owner
    elif kind == "HUMAN_DECISION":
        require(not state["claim"], "Release the worker claim before human review")
        pending = state["pending_review"]
        require(pending is not None, "No review is pending")
        require(
            event.get("review_id") == pending["package"]["id"]
            and event.get("review_sha256") == pending["sha256"],
            "Decision does not match the reviewed package",
        )
        require(
            type(event.get("approved")) is bool
            and nonempty(event.get("human_reply"))
            and nonempty(event.get("source_reference")),
            "Decision needs an explicit human reply, source reference and approval boolean",
        )
        require(
            not trigger_reply(event["human_reply"]),
            "The trigger itself is not approval of a review package",
        )
        state["decisions"].append(
            {
                k: event[k]
                for k in (
                    "review_id",
                    "review_sha256",
                    "approved",
                    "human_reply",
                    "source_reference",
                )
            }
        )
        state["decisions"][-1]["kind"] = pending["kind"]
        state["decisions"][-1]["phase"] = state["phase"]
        state["decisions"][-1]["task_id"] = state["task"]["id"] if state["task"] else None
        approved, review_kind = event["approved"], pending["kind"]
        state["pending_review"] = None
        ordinary = {
            ("findings", True): "TEST_REVIEW_PREPARATION",
            ("findings", False): "DISCOVERY",
            ("tests", True): "READY_FOR_IMPLEMENTATION",
            ("tests", False): "TEST_PREPARATION_PLAN",
            ("test_preparation", True): "TEST_PREPARATION",
            ("test_preparation", False): "TEST_PREPARATION_PLAN",
        }
        if review_kind in {"findings", "tests", "test_preparation"}:
            state["stage"] = ordinary[(review_kind, approved)]
            if review_kind == "findings" and approved:
                ids = event.get("finding_ids")
                available = {f["id"] for f in pending["package"]["findings"]}
                require(isinstance(ids, list) and ids and set(ids) <= available,
                        "Approval must name the specific findings to implement")
                state["approved_finding_ids"] = ids
        elif review_kind == "task":
            if approved:
                define_task(state, pending["package"]["contract"])
            state["stage"] = "TEST_REVIEW_PREPARATION" if approved else "TASK_PLANNING"
        elif review_kind == "phase_transition":
            if approved:
                check_transition(state, pending["package"])
                state["phase"] = pending["package"]["to_phase"]
                state["stage"] = ("ACTIVATION_PREPARATION" if state["phase"] == "DESKTOP_PILOT"
                                  else "TASK_PLANNING")
            else:
                state["stage"] = "PHASE_READINESS"
        elif review_kind == "activation":
            if approved:
                state["activation"] = copy.deepcopy(pending)
            state["stage"] = "TASK_PLANNING" if approved else "ACTIVATION_PREPARATION"
        elif review_kind == "merge":
            if approved:
                state["completed_tasks"].append({
                    "contract": state["task"], "phase": state["phase"],
                    "report": state["report"], "verification": state["verification"],
                    "diff": state["diff"], "reviews": copy.deepcopy(state["reviews"]),
                    "fix_retries": state["fix_retries"],
                    "verification_rounds": state["verification_rounds"],
                    "acceptance": copy.deepcopy(pending),
                })
                for finding in state["backlog"]:
                    if finding["id"] in state["task"]["finding_ids"]:
                        finding.update(status="resolved", resolution=pending["package"]["evidence"])
                state["task"] = None
                state["approved_finding_ids"] = []
                state["stage"] = ("COMPLETED" if state["phase"] == "DESKTOP_PILOT"
                                  else "PHASE_READINESS")
            else:
                state["stage"] = "MERGE_REVIEW_PREPARATION"
    elif kind in {"BLOCKED", "FAILED"}:
        require(
            nonempty(owner) and (not state["claim"] or owner == state["claim"]),
            "Only the current coordinator may stop a claimed run",
        )
        require(
            nonempty(event.get("summary")) and event.get("evidence") and not event.get("pr"),
            "Blocked/failed reports need evidence and cannot record a PR",
        )
        state.update(
            stage=kind,
            claim=None,
            pending_review=None,
            report={"summary": event["summary"], "evidence": event["evidence"], "pr": None},
        )
    else:
        require(
            state["claim"] and owner == state["claim"], "Event needs the current coordinator claim"
        )
        if kind in {
            "WORK_STARTED",
            "VERIFICATION_READY",
            "VERIFIED",
            "FIX_STARTED",
            "TESTS_CHANGED",
            "COMPLETE",
            "TASK_DEFINED",
            "DIFF_CAPTURED",
        }:
            require(
                not any(w["status"] == "active" for w in state["workers"]),
                "Await the current worker before changing its work stage",
            )
        if kind == "RELEASE":
            require(
                not any(w["status"] == "active" for w in state["workers"]),
                "Await or resolve the active worker before releasing its claim",
            )
            state["claim"] = None
        elif kind == "WORKER_STARTED":
            require(
                nonempty(event.get("worker_id"))
                and event.get("role") in {"discovery", "implementer", "verifier"},
                "Worker needs role and ID",
            )
            allowed = {
                "DISCOVERY": {"discovery"},
                "TEST_PREPARATION": {"implementer", "verifier"},
                "IMPLEMENTATION": {"implementer"},
                "VERIFICATION": {"verifier"},
            }
            require(
                event["role"] in allowed.get(state["stage"], set()),
                "Worker role is not allowed at this checkpoint",
            )
            require(
                not any(w["status"] == "active" for w in state["workers"]),
                "An active worker already exists",
            )
            state["workers"].append(
                {"role": event["role"], "id": event["worker_id"], "status": "active"}
            )
        elif kind == "WORKER_FINISHED":
            active = [
                w
                for w in state["workers"]
                if w["status"] == "active" and w["id"] == event.get("worker_id")
            ]
            require(len(active) == 1, "No matching active worker")
            active[0]["status"] = "finished"
        elif kind == "REVIEW_READY":
            review_kind, package = event.get("kind"), event.get("package")
            require(
                state["stage"] in REVIEW_FROM.get(review_kind, set()),
                "Review kind is out of sequence",
            )
            require(
                not any(w["status"] == "active" for w in state["workers"]),
                "Await the worker before publishing its review",
            )
            review_package(review_kind, package)
            if review_kind == "findings":
                require(state["phase"] == "DISCOVERY_PREREQUISITES", "Discovery is phase one only")
            if review_kind == "phase_transition":
                check_transition(state, package)
            if review_kind == "task":
                # Validate target/phase without changing the real task before human approval.
                define_task(copy.deepcopy(state), package["contract"])
            if review_kind == "tests":
                require(state["task"] is not None, "Freeze the approved task before test review")
            if review_kind == "merge":
                require(package.get("candidate") == state["candidate"],
                        "Human merge/acceptance review must identify the verified candidate")
                if package["disposition"] == "merged":
                    require(nonempty(package.get("pr")) and package["pr"] == state["report"].get("pr"),
                            "Merge review must identify the published task PR")
            record = {"kind": review_kind, "package": package, "sha256": digest(package)}
            state["reviews"][review_kind] = record
            state["pending_review"] = record
            state["stage"] = REVIEW_STAGES[review_kind]
            state["claim"] = None
            if review_kind == "findings":
                merge_backlog(state, package["findings"] + package.get("backlog", []),
                              {f["id"] for f in package["findings"]})
                if not package["findings"]:
                    state.update(
                        stage="PHASE_READINESS",
                        pending_review=None,
                        report={
                            "summary": package["summary"],
                            "evidence": package["evidence"],
                            "pr": None,
                        },
                    )
        elif kind == "TASK_DEFINED":
            require(state["stage"] == "TEST_REVIEW_PREPARATION"
                    and state["phase"] == "DISCOVERY_PREREQUISITES",
                    "Define a prerequisite contract only after named finding approval")
            define_task(state, event.get("contract"))
        elif kind == "CONTINUE_PHASE":
            require(state["stage"] == "PHASE_READINESS", "Reassess readiness first")
            state["stage"] = ("DISCOVERY" if state["phase"] == "DISCOVERY_PREREQUISITES"
                              else "TASK_PLANNING")
        elif kind == "BACKLOG_DECISION":
            require(state["stage"] == "PHASE_READINESS" and nonempty(event.get("human_reply"))
                    and not trigger_reply(event["human_reply"])
                    and nonempty(event.get("source_reference"))
                    and nonempty(event.get("rationale")) and event.get("evidence"),
                    "Backlog decisions need explicit human resolution and evidence")
            items = [f for f in state["backlog"] if f["id"] == event.get("finding_id")]
            require(len(items) == 1 and event.get("disposition") in {"resolved", "deferred"},
                    "Name one existing finding and its disposition")
            require(type(event.get("blocking")) is bool, "Record whether the item still blocks readiness")
            require(event["disposition"] != "resolved" or not event["blocking"],
                    "A resolved finding cannot still block readiness")
            items[0].update(status=event["disposition"], blocking=event["blocking"],
                            resolution=copy.deepcopy(event))
        elif kind == "WORK_STARTED":
            require(
                state["stage"] == "READY_FOR_IMPLEMENTATION",
                "Human test-review approval is required before implementation",
            )
            tests = state["reviews"].get("tests")
            require(
                state["task"] and tests
                and any(
                    d["kind"] == "tests" and d["review_sha256"] == tests["sha256"] and d["approved"]
                    for d in state["decisions"]
                ),
                "No approval of the current test package",
            )
            require(
                event.get("readiness_evidence") and nonempty(event.get("execution_authorisation")),
                "Check actual readiness and execution authorisation separately",
            )
            state["execution"] = {
                "evidence": event["readiness_evidence"],
                "authorisation": event["execution_authorisation"],
            }
            state["stage"] = "IMPLEMENTATION"
        elif kind == "DIFF_CAPTURED":
            require(state["task"] and state["stage"] in {
                "TEST_REVIEW_PREPARATION", "TEST_PREPARATION", "READY_FOR_IMPLEMENTATION",
                "IMPLEMENTATION", "VERIFICATION", "VERIFICATION_FAILED", "FINAL_GATE",
            }, "Capture a diff for the current task only")
            snapshot = event.get("snapshot")
            require(isinstance(snapshot, dict) and isinstance(snapshot.get("paths"), list)
                    and nonempty(snapshot.get("candidate")), "Use the capture-diff command")
            require(snapshot["file_count"] == len(set(snapshot["paths"])) <= 10,
                    "Review exceeds 10 changed files; reduce scope or propose independent tasks")
            require(snapshot["base"] == state["task"]["baseline_head"]
                    and snapshot["checkout"] == state["task"]["checkout"],
                    "Diff must use the frozen task checkout and baseline")
            if state["diff"] and snapshot["candidate"] != state["diff"]["candidate"]:
                require(state["stage"] != "VERIFICATION_FAILED",
                        "Record FIX_STARTED for the specific findings before changing a failed candidate")
                state["verification"] = None
                if state["stage"] in {"VERIFICATION", "FINAL_GATE"}:
                    state["stage"] = "VERIFICATION"
                if state["stage"] == "VERIFICATION":
                    require(state["verification_rounds"] < 4, "Verification-round ceiling reached")
            state["diff"] = copy.deepcopy(snapshot)
            state["changed_paths"] = snapshot["paths"]
            state["candidate"] = snapshot["candidate"]
        elif kind == "TESTS_CHANGED":
            require(
                state["stage"]
                in {
                    "READY_FOR_IMPLEMENTATION",
                    "IMPLEMENTATION",
                    "VERIFICATION",
                    "VERIFICATION_FAILED",
                    "FINAL_GATE",
                }
                and nonempty(event.get("reason")),
                "Test changes need an existing reviewed task and a reason",
            )
            require(
                not any(w["status"] == "active" for w in state["workers"]),
                "Stop and await workers before revising the test plan",
            )
            state["reviews"].pop("tests", None)
            state["verification"] = None
            state["stage"] = "TEST_PREPARATION_PLAN"
        elif kind == "VERIFICATION_READY":
            require(
                state["stage"] == "IMPLEMENTATION" and state["diff"]
                and event.get("candidate") == state["diff"]["candidate"],
                "Verification needs an implementation candidate",
            )
            state["candidate"] = event["candidate"]
            state["stage"] = "VERIFICATION"
        elif kind == "VERIFIED":
            require(
                state["stage"] == "VERIFICATION"
                and event.get("candidate") == state.get("candidate"),
                "Verification must match the frozen candidate",
            )
            require(
                event.get("outcome") in {"PASS", "FAIL", "BLOCKED"} and event.get("evidence"),
                "Verification needs outcome and evidence",
            )
            if event["outcome"] == "FAIL":
                require(
                    isinstance(event.get("findings"), list)
                    and event["findings"]
                    and all(map(nonempty, event["findings"])),
                    "FAIL needs specific verification finding IDs",
                )
            require(state["verification_rounds"] < 4, "Verification-round ceiling reached")
            state["verification_rounds"] += 1
            state["verification"] = {
                k: event.get(k) for k in ("candidate", "outcome", "evidence", "findings")
            }
            state["stage"] = {
                "PASS": "FINAL_GATE",
                "FAIL": "VERIFICATION_FAILED",
                "BLOCKED": "BLOCKED",
            }[event["outcome"]]
            if event["outcome"] == "BLOCKED" or (
                event["outcome"] == "FAIL" and state["fix_retries"] >= 3
            ):
                state["stage"] = "BLOCKED" if event["outcome"] == "BLOCKED" else "FAILED"
                state["report"] = state["verification"]
                state["claim"] = None
        elif kind == "FIX_STARTED":
            require(
                state["stage"] == "VERIFICATION_FAILED" and state["fix_retries"] < 3,
                "No fix retry is available",
            )
            require(
                event.get("finding_ids") and state["verification"].get("findings"),
                "A fix must address specific verification findings",
            )
            require(
                set(event["finding_ids"]) <= set(state["verification"]["findings"]),
                "Fix references unknown verification findings",
            )
            state["fix_retries"] += 1
            state["stage"] = "IMPLEMENTATION"
        elif kind == "COMPLETE":
            require(
                nonempty(event.get("summary")) and event.get("evidence"),
                "Terminal report needs summary and evidence",
            )
            require(
                state["stage"] == "FINAL_GATE" and event.get("final_gate_evidence"),
                "Completion requires independently checked final-gate evidence",
            )
            require(state["verification"] and state["verification"]["outcome"] == "PASS"
                    and state["verification"]["candidate"] == state["diff"]["candidate"],
                    "Completion needs PASS for the current candidate")
            require(not event.get("pr") or nonempty(event.get("publication_authorisation")),
                    "A PR needs separate explicit publication authorisation")
            state["stage"] = "MERGE_REVIEW_PREPARATION"
            state["report"] = {
                k: event.get(k) for k in ("summary", "evidence", "pr", "final_gate_evidence")
            }
            state["claim"] = None
        else:
            raise StateError("Unknown event type")
    state["revision"] += 1
    state["history"].append(copy.deepcopy(event))
    return state


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True).rstrip("\n")


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        epilog="Events: CLAIM, RELEASE, WORKER_STARTED, WORKER_FINISHED, REVIEW_READY, HUMAN_DECISION, TASK_DEFINED, CONTINUE_PHASE, BACKLOG_DECISION, WORK_STARTED, TESTS_CHANGED, VERIFICATION_READY, VERIFIED, FIX_STARTED, BLOCKED, FAILED, COMPLETE. All events need run_id and revision; claimed events also need owner. Review kinds: findings, task, tests, test_preparation, phase_transition, merge, activation. DIFF_CAPTURED is generated only by capture-diff; caller-supplied path lists are unsupported.",
    )
    parser.add_argument("command", choices=("enter", "status", "event", "capture-diff", "check-candidate"))
    parser.add_argument("--repo", default=".")
    parser.add_argument("--file", help="JSON event file; never interpreted as code")
    parser.add_argument("--owner", help="Current coordinator owner for capture-diff")
    args = parser.parse_args()
    repo = Path(git(Path(args.repo).resolve(), "rev-parse", "--show-toplevel")).resolve()
    common = Path(git(repo, "rev-parse", "--git-common-dir"))
    directory = (common if common.is_absolute() else repo / common).resolve() / "jobkaki-refinement"
    path = directory / "current.json"
    if args.command == "status" and not path.exists():
        print(json.dumps({"state": None, "next_action": "NO_RUN"}))
        return
    require(args.command == "enter" or path.exists(), "No run exists; use enter first")
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "state.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        existed = path.exists()
        if existed:
            state = json.loads(path.read_text())
            require(state.get("schema_version") == 2,
                    "Unsupported or legacy state schema; preserve it for explicit human-reviewed migration")
            require(
                state.get("repo") == str(repo),
                "Run belongs to another checkout; use the recorded checkout",
            )
            next_action(state)
        else:
            state = fresh_state(
                repo,
                {
                    "head": git(repo, "rev-parse", "HEAD"),
                    "working_tree": git(repo, "status", "--porcelain=v1", "--untracked-files=all"),
                },
            )
        if args.command == "event":
            require(args.file, "event requires --file")
            event = json.loads(Path(args.file).read_text())
            require(event.get("type") != "DIFF_CAPTURED", "Use capture-diff, not a reported path list")
            if event.get("type") in {"VERIFICATION_READY", "VERIFIED", "COMPLETE"}:
                check_candidate(state)
            state = apply_event(state, event)
        if args.command == "capture-diff":
            require(state["task"], "No frozen task checkout exists")
            snapshot = capture_diff(state["task"]["checkout"], state["task"]["baseline_head"])
            state = apply_event(state, dict(type="DIFF_CAPTURED", run_id=state["run_id"],
                                           revision=state["revision"], owner=args.owner,
                                           snapshot=snapshot))
        if args.command == "check-candidate":
            check_candidate(state)
            require(state["stage"] == "FINAL_GATE" and state["verification"]
                    and state["verification"]["outcome"] == "PASS",
                    "Publication review needs independent PASS for the current candidate")
        if not existed or args.command in {"event", "capture-diff"}:
            fd, temporary = tempfile.mkstemp(prefix="state-", suffix=".json", dir=directory)
            try:
                with os.fdopen(fd, "w") as output:
                    json.dump(state, output, indent=2, sort_keys=True)
                    output.write("\n")
                    output.flush()
                    os.fsync(output.fileno())
                os.replace(temporary, path)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
        artifacts = directory / "artifacts" / state["run_id"]
        artifacts.mkdir(parents=True, exist_ok=True)
        print(
            json.dumps(
                {
                    "state": state,
                    "next_action": next_action(state),
                    "state_file": str(path),
                    "artifact_directory": str(artifacts),
                },
                indent=2,
            )
        )


def check_candidate(state):
    require(state["task"] and state["diff"], "Use capture-diff before verification/publication review")
    current = capture_diff(state["task"]["checkout"], state["task"]["baseline_head"])
    require(current == state["diff"],
            "Candidate changed; capture-diff again and obtain fresh independent verification")
    require(current["file_count"] <= 10, "Review exceeds 10 changed files")


if __name__ == "__main__":
    try:
        main()
    except (
        StateError,
        OSError,
        ValueError,
        KeyError,
        TypeError,
        subprocess.CalledProcessError,
    ) as error:
        print(
            json.dumps({"error": str(error), "next_action": "REPORT_BLOCKER", "pr_created": False}),
            file=sys.stderr,
        )
        sys.exit(1)
