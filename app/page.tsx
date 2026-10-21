import type { ReactElement } from "react";

import { TodoList } from "@/components/todo-list";

/** Home page rendering the todo list. Default export is required by Next.js. */
const Home = (): ReactElement => (
  <main className="flex flex-1 items-start justify-center p-4 sm:pt-16">
    <TodoList />
  </main>
);

export default Home;
