import { RouterProvider } from "react-router-dom";
import { router } from "../adapters/views/routes/index";

// Render the application router within the providers installed at startup.
export function App() {
  return <RouterProvider router={router} />;
}
