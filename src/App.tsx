import { useState } from "react";
import KanbanBoard from "./components/KanbanBoard";
import BoardSelector from "./components/BoardSelector";
import type { Board } from "./lib/supabase";

const App: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  if (!selectedBoard) {
    return <BoardSelector onSelectBoard={setSelectedBoard} />;
  }

  return (
    <KanbanBoard
      boardId={selectedBoard.id}
      boardTitle={selectedBoard.title}
      onBack={() => setSelectedBoard(null)}
    />
  );
};

export default App;
