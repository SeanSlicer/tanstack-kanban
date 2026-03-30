import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useCards, useMoveCard, useCreateCard } from "../hooks/useCards";
import { useProfiles } from "../hooks/useProfile";
import type { Card } from "../lib/supabase";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import BacklogView from "./BacklogView";

interface KanbanBoardProps {
  boardId: string;
  boardTitle: string;
  onBack: () => void;
  onSignOut: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  boardId,
  boardTitle,
  onBack,
  onSignOut,
}) => {
  const { data: serverCards = [] } = useCards(boardId);
  const moveCard = useMoveCard();
  const createCard = useCreateCard();
  const { data: profiles = [] } = useProfiles();

  const [localCards, setLocalCards] = useState<Card[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColumn, setNewColumn] = useState<Card["column_name"]>("todo");
  const [newAssignee, setNewAssignee] = useState("none");
  const [newPriority, setNewPriority] = useState("none");
  const [newDueDate, setNewDueDate] = useState("");
  const [activeView, setActiveView] = useState<"board" | "backlog">("board");

  const profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const cards = localCards.length > 0 ? localCards : serverCards;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
    setLocalCards([...serverCards]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) {
      setLocalCards([]);
      return;
    }

    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    const overIsColumn = ["todo", "in_progress", "done"].includes(
      over.id as string,
    );
    const overCard = cards.find((c) => c.id === over.id);
    const targetColumn = overIsColumn
      ? (over.id as "todo" | "in_progress" | "done")
      : (overCard?.column_name ?? activeCardData.column_name);

    if (activeCardData.column_name === targetColumn && active.id === over.id) {
      setLocalCards([]);
      return;
    }

    const updated = cards.map((c) =>
      c.id === active.id ? { ...c, column_name: targetColumn } : c,
    );

    if (!overIsColumn && overCard) {
      const oldIndex = updated.findIndex((c) => c.id === active.id);
      const newIndex = updated.findIndex((c) => c.id === over.id);
      setLocalCards(arrayMove(updated, oldIndex, newIndex));
    } else {
      setLocalCards(updated);
    }

    moveCard.mutate(
      {
        cardId: activeCardData.id,
        column_name: targetColumn,
        position: overIsColumn
          ? cards.filter((c) => c.column_name === targetColumn).length
          : cards.findIndex((c) => c.id === over.id),
      },
      {
        onSuccess: () => setLocalCards([]),
        onError: () => setLocalCards([]),
      },
    );
  };

  const handleCreateCard = () => {
    if (!newTitle.trim()) return;
    createCard.mutate({
      board_id: boardId,
      column_name: newColumn,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      position: cards.filter((c) => c.column_name === newColumn).length,
      assigned_to: newAssignee === "none" ? null : newAssignee,
      priority: newPriority === "none" ? undefined : (newPriority as Card["priority"]),
      due_date: newDueDate || undefined,
    });
    setNewTitle("");
    setNewDescription("");
    setNewColumn("todo");
    setNewAssignee("none");
    setNewPriority("none");
    setNewDueDate("");
    setDialogOpen(false);
  };

  const boardColumns = {
    todo: cards.filter((c) => c.column_name === "todo"),
    in_progress: cards.filter((c) => c.column_name === "in_progress"),
    done: cards.filter((c) => c.column_name === "done"),
  };

  const backlogCount = serverCards.filter(
    (c) => c.column_name === "backlog",
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Boards
          </Button>
          <h1 className="text-2xl font-bold">{boardTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setDialogOpen(true)}>+ New Card</Button>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeView === "board"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveView("board")}
        >
          Board
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeView === "backlog"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveView("backlog")}
        >
          Backlog
          {backlogCount > 0 && (
            <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 leading-none">
              {backlogCount}
            </span>
          )}
        </button>
      </div>

      {activeView === "backlog" ? (
        <BacklogView boardId={boardId} profilesMap={profilesMap} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-6">
            {Object.entries(boardColumns).map(([columnName, columnCards]) => (
              <SortableContext
                key={columnName}
                items={columnCards.map((c) => c.id)}
              >
                <KanbanColumn
                  columnName={columnName as "todo" | "in_progress" | "done"}
                  cards={columnCards}
                  boardId={boardId}
                  profilesMap={profilesMap}
                />
              </SortableContext>
            ))}
          </div>

          <DragOverlay>
            {activeCard && (
              <KanbanCard card={activeCard} profilesMap={profilesMap} />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Card</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              autoFocus
              placeholder="Card title"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewTitle(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleCreateCard();
              }}
            />
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewDescription(e.target.value)
              }
            />
            <Select
              value={newColumn}
              onValueChange={(v: string) =>
                setNewColumn(v as Card["column_name"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewDueDate(e.target.value)
                }
              />
            </div>
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
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCard}
              disabled={createCard.isPending || !newTitle.trim()}
            >
              {createCard.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanbanBoard;
