import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ContentListPage } from "./pages/ContentListPage";
import { ContentEditPage } from "./pages/ContentEditPage";
import { StoryboardPage } from "./pages/StoryboardPage";
import { CalendarTodoPage } from "./pages/CalendarTodoPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MediaReviewPage } from "./pages/MediaReviewPage";
import { StoryboardListPage } from "./pages/StoryboardListPage";
import { MediaListPage } from "./pages/MediaListPage";
import { StoryboardStandalonePage } from "./pages/StoryboardStandalonePage";
import { MediaStandalonePage } from "./pages/MediaStandalonePage";
import { TodoListPage } from "./pages/TodoListPage";
import { PromptTemplatesPage } from "./pages/PromptTemplatesPage";
import { TeamPage } from "./pages/TeamPage";
import { ReviewPage } from "./pages/ReviewPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content"
            element={
              <ProtectedRoute>
                <ContentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/new"
            element={
              <ProtectedRoute>
                <ContentEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/:id/edit"
            element={
              <ProtectedRoute>
                <ContentEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/:id/storyboard"
            element={
              <ProtectedRoute>
                <StoryboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/:id/calendar"
            element={
              <ProtectedRoute>
                <CalendarTodoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/:id/media"
            element={
              <ProtectedRoute>
                <MediaReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storyboard"
            element={
              <ProtectedRoute>
                <StoryboardListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storyboard/:storyboardId"
            element={
              <ProtectedRoute>
                <StoryboardStandalonePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/media"
            element={
              <ProtectedRoute>
                <MediaListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/media/standalone"
            element={
              <ProtectedRoute>
                <MediaStandalonePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/todos"
            element={
              <ProtectedRoute>
                <TodoListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompt-templates"
            element={
              <ProtectedRoute>
                <PromptTemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute requireRole="lead_admin">
                <TeamPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}