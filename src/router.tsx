import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";
import type { Board } from "./lib/supabase";
import AuthPage from "./components/AuthPage";
import BoardSelector from "./components/BoardSelector";
import KanbanBoard from "./components/KanbanBoard";

const checkAuth = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw redirect({ to: "/login" });
};

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: checkAuth,
  component: function BoardSelectorPage() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleSelectBoard = (board: Board) =>
      navigate({
        to: "/boards/$boardId",
        params: { boardId: board.id },
        search: { title: board.title },
      });

    const handleSignOut = async () => {
      await signOut();
      navigate({ to: "/login" });
    };

    return (
      <BoardSelector
        onSelectBoard={handleSelectBoard}
        onSignOut={handleSignOut}
        userId={user.id}
        userName={user.user_metadata?.full_name ?? user.email ?? ""}
      />
    );
  },
});

type BoardSearch = { title: string };

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boards/$boardId",
  validateSearch: (search: Record<string, unknown>): BoardSearch => ({
    title: typeof search.title === "string" ? search.title : "",
  }),
  beforeLoad: checkAuth,
  component: function KanbanBoardPage() {
    const { boardId } = useParams({ from: "/boards/$boardId" });
    const { title } = useSearch({ from: "/boards/$boardId" });
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
      await signOut();
      navigate({ to: "/login" });
    };

    return (
      <KanbanBoard
        boardId={boardId}
        boardTitle={title}
        onBack={() => navigate({ to: "/" })}
        onSignOut={handleSignOut}
      />
    );
  },
});

const routeTree = rootRoute.addChildren([loginRoute, indexRoute, boardRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
