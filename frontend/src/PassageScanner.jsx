import { useState } from "react";

function PassageScanner({ token, sessionId }) {
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  return (
    <div className="passage-scanner-page">
      <h1>EnglishPrep AI</h1>
      <h2>Scan reading passage</h2>

      <p>
        Capture clear photos of the printed passage pages.
        You can upload multiple pages in the correct order.
      </p>

      <p>Scanner status: {status}</p>

        <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            onChange={(event) => {
            const files = Array.from(event.target.files || []);

            console.log("Number of selected files:", files.length);
            console.log("Selected files:", files);

            setSelectedImages(files);
            }}
            />

            {selectedImages.length > 0 && (
            <div>
                <h3>Selected pages: {selectedImages.length}</h3>

                {selectedImages.map((file, index) => (
                <p key={`${file.name}-${index}`}>
                    Page {index + 1}: {file.name}
                </p>
                ))}
            </div>
            )}

        {error && <p>{error}</p>}
    </div>
  );
}

export default PassageScanner;