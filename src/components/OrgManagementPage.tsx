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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  useOrganizations,
  useOrgMembers,
  useAddOrgMember,
  useRemoveOrgMember,
  useUpdateOrgMemberRole,
  useOrgBoards,
  useCreateOrgBoard,
  useBoardMembers,
  useAssignBoardMember,
  useRemoveBoardMember,
} from "../hooks/useOrganizations";
import { useProfiles } from "../hooks/useProfile";
import type { OrgMember, Board } from "../lib/supabase";

interface OrgManagementPageProps {
  orgId: string;
}

// ─── Board Members Dialog ─────────────────────────────────────────

interface BoardMembersDialogProps {
  board: Board;
  orgId: string;
  profilesMap: Record<string, { id: string; full_name: string; email: string }>;
  orgMemberIds: Set<string>;
  open: boolean;
  onClose: () => void;
}

const BoardMembersDialog: React.FC<BoardMembersDialogProps> = ({
  board,
  profilesMap,
  orgMemberIds,
  open,
  onClose,
}) => {
  const { data: boardMembers = [] } = useBoardMembers(board.id);
  const assignMember = useAssignBoardMember();
  const removeMember = useRemoveBoardMember();
  const [addUserId, setAddUserId] = useState("none");

  const boardMemberIds = new Set(boardMembers.map((m) => m.user_id));
  const eligible = [...orgMemberIds].filter((id) => !boardMemberIds.has(id));

  const handleAdd = () => {
    if (addUserId === "none") return;
    assignMember.mutate({ boardId: board.id, userId: addUserId }, {
      onSuccess: () => setAddUserId("none"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Board Access — {board.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {boardMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members assigned yet — all org members can see this board by default via RLS.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {boardMembers.map((bm) => {
                const profile = profilesMap[bm.user_id];
                return (
                  <div key={bm.user_id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name ?? bm.user_id}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeMember.mutate({ boardId: board.id, userId: bm.user_id })}
                      disabled={removeMember.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {eligible.length > 0 && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add org member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select member</SelectItem>
                  {eligible.map((id) => {
                    const p = profilesMap[id];
                    return (
                      <SelectItem key={id} value={id}>
                        {p?.full_name ?? id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={addUserId === "none" || assignMember.isPending}>
                Add
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────

const OrgManagementPage: React.FC<OrgManagementPageProps> = ({ orgId }) => {
  const navigate = useNavigate();
  const { data: orgs = [] } = useOrganizations();
  const org = orgs.find((o) => o.id === orgId);

  const { data: orgMembers = [] } = useOrgMembers(orgId);
  const { data: orgBoards = [] } = useOrgBoards(orgId);
  const { data: profiles = [] } = useProfiles();
  const addOrgMember = useAddOrgMember();
  const removeOrgMember = useRemoveOrgMember();
  const updateRole = useUpdateOrgMemberRole();
  const createBoard = useCreateOrgBoard();

  const [activeTab, setActiveTab] = useState<"members" | "boards">("members");
  const [addMemberId, setAddMemberId] = useState("none");
  const [addMemberRole, setAddMemberRole] = useState<OrgMember["role"]>("member");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [boardMembersDialog, setBoardMembersDialog] = useState<Board | null>(null);

  const profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const orgMemberIds = new Set(orgMembers.map((m) => m.user_id));
  const notInOrg = profiles.filter((p) => !orgMemberIds.has(p.id));

  const handleAddMember = () => {
    if (addMemberId === "none") return;
    addOrgMember.mutate(
      { orgId, userId: addMemberId, role: addMemberRole },
      { onSuccess: () => { setAddMemberId("none"); setAddMemberRole("member"); } },
    );
  };

  const handleCreateBoard = () => {
    if (!newBoardTitle.trim()) return;
    createBoard.mutate(
      { title: newBoardTitle.trim(), orgId },
      { onSuccess: () => { setNewBoardTitle(""); setCreatingBoard(false); } },
    );
  };

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
              ← Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{org.name}</h1>
              {org.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{org.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(["members", "boards"] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "members" && orgMembers.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                  {orgMembers.length}
                </span>
              )}
              {tab === "boards" && orgBoards.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                  {orgBoards.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {activeTab === "members" && (
          <div className="flex flex-col gap-4">
            {orgMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {orgMembers.map((member) => {
                  const profile = profilesMap[member.user_id];
                  return (
                    <Card key={member.user_id}>
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{profile?.full_name ?? member.user_id}</p>
                          <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                        <Select
                          value={member.role}
                          onValueChange={(role: OrgMember["role"]) =>
                            updateRole.mutate({ orgId, userId: member.user_id, role })
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="leader">Leader</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8 px-2"
                          onClick={() => removeOrgMember.mutate({ orgId, userId: member.user_id })}
                          disabled={removeOrgMember.isPending}
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Add member */}
            {notInOrg.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm">Add Member</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex gap-2">
                  <Select value={addMemberId} onValueChange={setAddMemberId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select user</SelectItem>
                      {notInOrg.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} — {p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={addMemberRole}
                    onValueChange={(v: OrgMember["role"]) => setAddMemberRole(v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="leader">Leader</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddMember}
                    disabled={addMemberId === "none" || addOrgMember.isPending}
                  >
                    Add
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Boards tab */}
        {activeTab === "boards" && (
          <div className="flex flex-col gap-4">
            {orgBoards.length === 0 && !creatingBoard ? (
              <p className="text-sm text-muted-foreground">No boards yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {orgBoards.map((board) => (
                  <Card key={board.id}>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() =>
                          navigate({
                            to: "/boards/$boardId",
                            params: { boardId: board.id },
                            search: { title: board.title },
                          })
                        }
                      >
                        <p className="text-sm font-medium hover:underline">{board.title}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setBoardMembersDialog(board)}
                      >
                        Manage Access
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {creatingBoard ? (
              <Card>
                <CardContent className="py-3 px-4 flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Board name"
                    value={newBoardTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewBoardTitle(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") handleCreateBoard();
                      if (e.key === "Escape") setCreatingBoard(false);
                    }}
                  />
                  <Button onClick={handleCreateBoard} disabled={createBoard.isPending || !newBoardTitle.trim()}>
                    {createBoard.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button variant="ghost" onClick={() => setCreatingBoard(false)}>
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCreatingBoard(true)}
              >
                + New Board
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Board members dialog */}
      {boardMembersDialog && (
        <BoardMembersDialog
          board={boardMembersDialog}
          orgId={orgId}
          profilesMap={profilesMap}
          orgMemberIds={orgMemberIds}
          open={!!boardMembersDialog}
          onClose={() => setBoardMembersDialog(null)}
        />
      )}
    </div>
  );
};

export default OrgManagementPage;
