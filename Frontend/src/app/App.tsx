import type { ComponentProps } from "react";
import { RouterProvider } from "react-router-dom";

// Render the application router within the providers installed at startup.
export function App({
  router,
}: Pick<ComponentProps<typeof RouterProvider>, "router">) {
  return <RouterProvider router={router} />;
}
