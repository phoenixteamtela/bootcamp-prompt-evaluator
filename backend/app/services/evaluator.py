"""
Evaluator service — reimplemented from the notebook reference (assets/002_prompting_completed.ipynb).
Same workflow: generate ideas → generate test cases → run prompts → grade outputs.
Same prompt templates and grading rubric.
"""

import json
import logging
import re
from textwrap import dedent

from app.services.llm_service import LLMResponse, chat

logger = logging.getLogger(__name__)


def render(template_string: str, variables: dict) -> str:
    """Template interpolation matching the notebook's {variable} pattern."""
    placeholders = re.findall(r"{([^{}]+)}", template_string)
    result = template_string
    for placeholder in placeholders:
        if placeholder in variables:
            result = result.replace("{" + placeholder + "}", str(variables[placeholder]))
    return result.replace("{{", "{").replace("}}", "}")


TYPE_HINTS: dict[str, str] = {
    "short_text": "a word, phrase, or sentence",
    "paragraph": "a few sentences to a paragraph",
    "document": "a full article, report, or multi-page text",
    "integer": "a whole number (e.g., 5, 100, 2500)",
    "decimal": "a number with decimals (e.g., 3.14, 98.6)",
    "currency_usd": "a dollar amount (e.g., $49.99, $1,500.00)",
    "list": "a list of items",
    "json": "structured JSON data (e.g., user profile, API response)",
}


def normalize_spec(spec: dict) -> dict[str, dict]:
    """Normalize prompt_inputs_spec — handles old string format and new dict format."""
    result = {}
    for key, value in spec.items():
        if isinstance(value, str):
            result[key] = {"description": value, "type": "short_text"}
        else:
            result[key] = dict(value) if not isinstance(value, dict) else value
    return result


def generate_unique_ideas(
    task_description: str,
    prompt_inputs_spec: dict,
    num_cases: int,
    model: str,
) -> tuple[list[str], LLMResponse]:
    """Generate diverse test case scenario ideas. Returns (ideas, llm_response)."""

    spec = normalize_spec(prompt_inputs_spec)
    example_prompt_inputs = ""
    for key, info in spec.items():
        desc = info["description"].replace("\n", "\\n")
        dtype = info.get("type", "short_text")
        example_prompt_inputs += f'"{key}": {dtype} # {desc},'

    prompt = """
    Generate {num_cases} unique, diverse ideas for testing a prompt that accomplishes this task:

    <task_description>
    {task_description}
    </task_description>

    The prompt will receive the following inputs
    <prompt_inputs>
    {prompt_inputs_spec}
    </prompt_inputs>

    Each idea should represent a distinct scenario or example that tests different aspects of the task.

    Output Format:
    Provide your response as a structured JSON array where each item is a brief description of the idea.

    Example:
    ```json
    [
        "Testing with technical computer science terminology",
        "Testing with medical research findings",
        "Testing with complex mathematical concepts",
        ...
    ]
    ```

    Ensure each idea is:
    - Clearly distinct from the others
    - Relevant to the task description
    - Specific enough to guide generation of a full test case
    - Quick to solve without requiring extensive computation or multi-step processing
    - Solvable with no more than 400 tokens of output

    Remember, only generate {num_cases} unique ideas
    """

    rendered_prompt = render(
        dedent(prompt),
        {
            "task_description": task_description,
            "num_cases": num_cases,
            "prompt_inputs_spec": example_prompt_inputs,
        },
    )

    messages = [
        {"role": "user", "content": rendered_prompt},
        {"role": "assistant", "content": "```json"},
    ]

    response = chat(
        messages,
        model=model,
        system="You are a test scenario designer specialized in creating diverse, unique testing scenarios.",
        temperature=1.0,
        stop_sequences=["```"],
    )

    ideas = json.loads(response.text)
    return ideas, response


def generate_test_case(
    task_description: str,
    idea: str,
    prompt_inputs_spec: dict,
    model: str,
) -> tuple[dict, LLMResponse]:
    """Generate a single test case from a scenario idea. Returns (test_case, llm_response)."""

    spec = normalize_spec(prompt_inputs_spec)
    input_variable_reqs = ""
    for key, info in spec.items():
        desc = info["description"].replace("\n", " ")
        dtype = info.get("type", "short_text")
        input_variable_reqs += f'- "{key}" (type: {dtype}): {desc}\n'

    example_prompt_inputs = ""
    for key, info in spec.items():
        dtype = info.get("type", "short_text")
        hint = TYPE_HINTS.get(dtype, "realistic content")
        example_prompt_inputs += f'"{key}": "<{hint}>",\n'

    allowed_keys = ", ".join([f'"{key}"' for key in spec.keys()])

    prompt = """
    Generate a single detailed test case for a prompt evaluation based on:

    <task_description>
    {task_description}
    </task_description>

    <specific_idea>
    {idea}
    </specific_idea>

    <input_variable_requirements>
    Each prompt_inputs value MUST follow these descriptions exactly:
    {input_variable_reqs}
    </input_variable_requirements>

    <allowed_input_keys>
    {allowed_keys}
    </allowed_input_keys>

    Output Format:
    ```json
    {{
        "prompt_inputs": {{
        {example_prompt_inputs}
        }},
        "solution_criteria": ["criterion 1", "criterion 2", ...] // Concise list of criteria for evaluating the solution, 1 to 4 items
    }}
    ```

    IMPORTANT REQUIREMENTS:
    - You MUST ONLY use these exact input keys in your prompt_inputs: {allowed_keys}
    - Do NOT add any additional keys to prompt_inputs
    - All keys listed in allowed_input_keys must be included in your response
    - Each prompt_inputs value MUST be realistic, substantive content that fully matches its variable description above
    - Input values should be COMPLETE — never truncate or abbreviate. If the description says "sentences", write full sentences. If it says "paragraph", write a full paragraph.
    - Make the test case realistic and practically useful
    - Include measurable, concise solution criteria
    - The solution criteria should ONLY address the direct requirements of the task description and the generated prompt_inputs
    - Avoid over-specifying criteria with requirements that go beyond the core task
    - Keep solution criteria simple, focused, and directly tied to the fundamental task
    - The test case should be tailored to the specific idea provided
    - Solvable with no more than 400 tokens of output
    - DO NOT include any fields beyond those specified in the output format

    Here's an example of a sample input with an ideal output:
    <sample_input>
    <sample_task_description>
    Extract topics out of a passage of text
    </sample_task_description>
    <sample_specific_idea>
    Testing with a text that contains multiple nested topics and subtopics (e.g., a passage about renewable energy that covers solar power economics, wind turbine technology, and policy implications simultaneously)
    </sample_specific_idea>

    <sample_input_variable_requirements>
    - "content": A passage of text with at least three complete sentences
    </sample_input_variable_requirements>

    <sample_allowed_input_keys>
    "content"
    </sample_allowed_input_keys>
    </sample_input>
    <ideal_output>
    ```json
    {{
        "prompt_inputs": {{
            "content": "The transition to renewable energy encompasses numerous interdependent dimensions. Solar photovoltaic technology has seen dramatic cost reductions, with panel efficiency improving 24% since 2010 while manufacturing costs declined by 89%, making it economically competitive with fossil fuels in many markets. Concurrently, wind energy has evolved through innovative turbine designs featuring carbon-fiber composite blades and advanced control systems that increase energy capture by 35% in low-wind conditions."
        }},
        "solution_criteria": [
            "Includes all topics mentioned"
        ]
    }}
    ```
    </ideal_output>
    This is ideal output because the solution criteria is concise and doesn't ask for anything outside of the scope of the task description, and the "content" value is three complete sentences matching the variable description.
    """

    rendered_prompt = render(
        dedent(prompt),
        {
            "allowed_keys": allowed_keys,
            "task_description": task_description,
            "idea": idea,
            "input_variable_reqs": input_variable_reqs,
            "example_prompt_inputs": example_prompt_inputs,
        },
    )

    messages = [
        {"role": "user", "content": rendered_prompt},
        {"role": "assistant", "content": "```json"},
    ]

    response = chat(
        messages,
        model=model,
        system="You are a test case creator specializing in designing evaluation scenarios.",
        temperature=0.7,
        max_tokens=2000,
        stop_sequences=["```"],
    )

    test_case = json.loads(response.text)
    test_case["scenario"] = idea
    return test_case, response


def _format_inputs(prompt_inputs: dict) -> str:
    """Format prompt_inputs dict as a readable user message."""
    parts = []
    for key, value in prompt_inputs.items():
        parts.append(f"{key}:\n{value}")
    return "\n\n".join(parts)


def run_prompt_with_template(
    template: str,
    prompt_inputs: dict,
    model: str,
    temperature: float = 1.0,
) -> tuple[str, str, LLMResponse]:
    """Run the student's prompt template against test case inputs.

    The template is sent as the system message (instructions).
    The test case prompt_inputs are sent as the user message (data).
    If the template contains {variable} placeholders, those are also
    substituted inline for students who prefer that style.

    Returns (output_text, rendered_prompt, llm_response).
    """
    system_prompt = render(template, prompt_inputs)
    user_message = _format_inputs(prompt_inputs)
    rendered = f"[System]\n{system_prompt}\n\n[User]\n{user_message}"

    messages = [{"role": "user", "content": user_message}]
    response = chat(messages, model=model, system=system_prompt, temperature=temperature)
    return response.text, rendered, response


def grade_output(
    task_description: str,
    prompt_inputs: dict,
    solution_criteria: list[str],
    output: str,
    extra_criteria: str | None,
    model: str,
) -> tuple[dict, LLMResponse]:
    """Grade an LLM output against test case criteria. Returns (grade_dict, llm_response)."""

    prompt_inputs_str = ""
    for key, value in prompt_inputs.items():
        val = str(value).replace("\n", "\\n")
        prompt_inputs_str += f'"{key}":"{val}",\n'

    extra_criteria_section = ""
    if extra_criteria:
        extra_criteria_template = """
        Mandatory Requirements - ANY VIOLATION MEANS AUTOMATIC FAILURE (score of 3 or lower):
        <extra_important_criteria>
        {extra_criteria}
        </extra_important_criteria>
        """
        extra_criteria_section = render(
            dedent(extra_criteria_template),
            {"extra_criteria": extra_criteria},
        )

    eval_template = """
    Your task is to evaluate the following AI-generated solution with EXTREME RIGOR.

    Original task description:
    <task_description>
    {task_description}
    </task_description>

    Original task inputs:
    <task_inputs>
    {{ {prompt_inputs} }}
    </task_inputs>

    Solution to Evaluate:
    <solution>
    {output}
    </solution>

    Criteria you should use to evaluate the solution:
    <criteria>
    {solution_criteria}
    </criteria>

    {extra_criteria_section}

    Scoring Guidelines:
    * Score 1-3: Solution fails to meet one or more MANDATORY requirements
    * Score 4-6: Solution meets all mandatory requirements but has significant deficiencies in secondary criteria
    * Score 7-8: Solution meets all mandatory requirements and most secondary criteria, with minor issues
    * Score 9-10: Solution meets all mandatory and secondary criteria

    IMPORTANT SCORING INSTRUCTIONS:
    * Grade the output based ONLY on the listed criteria. Do not add your own extra requirements.
    * If a solution meets all of the mandatory and secondary criteria give it a 10
    * Don't complain that the solution "only" meets the mandatory and secondary criteria. Solutions shouldn't go above and beyond - they should meet the exact listed criteria.
    * ANY violation of a mandatory requirement MUST result in a score of 3 or lower
    * The full 1-10 scale should be utilized - don't hesitate to give low scores when warranted

    Output Format
    Provide your evaluation as a structured JSON object with the following fields, in this specific order:
    - "strengths": An array of 1-3 key strengths
    - "weaknesses": An array of 1-3 key areas for improvement
    - "reasoning": A concise explanation of your overall assessment
    - "score": A number between 1-10

    Respond with JSON. Keep your response concise and direct.
    Example response shape:
    {{
        "strengths": string[],
        "weaknesses": string[],
        "reasoning": string,
        "score": number
    }}
    """

    eval_prompt = render(
        dedent(eval_template),
        {
            "task_description": task_description,
            "prompt_inputs": prompt_inputs_str,
            "output": output,
            "solution_criteria": "\n".join(solution_criteria),
            "extra_criteria_section": extra_criteria_section,
        },
    )

    messages = [
        {"role": "user", "content": eval_prompt},
        {"role": "assistant", "content": "```json"},
    ]

    response = chat(
        messages,
        model=model,
        temperature=0.0,
        stop_sequences=["```"],
    )

    grade = json.loads(response.text)
    return grade, response


# ---------- Conversation Mode ----------


def run_conversation_prompt(
    prompt: str,
    model: str,
    temperature: float = 1.0,
) -> tuple[str, LLMResponse]:
    """Run a plain conversation prompt (no template rendering, no variables).

    The student's prompt is sent as the user message directly.
    Returns (output_text, llm_response).
    """
    messages = [{"role": "user", "content": prompt}]
    response = chat(messages, model=model, temperature=temperature)
    return response.text, response


def grade_conversation_prompt(
    task_description: str,
    prompt: str,
    output: str,
    extra_criteria: str | None,
    model: str,
) -> tuple[dict, LLMResponse]:
    """Grade a conversation prompt using the PPT best-practices rubric.

    Four pillars, each scored 0-2.5, summed to 1-10 overall:
    - Clarity & Directness
    - Specificity
    - Examples
    - Structure

    Returns (grade_dict, llm_response) where grade_dict has:
      pillar_scores, strengths, weaknesses, reasoning, score
    """

    extra_criteria_section = ""
    if extra_criteria:
        extra_criteria_section = f"""
    Additional Evaluation Criteria (treat as extra considerations):
    <extra_criteria>
    {extra_criteria}
    </extra_criteria>
    """

    grading_prompt = f"""
    You are an expert prompt engineering evaluator. Evaluate the student's prompt
    using the four pillars of prompt engineering best practices.

    <task_description>
    {task_description}
    </task_description>

    <student_prompt>
    {prompt}
    </student_prompt>

    <llm_output>
    {output}
    </llm_output>
    {extra_criteria_section}
    Score each pillar from 0.0 to 2.5 based on these criteria:

    **Pillar 1: Clarity & Directness (0-2.5)**
    - First line clearly states the task
    - Uses simple, direct language
    - Uses action verbs (write, list, summarize, classify, etc.)
    - Assigns a persona or role when appropriate
    - 2.5 = exemplary, 1.5 = adequate, 0.5 = poor/missing

    **Pillar 2: Specificity (0-2.5)**
    - Provides guidelines or step-by-step instructions
    - Defines desired output qualities (length, format, tone)
    - Breaks complex tasks into subtasks
    - Includes constraints and boundaries
    - 2.5 = exemplary, 1.5 = adequate, 0.5 = poor/missing

    **Pillar 3: Examples (0-2.5)**
    - Provides sample input/output pairs
    - Addresses edge cases
    - Uses content tags or labeled sections
    - Explains why the example is ideal
    - 2.5 = exemplary, 1.5 = adequate, 0.5 = poor/missing

    **Pillar 4: Structure (0-2.5)**
    - Uses XML tags or delimiters to separate sections
    - Has clear content boundaries
    - Logical organization of instructions
    - Clean separation between context, instructions, and constraints
    - 2.5 = exemplary, 1.5 = adequate, 0.5 = poor/missing

    Also evaluate the quality of the LLM output as evidence of prompt quality.
    A well-crafted prompt should produce high-quality output.

    Output Format:
    Respond with a JSON object:
    {{{{
        "pillar_scores": {{{{
            "clarity": <float 0-2.5>,
            "specificity": <float 0-2.5>,
            "examples": <float 0-2.5>,
            "structure": <float 0-2.5>
        }}}},
        "strengths": ["strength 1", "strength 2", ...],
        "weaknesses": ["weakness 1", "weakness 2", ...],
        "reasoning": "Overall assessment of the prompt quality",
        "score": <float 1-10, sum of pillar scores clamped to 1-10>
    }}}}

    IMPORTANT:
    - The overall score MUST equal the sum of pillar scores, clamped to minimum 1.0 and maximum 10.0
    - Be rigorous but fair — most first attempts should score 3-5
    - A prompt with no examples should get 0.5 or less on Examples pillar
    - A prompt with no structural elements (XML tags, delimiters) should get 0.5 or less on Structure
    - Keep strengths and weaknesses to 1-3 items each
    """

    messages = [
        {"role": "user", "content": dedent(grading_prompt)},
        {"role": "assistant", "content": "```json"},
    ]

    response = chat(
        messages,
        model=model,
        temperature=0.0,
        stop_sequences=["```"],
    )

    grade = json.loads(response.text)

    # Ensure score is the clamped sum of pillar scores
    pillar_scores = grade.get("pillar_scores", {})
    pillar_sum = sum(pillar_scores.values())
    grade["score"] = max(1.0, min(10.0, pillar_sum))

    return grade, response
