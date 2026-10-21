import type { ReactElement } from "react";

import { ComponentDemo } from "@/components/component-demo";

/** Home page rendering the shadcn/ui component demo. Default export is required by Next.js. */
const Home = (): ReactElement => (
  <main className="flex flex-1 items-center justify-center p-4">
    <ComponentDemo />
  </main>
);

export default Home;
