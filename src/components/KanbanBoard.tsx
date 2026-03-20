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
import type { Card } from "../lib/supabase";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";

interface KanbanBoardProps {
  boardId: string;
  boardTitle: string;
  onBack: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  boardId,
  boardTitle,
  onBack,
}) => {
  const { data: serverCards = [] } = useCards(boardId);
  const moveCard = useMoveCard();
  const createCard = useCreateCard();

  const [localCards, setLocalCards] = useState<Card[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<"todo" | "in_progress" | "done">(
    "todo",
  );

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
      column_name: newStatus,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      position: cards.filter((c) => c.column_name === newStatus).length,
    });
    setNewTitle("");
    setNewDescription("");
    setNewStatus("todo");
    setDialogOpen(false);
  };

  const columns = {
    todo: cards.filter((c) => c.column_name === "todo"),
    in_progress: cards.filter((c) => c.column_name === "in_progress"),
    done: cards.filter((c) => c.column_name === "done"),
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Boards
          </Button>
          <h1 className="text-2xl font-bold">{boardTitle}</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ New Card</Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-6">
          {Object.entries(columns).map(([columnName, columnCards]) => (
            <SortableContext
              key={columnName}
              items={columnCards.map((c) => c.id)}
            >
              <KanbanColumn
                columnName={columnName as "todo" | "in_progress" | "done"}
                cards={columnCards}
                boardId={boardId}
              />
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeCard && <KanbanCard card={activeCard} />}
        </DragOverlay>
      </DndContext>

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
              value={newStatus}
              onValueChange={(v: string) =>
                setNewStatus(v as "todo" | "in_progress" | "done")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCard}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanbanBoard;
