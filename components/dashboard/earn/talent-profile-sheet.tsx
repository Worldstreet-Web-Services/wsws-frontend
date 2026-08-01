"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextAreaField, TextField } from "@/components/dashboard/earn/form-field";
import { useSaveTalentProfile } from "@/hooks/use-earn-talent";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";

interface TalentProfileSheetProps {
  open: boolean;
  onClose: () => void;
  // Called after the profile saves, so the submit flow that opened this can
  // carry on.
  onSaved?: () => void;
}

// The one-time talent profile a user completes before they can enter a listing.
// The service refuses a submission until this is filled in, so the submit sheet
// opens this when it hits that refusal.
export function TalentProfileSheet({ open, onClose, onSaved }: TalentProfileSheetProps) {
  const save = useSaveTalentProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [telegram, setTelegram] = useState("");
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    username?: string;
  }>({});

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "Add your first name.";
    if (!lastName.trim()) next.lastName = "Add your last name.";
    if (!username.trim()) next.username = "Pick a username.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const id = toast.loading("Saving your profile…");
    try {
      await save.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        // Skills are entered as a comma-separated line and split into the list
        // the service expects.
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        telegram: telegram.trim(),
      });
      toast.success("Profile saved. You can submit now.", { id });
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't save your profile."), { id });
    }
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="ws-display text-[18px] text-white">Complete your talent profile</h2>
          <p className="mt-1 font-sans text-[12.5px] font-normal text-white/50">
            A one-time step before you can submit to listings.
          </p>
        </div>

        <div className="flex gap-3">
          <TextField
            label="First name"
            required
            value={firstName}
            onChange={setFirstName}
            error={errors.firstName}
          />
          <TextField
            label="Last name"
            required
            value={lastName}
            onChange={setLastName}
            error={errors.lastName}
          />
        </div>

        <TextField
          label="Username"
          required
          value={username}
          onChange={setUsername}
          error={errors.username}
          placeholder="yourhandle"
        />

        <TextAreaField
          label="Bio"
          value={bio}
          onChange={setBio}
          rows={3}
          placeholder="A line or two about what you build."
        />

        <TextField
          label="Skills"
          value={skills}
          onChange={setSkills}
          placeholder="Frontend, React, Solidity"
          hint="Comma-separated."
        />

        <TextField
          label="Telegram"
          value={telegram}
          onChange={setTelegram}
          placeholder="https://t.me/yourhandle"
        />

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ws-inset flex-1 cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="bg-accent text-ink flex-1 cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
