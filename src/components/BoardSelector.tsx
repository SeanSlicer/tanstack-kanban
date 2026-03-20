import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useBoards, useCreateBoard } from "../hooks/useBoards";
import type { Board } from "../lib/supabase";

interface BoardSelectorProps {
  onSelectBoard: (board: Board) => void;
}

const BoardSelector: React.FC<BoardSelectorProps> = ({ onSelectBoard }) => {
  const { data: boards = [], isLoading } = useBoards();
  const createBoard = useCreateBoard();
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (!newBoardTitle.trim()) return;
    createBoard.mutate(newBoardTitle.trim(), {
      onSuccess: (board) => {
        setNewBoardTitle("");
        setCreating(false);
        onSelectBoard(board);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2">My Boards</h1>
        <p className="text-muted-foreground mb-8">
          Select a board to get started
        </p>

        {isLoading ? (
          <p className="text-muted-foreground">Loading boards...</p>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {boards.length === 0 && !creating && (
              <p className="text-muted-foreground text-sm">
                No boards yet. Create one below.
              </p>
            )}
            {boards.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelectBoard(board)}
              >
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-base">{board.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {creating ? (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-5">
              <Input
                autoFocus
                placeholder="Board name"
                value={newBoardTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewBoardTitle(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createBoard.isPending}>
                  {createBoard.isPending ? "Creating..." : "Create Board"}
                </Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setCreating(true)}
          >
            + New Board
          </Button>
        )}
      </div>
    </div>
  );
};

export default BoardSelector;
