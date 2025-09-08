import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInputWithCountry } from "@/components/ui/phone-input-with-country";
import { isValidPhoneNumber } from "react-phone-number-input";

interface ProfileCompletionProps {
  initialData?: {
    full_name: string | null;
    phone_number: string | null;
  };
  onComplete: (fullName: string, phoneNumber?: string) => Promise<{ success: boolean; error?: any }>;
}

export function ProfileCompletion({ initialData, onComplete }: ProfileCompletionProps) {
  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phone_number || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your full name to continue.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await onComplete(fullName, phoneNumber);
      
      if (result.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been completed successfully!",
        });
      } else {
        throw result.error;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please complete your profile information to continue using the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile information helps us provide better service and allows our team to contact you when needed.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-sm text-muted-foreground">(recommended)</span>
              </Label>
              <PhoneInputWithCountry
                id="phoneNumber"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value || "")}
              />
              <p className="text-xs text-muted-foreground">
                Providing your phone number helps our support team assist you more effectively
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !fullName.trim()}
            >
              {isLoading ? "Updating Profile..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}