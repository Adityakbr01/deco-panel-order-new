import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User } from "lucide-react";
import { useCreateUserMutation } from "../hooks/use-create-order";
import type { UserProfile } from "../types";

type TriggerHaptic = (pattern: "light" | "medium" | "heavy") => void;

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (userId: string) => void;
  refetchUsers: () => Promise<{ data?: UserProfile[] }>;
  trigger: TriggerHaptic;
}

function getCreatedUserId(response: any) {
  return (
    response?.id ||
    response?.user?.id ||
    response?.profile?.id ||
    response?.data?.id ||
    response?.data?.user?.id ||
    response?.data?.profile?.id ||
    ""
  );
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCustomerCreated,
  refetchUsers,
  trigger,
}: CreateCustomerDialogProps) {
  const createUserMutation = useCreateUserMutation();
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    mobile: "",
    address: "",
    state: "",
    pincode: "",
  });
  const [newUserImage, setNewUserImage] = useState<File | null>(null);

  const resetNewUserForm = () => {
    setNewUserForm({
      name: "",
      email: "",
      mobile: "",
      address: "",
      state: "",
      pincode: "",
    });
    setNewUserImage(null);
  };

  const handleCreateUserSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    trigger("heavy");

    createUserMutation.mutate(
      { ...newUserForm, user_image: newUserImage },
      {
        onSuccess: async (response) => {
          const createdUserId = getCreatedUserId(response);
          const usersResult = await refetchUsers();
          const createdUser =
            usersResult.data?.find(
              (user) => String(user.id) === String(createdUserId),
            ) ||
            usersResult.data?.find(
              (user) =>
                user.mobile === newUserForm.mobile ||
                (Boolean(newUserForm.email) && user.email === newUserForm.email) ||
                user.full_name?.toLowerCase() ===
                  newUserForm.name.toLowerCase(),
            );

          if (createdUser) {
            onCustomerCreated(String(createdUser.id));
          } else if (createdUserId) {
            onCustomerCreated(String(createdUserId));
          }

          resetNewUserForm();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetNewUserForm();
      }}
    >
      <DialogContent className="max-w-lg bg-popover border border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-text flex items-center gap-2">
            <User className="size-4 text-primary" />
            Create Customer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateUserSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Name *
              </label>
              <Input
                required
                value={newUserForm.name}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Customer name"
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Mobile *
              </label>
              <Input
                required
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                value={newUserForm.mobile}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    mobile: digitsOnly(event.target.value).slice(0, 10),
                  }))
                }
                placeholder="Mobile number"
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="customer@example.com"
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Address
              </label>
              <Input
                value={newUserForm.address}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                placeholder="Address"
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                State
              </label>
              <Input
                value={newUserForm.state}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    state: event.target.value,
                  }))
                }
                placeholder="State"
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Pincode
              </label>
              <Input
                inputMode="numeric"
                value={newUserForm.pincode}
                onChange={(event) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    pincode: digitsOnly(event.target.value),
                  }))
                }
                placeholder="Pincode"
                className="bg-background border-border rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                User Image
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setNewUserImage(event.target.files?.[0] || null)
                }
                className="bg-background border-border rounded-xl cursor-pointer py-1.5 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                trigger("light");
                onOpenChange(false);
                resetNewUserForm();
              }}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="rounded-xl font-bold text-xs"
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
