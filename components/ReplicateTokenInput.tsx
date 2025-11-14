'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ReplicateTokenInputProps {
  open: boolean;
  onTokenSubmit: (token: string) => void;
  isLoading?: boolean;
}

export function ReplicateTokenInput({
  open,
  onTokenSubmit,
  isLoading = false,
}: ReplicateTokenInputProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError('Please enter your Replicate API token');
      return;
    }

    setError('');
    onTokenSubmit(token.trim());
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Replicate API Token</DialogTitle>
          <DialogDescription>
            Your API token is used only for this session and not stored anywhere.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="token"
              className="text-sm font-medium text-foreground"
            >
              API Token
            </label>
            <input
              id="token"
              type="password"
              placeholder="r8_..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError('');
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Get your token from{' '}
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                replicate.com/account/api-tokens
              </a>
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !token.trim()}
          >
            {isLoading ? 'Generating...' : 'Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
