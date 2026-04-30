import { BrowserRouter } from "react-router-dom";
import { ConfirmModal, ToastRegion } from "./components/feedback";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ConfirmModal />
      <ToastRegion />
    </BrowserRouter>
  );
}

export default App;
