
import json
import os
from collections import Counter
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

MODEL_ID = os.getenv(
    "OPENAI_EXAM_GENERATION_MODEL",
    os.getenv("OPENAI_EVALUATION_MODEL", "gpt-6.1-sol"),
)

PROMPT_VERSION = "ai-exam-generation-v1.0"

QUESTION_TYPES = {
    "Short answer",
    "Inference",
    "Multiple choice",
    "Language analysis",
    "Vocabulary",
    "Extended response",
}


QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "question_type": {
            "type": "string",
            "enum": sorted(QUESTION_TYPES),
        },
        "prompt": {"type": "string"},
        "options": {
            "type": ["array", "null"],
            "items": {"type": "string"},
        },
        "correct_answer": {"type": "string"},
        "marks": {"type": "integer"},
        "marking_criteria": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "criterion": {"type": "string"},
                    "marks": {"type": "integer"},
                },
                "required": ["criterion", "marks"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "question_type",
        "prompt",
        "options",
        "correct_answer",
        "marks",
        "marking_criteria",
    ],
    "additionalProperties": False,
}


PASSAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "category": {"type": "string"},
        "content": {"type": "string"},
        "questions": {
            "type": "array",
            "items": QUESTION_SCHEMA,
        },
    },
    "required": [
        "title",
        "category",
        "content",
        "questions",
    ],
    "additionalProperties": False,
}


OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "instructions": {
            "type": ["string", "null"],
        },
        "passages": {
            "type": "array",
            "items": PASSAGE_SCHEMA,
        },
        "standalone_questions": {
            "type": "array",
            "items": QUESTION_SCHEMA,
        },
    },
    "required": [
        "title",
        "instructions",
        "passages",
        "standalone_questions",
    ],
    "additionalProperties": False,
}


SYSTEM_INSTRUCTIONS = """
You are an expert English Language examination designer.

Your task is to create a completely original examination using
the teacher's supplied examination blueprint.

EDUCATIONAL PURPOSE:

This examination assesses English Language skills, particularly
reading comprehension and the student's ability to understand,
interpret and analyse written information.

It is NOT intended to test specialist knowledge of the topic.

THE TEACHER'S TOPIC:

The supplied topic must be the central thematic direction
of the examination.

All generated passages and questions must remain relevant
to this topic.

READING PASSAGES:

1. Generate exactly the number of passages requested.
2. Each passage must be original and suitable for the
   specified educational level.
3. When multiple passages are requested, explore different
   but related aspects of the topic.
4. Use clear, engaging and age-appropriate language.
5. Explain unfamiliar or technical concepts within the passage.
6. Do not assume that students have specialist prior knowledge.
7. Make every passage sufficiently informative to support
   its associated questions.

QUESTION REQUIREMENTS:

1. Generate exactly the requested number of questions
   for each question type and passage.
2. Do not add extra questions or omit requested questions.
3. Every question must assess its specified question type.
4. Short answer questions should assess understanding
   of explicit information.
5. Inference questions should assess implied meaning
   supported by evidence.
6. Multiple choice questions must contain exactly four
   distinct and plausible options, with one correct answer.
7. Language analysis questions should examine the writer's
   language choices and their effects.
8. Vocabulary questions should assess word or phrase meaning
   in context.
9. Extended response questions should require a developed,
   evidence-based response appropriate to the level.

QUESTIONS WITHOUT PASSAGES:

When the teacher requests no reading passages:

1. Generate exactly the requested standalone questions.
2. Each question must be self-contained.
3. Include any context or scenario necessary to answer it.
4. Do not refer to a missing passage.
5. Do not require specialist knowledge that the question
   itself has not explained.

REFERENCE ANSWERS:

1. Provide an accurate reference answer for every question.
2. Accept meaningful paraphrases where appropriate.
3. Base passage-related answers on the generated passage.
4. Do not introduce unsupported information.

MARKING CRITERIA:

1. Every question must have one or more marking criteria.
2. The sum of criterion marks must equal the question's
   requested maximum marks exactly.
3. Each criterion must describe an identifiable achievement.
4. Distribute marks sensibly across the expected answer.
5. Avoid awarding the same achievement twice.

IMPORTANT:

The requested question counts and marks are strict requirements.

The student's examination should be answerable using the supplied
passage and question information.

Return only the requested structured JSON output.
"""


def build_generation_payload(
    configuration: dict[str, Any],
) -> dict[str, Any]:
    """Prepare a clean examination blueprint for the AI."""

    payload = {
        "level": configuration["level"],
        "topic": configuration["topic"],
        "include_passages": configuration["include_passages"],
        "passage_count": configuration["passage_count"],
        "passages": [],
        "standalone_question_types": [],
    }

    if configuration["include_passages"]:
        for index, passage in enumerate(
            configuration["passages"],
            start=1,
        ):
            payload["passages"].append({
                "passage_number": index,
                "question_types": [
                    item.model_dump()
                    if hasattr(item, "model_dump")
                    else item
                    for item in passage["question_types"]
                ],
            })

    else:
        payload["standalone_question_types"] = [
            item.model_dump()
            if hasattr(item, "model_dump")
            else item
            for item in configuration["standalone_question_types"]
        ]

    return payload


def validate_generated_questions(
    questions: list[dict[str, Any]],
    expected_blueprint: list[dict[str, Any]],
    location: str,
) -> None:
    """Validate generated question counts, marks and criteria."""

    expected_counts = {
        item["question_type"]: item["count"]
        for item in expected_blueprint
    }

    expected_marks = {
        item["question_type"]: item["marks_per_question"]
        for item in expected_blueprint
    }

    actual_counts = Counter(
        question.get("question_type")
        for question in questions
    )

    if actual_counts != Counter(expected_counts):
        raise ValueError(
            f"{location}: AI generated incorrect question counts. "
            f"Expected {expected_counts}, got {dict(actual_counts)}."
        )

    for index, question in enumerate(questions, start=1):

        question_type = question["question_type"]

        prompt = question.get("prompt")
        reference_answer = question.get("correct_answer")
        marks = question.get("marks")
        criteria = question.get("marking_criteria")

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(
                f"{location}: Question {index} has no question text."
            )

        if (
            not isinstance(reference_answer, str)
            or not reference_answer.strip()
        ):
            raise ValueError(
                f"{location}: Question {index} has no reference answer."
            )

        if marks != expected_marks[question_type]:
            raise ValueError(
                f"{location}: Question {index} has incorrect marks."
            )

        if not isinstance(criteria, list) or not criteria:
            raise ValueError(
                f"{location}: Question {index} has no marking criteria."
            )

        criteria_total = 0

        for criterion in criteria:

            description = criterion.get("criterion")
            criterion_marks = criterion.get("marks")

            if (
                not isinstance(description, str)
                or not description.strip()
            ):
                raise ValueError(
                    f"{location}: Question {index} has an invalid criterion."
                )

            if (
                isinstance(criterion_marks, bool)
                or not isinstance(criterion_marks, int)
                or criterion_marks <= 0
            ):
                raise ValueError(
                    f"{location}: Question {index} has invalid criterion marks."
                )

            criteria_total += criterion_marks

        if criteria_total != marks:
            raise ValueError(
                f"{location}: Question {index} has {criteria_total} "
                f"criterion marks, but its maximum is {marks}."
            )

        options = question.get("options")

        if question_type == "Multiple choice":

            if (
                not isinstance(options, list)
                or len(options) != 4
                or any(
                    not isinstance(option, str) or not option.strip()
                    for option in options
                )
                or len(set(options)) != 4
            ):
                raise ValueError(
                    f"{location}: Multiple choice question {index} "
                    "must have four distinct options."
                )

            if reference_answer not in options:
                raise ValueError(
                    f"{location}: Multiple choice question {index} "
                    "has a reference answer that is not one of its options."
                )

        elif options is not None:
            raise ValueError(
                f"{location}: Non-MCQ question {index} "
                "must not contain answer options."
            )


def validate_generated_exam(
    generated: dict[str, Any],
    configuration: dict[str, Any],
) -> dict[str, Any]:
    """Validate the complete AI-generated examination."""

    if not isinstance(generated.get("title"), str) or not generated["title"].strip():
        raise ValueError("AI did not generate a valid examination title.")

    include_passages = configuration["include_passages"]

    passages = generated.get("passages")
    standalone_questions = generated.get("standalone_questions")

    if not isinstance(passages, list):
        raise ValueError("AI returned an invalid passages collection.")

    if not isinstance(standalone_questions, list):
        raise ValueError("AI returned an invalid standalone questions collection.")

    if include_passages:

        if len(passages) != configuration["passage_count"]:
            raise ValueError(
                "AI generated an incorrect number of reading passages."
            )

        if standalone_questions:
            raise ValueError(
                "AI returned standalone questions when passages were requested."
            )

        for index, passage in enumerate(passages):

            for field in ("title", "category", "content"):
                value = passage.get(field)

                if not isinstance(value, str) or not value.strip():
                    raise ValueError(
                        f"Passage {index + 1} has an invalid {field}."
                    )

            expected_blueprint = configuration["passages"][index][
                "question_types"
            ]

            validate_generated_questions(
                passage.get("questions"),
                expected_blueprint,
                f"Passage {index + 1}",
            )

    else:

        if passages:
            raise ValueError(
                "AI returned reading passages when none were requested."
            )

        validate_generated_questions(
            standalone_questions,
            configuration["standalone_question_types"],
            "Standalone questions",
        )

    instructions = generated.get("instructions")

    if instructions is not None and not isinstance(instructions, str):
        raise ValueError("AI returned invalid examination instructions.")

    return generated


def generate_ai_exam(
    configuration: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate and validate a complete examination.

    This function does not write anything to the database.
    """

    payload = build_generation_payload(configuration)

    client = OpenAI()

    response = client.responses.create(
        model=MODEL_ID,
        reasoning={"effort": "medium"},
        max_output_tokens=20000,
        instructions=SYSTEM_INSTRUCTIONS,
        input=json.dumps(payload, ensure_ascii=False),
        text={
            "format": {
                "type": "json_schema",
                "name": "english_examination",
                "strict": True,
                "schema": OUTPUT_SCHEMA,
            }
        },
    )

    if not response.output_text:
        raise ValueError("AI returned an empty examination.")

    try:
        generated = json.loads(response.output_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "AI returned an invalid examination response."
        ) from exc

    validated_exam = validate_generated_exam(
        generated,
        configuration,
    )

    return {
        "exam": validated_exam,
        "model_id": getattr(response, "model", None) or MODEL_ID,
        "prompt_version": PROMPT_VERSION,
    }
