"use client";

const PdfViewer = ({ url }: { url: string }) => {
  return (
    <div style={{ height: "100vh", width: "100%", overflow: "auto" }}>
      <iframe
        src={url}
        title="PDF Viewer"
        width="100%"
        height="100%"
        style={{
          border: "none",
          overflow: "auto", // Allow scrolling inside the iframe
          display: "block",  // Make sure iframe is treated as a block element
          touchAction: "auto", // Enable touch actions like scrolling
        }}
        scrolling="yes" // Explicitly allow scrolling in the iframe
      />
    </div>
  );
};

export default PdfViewer;
