import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useProfiles } from "../hooks/useProfile";
import {
  useAllBoards,
  useAllCards,
  useAllOrganizations,
  useToggleAdmin,
  useCreateTestUser,
  useAdminDeleteBoard,
  useAdminDeleteCard,
  useAdminDeleteProfile,
  useAdminDeleteOrganization,
} from "../hooks/useAdmin";

type Tab = "overview" | "users" | "orgs" | "boards" | "cards" | "create-user";

const columnLabel: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  backlog: "Backlog",
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: profiles = [] } = useProfiles();
  const { data: boards = [], isLoading: boardsLoading } = useAllBoards();
  const { data: cards = [], isLoading: cardsLoading } = useAllCards();
  const { data: orgs = [] } = useAllOrganizations();

  const toggleAdmin = useToggleAdmin();
  const createTestUser = useCreateTestUser();
  const deleteBoard = useAdminDeleteBoard();
  const deleteCard = useAdminDeleteCard();
  const deleteProfile = useAdminDeleteProfile();
  const deleteOrg = useAdminDeleteOrganization();

  // Create test user form state
  const [testFullName, setTestFullName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Lookup maps for joining data client-side
  const profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const boardsMap = Object.fromEntries(boards.map((b) => [b.id, b]));

  const backlogCount = cards.filter((c) => c.column_name === "backlog").length;

  const handleToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
    if (
      !window.confirm(
        `${currentIsAdmin ? "Remove" : "Grant"} admin access for this user?`,
      )
    )
      return;
    toggleAdmin.mutate({ userId, isAdmin: !currentIsAdmin });
  };

  const handleDeleteBoard = (boardId: string, title: string) => {
    if (
      !window.confirm(
        `Delete board "${title}" and all its cards? This cannot be undone.`,
      )
    )
      return;
    deleteBoard.mutate(boardId);
  };

  const handleDeleteCard = (cardId: string, title: string) => {
    if (!window.confirm(`Delete card "${title}"? This cannot be undone.`))
      return;
    deleteCard.mutate(cardId);
  };

  const handleDeleteProfile = (userId: string, name: string) => {
    if (
      !window.confirm(
        `Delete profile for "${name}"? Their boards and cards will remain. The auth account will still exist until removed from Supabase.`,
      )
    )
      return;
    deleteProfile.mutate(userId);
  };

  const handleCreateTestUser = () => {
    if (!testFullName.trim() || !testEmail.trim() || testPassword.length < 6)
      return;
    setCreateError(null);
    setCreateSuccess(null);
    createTestUser.mutate(
      {
        email: testEmail.trim(),
        password: testPassword,
        fullName: testFullName.trim(),
      },
      {
        onSuccess: () => {
          setCreateSuccess(
            `User "${testFullName}" created. If email confirmation is enabled in Supabase they will need to confirm before logging in.`,
          );
          setTestFullName("");
          setTestEmail("");
          setTestPassword("");
        },
        onError: (err) => setCreateError(err.message),
      },
    );
  };

  const handleDeleteOrg = (orgId: string, name: string) => {
    if (!window.confirm(`Delete organization "${name}"? Boards will remain but lose their org association. This cannot be undone.`)) return;
    deleteOrg.mutate(orgId);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${profiles.length})` },
    { id: "orgs", label: `Orgs (${orgs.length})` },
    { id: "boards", label: `Boards (${boards.length})` },
    { id: "cards", label: `Cards (${cards.length})` },
    { id: "create-user", label: "Create Test User" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
          ← Boards
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={profiles.length} />
          <StatCard title="Organizations" value={orgs.length} />
          <StatCard title="Total Boards" value={boards.length} />
          <StatCard
            title="Board Cards"
            value={cards.filter((c) => c.column_name !== "backlog").length}
          />
          <StatCard title="Backlog Items" value={backlogCount} />
          <StatCard
            title="Admin Users"
            value={profiles.filter((p) => p.is_admin).length}
          />
          <StatCard
            title="In Progress"
            value={cards.filter((c) => c.column_name === "in_progress").length}
          />
          <StatCard
            title="Done"
            value={cards.filter((c) => c.column_name === "done").length}
          />
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div className="flex flex-col gap-2">
          {profiles.map((profile) => {
            const userBoards = boards.filter((b) => b.user_id === profile.id);
            const userCards = cards.filter((c) => {
              const board = boardsMap[c.board_id];
              return board?.user_id === profile.id;
            });
            const initials = profile.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={profile.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    {profile.is_admin && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0 hidden sm:block">
                  <p>{userBoards.length} boards</p>
                  <p>{userCards.length} cards</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      handleToggleAdmin(profile.id, profile.is_admin)
                    }
                    disabled={toggleAdmin.isPending}
                  >
                    {profile.is_admin ? "Remove Admin" : "Make Admin"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-destructive hover:text-destructive"
                    onClick={() =>
                      handleDeleteProfile(profile.id, profile.full_name)
                    }
                    disabled={deleteProfile.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {profiles.length === 0 && !boardsLoading && (
            <p className="text-muted-foreground text-sm">No users found.</p>
          )}
        </div>
      )}

      {/* Organizations */}
      {activeTab === "orgs" && (
        <div className="flex flex-col gap-2">
          {orgs.map((org) => {
            const orgBoards = boards.filter((b) => b.org_id === org.id);
            const creator = profilesMap[org.created_by ?? ""];
            return (
              <div
                key={org.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{org.name}</p>
                  {org.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{org.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created by {creator?.full_name ?? "unknown"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0 hidden sm:block">
                  <p>{orgBoards.length} boards</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      navigate({ to: "/org/$orgId", params: { orgId: org.id } })
                    }
                  >
                    Manage
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteOrg(org.id, org.name)}
                    disabled={deleteOrg.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {orgs.length === 0 && (
            <p className="text-muted-foreground text-sm">No organizations found.</p>
          )}
        </div>
      )}

      {/* Boards */}
      {activeTab === "boards" && (
        <div className="flex flex-col gap-2">
          {boards.map((board) => {
            const owner = profilesMap[board.user_id ?? ""];
            const boardCards = cards.filter((c) => c.board_id === board.id);
            const boardBacklog = boardCards.filter(
              (c) => c.column_name === "backlog",
            ).length;

            return (
              <div
                key={board.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{board.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {owner
                      ? `${owner.full_name} · ${owner.email}`
                      : "Unknown owner"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0 hidden sm:block">
                  <p>
                    {boardCards.length - boardBacklog} cards
                  </p>
                  {boardBacklog > 0 && <p>{boardBacklog} backlog</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      navigate({
                        to: "/boards/$boardId",
                        params: { boardId: board.id },
                        search: { title: board.title },
                      })
                    }
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteBoard(board.id, board.title)}
                    disabled={deleteBoard.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
          {boards.length === 0 && !boardsLoading && (
            <p className="text-muted-foreground text-sm">No boards found.</p>
          )}
        </div>
      )}

      {/* Cards */}
      {activeTab === "cards" && (
        <div className="flex flex-col gap-2">
          {cards.map((card) => {
            const board = boardsMap[card.board_id];
            const assignee = card.assigned_to
              ? profilesMap[card.assigned_to]
              : null;

            return (
              <div
                key={card.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{card.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {board?.title ?? "Unknown board"}
                    {" · "}
                    {columnLabel[card.column_name] ?? card.column_name}
                    {assignee ? ` · ${assignee.full_name}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDeleteCard(card.id, card.title)}
                  disabled={deleteCard.isPending}
                >
                  Delete
                </Button>
              </div>
            );
          })}
          {cards.length === 0 && !cardsLoading && (
            <p className="text-muted-foreground text-sm">No cards found.</p>
          )}
        </div>
      )}

      {/* Create Test User */}
      {activeTab === "create-user" && (
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Test User</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                placeholder="Full name"
                value={testFullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTestFullName(e.target.value)
                }
              />
              <Input
                type="email"
                placeholder="Email"
                value={testEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTestEmail(e.target.value)
                }
              />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={testPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTestPassword(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") handleCreateTestUser();
                }}
              />
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              {createSuccess && (
                <p className="text-sm text-green-500">{createSuccess}</p>
              )}
              <p className="text-xs text-muted-foreground">
                To skip email confirmation, go to your Supabase project →
                Authentication → Settings and disable "Enable email
                confirmations".
              </p>
              <Button
                onClick={handleCreateTestUser}
                disabled={
                  createTestUser.isPending ||
                  !testFullName.trim() ||
                  !testEmail.trim() ||
                  testPassword.length < 6
                }
              >
                {createTestUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number }> = ({
  title,
  value,
}) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </CardContent>
  </Card>
);

export default AdminPage;
