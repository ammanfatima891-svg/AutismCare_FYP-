import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function UploadResults() {
  const [selectedTest, setSelectedTest] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resultNotes, setResultNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingTests = [
    { id: 1, label: 'Hearing Assessment - Emma Johnson (4 years)' },
    { id: 2, label: 'Audiometry Test - Noah Smith (3 years)' },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setUploadedFile(file);
        toast.success('File uploaded successfully');
      } else {
        toast.error('Please upload a PDF or image file');
      }
    }
  };

  const handleSubmit = () => {
    if (!selectedTest || !uploadedFile || !resultNotes) {
      toast.error('Please complete all fields');
      return;
    }

    toast.success('Test results uploaded successfully!');
    setSelectedTest('');
    setUploadedFile(null);
    setResultNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-purple-600 mb-2">Upload Test Results</h2>
        <p className="text-gray-600">Upload completed test results and reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            Test Result Upload
          </CardTitle>
          <CardDescription>
            Select the test and upload the results document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Select Test */}
          <div>
            <Label htmlFor="test-select">Select Test Request *</Label>
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger id="test-select" className="mt-1">
                <SelectValue placeholder="Choose a pending test" />
              </SelectTrigger>
              <SelectContent>
                {pendingTests.map((test) => (
                  <SelectItem key={test.id} value={test.id.toString()}>
                    {test.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div>
            <Label>Upload Report File *</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer"
            >
              {uploadedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-green-600">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <>
                  <FileText className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <p className="text-purple-600 mb-2">Click to upload report</p>
                  <p className="text-sm text-gray-500">PDF or Image files (Max 10MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Result Notes */}
          <div>
            <Label htmlFor="result-notes">Result Summary *</Label>
            <Textarea
              id="result-notes"
              placeholder="Enter test results, findings, and recommendations..."
              rows={6}
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={!selectedTest || !uploadedFile || !resultNotes}
            >
              <Upload className="w-4 h-4 mr-2" />
              Submit Results
            </Button>
            <Button variant="outline" onClick={() => {
              setSelectedTest('');
              setUploadedFile(null);
              setResultNotes('');
            }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
