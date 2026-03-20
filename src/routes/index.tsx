import { Link } from "@tanstack/react-router";
import { useBoards } from "../hooks/useBoards";

const IndexPage: React.FC = () => {
  const { data: boards = [] } = useBoards();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Boards</h1>
      <ul className="space-y-2">
        {boards.map((board) => (
          <li key={board.id}>
            <Link
              to={`/board/${board.id}`}
              className="text-primary hover:underline"
            >
              {board.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IndexPage;
