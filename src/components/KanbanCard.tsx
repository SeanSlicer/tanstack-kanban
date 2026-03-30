import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import React, { useState } from "react";
import type { Card } from "../lib/supabase";
import type { Profile } from "../hooks/useProfile";
import { useUpdateCard } from "../hooks/useCards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface KanbanCardProps {
  card: Card;
  profilesMap: Record<string, Profile>;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-green-500/15 text-green-600 dark:text-green-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const KanbanCard: React.FC<KanbanCardProps> = ({ card, profilesMap }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const [detailOpen, setDetailOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignee, setEditAssignee] = useState("none");
  const [editPriority, setEditPriority] = useState("none");
  const [editDueDate, setEditDueDate] = useState("");
  const updateCard = useUpdateCard();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = card.assigned_to ? profilesMap[card.assigned_to] : null;
  const initials = assignee?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(card.title);
    setEditDescription(card.description ?? "");
    setEditAssignee(card.assigned_to ?? "none");
    setEditPriority(card.priority ?? "none");
    setEditDueDate(card.due_date ?? "");
    setDetailOpen(true);
  };

  const handleSave = () => {
    updateCard.mutate(
      {
        cardId: card.id,
        title: editTitle.trim() || card.title,
        description: editDescription.trim() || null,
        assigned_to: editAssignee === "none" ? null : editAssignee,
        priority: editPriority === "none" ? null : (editPriority as Card["priority"]),
        due_date: editDueDate || null,
      },
      { onSuccess: () => setDetailOpen(false) },
    );
  };

  const isOverdue =
    card.due_date && new Date(card.due_date) < new Date(new Date().toDateString());

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="bg-card text-card-foreground rounded-lg border border-border shadow-sm"
      >
        <div className="flex items-start gap-2 p-3">
          <div
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={handleOpenDetail}
          >
            <h3 className="text-sm font-medium">{card.title}</h3>
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {card.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {card.priority && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${PRIORITY_STYLES[card.priority]}`}
                >
                  {card.priority}
                </span>
              )}
              {card.due_date && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isOverdue
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {new Date(card.due_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
              {assignee && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {initials}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {assignee.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Add a description..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Priority</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Assign to</label>
              <Select value={editAssignee} onValueChange={setEditAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {Object.values(profilesMap).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateCard.isPending}>
              {updateCard.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KanbanCard;
