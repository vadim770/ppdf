import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfToImageTool() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState(2); // Scale: 1.5 = Good, 3.0 = Print Quality

  const onDrop = (acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const convertAndDownload = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const zip = new JSZip();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;

        // Create a folder for this PDF inside the zip
        const folderName = file.name.replace('.pdf', '');
        const folder = zip.folder(folderName);

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          
          // Render at High Resolution
          const viewport = page.getViewport({ scale: quality });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          // Convert to Blob (JPG)
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          
          // Add to Zip
          folder.file(`page_${String(i).padStart(3, '0')}.jpg`, blob);
        }
      }

      // Generate and Download Zip
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "converted_images.zip";
      link.click();

    } catch (error) {
      console.error("Conversion failed", error);
      alert("Error converting PDF. The file might be corrupted or password protected.");
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div {...getRootProps()} className="border-4 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
        <input {...getInputProps()} />
        <p className="text-lg text-gray-600 font-medium">Drop PDF files here</p>
        <p className="text-sm text-gray-400">We will extract every page as a high-quality JPG</p>
      </div>

      {files.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700">Selected Files ({files.length})</h3>
            <button onClick={() => setFiles([])} className="text-red-500 text-sm hover:underline">Clear All</button>
          </div>

          <ul className="space-y-2 mb-8">
            {files.map((file, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <span className="text-xl">📄</span>
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>

          <div className="border-t pt-6">
            <div className="flex items-end justify-between gap-4">
              
              {/* Quality Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Quality</label>
                <select 
                  value={quality} 
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="block w-full rounded-md border-gray-300 bg-gray-50 py-2 px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value={1.5}>Standard (Web)</option>
                  <option value={2.0}>High (Screen)</option>
                  <option value={3.0}>Ultra (Print)</option>
                </select>
              </div>

              <button
                onClick={convertAndDownload}
                disabled={isProcessing}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-200 transition-all flex-1 text-center ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isProcessing ? 'Extracting Images...' : 'Convert & Download ZIP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}