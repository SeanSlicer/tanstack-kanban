import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";
import type { Card } from "../lib/supabase";

interface KanbanCardProps {
  card: Card;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ card }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-card text-card-foreground rounded-lg border border-border shadow-sm cursor-grab active:cursor-grabbing"
    >
      <h3 className="text-sm font-medium">{card.title}</h3>
      {card.description && (
        <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
      )}
    </div>
  );
};

export default KanbanCard;
