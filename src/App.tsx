import React, { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./components/AuthPage";
import BoardSelector from "./components/BoardSelector";
import KanbanBoard from "./components/KanbanBoard";
import type { Board } from "./lib/supabase";

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!selectedBoard) {
    return (
      <BoardSelector
        onSelectBoard={setSelectedBoard}
        onSignOut={signOut}
        userEmail={user.email ?? ""}
      />
    );
  }

  return (
    <KanbanBoard
      boardId={selectedBoard.id}
      boardTitle={selectedBoard.title}
      onBack={() => setSelectedBoard(null)}
      onSignOut={signOut}
    />
  );
};

export default App;
