import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";

import { API_BASE_URL } from "./api";

function PassageScanner({ token, sessionId }) {
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewUrlsRef = useRef([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Attach the camera stream when the video element is rendered.
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Camera playback error:", err);
        setError("Unable to display the camera preview.");
      });
    }
  }, [cameraActive]);

  // Clean up camera and preview URLs when leaving the page.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const startCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser. Please use HTTPS."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
      setStatus("camera ready");
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        err.message || "Unable to access your camera. Please check permissions."
      );
    }
  };
  const getCroppedImage = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const context = canvas.getContext("2d");

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to create cropped image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.95
    );
  });
};
const confirmCrop = async () => {
  if (editingIndex === null || !croppedAreaPixels) {
    setError("Please select a crop area first.");
    return;
  }

  try {
    setError("");

    const selectedImage = selectedImages[editingIndex];

    const croppedBlob = await getCroppedImage(
      selectedImage.previewUrl,
      croppedAreaPixels
    );

    const croppedFile = new File(
      [croppedBlob],
      `passage-page-${editingIndex + 1}-cropped.jpg`,
      { type: "image/jpeg" }
    );

    const croppedPreviewUrl = URL.createObjectURL(croppedFile);

    previewUrlsRef.current.push(croppedPreviewUrl);

    setSelectedImages((previousImages) =>
      previousImages.map((image, index) =>
        index === editingIndex
          ? {
              ...image,
              file: croppedFile,
              previewUrl: croppedPreviewUrl,
              isCropped: true,
            }
          : image
      )
    );

    setEditingIndex(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

  } catch (err) {
    console.error("Cropping error:", err);
    setError("Unable to crop this page. Please try again.");
  }
};

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
    setStatus("ready");
  };

  const capturePage = () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is not ready. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to capture this page. Please try again.");
          return;
        }

        const pageNumber = selectedImages.length + 1;

        const file = new File(
          [blob],
          `passage-page-${pageNumber}.jpg`,
          { type: "image/jpeg" }
        );

        const previewUrl = URL.createObjectURL(file);

        previewUrlsRef.current.push(previewUrl);

        setSelectedImages((previousImages) => [
          ...previousImages,
          { file, previewUrl },
        ]);

        setError("");
        setStatus(`page ${pageNumber} captured`);
      },
      "image/jpeg",
      0.9
    );
  };

  const removePage = (index) => {
    const imageToRemove = selectedImages[index];

    URL.revokeObjectURL(imageToRemove.previewUrl);

    previewUrlsRef.current = previewUrlsRef.current.filter(
      (url) => url !== imageToRemove.previewUrl
    );

    setSelectedImages((previousImages) =>
      previousImages.filter((_, imageIndex) => imageIndex !== index)
    );
  };

  const uploadPages = async () => {
    if (selectedImages.length === 0) {
      setError("Please capture at least one page.");
      return;
    }

    try {
      setError("");
      setStatus("uploading");

      const formData = new FormData();

      selectedImages.forEach((image) => {
        formData.append("files", image.file);
      });

      const response = await fetch(
        `${API_BASE_URL}/api/passage-scanner/upload?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "POST",
          headers: {
            "X-Scan-Token": token,
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to upload passage pages."
        );
      }

      stopCamera();
      setStatus("uploaded");

    } catch (err) {
      console.error("Passage upload error:", err);
      setError(err.message || "Unable to upload passage pages.");
      setStatus("error");
    }
  };

  return (
    <div className="passage-scanner-page">
      <h1>EnglishPrep AI</h1>
      <h2>Scan reading passage</h2>

      <p>
        Capture each printed passage page using your phone camera.
        You can capture multiple pages in the correct order.
      </p>

      <p>
        Scanner status: {status}
      </p>

      {!cameraActive ? (
        <button type="button" onClick={startCamera}>
          Open Camera
        </button>
      ) : (
        <div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              maxWidth: "500px",
              borderRadius: "10px",
              background: "#000",
            }}
          />

          <div>
            <button type="button" onClick={capturePage}>
              Capture Next Page
            </button>

            <button type="button" onClick={stopCamera}>
              Stop Camera
            </button>
          </div>
        </div>
      )}

      {selectedImages.length > 0 && (
        <div>
          <h3>Captured pages: {selectedImages.length}</h3>
          {editingIndex !== null && (
            <div style={{ marginBottom: "25px" }}>
              <h3>Crop Page {editingIndex + 1}</h3>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "60vh",
                  maxHeight: "500px",
                  background: "#222",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <Cropper
                  image={selectedImages[editingIndex]?.previewUrl}
                  crop={crop}
                  zoom={zoom}
                  minZoom={1}
                  maxZoom={5}
                  zoomSpeed={0.5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) =>
                    setCroppedAreaPixels(croppedPixels)
                  }
                  restrictPosition={false}
                  objectFit="contain"
                />
              </div>

              <div style={{ marginTop: "15px" }}>
                <label>Zoom</label>

                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.1}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <button type="button" onClick={confirmCrop}>
                Confirm Crop
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setCroppedAreaPixels(null);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {selectedImages.map((image, index) => (
            <div key={image.previewUrl}>
              <p>Page {index + 1}</p>

              <img
                src={image.previewUrl}
                alt={`Captured page ${index + 1}`}
                style={{
                  width: "100%",
                  maxWidth: "350px",
                  borderRadius: "8px",
                }}
              />

              <button
                type="button"
                onClick={() => {
                  setEditingIndex(index);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setCroppedAreaPixels(null);
                }}
              >
                {image.isCropped ? "Adjust Crop" : "Crop Page"}
              </button>

              <button
                type="button"
                onClick={() => removePage(index)}
              >
                Remove Page
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={uploadPages}
            disabled={status === "uploading" || status === "uploaded"}
          >
            {status === "uploading"
              ? "Uploading Pages..."
              : status === "uploaded"
              ? "Pages Uploaded"
              : "Upload All Pages"}
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {status === "uploaded" && (
        <p>
          Pages uploaded successfully. You can return to your teacher
          dashboard while the passage is being processed.
        </p>
      )}
    </div>
  );
}

export default PassageScanner;
