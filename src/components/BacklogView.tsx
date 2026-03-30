import React, { useState } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
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
import { useCards, useCreateCard, useMoveCard, useUpdateCard } from "../hooks/useCards";
import type { Profile } from "../hooks/useProfile";
import type { Card as CardType } from "../lib/supabase";

interface BacklogViewProps {
  boardId: string;
  profilesMap: Record<string, Profile>;
}

const BacklogView: React.FC<BacklogViewProps> = ({ boardId, profilesMap }) => {
  const { data: cards = [] } = useCards(boardId);
  const createCard = useCreateCard();
  const moveCard = useMoveCard();
  const updateCard = useUpdateCard();

  const backlogCards = cards.filter((c) => c.column_name === "backlog");
  const todoCount = cards.filter((c) => c.column_name === "todo").length;

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("none");

  const [editCard, setEditCard] = useState<CardType | null>(null);
  const [editAssignee, setEditAssignee] = useState("none");

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createCard.mutate({
      board_id: boardId,
      column_name: "backlog",
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      position: backlogCards.length,
      assigned_to: newAssignee === "none" ? null : newAssignee,
    });
    setNewTitle("");
    setNewDescription("");
    setNewAssignee("none");
    setCreateOpen(false);
  };

  const handleMoveToBoard = (cardId: string) => {
    moveCard.mutate({ cardId, column_name: "todo", position: todoCount });
  };

  const handleOpenEdit = (card: CardType) => {
    setEditCard(card);
    setEditAssignee(card.assigned_to ?? "none");
  };

  const handleSaveEdit = () => {
    if (!editCard) return;
    updateCard.mutate(
      {
        cardId: editCard.id,
        assigned_to: editAssignee === "none" ? null : editAssignee,
      },
      { onSuccess: () => setEditCard(null) },
    );
  };

  const profiles = Object.values(profilesMap);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">
          {backlogCards.length} {backlogCards.length === 1 ? "item" : "items"}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Add Item
        </Button>
      </div>

      {backlogCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <p className="text-sm">No backlog items yet.</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            + Add your first item
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl">
          {backlogCards.map((card) => {
            const assignee = card.assigned_to
              ? profilesMap[card.assigned_to]
              : null;
            const initials = assignee?.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card key={card.id} className="bg-card">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{card.title}</p>
                    {card.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {card.description}
                      </p>
                    )}
                  </div>
                  {assignee ? (
                    <button
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      onClick={() => handleOpenEdit(card)}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {initials}
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {assignee.full_name}
                      </span>
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7 px-2 shrink-0"
                      onClick={() => handleOpenEdit(card)}
                    >
                      Assign
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 shrink-0"
                    onClick={() => handleMoveToBoard(card.id)}
                    disabled={moveCard.isPending}
                  >
                    → Board
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Backlog</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              autoFocus
              placeholder="Item title"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewTitle(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewDescription(e.target.value)
              }
            />
            {profiles.length > 0 && (
              <Select value={newAssignee} onValueChange={setNewAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createCard.isPending || !newTitle.trim()}
            >
              {createCard.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit assignee dialog */}
      <Dialog open={!!editCard} onOpenChange={(open) => !open && setEditCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCard?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <label className="text-sm font-medium">Assign to</label>
            <Select value={editAssignee} onValueChange={setEditAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditCard(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateCard.isPending}>
              {updateCard.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BacklogView;
