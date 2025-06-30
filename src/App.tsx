import React, { useState, useEffect } from 'react';
import { DocumentUploader } from './components/DocumentUploader';
import { EnhancedDocumentReader } from './components/EnhancedDocumentReader';
import { EnhancedAIPanel } from './components/EnhancedAIPanel';


import { useDocumentProcessor } from './hooks/useDocumentProcessor';
import { Document } from './types';

function App() {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [directQuery, setDirectQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAIPanelCollapsed, setIsAIPanelCollapsed] = useState(false);
  
  const { processDocument, isProcessing, processingProgress } = useDocumentProcessor();
  


  const handleFileUpload = async (file: File) => {
    console.log('App.tsx: handleFileUpload called with file:', file.name, file.type, file.size);
    try {
      console.log('App.tsx: Starting document processing...');
      const document = await processDocument(file);
      console.log('App.tsx: Document processed successfully:', document);
      setCurrentDocument(document);
      

      
      console.log('App.tsx: Current document set, should now show reader');
    } catch (error) {
      console.error('App.tsx: Failed to process document:', error);
    }
  };

  const handleTextSelection = (text: string) => {
    setSelectedText(text);
  };

  const handleAskAI = (query: string) => {
    setAiQuery(query);
  };

  // Handler for direct queries from text selection menu
  const handleDirectAI = async (query: string) => {
    setDirectQuery(query);
  };

  // Clear direct query after processing
  useEffect(() => {
    if (directQuery) {
      const timer = setTimeout(() => setDirectQuery(''), 100);
      return () => clearTimeout(timer);
    }
  }, [directQuery]);

  const handleCloseAI = () => {
    setAiQuery('');
    setSelectedText('');
  };



  if (!currentDocument) {
    return (
      <div className="relative">
      <DocumentUploader 
        onFileUpload={handleFileUpload}
        isLoading={isProcessing}
        processingProgress={processingProgress}
      />
      </div>
    );
  }

  return (
    <div className="h-screen bg-white relative">
      {/* Enhanced Document Reader */}
      <EnhancedDocumentReader
        document={currentDocument}
        onTextSelect={handleTextSelection}
        onAskAI={handleAskAI}
        onDirectAI={handleDirectAI}
        selectedText={selectedText}
        onPageChange={setCurrentPage}
        isAIPanelCollapsed={isAIPanelCollapsed}
      />

      {/* Always visible Enhanced AI Panel - positioned as right sidebar */}
      <EnhancedAIPanel
        document={currentDocument}
        selectedText={selectedText}
        query={aiQuery}
        onClose={handleCloseAI}
        currentPage={currentPage}
        directQuery={directQuery}
        onCollapseChange={setIsAIPanelCollapsed}
      />


    </div>
  );
}

export default App;