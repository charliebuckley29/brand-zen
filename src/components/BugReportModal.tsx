import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Camera, FileText, Bug, Loader2, Info, Copy, Check } from "lucide-react";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BugReportData {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  consoleLogs: string;
  screenshots: File[];
}

const priorities = [
  { value: 'low', label: 'Low', description: 'Minor issue, workaround exists' },
  { value: 'medium', label: 'Medium', description: 'Noticeable issue affecting workflow' },
  { value: 'high', label: 'High', description: 'Significant impact on functionality' },
  { value: 'critical', label: 'Critical', description: 'System unusable or data loss' }
];

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsCopied, setInstructionsCopied] = useState(false);
  const [capturedErrors, setCapturedErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<BugReportData>({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    priority: 'medium',
    consoleLogs: '',
    screenshots: []
  });
  const { toast } = useToast();

  // Attempt to capture recent console errors (limited by browser security)
  const captureRecentErrors = () => {
    try {
      // This is a very limited approach - we can only capture errors that happen after this point
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      const errors: string[] = [];

      // Override console.error and console.warn temporarily
      console.error = (...args) => {
        const errorMsg = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        errors.push(`ERROR: ${new Date().toISOString()}: ${errorMsg}`);
        originalConsoleError.apply(console, args);
      };

      console.warn = (...args) => {
        const warnMsg = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        errors.push(`WARN: ${new Date().toISOString()}: ${warnMsg}`);
        originalConsoleWarn.apply(console, args);
      };

      // Restore original console methods after 10 seconds
      setTimeout(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        if (errors.length > 0) {
          setCapturedErrors(errors);
          setFormData(prev => ({
            ...prev,
            consoleLogs: prev.consoleLogs + '\n\n--- Captured Errors ---\n' + errors.join('\n')
          }));
          toast({
            title: "Errors captured",
            description: `Captured ${errors.length} error(s) - check console logs field`
          });
        }
      }, 10000);

      toast({
        title: "Error capture active",
        description: "Reproducing the bug now will capture any console errors for 10 seconds"
      });
    } catch (error) {
      console.error('Error capture failed:', error);
    }
  };

  const collectBrowserInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  };

  const handleScreenshot = async () => {
    try {
      // Check if the browser supports screen capture
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast({
          title: "Screen capture not supported",
          description: "Your browser doesn't support screen capture. Please use the file upload option.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Screen capture starting",
        description: "Please select the screen or window to capture"
      });

      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      
      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
        video.play();
      });
      
      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Stop the stream immediately after capture
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          setFormData(prev => ({
            ...prev,
            screenshots: [...prev.screenshots, file]
          }));
          toast({
            title: "Screenshot captured",
            description: "Screenshot added to bug report"
          });
        } else {
          throw new Error('Failed to create screenshot blob');
        }
      }, 'image/png');
      
    } catch (error: any) {
      console.error('Screenshot error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permission denied",
          description: "Screen capture permission was denied. Please use the file upload option.",
          variant: "destructive"
        });
      } else if (error.name === 'NotSupportedError') {
        toast({
          title: "Not supported",
          description: "Screen capture is not supported in this browser. Please use the file upload option.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Screenshot failed",
          description: "Could not capture screenshot. Please use the file upload option.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files detected",
        description: `${invalidFiles.length} non-image file(s) were skipped. Only image files are allowed.`,
        variant: "destructive"
      });
    }
    
    if (imageFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...imageFiles]
      }));
      
      toast({
        title: "Files added",
        description: `${imageFiles.length} image(s) added to bug report`
      });
    }
    
    // Reset the input
    event.target.value = '';
  };

  const removeScreenshot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const copyConsoleLogs = async () => {
    const instructions = `To get console logs:

CHROME:
1. Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
2. Click the "Console" tab
3. Look for any red error messages or warnings
4. Right-click in the console area and select "Save as..." or copy all visible text
5. Paste the logs in the field below

FIREFOX:
1. Press F12 or Ctrl+Shift+K (Cmd+Option+K on Mac)
2. Click the "Console" tab
3. Look for any red error messages or warnings
4. Right-click and select "Select All" then copy
5. Paste the logs in the field below

SAFARI:
1. Press Cmd+Option+C
2. Click the "Console" tab
3. Look for any red error messages or warnings
4. Copy any error messages you see
5. Paste the logs in the field below

EDGE:
1. Press F12 or Ctrl+Shift+I
2. Click the "Console" tab
3. Look for any red error messages or warnings
4. Right-click and copy the console output
5. Paste the logs in the field below

TIP: If you don't see any errors, try reproducing the bug while the console is open to capture any new errors.`;

    try {
      await navigator.clipboard.writeText(instructions);
      setInstructionsCopied(true);
      setTimeout(() => setInstructionsCopied(false), 2000);
      toast({
        title: "Instructions copied",
        description: "Console log instructions copied to clipboard"
      });
    } catch (error) {
      // Fallback if clipboard API isn't available
      console.log('Clipboard not available, showing instructions instead');
      setShowInstructions(true);
      toast({
        title: "Instructions shown",
        description: "Follow the steps below to get console logs"
      });
    }
  };

  const uploadScreenshots = async (screenshots: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of screenshots) {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Create a path that includes user ID for RLS policy
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('bug-report-screenshots')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error('Screenshot upload error:', error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('bug-report-screenshots')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in the title and description",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload screenshots if any
      let screenshotUrls: string[] = [];
      if (formData.screenshots.length > 0) {
        screenshotUrls = await uploadScreenshots(formData.screenshots);
      }

      // Collect browser information
      const browserInfo = collectBrowserInfo();

      // Submit bug report
      const { error } = await supabase
        .from('bug_reports' as any)
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          steps_to_reproduce: formData.stepsToReproduce.trim() || null,
          expected_behavior: formData.expectedBehavior.trim() || null,
          actual_behavior: formData.actualBehavior.trim() || null,
          priority: formData.priority,
          browser_info: browserInfo,
          console_logs: formData.consoleLogs.trim() || null,
          screenshots: screenshotUrls.length > 0 ? screenshotUrls : null,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve the application!"
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: '',
        priority: 'medium',
        consoleLogs: '',
        screenshots: []
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Bug report submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit bug report",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            Help us improve the application by reporting bugs and issues you encounter.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Bug Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map(priority => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <div>
                      <div className="font-medium">{priority.label}</div>
                      <div className="text-xs text-muted-foreground">{priority.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the bug or issue"
              rows={4}
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <Label htmlFor="steps">Steps to Reproduce</Label>
            <Textarea
              id="steps"
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData(prev => ({ ...prev, stepsToReproduce: e.target.value }))}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. Enter..."
              rows={3}
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected">Expected Behavior</Label>
              <Textarea
                id="expected"
                value={formData.expectedBehavior}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                placeholder="What should happen?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual">Actual Behavior</Label>
              <Textarea
                id="actual"
                value={formData.actualBehavior}
                onChange={(e) => setFormData(prev => ({ ...prev, actualBehavior: e.target.value }))}
                placeholder="What actually happens?"
                rows={3}
              />
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <Label>Screenshots</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleScreenshot}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Screenshot
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            {formData.screenshots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {formData.screenshots.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeScreenshot(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Console Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="logs">Console Logs</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={captureRecentErrors}
                  className="text-xs"
                >
                  <Bug className="h-3 w-3 mr-1" />
                  Capture Errors
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={copyConsoleLogs}
                  className="text-xs"
                >
                  {instructionsCopied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1" />
                      Instructions
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {showInstructions && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs whitespace-pre-line">
                  {`To get console logs:

CHROME/EDGE: Press F12 → Console tab → Copy any red errors
FIREFOX: Press F12 → Console tab → Right-click → Select All → Copy  
SAFARI: Press Cmd+Option+C → Console tab → Copy any errors

TIP: Keep console open while reproducing the bug to capture new errors.`}
                </AlertDescription>
              </Alert>
            )}
            
            <Textarea
              id="logs"
              value={formData.consoleLogs}
              onChange={(e) => setFormData(prev => ({ ...prev, consoleLogs: e.target.value }))}
              placeholder="Paste any error messages or console logs here, or use 'Capture Errors' button then reproduce the bug..."
              rows={4}
            />
            
            {capturedErrors.length > 0 && (
              <div className="text-xs text-green-600">
                ✓ Captured {capturedErrors.length} error(s) automatically
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Bug Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
