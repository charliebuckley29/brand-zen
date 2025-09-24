import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { toast } from 'sonner';

// Common timezones organized by region
const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' },
  
  // North America
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'North America' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: 'North America' },
  
  // Europe
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Central European Time (Rome)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Central European Time (Stockholm)', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow Standard Time', region: 'Europe' },
  
  // Asia Pacific
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia Pacific' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', region: 'Asia Pacific' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', region: 'Asia Pacific' },
  { value: 'Asia/Singapore', label: 'Singapore Time', region: 'Asia Pacific' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)', region: 'Asia Pacific' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Mumbai)', region: 'Asia Pacific' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', region: 'Asia Pacific' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Asia Pacific' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)', region: 'Asia Pacific' },
  { value: 'Australia/Perth', label: 'Australian Western Time (Perth)', region: 'Asia Pacific' },
  
  // Others
  { value: 'Africa/Cairo', label: 'Eastern European Time (Cairo)', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time', region: 'Africa' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)', region: 'South America' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time (Buenos Aires)', region: 'South America' },
];

const groupedTimezones = timezones.reduce((acc, tz) => {
  if (!acc[tz.region]) {
    acc[tz.region] = [];
  }
  acc[tz.region].push(tz);
  return acc;
}, {} as Record<string, typeof timezones>);

export const TimezoneSettings: React.FC = () => {
  const { timezone, updateTimezone, formatDateTime } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateTimezone = async () => {
    if (selectedTimezone === timezone) return;
    
    setIsUpdating(true);
    try {
      await updateTimezone(selectedTimezone);
      toast.success('Timezone updated successfully');
    } catch (error) {
      toast.error('Failed to update timezone');
      console.error('Error updating timezone:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const detectBrowserTimezone = () => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(browserTimezone);
  };

  const currentTime = formatDateTime(new Date());
  const previewTime = selectedTimezone !== timezone 
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date())
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5" />
          Timezone Settings
        </CardTitle>
        <CardDescription>
          Configure your preferred timezone for displaying dates and times throughout the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="timezone-select" className="text-sm font-medium">
            Select Timezone
          </label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger id="timezone-select">
              <SelectValue placeholder="Select a timezone..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Object.entries(groupedTimezones).map(([region, timezones]) => (
                <div key={region}>
                  <div className="font-semibold text-sm px-2 py-1 text-muted-foreground">
                    {region}
                  </div>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={detectBrowserTimezone}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Auto-detect
          </Button>
          
          {selectedTimezone !== timezone && (
            <Button
              onClick={handleUpdateTimezone}
              disabled={isUpdating}
              size="sm"
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                'Updating...'
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Update Timezone
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Current Time</div>
          <div className="text-muted-foreground text-sm">
            <div>Current: {currentTime}</div>
            {previewTime && (
              <div>Preview: {previewTime}</div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Your timezone affects how all dates and times are displayed throughout the application,
          including fetch logs, mention timestamps, and analytics data.
        </div>
      </CardContent>
    </Card>
  );
};
