import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';

export default function CompressTool() {
  const [items, setItems] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const processFiles = async (files) => {
    setIsCompressing(true);
    const newItems = [];

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    for (const file of files) {
      const id = Date.now() + Math.random();
      try {
        const compressedFile = await imageCompression(file, options);
        
        newItems.push({
          id,
          originalFile: file,
          compressedFile: compressedFile,
          originalSize: (file.size / 1024 / 1024).toFixed(2),
          newSize: (compressedFile.size / 1024 / 1024).toFixed(2),
          savedPercent: ((1 - (compressedFile.size / file.size)) * 100).toFixed(0),
          preview: URL.createObjectURL(compressedFile)
        });
      } catch (error) {
        console.error("Compression failed", error);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsCompressing(false);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: processFiles,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] }
  });

  const downloadFile = (fileItem) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(fileItem.compressedFile);
    link.download = `min_${fileItem.originalFile.name}`;
    link.click();
  };

  // --- Create ZIP ---
  const downloadAllAsZip = async () => {
    if (items.length === 0) return;

    const zip = new JSZip();
    
    // Add every file to the virtual zip folder
    items.forEach((item) => {
      zip.file(`min_${item.originalFile.name}`, item.compressedFile);
    });

    // Generate the zip file as a Blob
    const content = await zip.generateAsync({ type: "blob" });
    
    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "compressed_images.zip";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div {...getRootProps()} className={`border-4 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
        <input {...getInputProps()} />
        {isCompressing ? (
          <p className="text-lg text-blue-600 font-medium animate-pulse">Compressing...</p>
        ) : (
          <div>
             <p className="text-lg text-gray-600 font-medium">Drop PNG or JPG files here</p>
             <p className="text-sm text-gray-400">We'll make them smaller without ruining the quality</p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* HEADER AREA */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
             <h3 className="font-bold text-gray-700">Results ({items.length})</h3>
             
             <div className="flex gap-3">
               {/* Clear Button */}
               <button onClick={() => setItems([])} className="text-red-500 text-sm hover:underline">
                 Clear All
               </button>

               {/* BUTTON: Download ZIP */}
               {items.length > 1 && (
                 <button 
                   onClick={downloadAllAsZip}
                   className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2"
                 >
                   <span>📦 Download All as ZIP</span>
                 </button>
               )}
             </div>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-blue-50/30 transition-colors">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.originalFile.name}</p>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span className="text-gray-400 line-through">{item.originalSize} MB</span>
                    <span className="text-green-600 font-bold">→ {item.newSize} MB</span>
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">-{item.savedPercent}%</span>
                  </div>
                </div>
                <button onClick={() => downloadFile(item)} className="text-gray-500 hover:text-black font-medium text-sm">Download</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}