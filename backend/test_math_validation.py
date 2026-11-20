from pydantic import ValidationError

from app.mathematics.schemas import GraphPointGroup

from app.mathematics.schemas import (
    CoordinateBounds,
    TriangleAreaAnswer,
    MathMarkingCriterion,
)

tests = [
    (
        CoordinateBounds,
        {
            "x_min": float("inf"),
            "x_max": 10,
            "y_min": 0,
            "y_max": 10,
        },
    ),
    (
        TriangleAreaAnswer,
        {"area": float("nan")},
    ),
    (
        MathMarkingCriterion,
        {
            "criterion_id": "C1",
            "description": "Correct answer",
            "marks": float("inf"),
            "evaluation_method": "deterministic",
        },
    ),
]

for model, data in tests:
    try:
        model(**data)
        print(f"FAIL: {model.__name__} accepted an invalid value")
    except ValidationError:
        print(f"PASS: {model.__name__} rejected an invalid value")

from app.mathematics.schemas import MathQuestionDefinition

try:
    MathQuestionDefinition(
        question_family="read_coordinates",
        response_type="coordinate_reading",
        prompt="Read the coordinates of point A.",
        marks=float("nan"),
        expected_answer={
            "response_type": "coordinate_reading",
            "points": [{"label": "A", "x": 2, "y": 3}],
        },
        marking_criteria=[
            {
                "criterion_id": "C1",
                "description": "Correct coordinates",
                "marks": 1,
                "evaluation_method": "deterministic",
            }
        ],
    )
    print("FAIL: MathQuestionDefinition accepted NaN marks")
except ValidationError:
    print("PASS: MathQuestionDefinition rejected NaN marks")

from app.mathematics.schemas import (
    GraphConfiguration,
    UnknownValueAnswer,
    TriangleAreaResponse,
    UnknownValueResponse,
)

additional_tests = [
    (
        GraphConfiguration,
        {
            "bounds": {
                "x_min": -10,
                "x_max": 10,
                "y_min": -10,
                "y_max": 10,
            },
            "x_interval": float("inf"),
            "y_interval": 1,
        },
    ),
    (
        UnknownValueAnswer,
        {
            "response_type": "unknown_value",
            "values": {"x": float("nan")},
        },
    ),
    (
        TriangleAreaResponse,
        {
            "response_type": "triangle_area",
            "area": -5,
        },
    ),
    (
        UnknownValueResponse,
        {
            "response_type": "unknown_value",
            "values": {"x": float("inf")},
        },
    ),
]

for model, data in additional_tests:
    try:
        model(**data)
        print(f"FAIL: {model.__name__} accepted an invalid value")
    except ValidationError:
        print(f"PASS: {model.__name__} rejected an invalid value")




from app.mathematics.schemas import MathQuestionDefinition

base_question = {
    "question_family": "plot_coordinates",
    "response_type": "coordinate_plot",
    "prompt": "Plot point A at (2, 3).",
    "marks": 1,
    "expected_answer": {
        "response_type": "coordinate_plot",
        "points": [{"label": "A", "x": 2, "y": 3}],
    },
    "marking_criteria": [
        {
            "criterion_id": "C1",
            "description": "Correctly plots point A.",
            "marks": 1,
            "evaluation_method": "deterministic",
        }
    ],
}

# Test 1: Graph configuration is accepted.
question_with_graph = MathQuestionDefinition(
    **base_question,
    graph={
        "bounds": {
            "x_min": -5,
            "x_max": 5,
            "y_min": -5,
            "y_max": 5,
        },
        "x_interval": 1,
        "y_interval": 1,
    },
)

print("PASS: Graph configuration attached to question")

# Test 2: Graph configuration is optional.
question_without_graph = MathQuestionDefinition(**{
    **base_question,
    "question_family": "triangle_area",
    "response_type": "triangle_area",
    "prompt": "Calculate the area of a triangle.",
    "expected_answer": {
        "response_type": "triangle_area",
        "area": 6,
    },
})

print("PASS: Question without graph accepted")


from app.mathematics.schemas import GraphData, GraphPoint

# Test 1: Graph points are accepted.
graph_data = GraphData(
    groups=[
        GraphPointGroup(
            group_label="Triangle ABC",
            points=[
                GraphPoint(label="A", x=1, y=2),
                GraphPoint(label="B", x=4, y=2),
                GraphPoint(label="C", x=2, y=5),
            ],
            connect_points=True,
            closed_shape=True,
        )
    ]
)

print("PASS: Graph points accepted")
print("PASS: Point connections accepted")

# Test 2: Graph data can be empty.
empty_graph = GraphData()

print("PASS: Empty graph data accepted")

# Test 3: Invalid coordinates are rejected.
try:
    GraphPoint(label="D", x=float("nan"), y=3)
    print("FAIL: Invalid graph coordinate accepted")
except ValidationError:
    print("PASS: Invalid graph coordinate rejected")


question_with_graph_data = MathQuestionDefinition(
    **base_question,
    graph_data={
        "groups": [
            {
                "group_label": "Triangle ABC",
                "points": [
                    {"label": "A", "x": 1, "y": 2},
                    {"label": "B", "x": 4, "y": 2},
                    {"label": "C", "x": 2, "y": 5},
                ],
                "connect_points": True,
                "closed_shape": True,
            }
        ],
        "show_point_labels": True,
    },
)

print("PASS: Graph data attached to mathematics question")

print("PASS: Graph data attached to mathematics question")
# Graph data must be rejected for non-graph question families

try:
    MathQuestionDefinition(
        **{
            **base_question,
            "question_family": "triangle_area",
            "response_type": "triangle_area",
            "expected_answer": {
                "response_type": "triangle_area",
                "area": 6,
            },
            "graph_data": {
                "points": [
                    {"label": "A", "x": 1, "y": 2}
                ]
            },
        }
    )
    print("FAIL: Graph data accepted for triangle area question")

except ValidationError:
    print("PASS: Graph data rejected for triangle area question")


try:
    MathQuestionDefinition(
        **{
            **base_question,
            "graph_data": None,
        }
    )
    print("PASS: Question without graph data accepted")

except ValidationError:
    print("FAIL: Question without graph data rejected")

multiple_shapes = GraphData(
    groups=[
        GraphPointGroup(
            group_label="Triangle ABC",
            points=[
                {"label": "A", "x": 1, "y": 2},
                {"label": "B", "x": 4, "y": 2},
                {"label": "C", "x": 2, "y": 5},
            ],
            connect_points=True,
            closed_shape=True,
        ),
        GraphPointGroup(
            group_label="Triangle DEF",
            points=[
                {"label": "D", "x": -1, "y": -2},
                {"label": "E", "x": -4, "y": -2},
                {"label": "F", "x": -2, "y": -5},
            ],
            connect_points=True,
            closed_shape=True,
        ),
    ]
)

print("PASS: Multiple independent shapes accepted")
print("PASS: Each shape retains its own points")


# Plotting question: visible graph is empty,
# while expected answer contains target coordinates.

plot_question = MathQuestionDefinition(
    question_family="plot_coordinates",
    response_type="coordinate_plot",
    prompt="Plot points A and B on the coordinate plane.",
    marks=2,
    graph={
        "bounds": {
            "x_min": -5,
            "x_max": 5,
            "y_min": -5,
            "y_max": 5,
        },
        "x_interval": 1,
        "y_interval": 1,
    },
    graph_data={
        "points": [],
        "groups": [],
    },
    expected_answer={
        "response_type": "coordinate_plot",
        "points": [
            {"label": "A", "x": 2, "y": 3},
            {"label": "B", "x": -1, "y": 4},
        ],
    },
    marking_criteria=[
        {
            "criterion_id": "point_accuracy",
            "description": "Correctly plots both points.",
            "marks": 2,
            "evaluation_method": "deterministic",
        }
    ],
)

assert len(plot_question.graph_data.points) == 0
assert len(plot_question.expected_answer.points) == 2

print("PASS: Blank student graph keeps expected coordinates separate")
try:
    GraphPointGroup(
        group_label="Empty triangle",
        points=[],
        connect_points=True,
        closed_shape=True,
    )
    print("FAIL: Empty shape accepted")
except ValidationError:
    print("PASS: Empty shape rejected")


# Read coordinates: visible graph contains points.
# Expected answer contains the correct coordinates.

read_question = MathQuestionDefinition(
    question_family="read_coordinates",
    response_type="coordinate_reading",
    prompt="Read the coordinates of point A.",
    marks=1,
    graph_data={
        "points": [
            {"label": "A", "x": 3, "y": 4}
        ]
    },
    expected_answer={
        "response_type": "coordinate_reading",
        "points": [
            {"label": "A", "x": 3, "y": 4}
        ]
    },
    marking_criteria=[
        {
            "criterion_id": "coordinate_accuracy",
            "description": "Correctly identifies the coordinates.",
            "marks": 1,
            "evaluation_method": "deterministic",
        }
    ],
)

assert len(read_question.graph_data.points) == 1
assert len(read_question.expected_answer.points) == 1

print("PASS: Read-coordinate question stores visible points and expected answer separately")


# Shape identification: visible graph contains connected points.
# Expected answer contains the correct shape name.

shape_question = MathQuestionDefinition(
    question_family="plot_and_identify_shapes",
    response_type="shape_identification",
    prompt="Identify the shape formed by points A, B and C.",
    marks=2,
    graph_data={
        "groups": [
            {
                "group_label": "Shape",
                "points": [
                    {"label": "A", "x": 1, "y": 1},
                    {"label": "B", "x": 4, "y": 1},
                    {"label": "C", "x": 2, "y": 4},
                ],
                "connect_points": True,
                "closed_shape": True,
            }
        ]
    },
    expected_answer={
        "response_type": "shape_identification",
        "points": [
            {"label": "A", "x": 1, "y": 1},
            {"label": "B", "x": 4, "y": 1},
            {"label": "C", "x": 2, "y": 4},
        ],
        "shape_name": "Triangle",
    },
    marking_criteria=[
        {
            "criterion_id": "shape_identification",
            "description": "Correctly identifies the triangle.",
            "marks": 2,
            "evaluation_method": "deterministic",
        }
    ],
)

assert len(shape_question.graph_data.groups) == 1
assert shape_question.expected_answer.shape_name == "Triangle"

print("PASS: Shape question stores visible geometry and expected answer separately")
