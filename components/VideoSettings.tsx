'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface VideoSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: VideoGenerationSettings) => void;
}

export interface VideoGenerationSettings {
  model: 'kling-2.1' | 'seedream-lite';
  resolution: '720p';
}

export function VideoSettings({
  isOpen,
  onClose,
  onConfirm,
}: VideoSettingsProps) {
  const [model, setModel] = useState<'kling-2.1' | 'seedream-lite'>(
    'kling-2.1'
  );

  const handleConfirm = () => {
    onConfirm({
      model,
      resolution: '720p',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Video Generation Settings</DialogTitle>
          <DialogDescription>
            Choose your preferred video generation model
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Video Model</Label>
            <RadioGroup value={model} onValueChange={(value) => setModel(value as 'kling-2.1' | 'seedream-lite')}>
              <div className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem
                  value="kling-2.1"
                  id="kling-2.1"
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="kling-2.1"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Kling 2.1
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher quality, more expensive. Best for smooth
                    transitions and detailed motion.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem
                  value="seedream-lite"
                  id="seedream-lite"
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="seedream-lite"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Seedream-lite
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    More affordable option. Good for quick iterations.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Resolution: 720p</p>
            <p>
              Both models will generate videos at 720p resolution for optimal
              quality and processing speed.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Generate Video</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
