import { useDroppable } from "@dnd-kit/core";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Card as CardType } from "../lib/supabase";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  columnName: "todo" | "in_progress" | "done";
  cards: CardType[];
  boardId: string;
}

const columnLabels = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ columnName, cards }) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnName });

  return (
    <Card
      ref={setNodeRef}
      className={`flex flex-col min-h-125 transition-colors ${
        isOver ? "border-primary bg-accent" : "bg-muted/40"
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{columnLabels[columnName]}</span>
          <span className="text-xs bg-muted rounded-full px-2 py-0.5">
            {cards.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 flex-1">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg p-4">
            Drop cards here
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KanbanColumn;
