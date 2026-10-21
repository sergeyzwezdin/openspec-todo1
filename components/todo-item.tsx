"use client";

import { cn } from "cn";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Task } from "@/lib/tasks/store";
import { MAX_TITLE_LENGTH, validateTitle } from "@/lib/tasks/validate-title";

/** Actions a row delegates to the list, which owns the server requests and error toasts. */
export type TodoItemHandlers = {
  onToggle: (task: Task, done: boolean) => void;
  /** Settles once the request is done, whether it succeeded or not. */
  onRename: (task: Task, title: string) => Promise<void>;
  onDelete: (task: Task) => void;
};

export type TodoItemProps = TodoItemHandlers & {
  task: Task;
};

/** One task row with a checkbox, an inline title editor and edit/delete buttons. */
export const TodoItem = ({ task, onToggle, onRename, onDelete }: TodoItemProps): ReactElement => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Set by Enter and Escape so the blur that follows them does not open the save prompt.
  const isBlurIgnoredRef = useRef(false);
  const validation = validateTitle(draft);

  const startEditing = (): void => {
    isBlurIgnoredRef.current = false;
    setDraft(task.title);
    setIsEditing(true);
  };

  const exitEditing = (): void => {
    setIsEditing(false);
    setIsPromptOpen(false);
    setIsSaving(false);
  };

  // Empty and unchanged titles leave edit mode without a request; a failed save shows the original title.
  const saveDraft = async (): Promise<void> => {
    if (!validation.ok || validation.title === task.title) {
      exitEditing();
      return;
    }
    setIsSaving(true);
    await onRename(task, validation.title);
    exitEditing();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    event.preventDefault();
    if (isSaving) return;
    isBlurIgnoredRef.current = true;
    if (event.key === "Escape") exitEditing();
    else void saveDraft();
  };

  const handleBlur = (): void => {
    if (isBlurIgnoredRef.current || isPromptOpen) return;
    if (draft.trim() === task.title) exitEditing();
    else setIsPromptOpen(true);
  };

  // Escape, an overlay click and the close button all count as "Discard".
  const handlePromptOpenChange = (isOpen: boolean): void => {
    if (!isOpen && !isSaving) exitEditing();
  };

  return (
    <li className="flex items-center gap-2 py-1">
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => onToggle(task, checked)}
        aria-label={`Mark "${task.title}" as ${task.done ? "not done" : "done"}`}
      />
      {isEditing ? (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          readOnly={isSaving}
          maxLength={MAX_TITLE_LENGTH}
          aria-label="Task title"
          autoFocus
        />
      ) : (
        <>
          <button
            type="button"
            onClick={startEditing}
            className={getTitleClassName(task.done)}
          >
            {task.title}
          </button>
          <Button variant="ghost" size="icon-sm" onClick={startEditing} aria-label={`Edit "${task.title}"`}>
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}>
            <Trash2Icon />
          </Button>
        </>
      )}
      <SavePromptDialog
        isOpen={isPromptOpen}
        isSaveDisabled={!validation.ok || isSaving}
        isSaving={isSaving}
        onOpenChange={handlePromptOpenChange}
        onSave={() => void saveDraft()}
        onDiscard={exitEditing}
      />
    </li>
  );
};

type SavePromptDialogProps = {
  isOpen: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
};

/** Dialog shown when the title field loses focus with an unsaved change. */
const SavePromptDialog = ({
  isOpen,
  isSaveDisabled,
  isSaving,
  onOpenChange,
  onSave,
  onDiscard,
}: SavePromptDialogProps): ReactElement => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Save changes?</DialogTitle>
        <DialogDescription>The task title has unsaved changes.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
          Discard
        </Button>
        <Button onClick={onSave} disabled={isSaveDisabled}>
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/** Classes for the clickable title; completed tasks are struck through. */
const getTitleClassName = (isDone: boolean): string =>
  cn("min-w-0 flex-1 truncate text-left text-sm", isDone && "text-muted-foreground line-through");
