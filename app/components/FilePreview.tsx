import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui2/dialog';
import { Button } from '@/app/components/ui2/button';
import { FileText, Image as ImageIcon, Video, FileSpreadsheet, FileCode, File } from 'lucide-react';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

export function FilePreview({ fileUrl, fileName, fileType, onClose }: FilePreviewProps) {
  const [isError, setIsError] = useState(false);

  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon className="w-6 h-6" />;
      case 'mp4':
      case 'webm':
        return <Video className="w-6 h-6" />;
      case 'csv':
      case 'xlsx':
        return <FileSpreadsheet className="w-6 h-6" />;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'xml':
      case 'html':
        return <FileCode className="w-6 h-6" />;
      case 'pdf':
        return <File className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const renderPreview = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          {getFileIcon()}
          <p className="mt-4 text-sm text-gray-500">Preview not available</p>
          <Button className="mt-4" onClick={() => window.open(fileUrl, '_blank')}>
            Download File
          </Button>
        </div>
      );
    }

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return (
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain"
            onError={() => setIsError(true)}
          />
        );
      case 'mp4':
      case 'webm':
        return (
          <video
            controls
            className="max-w-full max-h-[70vh]"
            onError={() => setIsError(true)}
          >
            <source src={fileUrl} type={`video/${extension}`} />
            Your browser does not support the video tag.
          </video>
        );
      case 'pdf':
        return (
          <iframe
            src={fileUrl}
            className="w-full h-[70vh]"
            onError={() => setIsError(true)}
          />
        );
      case 'csv':
      case 'json':
      case 'yaml':
      case 'yml':
      case 'xml':
      case 'html':
      case 'txt':
        return (
          <iframe
            src={fileUrl}
            className="w-full h-[70vh] font-mono"
            onError={() => setIsError(true)}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8">
            {getFileIcon()}
            <p className="mt-4 text-sm text-gray-500">Preview not available</p>
            <Button className="mt-4" onClick={() => window.open(fileUrl, '_blank')}>
              Download File
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon()}
            <span className="truncate">{fileName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 relative overflow-auto">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
} 