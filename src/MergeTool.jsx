import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// --- SUB-COMPONENT: The Draggable Card ---
// We extract this to make the main component cleaner
function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function MergeTool() {
  const [pages, setPages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldCompress, setShouldCompress] = useState(false);

  // Setup sensors (pointers = mouse/touch, keyboard = accessibility)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const renderPageToImage = async (pageData, scale = 1.0, quality = 0.7) => {
    const loadingTask = pdfjsLib.getDocument({ data: await pageData.file.arrayBuffer() });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageData.pageIndex + 1);
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL('image/jpeg', quality);
  };

  const generateThumbnail = async (file, pageIndex) => {
    const dummyPage = { file, pageIndex };
    return await renderPageToImage(dummyPage, 0.4, 0.5);
  };

  const onDrop = async (acceptedFiles) => {
    setIsProcessing(true);
    const newPages = [];
    for (const file of acceptedFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      for (let i = 0; i < pageCount; i++) {
        const thumbnail = await generateThumbnail(file, i);
        newPages.push({
          id: `${file.name}-${i}-${Date.now()}-${Math.random()}`, // Ensure truly unique ID
          file: file,
          pageIndex: i,
          fileName: file.name,
          pdfDoc: pdfDoc,
          thumbnail: thumbnail,
          rotation: 0 
        });
      }
    }
    setPages((prev) => [...prev, ...newPages]);
    setIsProcessing(false);
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'] } 
  });

  // --- NEW DRAG END HANDLER ---
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const rotatePage = (index) => {
    setPages(prev => prev.map((page, i) => {
      if (i === index) {
        return { ...page, rotation: (page.rotation + 90) % 360 };
      }
      return page;
    }));
  };

  const duplicatePage = (index) => {
    const pageToClone = pages[index];
    const newPage = {
      ...pageToClone,
      id: `${pageToClone.fileName}-${pageToClone.pageIndex}-${Date.now()}-${Math.random()}` 
    };
    const newPages = Array.from(pages);
    newPages.splice(index + 1, 0, newPage);
    setPages(newPages);
  };

  // Remove page helper (needed because we are inside a map loop in UI)
  const removePage = (idToRemove) => {
    setPages(pages.filter(page => page.id !== idToRemove));
  };

  const downloadMergedPDF = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    const mergedPdf = await PDFDocument.create();

    if (shouldCompress) {
      for (const pageItem of pages) {
        const imgDataUrl = await renderPageToImage(pageItem, 1.5, 0.6);
        const jpgImage = await mergedPdf.embedJpg(imgDataUrl);
        const page = mergedPdf.addPage([jpgImage.width, jpgImage.height]);
        if (pageItem.rotation === 90 || pageItem.rotation === 270) {
           page.setSize(jpgImage.height, jpgImage.width);
        }
        page.drawImage(jpgImage, {
          x: 0, y: 0, width: jpgImage.width, height: jpgImage.height,
          rotate: degrees(pageItem.rotation)
        });
      }
    } else {
      for (const pageItem of pages) {
        const [copiedPage] = await mergedPdf.copyPages(pageItem.pdfDoc, [pageItem.pageIndex]);
        const existingRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(existingRotation + pageItem.rotation));
        mergedPdf.addPage(copiedPage);
      }
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = shouldCompress ? 'organized_compressed.pdf' : 'organized.pdf';
    link.click();
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div {...getRootProps()} className={`border-4 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
        <input {...getInputProps()} />
        {isProcessing ? (
           <p className="text-lg text-blue-600 font-medium animate-pulse">Processing...</p>
        ) : (
           <div>
             <p className="text-lg text-gray-600 font-medium">Drop PDF files here</p>
           </div>
        )}
      </div>

      {pages.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">Arrange & Rotate ({pages.length})</h3>
            <button onClick={() => setPages([])} className="text-red-500 text-sm hover:underline">Clear All</button>
          </div>

          {/* --- NEW GRID DRAG CONTEXT --- */}
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={pages} 
              strategy={rectSortingStrategy} // <--- Enables Grid Support
            >
              <div className="flex flex-wrap gap-4">
                {pages.map((page, index) => (
                  <SortableItem key={page.id} id={page.id}>
                     {/* CARD UI */}
                     <div className="w-32 bg-gray-100 border border-gray-300 rounded-lg overflow-hidden relative group hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing">
                        <div className="h-40 bg-gray-800 w-full overflow-hidden flex items-center justify-center">
                          <div style={{ transform: `rotate(${page.rotation}deg)`, transition: 'transform 0.3s ease' }} className="w-full h-full flex items-center justify-center">
                              {page.thumbnail && <img src={page.thumbnail} alt="Preview" className="w-full h-full object-contain" />}
                          </div>
                        </div>

                        <div className="p-2 bg-white border-t border-gray-200 text-center flex justify-between items-center px-2">
                          <span className="text-xs font-bold text-gray-700 w-4">{index + 1}</span>
                          <div className="flex gap-1">
                              <button 
                                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking button
                                onClick={() => rotatePage(index)}
                                className="text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                              >
                                ⟳
                              </button>
                              <button 
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => duplicatePage(index)}
                                className="text-gray-500 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-colors"
                              >
                                ❐
                              </button>
                          </div>
                        </div>
                        
                        <button 
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => removePage(page.id)} 
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                     </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="peer sr-only" checked={shouldCompress} onChange={(e) => setShouldCompress(e.target.checked)}/>
                <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-600 transition-colors">Compress Output</span>
                <span className="text-[10px] text-gray-400">Smaller size, text becomes image.</span>
              </div>
            </label>

            <button
              onClick={downloadMergedPDF}
              disabled={isProcessing}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-200 transition-all ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isProcessing ? 'Processing...' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}