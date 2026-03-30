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

interface KanbanCardProps {
  card: Card;
  profilesMap: Record<string, Profile>;
}

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
  const [selectedAssignee, setSelectedAssignee] = useState<string>("none");
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
    setSelectedAssignee(card.assigned_to ?? "none");
    setDetailOpen(true);
  };

  const handleSaveAssignee = () => {
    updateCard.mutate(
      {
        cardId: card.id,
        assigned_to: selectedAssignee === "none" ? null : selectedAssignee,
      },
      { onSuccess: () => setDetailOpen(false) },
    );
  };

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
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            )}
            {assignee && (
              <div className="mt-2 flex items-center gap-1.5">
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{card.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {card.description && (
              <p className="text-sm text-muted-foreground">{card.description}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Assign to</label>
              <Select
                value={selectedAssignee}
                onValueChange={setSelectedAssignee}
              >
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
            <Button onClick={handleSaveAssignee} disabled={updateCard.isPending}>
              {updateCard.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KanbanCard;
