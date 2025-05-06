import React from 'react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

export default function TestFileSaver() {
  const handleTest = async () => {
    try {
      console.log('JSZip:', JSZip);
      console.log('FileSaver:', FileSaver);
      
      // Create a simple text file in a zip
      const zip = new JSZip();
      zip.file("Hello.txt", "Hello World!");
      
      const blob = await zip.generateAsync({type: "blob"});
      console.log('Generated blob:', blob);
      
      FileSaver.saveAs(blob, "test.zip");
      console.log('File saved');
    } catch (error) {
      console.error('Error testing file saver:', error);
    }
  };
  
  return (
    <div>
      <h1>Test FileSaver</h1>
      <button onClick={handleTest}>Test Download</button>
    </div>
  );
} 