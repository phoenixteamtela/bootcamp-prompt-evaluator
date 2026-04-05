#!/usr/bin/env python3
"""
Seed script: creates 3 starter projects with realistic prompt progressions.

Each project gets:
  - 3 prompt versions (vague → structured → refined)
  - A 5-case generated dataset
  - 3 eval runs (one per version)

Usage:
    python scripts/seed_starter_projects.py          # add to existing
    python scripts/seed_starter_projects.py --clean   # wipe first, then seed

Requires a running backend at http://localhost:8000 and valid admin creds
set via environment variables (or defaults below for local dev).
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_BASE = os.getenv("API_BASE", "http://localhost:8000")
USERNAME = os.getenv("SEED_USERNAME", "admin")
PASSWORD = os.getenv("SEED_PASSWORD", "BunnyH0p!!@")
MODEL = "claude-haiku-4-5-20251001"

POLL_INTERVAL = 3  # seconds between status checks
POLL_TIMEOUT = 300  # max seconds to wait for a long-running task


# ---------------------------------------------------------------------------
# HTTP helpers (stdlib only)
# ---------------------------------------------------------------------------
def api(method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
    """Make an API call and return parsed JSON."""
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  ERROR {e.code} {method} {path}: {err_body}", file=sys.stderr)
        raise


def login() -> str:
    """Authenticate and return a JWT token."""
    resp = api("POST", "/api/auth/login", {"username": USERNAME, "password": PASSWORD})
    return resp["access_token"]


def poll_dataset(project_id: str, dataset_id: str, token: str) -> dict:
    """Poll until dataset status is 'ready' or 'failed'."""
    elapsed = 0
    while elapsed < POLL_TIMEOUT:
        ds = api("GET", f"/api/projects/{project_id}/datasets/{dataset_id}", token=token)
        status = ds["status"]
        if status == "ready":
            return ds
        if status == "failed":
            print(f"  Dataset generation FAILED", file=sys.stderr)
            sys.exit(1)
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL
    print(f"  Dataset generation timed out after {POLL_TIMEOUT}s", file=sys.stderr)
    sys.exit(1)


def poll_eval_run(project_id: str, run_id: str, token: str) -> dict:
    """Poll until eval run status is 'completed' or 'failed'."""
    elapsed = 0
    while elapsed < POLL_TIMEOUT:
        run = api("GET", f"/api/projects/{project_id}/eval-runs/{run_id}", token=token)
        status = run["status"]
        if status == "completed":
            return run
        if status in ("failed", "cancelled"):
            print(f"  Eval run {status}: {run.get('error_message', '(no message)')}", file=sys.stderr)
            sys.exit(1)
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL
    print(f"  Eval run timed out after {POLL_TIMEOUT}s", file=sys.stderr)
    sys.exit(1)


def delete_all_projects(token: str) -> None:
    """Delete every project (cascades to versions, datasets, eval runs)."""
    projects = api("GET", "/api/projects", token=token)
    if not projects:
        print("  No existing projects to delete.")
        return
    for p in projects:
        api("DELETE", f"/api/projects/{p['id']}", token=token)
        print(f"  Deleted: {p['name']} ({p['id']})")


# ---------------------------------------------------------------------------
# Project definitions
# ---------------------------------------------------------------------------
PROJECTS = [
    {
        "name": "Email Summarizer",
        "task_description": "Summarize a professional email into bullet-point key takeaways.",
        "extra_criteria": (
            "- Output MUST contain a one-sentence TL;DR at the top\n"
            "- Output MUST use bullet points (not paragraphs) for takeaways\n"
            "- Action items MUST be listed separately from informational takeaways\n"
            "- Each action item MUST name the responsible person if mentioned in the email\n"
            "- Output MUST NOT exceed 5 bullet points for takeaways"
        ),
        "prompt_inputs_spec": {
            "email_subject": {
                "description": "The subject line of the email",
                "type": "short_text",
            },
            "email_body": {
                "description": "The full body of the email",
                "type": "document",
            },
        },
        "versions": [
            {
                "label": "First attempt",
                "template": (
                    "Summarize the following email.\n\n"
                    "Subject: {email_subject}\n\n"
                    "{email_body}"
                ),
            },
            {
                "label": "Added structure",
                "template": (
                    "You are an executive assistant. Read the email below and produce a concise summary.\n\n"
                    "Subject: {email_subject}\n\n"
                    "{email_body}\n\n"
                    "Format your response as:\n"
                    "- **Key Takeaways:** bullet-point list of the most important information\n"
                    "- **Action Items:** any tasks or follow-ups mentioned in the email"
                ),
            },
            {
                "label": "Refined with constraints",
                "template": (
                    "You are an executive assistant who produces crisp, actionable email summaries.\n\n"
                    "Subject: {email_subject}\n\n"
                    "{email_body}\n\n"
                    "Respond with EXACTLY this structure:\n"
                    "1. **TL;DR:** One sentence capturing the core message.\n"
                    "2. **Key Takeaways (max 5 bullets):** Prioritize action items and decisions over background info.\n"
                    "3. **Action Items:** List each action with the responsible person, if mentioned.\n\n"
                    "Keep a professional tone. Be concise — no filler phrases."
                ),
            },
        ],
    },
    {
        "name": "Product Description Generator",
        "task_description": "Write a compelling product description from structured product data.",
        "extra_criteria": (
            "- Output MUST lead with customer benefits, not raw specs\n"
            "- Output MUST address the customer directly using second person (\"you\")\n"
            "- Output MUST end with a clear call-to-action\n"
            "- Output MUST be between 80 and 150 words\n"
            "- Price MUST be mentioned and framed as value (not just stated)"
        ),
        "prompt_inputs_spec": {
            "product_name": {
                "description": "Name of the product",
                "type": "short_text",
            },
            "product_specs": {
                "description": "Technical specifications as JSON",
                "type": "json",
            },
            "price": {
                "description": "The retail price",
                "type": "currency_usd",
            },
        },
        "versions": [
            {
                "label": "Basic prompt",
                "template": (
                    "Write a product description for the following product.\n\n"
                    "Product: {product_name}\n"
                    "Specs: {product_specs}\n"
                    "Price: {price}"
                ),
            },
            {
                "label": "Target audience",
                "template": (
                    "You are a copywriter for an e-commerce store. Write a product description that converts browsers into buyers.\n\n"
                    "Product: {product_name}\n"
                    "Specifications: {product_specs}\n"
                    "Price: {price}\n\n"
                    "Guidelines:\n"
                    "- Lead with benefits, not features\n"
                    "- Speak directly to the customer using \"you\"\n"
                    "- End with a clear call-to-action\n"
                    "- Keep it under 150 words"
                ),
            },
            {
                "label": "Polished with examples",
                "template": (
                    "You are a senior e-commerce copywriter. Write a product description that is persuasive, scannable, and on-brand.\n\n"
                    "Product: {product_name}\n"
                    "Specifications: {product_specs}\n"
                    "Price: {price}\n\n"
                    "Requirements:\n"
                    "- Tone: confident, modern, conversational (not salesy or pushy)\n"
                    "- Length: 80-120 words\n"
                    "- Structure: opening hook → key benefits (2-3 bullets) → closing CTA\n"
                    "- Address the customer directly using \"you\"\n"
                    "- Mention the price naturally, framing it as value\n\n"
                    "Example of a good opening hook:\n"
                    "\"Meet your new everyday companion — the [product] that finally gets it right.\"\n\n"
                    "Write the description now."
                ),
            },
        ],
    },
    {
        "name": "Meeting Notes Formatter",
        "task_description": "Turn raw meeting notes into a structured summary with decisions and action items.",
        "extra_criteria": (
            "- Output MUST contain these sections: Summary, Key Decisions, Action Items, Next Steps\n"
            "- Every action item MUST have an assigned owner\n"
            "- Every action item MUST have a deadline (use \"TBD\" if not stated in the notes)\n"
            "- Summary section MUST NOT exceed 200 words\n"
            "- Output MUST list all attendees in a header"
        ),
        "prompt_inputs_spec": {
            "meeting_title": {
                "description": "Title or topic of the meeting",
                "type": "short_text",
            },
            "attendees": {
                "description": "List of meeting participants",
                "type": "list",
            },
            "raw_notes": {
                "description": "Unstructured notes from the meeting",
                "type": "paragraph",
            },
        },
        "versions": [
            {
                "label": "Minimal",
                "template": (
                    "Format these meeting notes.\n\n"
                    "Meeting: {meeting_title}\n"
                    "Attendees: {attendees}\n\n"
                    "{raw_notes}"
                ),
            },
            {
                "label": "Structured output",
                "template": (
                    "You are a professional meeting secretary. Transform the raw notes below into a well-organized meeting summary.\n\n"
                    "Meeting: {meeting_title}\n"
                    "Attendees: {attendees}\n\n"
                    "Raw Notes:\n{raw_notes}\n\n"
                    "Format your output with these sections:\n"
                    "1. **Summary** — 2-3 sentence overview of the meeting\n"
                    "2. **Key Decisions** — bullet list of decisions made\n"
                    "3. **Action Items** — each item must include the owner's name\n"
                    "4. **Next Steps** — upcoming deadlines or follow-up meetings"
                ),
            },
            {
                "label": "Production-ready",
                "template": (
                    "You are a professional meeting secretary producing polished meeting minutes for distribution to stakeholders.\n\n"
                    "Meeting: {meeting_title}\n"
                    "Attendees: {attendees}\n\n"
                    "Raw Notes:\n{raw_notes}\n\n"
                    "Output the meeting minutes in this exact format:\n\n"
                    "## {meeting_title}\n"
                    "**Attendees:** [list from above]\n\n"
                    "### Summary\n"
                    "A concise overview of the meeting (max 200 words). Use a professional, neutral tone.\n\n"
                    "### Key Decisions\n"
                    "- Decision 1\n"
                    "- Decision 2\n\n"
                    "### Action Items\n"
                    "| # | Action | Owner | Deadline |\n"
                    "|---|--------|-------|----------|\n"
                    "| 1 | ...    | ...   | ...      |\n\n"
                    "Every action item MUST have an owner and a deadline (use \"TBD\" if not stated).\n\n"
                    "### Next Steps\n"
                    "- Bullet list of follow-ups\n\n"
                    "Keep the tone professional throughout. Do not editorialize or add information not present in the notes."
                ),
            },
        ],
    },
    {
        "name": "Customer Complaint Response",
        "mode": "conversation",
        "task_description": (
            "Write a prompt that instructs an AI to handle an angry customer complaint. "
            "The customer ordered a birthday gift with express shipping, but it hasn't arrived "
            "and the birthday is tomorrow. The customer is frustrated and wants a resolution."
        ),
        "extra_criteria": None,
        "prompt_inputs_spec": None,
        "versions": [
            {
                "label": "Vague attempt",
                "template": (
                    "Help me respond to an angry customer whose package is late."
                ),
            },
            {
                "label": "Better structure",
                "template": (
                    "You are a customer service representative for an online retailer.\n\n"
                    "A customer is upset because their express-shipped birthday gift hasn't arrived "
                    "and the birthday is tomorrow.\n\n"
                    "Write a response that:\n"
                    "- Acknowledges their frustration\n"
                    "- Apologizes sincerely\n"
                    "- Offers a concrete resolution (expedited re-ship or refund)\n"
                    "- Keeps a professional, empathetic tone\n"
                    "- Is under 200 words"
                ),
            },
            {
                "label": "Full best practices",
                "template": (
                    "<role>\n"
                    "You are a senior customer service representative at a premium online retailer. "
                    "You are known for turning frustrated customers into loyal advocates.\n"
                    "</role>\n\n"
                    "<situation>\n"
                    "A customer ordered a birthday gift with express shipping (2-day delivery). "
                    "The package has not arrived and the recipient's birthday is tomorrow. "
                    "The customer is angry and wants immediate resolution.\n"
                    "</situation>\n\n"
                    "<instructions>\n"
                    "Write a customer service response that:\n"
                    "1. Opens with genuine empathy — acknowledge the specific frustration (ruined birthday surprise)\n"
                    "2. Apologize without being generic — reference their specific situation\n"
                    "3. Offer TWO concrete resolution options:\n"
                    "   a. Emergency overnight re-ship at no cost\n"
                    "   b. Full refund plus a store credit as goodwill gesture\n"
                    "4. Provide a direct contact for follow-up (don't make them go through the queue again)\n"
                    "5. Close with a warm, human touch\n"
                    "</instructions>\n\n"
                    "<format>\n"
                    "- Tone: warm, professional, empathetic (not corporate-speak)\n"
                    "- Length: 150-200 words\n"
                    "- Use the customer's perspective (\"I understand how disappointing...\")\n"
                    "- No bullet points in the actual response — write it as a natural message\n"
                    "</format>\n\n"
                    "<example_opening>\n"
                    "I'm truly sorry about this — I know how much thought goes into choosing the perfect "
                    "birthday gift, and the last thing you need is shipping uncertainty the day before.\n"
                    "</example_opening>"
                ),
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def seed_project(project_def: dict, token: str) -> None:
    """Create one project, its versions, dataset (template only), and eval runs."""
    name = project_def["name"]
    mode = project_def.get("mode", "template")
    print(f"\n{'='*60}")
    print(f"  Project: {name} [{mode}]")
    print(f"{'='*60}")

    # 1. Create project
    create_body: dict = {
        "name": project_def["name"],
        "mode": mode,
        "task_description": project_def["task_description"],
    }
    if mode == "template":
        create_body["prompt_inputs_spec"] = project_def["prompt_inputs_spec"]
    if project_def.get("extra_criteria"):
        create_body["extra_criteria"] = project_def["extra_criteria"]

    proj = api("POST", "/api/projects", create_body, token=token)
    project_id = proj["id"]
    print(f"  Created project: {project_id}")

    # 2. Create prompt versions
    version_ids = []
    for v in project_def["versions"]:
        ver = api("POST", f"/api/projects/{project_id}/versions", {
            "template": v["template"],
            "label": v["label"],
        }, token=token)
        version_ids.append(ver["id"])
        print(f"  Created version {ver['version_number']}: \"{v['label']}\" ({ver['id']})")

    if mode == "conversation":
        # Conversation mode: run eval for each version (no dataset)
        for i, vid in enumerate(version_ids):
            label = project_def["versions"][i]["label"]
            run = api("POST", f"/api/projects/{project_id}/eval-runs", {
                "prompt_version_id": vid,
                "run_model": MODEL,
                "grading_model": MODEL,
            }, token=token)
            run_id = run["id"]
            print(f"  Started conversation eval for v{i+1} \"{label}\": {run_id}")

            print(f"    Waiting for eval...", end="", flush=True)
            result = poll_eval_run(project_id, run_id, token)
            score = result.get("avg_score")
            score_str = f"{score:.1f}" if score is not None else "N/A"
            print(f" done! score={score_str}")
    else:
        # Template mode: generate dataset, then run evals
        # 3. Generate dataset (5 cases)
        ds = api("POST", f"/api/projects/{project_id}/datasets", {
            "name": f"{name} — Starter Dataset",
            "num_cases": 5,
            "generation_model": MODEL,
        }, token=token)
        dataset_id = ds["id"]
        print(f"  Started dataset generation: {dataset_id}")

        # 4. Poll until ready
        print(f"  Waiting for dataset generation...", end="", flush=True)
        ds = poll_dataset(project_id, dataset_id, token)
        print(f" done! ({len(ds['test_cases'])} cases)")

        # 5. Run evals for each version
        for i, vid in enumerate(version_ids):
            label = project_def["versions"][i]["label"]
            run = api("POST", f"/api/projects/{project_id}/eval-runs", {
                "prompt_version_id": vid,
                "dataset_id": dataset_id,
                "run_model": MODEL,
                "grading_model": MODEL,
            }, token=token)
            run_id = run["id"]
            print(f"  Started eval for v{i+1} \"{label}\": {run_id}")

            print(f"    Waiting for eval...", end="", flush=True)
            result = poll_eval_run(project_id, run_id, token)
            score = result.get("avg_score")
            pass_rate = result.get("pass_rate")
            score_str = f"{score:.1f}" if score is not None else "N/A"
            pass_str = f"{pass_rate:.0f}%" if pass_rate is not None else "N/A"
            print(f" done! avg_score={score_str}, pass_rate={pass_str}")


def main():
    clean = "--clean" in sys.argv

    print("Seed Starter Projects")
    print("=" * 60)
    print(f"API: {API_BASE}")
    print(f"User: {USERNAME}")
    print(f"Model: {MODEL}")
    if clean:
        print("Mode: CLEAN (will delete existing projects first)")
    print()

    # Login
    print("Logging in...", end=" ", flush=True)
    token = login()
    print("OK")

    # Clean mode: delete everything first
    if clean:
        print("\nDeleting existing projects...")
        delete_all_projects(token)
    else:
        # Check for existing projects
        existing = api("GET", "/api/projects", token=token)
        if existing:
            print(f"\nFound {len(existing)} existing project(s):")
            for p in existing:
                print(f"  - {p['name']} ({p['id']})")
            print()
            answer = input("Continue and add starter projects? [y/N] ").strip().lower()
            if answer != "y":
                print("Aborted.")
                sys.exit(0)

    # Seed each project
    for project_def in PROJECTS:
        seed_project(project_def, token)

    # Final summary
    print(f"\n{'='*60}")
    print(f"  DONE — All {len(PROJECTS)} projects seeded successfully!")
    print(f"{'='*60}")
    projects = api("GET", "/api/projects", token=token)
    for p in projects:
        score = p.get("latest_avg_score")
        score_str = f"{score:.1f}" if score is not None else "—"
        print(f"  {p['name']}: {p['version_count']} versions, latest avg={score_str}")
    print()


if __name__ == "__main__":
    main()
