import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export default function ImageToPdfTool() {
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveAsIndividual, setSaveAsIndividual] = useState(false); // <--- 2. New Toggle State

  const onDrop = (acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] }
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setImages(items);
  };

  const downloadPDF = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      
      if (saveAsIndividual) {
        const zip = new JSZip();

        for (const [index, imgItem] of images.entries()) {
          // Create a NEW document for every single image
          const pdfDoc = await PDFDocument.create();
          const imageBytes = await imgItem.file.arrayBuffer();
          let pdfImage;

          if (imgItem.file.type === 'image/jpeg') {
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } else {
            pdfImage = await pdfDoc.embedPng(imageBytes);
          }

          const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
          page.drawImage(pdfImage, {
            x: 0, y: 0, width: pdfImage.width, height: pdfImage.height,
          });

          const pdfBytes = await pdfDoc.save();
          // Add this PDF to the ZIP
          zip.file(`${imgItem.name.split('.')[0]}.pdf`, pdfBytes);
        }

        // Generate and download ZIP
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "converted_pdfs.zip";
        link.click();

      } else {
        const pdfDoc = await PDFDocument.create();

        for (const imgItem of images) {
          const imageBytes = await imgItem.file.arrayBuffer();
          let pdfImage;

          if (imgItem.file.type === 'image/jpeg') {
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } else {
            pdfImage = await pdfDoc.embedPng(imageBytes);
          }

          const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
          page.drawImage(pdfImage, {
            x: 0, y: 0, width: pdfImage.width, height: pdfImage.height,
          });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'images_converted.pdf';
        link.click();
      }

    } catch (error) {
      console.error("Error creating PDF:", error);
      alert("Failed to process. Ensure images are valid.");
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div {...getRootProps()} className="border-4 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
        <input {...getInputProps()} />
        <p className="text-lg text-gray-600 font-medium">Drop Images (JPG/PNG) here</p>
        <p className="text-sm text-gray-400">We will convert them to PDF</p>
      </div>

      {images.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">Arrange Order ({images.length})</h3>
            <button onClick={() => setImages([])} className="text-red-500 text-sm hover:underline">Clear All</button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="images" direction="horizontal">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-wrap gap-4">
                  {images.map((img, index) => (
                    <Draggable key={img.id} draggableId={img.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="w-32 bg-gray-100 border border-gray-300 rounded-lg overflow-hidden relative group hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing">
                          <div className="h-40 w-full">
                            <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-2 bg-white border-t border-gray-200 text-center">
                            <p className="text-[10px] text-gray-500 font-mono truncate">{img.name}</p>
                            <p className="text-xs font-bold text-gray-700">Page {index + 1}</p>
                          </div>
                          <button onClick={() => setImages(images.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* FOOTER: Toggle & Download */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            
            {/* TOGGLE SWITCH */}
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={saveAsIndividual}
                  onChange={(e) => setSaveAsIndividual(e.target.checked)}
                />
                <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-purple-500 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors">Save as Separate Files</span>
                <span className="text-[10px] text-gray-400">Download a ZIP with one PDF per image.</span>
              </div>
            </label>

            <button
              onClick={downloadPDF}
              disabled={isProcessing}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-200 transition-all ${isProcessing ? 'opacity-70' : ''}`}
            >
              {isProcessing ? 'Processing...' : saveAsIndividual ? 'Download ZIP' : 'Download PDF'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}