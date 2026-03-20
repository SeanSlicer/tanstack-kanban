import { useState, useEffect } from 'react';
import { useCards } from '../hooks/useCards';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { DndContext, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/core';

interface CardItem {
  id: string;
  board_id: string;
  column_name: 'todo' | 'in_progress' | 'done';
  title: string;
  description: string;
  position: number;
  created_at: string;
}

interface Column {
  id: 'todo' | 'in_progress' | 'done';
  title: string;
  cards: CardItem[];
}

const KanbanBoard = () => {
  const [boardId, setBoardId] = useState<string>('');
  const { data: cards = [] } = useCards(boardId);
  const [columns, setColumns] = useState<Column[]>([]);

  useEffect(() => {
    if (cards.length > 0) {
      const newColumns = [
        { id: 'todo', title: 'Todo', cards: [] },
        { id: 'in_progress', title: 'In Progress', cards: [] },
        { id: 'done', title: 'Done', cards: [] },
      ];

      cards.forEach((card: CardItem) => {
        const column = newColumns.find(col => col.id === card.column_name);
        if (column) {
          column.cards.push(card);
        }
      });

      setColumns(newColumns);
    }
  }, [cards]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active && over) {
      const activeCard = active.data.current;
      const overColumn = columns.find(col => col.id === over.id);

      if (overColumn) {
        const newColumns = columns.map(column => {
          if (column.id === activeCard.column_name) {
            return {
              ...column,
              cards: column.cards.filter(card => card.id !== activeCard.id),
            };
          }
          if (column.id === overColumn.id) {
            return {
              ...column,
              cards: [...column.cards, activeCard],
            };
          }
          return column;
        });

        setColumns(newColumns);

        // Call useMoveCard to update the card's column and position
        // You would need to implement the actual mutation logic here
        // For example, using the useMoveCard hook from your hooks file
        // useMoveCard.mutate({ id: activeCard.id, column_name: overColumn.id, position: newColumns.findIndex(col => col.id === overColumn.id) });
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="flex space-x-4">
        {columns.map(column => (
          <div key={column.id} className="w-1/3">
            <Card>
              <CardHeader>
                <CardTitle>{column.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {column.cards.map(card => (
                  <div key={card.id} className="mb-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>{card.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{card.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;