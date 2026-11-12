import cv2
import numpy as np


def preprocess_image(image_bytes: bytes) -> bytes:
    """Decode and enhance an image for OCR."""

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Unable to read the uploaded image.")

    # Improve local contrast while preserving the original dimensions.
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lightness, channel_a, channel_b = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    enhanced_lightness = clahe.apply(lightness)

    enhanced_lab = cv2.merge(
        (enhanced_lightness, channel_a, channel_b)
    )

    enhanced_image = cv2.cvtColor(
        enhanced_lab,
        cv2.COLOR_LAB2BGR
    )

    success, encoded_image = cv2.imencode(
        ".jpg",
        enhanced_image,
        [cv2.IMWRITE_JPEG_QUALITY, 95]
    )

    if not success:
        raise ValueError("Unable to encode the preprocessed image.")

    return encoded_image.tobytes()


def correct_illumination(image: np.ndarray) -> np.ndarray:
    """Reduce uneven lighting across a photographed page."""

    # Work on the brightness channel.
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lightness, channel_a, channel_b = cv2.split(lab)

    # Estimate the background lighting.
    background = cv2.GaussianBlur(
        lightness,
        (101, 101),
        0
    )

    # Correct brightness variations.
    background = np.maximum(background, 1)

    corrected = (
        lightness.astype(np.float32)
        / background.astype(np.float32)
    ) * np.mean(background)

    corrected = np.clip(corrected, 0, 255).astype(np.uint8)

    # Reconstruct the colour image.
    corrected_lab = cv2.merge(
        (corrected, channel_a, channel_b)
    )

    return cv2.cvtColor(
        corrected_lab,
        cv2.COLOR_LAB2BGR
    )


def preprocess_image_with_illumination(image_bytes: bytes) -> bytes:
    """Apply contrast enhancement and illumination correction."""

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Unable to read the uploaded image.")

    # First, reduce uneven illumination.
    corrected_image = correct_illumination(image)

    # Then, enhance local contrast.
    lab = cv2.cvtColor(corrected_image, cv2.COLOR_BGR2LAB)
    lightness, channel_a, channel_b = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    enhanced_lightness = clahe.apply(lightness)

    enhanced_lab = cv2.merge(
        (enhanced_lightness, channel_a, channel_b)
    )

    enhanced_image = cv2.cvtColor(
        enhanced_lab,
        cv2.COLOR_LAB2BGR
    )

    success, encoded_image = cv2.imencode(
        ".jpg",
        enhanced_image,
        [cv2.IMWRITE_JPEG_QUALITY, 95]
    )

    if not success:
        raise ValueError("Unable to encode the preprocessed image.")

    return encoded_image.tobytes()