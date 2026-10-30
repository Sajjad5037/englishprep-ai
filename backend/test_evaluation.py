
from app.evaluation_service import evaluate_submitted_answer


PASSAGE = """
The rain had stopped, but the road glistened beneath the fading
evening light.

Sajid had promised his mother that he would be home before sunset,
but the final bus had broken down several kilometres from the
village. Now, with darkness approaching, he had no choice but to
continue on foot.

As he rounded a bend, he noticed an elderly man struggling to
lift his bicycle from a muddy ditch.

Sajid hesitated. He was already late, and every minute seemed
to make the journey longer. Then he remembered how his
grandfather had once stopped in the middle of a storm to help
a stranger.

Without another thought, Sajid hurried towards the man. Together,
they dragged the bicycle onto the road. The old man thanked him
repeatedly, his tired face brightening with relief.

Sajid later realised that reaching home was not always about
how quickly one travelled. Sometimes, it was about the choices
one made along the way.
"""

QUESTION = (
    "Why does Sajid hesitate before helping the elderly man, "
    "and what finally persuades him to help?"
)

REFERENCE_ANSWER = (
    "Sajid hesitates because he is already late getting home "
    "and worries that helping the man will delay him further. "
    "He finally decides to help after remembering how his "
    "grandfather once stopped during a storm to help a stranger."
)

STUDENT_ANSWER = (
    "He was worried because he was already running late "
    "and stopping would make his journey longer. "
    "He then thought about his grandfather helping a stranger "
    "during a storm, which inspired him to help the old man."
)

CRITERIA = [
    {
        "criterion": (
            "Explains that Sajid is already late and is concerned "
            "about further delaying his journey."
        ),
        "marks": 1,
    },
    {
        "criterion": (
            "Identifies his memory of his grandfather helping "
            "a stranger as the reason he decides to help."
        ),
        "marks": 1,
    },
]


def main():
    submitted_snapshot = {
        "question": {
            "prompt": QUESTION,
            "question_type": "short_answer",
            "correct_answer": REFERENCE_ANSWER,
            "marking_criteria": CRITERIA,
            "marks": 2,
            "passage": {
                "title": "Sajid and the Elderly Man",
                "content": PASSAGE,
            },
        },
        "answer_text": STUDENT_ANSWER,
    }

    result = evaluate_submitted_answer(submitted_snapshot)

    print("\n========== AI EVALUATION ==========\n")

    for item in result["criterion_results"]:
        print(f"Criterion: {item['criterion']}")
        print(
            f"Marks: {item['marks_awarded']}"
            f"/{item['max_marks']}"
        )
        print(f"Met: {item['met']}")
        print(f"Evidence: {item['evidence']}")
        print(f"Feedback: {item['feedback']}")
        print()

    print("Overall feedback:")
    print(result["feedback"])

    print("\n========== FINAL SCORE ==========")
    print(
        f"Marks awarded: {result['marks_awarded']}"
        f"/{result['max_marks']}"
    )

    print(f"Model: {result['model_id']}")
    print(f"Prompt version: {result['prompt_version']}")


if __name__ == "__main__":
    main()
