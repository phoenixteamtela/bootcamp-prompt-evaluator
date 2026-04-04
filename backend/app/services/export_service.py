"""Export service — generates HTML reports and ZIP archives."""

import io
import json
import zipfile
from statistics import mean


def generate_html_report(eval_run_data: dict, results: list[dict]) -> str:
    """Generate an HTML evaluation report matching the notebook's format."""
    total_tests = len(results)
    scores = [r["score"] for r in results]
    avg_score = mean(scores) if scores else 0
    pass_rate = (100 * len([s for s in scores if s >= 7]) / total_tests) if total_tests else 0

    rows = ""
    for r in results:
        prompt_inputs_html = "<br>".join(
            f"<strong>{k}:</strong> {v}" for k, v in r.get("prompt_inputs", {}).items()
        )
        criteria_str = "<br>- ".join(r.get("solution_criteria", []))
        score = r["score"]
        if score >= 8:
            score_class = "score-high"
        elif score <= 5:
            score_class = "score-low"
        else:
            score_class = "score-medium"

        rows += f"""
            <tr>
                <td>{r.get("scenario", "")}</td>
                <td class="prompt-inputs">{prompt_inputs_html}</td>
                <td class="criteria">- {criteria_str}</td>
                <td class="output"><pre>{r.get("output", "")}</pre></td>
                <td class="score-col"><span class="score {score_class}">{score}</span></td>
                <td class="reasoning">{r.get("reasoning", "")}</td>
            </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt Evaluation Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }}
        .header {{ background-color: #2B3A57; color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .header h1 {{ margin: 0 0 15px 0; }}
        .summary-stats {{ display: flex; gap: 15px; flex-wrap: wrap; }}
        .stat-box {{ background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; flex: 1; min-width: 160px; }}
        .stat-value {{ font-size: 28px; font-weight: bold; color: #E8832A; margin-top: 5px; }}
        .meta {{ font-size: 13px; opacity: 0.8; margin-top: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th {{ background-color: #2B3A57; color: white; text-align: left; padding: 12px; }}
        td {{ padding: 10px 12px; border-bottom: 1px solid #ddd; vertical-align: top; }}
        tr:nth-child(even) {{ background-color: #f9f9f9; }}
        .output pre {{ background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin: 0;
            font-family: monospace; font-size: 13px; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; }}
        .score {{ font-weight: bold; padding: 5px 10px; border-radius: 4px; display: inline-block; }}
        .score-high {{ background: #c8e6c9; color: #2e7d32; }}
        .score-medium {{ background: #fff9c4; color: #f57f17; }}
        .score-low {{ background: #ffcdd2; color: #c62828; }}
        td {{ width: 20%; }} .score-col {{ width: 80px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Prompt Evaluation Report</h1>
        <div class="summary-stats">
            <div class="stat-box"><div>Total Test Cases</div><div class="stat-value">{total_tests}</div></div>
            <div class="stat-box"><div>Average Score</div><div class="stat-value">{avg_score:.1f} / 10</div></div>
            <div class="stat-box"><div>Pass Rate (≥7)</div><div class="stat-value">{pass_rate:.1f}%</div></div>
        </div>
        <div class="meta">Model: {eval_run_data.get("run_model", "N/A")} | Grading: {eval_run_data.get("grading_model", "N/A")} | Temperature: {eval_run_data.get("temperature", "N/A")}</div>
    </div>
    <table>
        <thead><tr><th>Scenario</th><th>Prompt Inputs</th><th>Solution Criteria</th><th>Output</th><th>Score</th><th>Reasoning</th></tr></thead>
        <tbody>{rows}</tbody>
    </table>
</body>
</html>"""
    return html


def build_project_zip(project_data: dict) -> bytes:
    """Build a ZIP archive for a full project export."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Manifest
        zf.writestr("manifest.json", json.dumps({
            "project": project_data["name"],
            "task_description": project_data["task_description"],
            "prompt_inputs_spec": project_data["prompt_inputs_spec"],
            "exported_at": project_data.get("exported_at", ""),
        }, indent=2))

        # Prompt versions
        for v in project_data.get("versions", []):
            zf.writestr(f"versions/v{v['version_number']}.txt", v["template"])

        # Datasets
        for d in project_data.get("datasets", []):
            zf.writestr(f"datasets/{d['name']}.json", json.dumps(d.get("test_cases", []), indent=2))

        # Eval runs
        for run in project_data.get("eval_runs", []):
            run_dir = f"eval_runs/{run['id']}"
            zf.writestr(f"{run_dir}/results.json", json.dumps(run.get("results", []), indent=2))
            html = generate_html_report(run, run.get("results", []))
            zf.writestr(f"{run_dir}/report.html", html)

    return buf.getvalue()


def build_eval_run_zip(eval_run_data: dict, results: list[dict]) -> bytes:
    """Build a ZIP for a single eval run."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("results.json", json.dumps(results, indent=2))
        html = generate_html_report(eval_run_data, results)
        zf.writestr("report.html", html)
    return buf.getvalue()
