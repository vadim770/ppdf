import { useState } from 'react';
import MergeTool from './MergeTool';
import CompressTool from './CompressTool';
import ImageToPdfTool from './ImageToPdfTool';
import PdfToImageTool from './PdfToImageTool';

type TabView = 'compress' | 'merge' | 'img-to-pdf' | 'pdf-to-img';

function App() {
  const [activeTab, setActiveTab] = useState<TabView>('merge');

  const tabContent: Record<TabView, { title: string; desc: string }> = {
    'compress': {
      title: 'Compress Images',
      desc: 'Reduce file size without losing quality. All processing happens on your device.'
    },
    'merge': {
      title: 'PDF Organizer',
      desc: 'Merge files, reorder pages, and fix rotation before saving.'
    },
    'img-to-pdf': {
      title: 'Convert Images to PDF',
      desc: 'Turn multiple images (JPG, PNG) into a single PDF document.'
    },
    'pdf-to-img': {
      title: 'Convert PDF to Images',
      desc: 'Extract every page of your PDF as a high-quality image file.'
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      
      <aside className="w-64 bg-white shadow-md flex flex-col z-10">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tighter">
            ppdf<span className="text-gray-400 text-sm">.tool</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          
          {/* 1st: PDF Organizer */}
          <button 
            onClick={() => setActiveTab('merge')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'merge' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            📑 PDF Organizer
          </button>

          {/* 2nd: Images to PDF */}
          <button 
            onClick={() => setActiveTab('img-to-pdf')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'img-to-pdf' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            🖼️ Images to PDF
          </button>

          {/* 3rd: PDF to Image */}
          <button 
            onClick={() => setActiveTab('pdf-to-img')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'pdf-to-img' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            📸 PDF to JPG
          </button>

          {/* 4th: Image Compressor */}
          <button 
            onClick={() => setActiveTab('compress')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'compress' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
          >
            📉 Compress Images
          </button>

        </nav>

        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center mb-2">
            Privacy First. No servers.
          </p>
          
          {/* ATTRIBUTION LINK */}
          <p className="text-[10px] text-gray-300 text-center leading-tight">
            <a 
              href="https://www.flaticon.com/free-icons/pdf" 
              title="pdf icons"
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              Pdf icons created by Freepik - Flaticon
            </a>
          </p>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {tabContent[activeTab].title}
            </h2>
            <p className="text-gray-500 mt-2">
              {tabContent[activeTab].desc}
            </p>
          </div>

          {activeTab === 'compress' && <CompressTool />}
          {activeTab === 'merge' && <MergeTool />}
          {activeTab === 'img-to-pdf' && <ImageToPdfTool />}
          {activeTab === 'pdf-to-img' && <PdfToImageTool />}

        </div>
      </main>

      

    </div>
  )
}

export default App