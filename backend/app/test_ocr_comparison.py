from google.cloud import vision

from app.image_preprocessing import (
    preprocess_image,
    preprocess_image_with_illumination,
)
from app.passage_scanner import get_vision_client


def run_ocr(client, image_bytes, label):
    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise RuntimeError(response.error.message)

    text = ""

    if response.full_text_annotation:
        text = response.full_text_annotation.text.strip()

    print(f"\n{'=' * 25} {label} {'=' * 25}")
    print(text or "No text detected")


def main():
    

    client = get_vision_client()

    with open("app/test_passage.jpg", "rb") as file:
        original = file.read()

    clahe_image = preprocess_image(original)

    illumination_image = preprocess_image_with_illumination(original)

    run_ocr(client, original, "A - ORIGINAL")
    run_ocr(client, clahe_image, "B - CLAHE")
    run_ocr(client, illumination_image, "C - CLAHE + ILLUMINATION")


if __name__ == "__main__":
    main()