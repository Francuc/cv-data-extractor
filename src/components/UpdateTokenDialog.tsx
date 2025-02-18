
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UpdateTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const validateToken = (token: string): { isValid: boolean; error?: string } => {
  if (!token.startsWith('1//')) {
    return { isValid: false, error: "Token must start with '1//'" };
  }
  if (token.length < 100 || token.length > 150) {
    return { isValid: false, error: "Token length is invalid (should be between 100-150 characters)" };
  }
  if (!/^[a-zA-Z0-9\-\/]+$/.test(token)) {
    return { isValid: false, error: "Token contains invalid characters" };
  }
  return { isValid: true };
};

export const UpdateTokenDialog = ({ isOpen, onClose }: UpdateTokenDialogProps) => {
  const [token, setToken] = useState('');
  const validation = validateToken(token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      toast.error("Please enter a valid token");
      return;
    }

    try {
      // Update the token in Supabase secrets
      const { error } = await supabase.functions.invoke('google-drive-operations', {
        body: {
          operation: 'updateRefreshToken',
          token: token
        }
      });

      if (error) throw error;

      // Update the timestamp in token_updates table
      const { error: dbError } = await supabase
        .from('token_updates')
        .upsert({
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token_type: 'google_refresh'
        })
        .eq('token_type', 'google_refresh');

      if (dbError) throw dbError;

      toast.success("Token updated successfully");
      onClose();
      setToken('');
    } catch (error) {
      console.error('Error updating token:', error);
      toast.error("Failed to update token");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Drive Refresh Token</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter refresh token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={`pr-10 ${!validation.isValid && token ? 'border-red-500' : ''}`}
              />
              {token && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validation.isValid ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </span>
              )}
            </div>
            {token && !validation.isValid && (
              <p className="text-sm text-red-500">{validation.error}</p>
            )}
            <p className="text-sm text-gray-500">
              Token should start with '1//' and be between 100-150 characters long.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!validation.isValid}>
              Update Token
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
