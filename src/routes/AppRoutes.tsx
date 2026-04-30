import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { HomePage } from "../pages/HomePage";
import { ExamCreatePage } from "../pages/ExamCreatePage";
import { QuestionBankPage } from "../pages/QuestionBankPage";
import { CoursesPage } from "../pages/CoursesPage";
import { RostersPage } from "../pages/RostersPage";
import { LaunchPage } from "../pages/LaunchPage";
import { MonitorPage } from "../pages/MonitorPage";
import { ResultsPage } from "../pages/ResultsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { DocsPage } from "../pages/DocsPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import {
  StudentExamPage,
  StudentInstructionsPage,
  StudentLoginPage,
  StudentSubmittedPage
} from "../pages/StudentPortalPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/exams/new" element={<ExamCreatePage />} />
        <Route path="/question-bank" element={<QuestionBankPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/students" element={<RostersPage />} />
        <Route path="/launch" element={<LaunchPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route path="/student/instructions" element={<StudentInstructionsPage />} />
      <Route path="/student/exam" element={<StudentExamPage />} />
      <Route path="/student/submitted" element={<StudentSubmittedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
