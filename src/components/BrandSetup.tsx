import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BrandSetupProps {
  onComplete: () => void;
}

export function BrandSetup({ onComplete }: BrandSetupProps) {
  const [brandName, setBrandName] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [currentVariant, setCurrentVariant] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addVariant = () => {
    if (currentVariant.trim() && !variants.includes(currentVariant.trim())) {
      setVariants([...variants, currentVariant.trim()]);
      setCurrentVariant("");
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: keyword, error } = await supabase
        .from("keywords")
        .insert({
          user_id: user.id,
          brand_name: brandName.trim(),
          variants: variants
        })
        .select()
        .single();

      if (error) throw error;

      // Monitoring is handled automatically by backend queue system

      toast({
        title: "Brand setup complete!",
        description: "Your brand is now being monitored and sample data has been generated.",
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up brand monitoring.",
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
          <CardTitle>Brand Setup</CardTitle>
          <CardDescription>
            Set up your brand for monitoring across the web
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                placeholder="Enter your brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant">Brand Variants (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="variant"
                  placeholder="Alternative names or keywords"
                  value={currentVariant}
                  onChange={(e) => setCurrentVariant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
                />
                <Button type="button" onClick={addVariant} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2">
                <Label>Added Variants:</Label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {variant}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => removeVariant(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Setting up..." : "Start Monitoring"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}