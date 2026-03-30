import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { useBoards, useCreateBoard } from "../hooks/useBoards";
import { useProfile } from "../hooks/useProfile";
import {
  useOrganizations,
  useMyOrgMemberships,
  useCreateOrganization,
} from "../hooks/useOrganizations";
import ProfileDialog from "./ProfileDialog";
import type { Board } from "../lib/supabase";

interface BoardSelectorProps {
  onSelectBoard: (board: Board) => void;
  onSignOut: () => void;
  userId: string;
  userName: string;
}

const BoardSelector: React.FC<BoardSelectorProps> = ({
  onSelectBoard,
  onSignOut,
  userId,
  userName,
}) => {
  const { data: boards = [], isLoading } = useBoards();
  const { data: orgs = [] } = useOrganizations();
  const { data: myMemberships = [] } = useMyOrgMemberships();
  const { data: profile } = useProfile(userId);
  const createBoard = useCreateBoard();
  const createOrg = useCreateOrganization();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(userName);

  // Personal board creation
  const [creatingPersonal, setCreatingPersonal] = useState(false);
  const [personalTitle, setPersonalTitle] = useState("");

  // Org board creation (per org)
  const [creatingOrgBoard, setCreatingOrgBoard] = useState<string | null>(null);
  const [orgBoardTitle, setOrgBoardTitle] = useState("");

  // Create org dialog
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");

  // Role lookup: orgId -> 'leader' | 'member'
  const myRoleMap = Object.fromEntries(
    myMemberships.map((m) => [m.org_id, m.role]),
  );

  const personalBoards = boards.filter((b) => !b.org_id);
  const orgBoardsMap = Object.fromEntries(
    orgs.map((org) => [org.id, boards.filter((b) => b.org_id === org.id)]),
  );

  const handleCreatePersonal = () => {
    if (!personalTitle.trim()) return;
    createBoard.mutate(
      { title: personalTitle.trim() },
      {
        onSuccess: (board) => {
          setPersonalTitle("");
          setCreatingPersonal(false);
          onSelectBoard(board);
        },
      },
    );
  };

  const handleCreateOrgBoard = (orgId: string) => {
    if (!orgBoardTitle.trim()) return;
    createBoard.mutate(
      { title: orgBoardTitle.trim(), orgId },
      {
        onSuccess: (board) => {
          setOrgBoardTitle("");
          setCreatingOrgBoard(null);
          onSelectBoard(board);
        },
      },
    );
  };

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) return;
    createOrg.mutate(
      { name: newOrgName.trim(), description: newOrgDesc.trim() || undefined },
      {
        onSuccess: () => {
          setNewOrgName("");
          setNewOrgDesc("");
          setOrgDialogOpen(false);
        },
      },
    );
  };

  const BoardCard = ({ board }: { board: Board }) => (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => onSelectBoard(board)}
    >
      <CardHeader className="py-4 px-5">
        <CardTitle className="text-base">{board.title}</CardTitle>
      </CardHeader>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Boards</h1>
            <p className="text-muted-foreground text-sm mt-1">{displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.is_admin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/admin" })}
              >
                Admin
              </Button>
            )}
            <ProfileDialog userId={userId} onNameChange={setDisplayName} />
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading boards...</p>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Personal boards */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Personal
              </h2>
              <div className="flex flex-col gap-3 mb-3">
                {personalBoards.length === 0 && !creatingPersonal && (
                  <p className="text-muted-foreground text-sm">
                    No personal boards yet.
                  </p>
                )}
                {personalBoards.map((board) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>
              {creatingPersonal ? (
                <Card>
                  <CardContent className="flex flex-col gap-3 pt-5">
                    <Input
                      autoFocus
                      placeholder="Board name"
                      value={personalTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPersonalTitle(e.target.value)
                      }
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") handleCreatePersonal();
                        if (e.key === "Escape") setCreatingPersonal(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreatePersonal}
                        disabled={createBoard.isPending}
                      >
                        {createBoard.isPending ? "Creating..." : "Create Board"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setCreatingPersonal(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCreatingPersonal(true)}
                >
                  + New Personal Board
                </Button>
              )}
            </section>

            {/* Org sections */}
            {orgs.map((org) => {
              const isLeader = myRoleMap[org.id] === "leader" || profile?.is_admin;
              const ob = orgBoardsMap[org.id] ?? [];
              const isCreatingHere = creatingOrgBoard === org.id;

              return (
                <section key={org.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {org.name}
                    </h2>
                    {isLeader && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() =>
                          navigate({ to: "/org/$orgId", params: { orgId: org.id } })
                        }
                      >
                        Manage →
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 mb-3">
                    {ob.length === 0 && !isCreatingHere && (
                      <p className="text-muted-foreground text-sm">
                        No boards yet.
                      </p>
                    )}
                    {ob.map((board) => (
                      <BoardCard key={board.id} board={board} />
                    ))}
                  </div>
                  {isLeader &&
                    (isCreatingHere ? (
                      <Card>
                        <CardContent className="flex gap-2 pt-5">
                          <Input
                            autoFocus
                            placeholder="Board name"
                            value={orgBoardTitle}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setOrgBoardTitle(e.target.value)
                            }
                            onKeyDown={(
                              e: React.KeyboardEvent<HTMLInputElement>,
                            ) => {
                              if (e.key === "Enter") handleCreateOrgBoard(org.id);
                              if (e.key === "Escape") setCreatingOrgBoard(null);
                            }}
                          />
                          <Button
                            onClick={() => handleCreateOrgBoard(org.id)}
                            disabled={createBoard.isPending}
                          >
                            Create
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setCreatingOrgBoard(null)}
                          >
                            Cancel
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setCreatingOrgBoard(org.id);
                          setOrgBoardTitle("");
                        }}
                      >
                        + New Board in {org.name}
                      </Button>
                    ))}
                </section>
              );
            })}

            {/* Create org button */}
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground hover:text-foreground"
              onClick={() => setOrgDialogOpen(true)}
            >
              + New Organization
            </Button>
          </div>
        )}
      </div>

      {/* Create org dialog */}
      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              autoFocus
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewOrgName(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleCreateOrg();
              }}
            />
            <Input
              placeholder="Description (optional)"
              value={newOrgDesc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewOrgDesc(e.target.value)
              }
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOrgDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={createOrg.isPending || !newOrgName.trim()}
            >
              {createOrg.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardSelector;
