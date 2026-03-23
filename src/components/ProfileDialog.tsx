import React, { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { useProfile, useUpdateProfile } from "../hooks/useProfile";

interface ProfileDialogProps {
  userId: string;
  onNameChange: (name: string) => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({
  userId,
  onNameChange,
}) => {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile();

  const handleOpen = () => {
    setFullName(profile?.full_name ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    updateProfile.mutate(
      { userId, fullName: fullName.trim() },
      {
        onSuccess: () => {
          onNameChange(fullName.trim());
          setOpen(false);
        },
      },
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-8 w-8 p-0"
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                autoFocus
                placeholder="Your full name"
                value={fullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFullName(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setOpen(false);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                disabled
                value={profile?.email ?? ""}
                className="opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || !fullName.trim()}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileDialog;
