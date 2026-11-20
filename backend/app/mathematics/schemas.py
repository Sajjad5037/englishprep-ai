
from typing import Annotated, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

FiniteFloat = Annotated[
    float,
    Field(allow_inf_nan=False),
]
# ============================================================
# COMMON CONFIGURATION
# ============================================================

class MathBaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )


# ============================================================
# QUESTION CLASSIFICATION
# ============================================================

MathQuestionFamily = Literal[
    "read_coordinates",
    "plot_coordinates",
    "plot_and_identify_shapes",
    "triangle_area",
    "unknown_values",
]

MathResponseType = Literal[
    "coordinate_reading",
    "coordinate_plot",
    "shape_identification",
    "triangle_area",
    "unknown_value",
]

MathExamMode = Literal[
    "learning",
    "formal_assessment",
    "both",
]


# ============================================================
# MATHEMATICAL PRIMITIVES
# ============================================================

class CoordinatePoint(MathBaseSchema):
    label: str = Field(min_length=1, max_length=20)
    x: float = Field(allow_inf_nan=False)
    y: float = Field(allow_inf_nan=False)


class CoordinateBounds(MathBaseSchema):
    x_min: float = Field(allow_inf_nan=False)
    x_max: float = Field(allow_inf_nan=False)
    y_min: float = Field(allow_inf_nan=False)
    y_max: float = Field(allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_bounds(self):
        if self.x_min >= self.x_max:
            raise ValueError("x_min must be less than x_max.")

        if self.y_min >= self.y_max:
            raise ValueError("y_min must be less than y_max.")

        return self


class GraphConfiguration(MathBaseSchema):
    bounds: CoordinateBounds
    x_interval: FiniteFloat = Field(gt=0)
    y_interval: FiniteFloat = Field(gt=0)

    show_grid: bool = True
    show_axes: bool = True
    show_labels: bool = True

# ============================================================
# GRAPH MATHEMATICAL DATA
# ============================================================

class GraphPoint(MathBaseSchema):
    label: str = Field(min_length=1, max_length=20)

    x: FiniteFloat
    y: FiniteFloat


class GraphPointGroup(MathBaseSchema):
    group_label: str = Field(min_length=1, max_length=50)

    points: list[GraphPoint] = Field(min_length=1)

    connect_points: bool = False

    closed_shape: bool = False


class GraphData(MathBaseSchema):
    points: list[GraphPoint] = Field(default_factory=list)

    groups: list[GraphPointGroup] = Field(
        default_factory=list
    )

    show_point_labels: bool = True
# ============================================================
# EXPECTED ANSWER STRUCTURES
# ============================================================

class CoordinateReadingAnswer(MathBaseSchema):
    response_type: Literal["coordinate_reading"] = (
        "coordinate_reading"
    )

    points: list[CoordinatePoint] = Field(min_length=1)


class CoordinatePlotAnswer(MathBaseSchema):
    response_type: Literal["coordinate_plot"] = (
        "coordinate_plot"
    )

    points: list[CoordinatePoint] = Field(min_length=1)


class ShapeIdentificationAnswer(MathBaseSchema):
    response_type: Literal["shape_identification"] = (
        "shape_identification"
    )

    points: list[CoordinatePoint] = Field(min_length=1)

    shape_name: str = Field(min_length=1, max_length=100)


class TriangleAreaAnswer(MathBaseSchema):
    response_type: Literal["triangle_area"] = (
        "triangle_area"
    )

    area: float = Field(ge=0, allow_inf_nan=False)
    unit: str | None = Field(default=None, max_length=30)


class UnknownValueAnswer(MathBaseSchema):
    response_type: Literal["unknown_value"] = (
        "unknown_value"
    )

    values: dict[str, FiniteFloat] = Field(min_length=1)

MathExpectedAnswer = (
    CoordinateReadingAnswer
    | CoordinatePlotAnswer
    | ShapeIdentificationAnswer
    | TriangleAreaAnswer
    | UnknownValueAnswer
)


# ============================================================
# STUDENT RESPONSE STRUCTURES
# ============================================================

class CoordinateReadingResponse(MathBaseSchema):
    response_type: Literal["coordinate_reading"] = (
        "coordinate_reading"
    )

    points: list[CoordinatePoint] = Field(default_factory=list)


class CoordinatePlotResponse(MathBaseSchema):
    response_type: Literal["coordinate_plot"] = (
        "coordinate_plot"
    )

    points: list[CoordinatePoint] = Field(default_factory=list)


class ShapeIdentificationResponse(MathBaseSchema):
    response_type: Literal["shape_identification"] = (
        "shape_identification"
    )

    points: list[CoordinatePoint] = Field(default_factory=list)

    shape_name: str | None = Field(
        default=None,
        max_length=100,
    )


class TriangleAreaResponse(MathBaseSchema):
    response_type: Literal["triangle_area"] = (
        "triangle_area"
    )

    area: Annotated[float, Field(ge=0, allow_inf_nan=False)] | None = None

    working: str | None = Field(
        default=None,
        max_length=20000,
    )

    unit: str | None = Field(
        default=None,
        max_length=30,
    )


class UnknownValueResponse(MathBaseSchema):
    response_type: Literal["unknown_value"] = (
        "unknown_value"
    )

    values: dict[str, FiniteFloat] = Field(default_factory=dict)

    working: str | None = Field(
        default=None,
        max_length=20000,
    )


MathStudentResponse = (
    CoordinateReadingResponse
    | CoordinatePlotResponse
    | ShapeIdentificationResponse
    | TriangleAreaResponse
    | UnknownValueResponse
)


# ============================================================
# MARKING CRITERIA
# ============================================================

class MathMarkingCriterion(MathBaseSchema):
    criterion_id: str = Field(min_length=1, max_length=50)

    description: str = Field(
        min_length=1,
        max_length=1000,
    )

    marks: float = Field(gt=0, allow_inf_nan=False)

    evaluation_method: Literal[
        "deterministic",
        "ai",
        "hybrid",
    ]


# ============================================================
# QUESTION DEFINITION
# ============================================================

class MathQuestionDefinition(MathBaseSchema):
    question_family: MathQuestionFamily

    response_type: MathResponseType

    prompt: str = Field(
        min_length=1,
        max_length=10000,
    )

    marks: float = Field(gt=0, allow_inf_nan=False)
    graph: GraphConfiguration | None = None
    graph_data: GraphData | None = None

    

    expected_answer: MathExpectedAnswer

    marking_criteria: list[MathMarkingCriterion] = Field(
        min_length=1
    )

    @model_validator(mode="after")
    def validate_response_type(self):
        expected_types = {
            "read_coordinates": "coordinate_reading",
            "plot_coordinates": "coordinate_plot",
            "plot_and_identify_shapes": "shape_identification",
            "triangle_area": "triangle_area",
            "unknown_values": "unknown_value",
        }

        expected = expected_types[self.question_family]

        if self.response_type != expected:
            raise ValueError(
                "Response type does not match question family."
            )

        if self.expected_answer.response_type != expected:
            raise ValueError(
                "Expected answer type does not match question family."
            )

        criteria_total = sum(
            criterion.marks
            for criterion in self.marking_criteria
        )

        if abs(criteria_total - self.marks) > 0.001:
            raise ValueError(
                "The total marks assigned to marking criteria "
                "must equal the question marks."
            )

        graph_question_families = {
            "read_coordinates",
            "plot_coordinates",
            "plot_and_identify_shapes",
        }

        if (
            self.graph_data is not None
            and self.question_family not in graph_question_families
        ):
            raise ValueError(
                "Graph data is only allowed for coordinate and shape questions."
            )

        return self


# ============================================================
# MULTIPART QUESTION STRUCTURE
# ============================================================

class MathQuestionPart(MathBaseSchema):
    part_label: str = Field(min_length=1, max_length=10)

    question: MathQuestionDefinition


class MathQuestionGroup(MathBaseSchema):
    parent_prompt: str = Field(
        min_length=1,
        max_length=10000,
    )

    parts: list[MathQuestionPart] = Field(
        min_length=2,
        max_length=26,
    )

    @model_validator(mode="after")
    def validate_part_labels(self):
        labels = [
            part.part_label
            for part in self.parts
        ]

        if len(labels) != len(set(labels)):
            raise ValueError("Part labels must be unique.")

        return self

    @property
    def total_marks(self) -> float:
        return sum(part.question.marks for part in self.parts)


# ============================================================
# EXAM CONFIGURATION
# ============================================================

class MathExamSettings(MathBaseSchema):
    exam_mode: MathExamMode

    require_teacher_approval: bool = True


# ============================================================
# COMPLETE QUESTION PAYLOAD
# ============================================================

class MathQuestionCreate(MathBaseSchema):
    question: MathQuestionDefinition | MathQuestionGroup

    source_type: Literal[
        "teacher_created",
        "textbook_source",
        "ai_generated",
    ] = "teacher_created"

    source_reference: dict[str, Any] | None = None

 
