const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request gagal (${res.status})`);
  }

  return res.json();
}

// khusus upload file — JANGAN set Content-Type manual, biarkan browser
// yang menentukan boundary multipart/form-data secara otomatis
async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Upload gagal (${res.status})`);
  }

  return res.json();
}

/**
 * Upload dengan progress % — fetch() tidak bisa laporan progress upload,
 * jadi khusus ini pakai XMLHttpRequest.
 */
function requestFormDataWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : (undefined as any));
        } catch {
          resolve(undefined as any);
        }
      } else {
        let message = `Upload gagal (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.message) message = body.message;
        } catch {
          // biarkan pesan default
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Upload gagal — koneksi terputus"));
    xhr.send(formData);
  });
}

/** Download file dari endpoint yang butuh auth cookie (export Excel/PDF, dll). */
async function downloadFile(path: string, filenameFallback: string) {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Gagal download (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="(.+)"/);
  const filename = match?.[1] || filenameFallback;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export function mediaFileUrl(versionId: string): string {
  return `${BASE_URL}/media/versions/${versionId}/file`;
}

export function storyboardSketchUrl(sceneId: string): string {
  return `${BASE_URL}/storyboard/scenes/${sceneId}/sketch`;
}

export function sketchTemplateImageUrl(templateId: string): string {
  return `${BASE_URL}/storyboard/templates/${templateId}/image`;
}

export type ContentStatus =
  | "draft"
  | "pending_review"
  | "revisi"
  | "approved"
  | "published";

export type ContentPillar = "edukasi" | "hiburan" | "promosi";

export type Content = {
  id: string;
  title: string;
  bodyDraft: string | null;
  bodyAiGenerated: string | null;
  status: ContentStatus;
  requiresApproval: boolean;
  platform: string | null;
  pillar: ContentPillar | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; role: string };
};

export type StoryboardScene = {
  id: string;
  storyboardId: string;
  sceneOrder: number;
  sketchImageGdriveId: string | null;
  sketchLabel: string | null;
  description: string | null;
  dialogue: string | null;
  durationSeconds: number;
  createdAt: string;
};

export type SketchTemplate = {
  id: string;
  name: string;
  gdriveFileId: string;
  uploadedBy: string | null;
  createdAt: string;
};

export type Storyboard = {
  id: string;
  contentId: string | null;
  title: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  scenes: StoryboardScene[];
  content?: { id: string; title: string } | null;
};

export type CalendarItem = {
  id: string;
  contentId: string;
  scheduledDate: string;
  platform: string | null;
  createdAt: string;
  content?: { id: string; title: string; status: ContentStatus };
};

export type Todo = {
  id: string;
  contentId: string | null;
  taskText: string;
  isDone: boolean;
  assignedTo: string | null;
  createdAt: string;
  assignee?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  content?: { id: string; title: string; status: ContentStatus } | null;
};

export type SimpleUser = {
  id: string;
  name: string;
  role: "lead_admin" | "creator_staff";
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "lead_admin" | "creator_staff";
  isActive: boolean;
  createdAt: string;
};

export type Approval = {
  id: string;
  contentId: string;
  reviewerId: string;
  status: "approved" | "revisi";
  notes: string | null;
  reviewedAt: string;
  reviewer?: { id: string; name: string };
};

export type AppNotification = {
  id: string;
  userId: string;
  type: "approval" | "revisi" | "comment" | "media_approved";
  contentId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  content?: { id: string; title: string } | null;
};

export type MediaComment = {
  id: string;
  mediaVersionId: string;
  userId: string;
  commentText: string;
  timestampSeconds: number | null;
  positionX: number | null;
  positionY: number | null;
  isResolved: boolean;
  parentCommentId: string | null;
  createdAt: string;
  user?: { id: string; name: string };
};

export type MediaVersion = {
  id: string;
  mediaAssetId: string;
  versionNumber: number;
  gdriveFileId: string;
  status: "pending" | "approved";
  uploadedBy: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type MediaAsset = {
  id: string;
  contentId: string | null;
  fileName: string;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt: string;
  versions: MediaVersion[];
};

export type StoryboardSummary = {
  id: string;
  contentId: string | null;
  title: string | null;
  updatedAt: string;
  content: { id: string; title: string; status: ContentStatus; platform: string | null } | null;
  sceneCount: number;
  totalDurationSeconds: number;
};

export type MediaAssetSummary = {
  id: string;
  contentId: string | null;
  fileName: string;
  mimeType: string | null;
  createdAt: string;
  content: { id: string; title: string; status: ContentStatus; platform: string | null } | null;
  latestVersion: MediaVersion | null;
  versionCount: number;
};

export type PromptTemplate = {
  id: string;
  name: string;
  templateText: string;
  brandVoiceNotes: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type MediaPendingItem = {
  id: string;
  contentId: string | null;
  fileName: string;
  mimeType: string | null;
  content: { id: string; title: string } | null;
  pendingVersion: MediaVersion;
};

export const api = {
  login: (email: string, password: string) =>
    request<{ id: string; name: string; role: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<{ userId: string; role: string }>("/auth/me"),

  // --- content CRUD ---
  listContents: (params?: {
    status?: string;
    search?: string;
    platform?: string;
    pillar?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.platform) qs.set("platform", params.platform);
    if (params?.pillar) qs.set("pillar", params.pillar);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Content[]>(`/content${suffix}`);
  },
  getContent: (id: string) => request<Content>(`/content/${id}`),
  createContent: (data: {
    title: string;
    bodyDraft?: string;
    platform?: string;
    pillar?: ContentPillar;
  }) =>
    request<Content>("/content", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateContent: (
    id: string,
    data: Partial<Pick<Content, "title" | "bodyDraft" | "platform" | "pillar" | "status">>
  ) =>
    request<Content>(`/content/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteContent: (id: string) =>
    request<{ message: string }>(`/content/${id}`, { method: "DELETE" }),

  // --- storyboard CRUD ---
  listAllStoryboards: () => request<StoryboardSummary[]>("/storyboard"),
  getStoryboardByContent: (contentId: string) =>
    request<Storyboard | null>(`/storyboard/content/${contentId}`),
  getStoryboardById: (id: string) => request<Storyboard>(`/storyboard/${id}`),
  createStoryboard: (contentId?: string, title?: string) =>
    request<Storyboard>("/storyboard", {
      method: "POST",
      body: JSON.stringify({ contentId: contentId || undefined, title }),
    }),
  deleteStoryboard: (id: string) =>
    request<{ message: string }>(`/storyboard/${id}`, { method: "DELETE" }),
  addScene: (
    storyboardId: string,
    data: { description?: string; dialogue?: string; durationSeconds?: number; sketchImageGdriveId?: string }
  ) =>
    request<StoryboardScene>(`/storyboard/${storyboardId}/scenes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateScene: (
    sceneId: string,
    data: Partial<Pick<StoryboardScene, "description" | "dialogue" | "durationSeconds" | "sketchImageGdriveId">>
  ) =>
    request<StoryboardScene>(`/storyboard/scenes/${sceneId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  moveScene: (sceneId: string, direction: "up" | "down") =>
    request(`/storyboard/scenes/${sceneId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ direction }),
    }),
  deleteScene: (sceneId: string) =>
    request<{ message: string }>(`/storyboard/scenes/${sceneId}`, { method: "DELETE" }),
  uploadSceneSketch: (sceneId: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    return requestFormDataWithProgress<StoryboardScene>(`/storyboard/scenes/${sceneId}/sketch`, fd, onProgress);
  },

  // --- library sketsa template (reusable, drag & drop ke scene) ---
  listSketchTemplates: () => request<SketchTemplate[]>("/storyboard/templates/all"),
  uploadSketchTemplate: (name: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("file", file);
    return requestFormDataWithProgress<SketchTemplate>("/storyboard/templates/all", fd, onProgress);
  },
  deleteSketchTemplate: (id: string) =>
    request<{ message: string }>(`/storyboard/templates/${id}`, { method: "DELETE" }),
  applySketchTemplateToScene: (sceneId: string, templateId: string) =>
    request<StoryboardScene>(`/storyboard/scenes/${sceneId}/apply-template`, {
      method: "POST",
      body: JSON.stringify({ templateId }),
    }),

  // --- calendar CRUD ---
  listCalendarItems: () => request<CalendarItem[]>("/calendar"),
  listCalendarItemsForContent: (contentId: string) =>
    request<CalendarItem[]>(`/calendar/content/${contentId}`),
  createCalendarItem: (data: { contentId: string; scheduledDate: string; platform?: string }) =>
    request<CalendarItem>("/calendar", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCalendarItem: (id: string, data: { scheduledDate?: string; platform?: string }) =>
    request<CalendarItem>(`/calendar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCalendarItem: (id: string) =>
    request<{ message: string }>(`/calendar/${id}`, { method: "DELETE" }),

  // --- todo CRUD ---
  listAllTodos: () => request<Todo[]>("/todos"),
  listTodosForContent: (contentId: string) =>
    request<Todo[]>(`/todos/content/${contentId}`),
  createTodo: (data: { contentId?: string; taskText: string; assignedTo?: string }) =>
    request<Todo>("/todos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTodo: (
    id: string,
    data: Partial<{ taskText: string; isDone: boolean; assignedTo: string }>
  ) =>
    request<Todo>(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTodo: (id: string) =>
    request<{ message: string }>(`/todos/${id}`, { method: "DELETE" }),

  // --- users ---
  listUsers: () => request<SimpleUser[]>("/users"),

  // --- kelola tim (khusus Lead/Admin) ---
  listTeamMembers: () => request<TeamMember[]>("/users/admin"),
  createTeamMember: (data: {
    name: string;
    email: string;
    password: string;
    role: "lead_admin" | "creator_staff";
  }) =>
    request<TeamMember>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTeamMember: (
    id: string,
    data: Partial<{
      name: string;
      role: "lead_admin" | "creator_staff";
      isActive: boolean;
      password: string;
    }>
  ) =>
    request<TeamMember>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTeamMember: (id: string) =>
    request<{ message: string }>(`/users/${id}`, { method: "DELETE" }),

  // --- approval flow ---
  submitForReview: (contentId: string) =>
    request<Content>(`/approval/${contentId}/submit`, { method: "POST" }),
  listPendingApprovals: () => request<Content[]>("/approval/pending"),
  getApprovalHistory: (contentId: string) =>
    request<Approval[]>(`/approval/content/${contentId}`),
  approveContent: (contentId: string, notes?: string) =>
    request<Content>(`/approval/${contentId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  requestRevision: (contentId: string, notes: string) =>
    request<Content>(`/approval/${contentId}/revisi`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  publishContent: (contentId: string) =>
    request<Content>(`/approval/${contentId}/publish`, { method: "POST" }),

  // --- notifications ---
  listNotifications: () => request<AppNotification[]>("/notifications"),
  markNotificationRead: (id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<{ message: string }>("/notifications/read-all", { method: "PATCH" }),

  // --- media upload & review ---
  listAllMedia: () => request<MediaAssetSummary[]>("/media"),
  listPendingMedia: () => request<MediaPendingItem[]>("/media/pending"),
  listStandaloneMedia: () => request<MediaAsset[]>("/media/standalone"),
  uploadStandaloneMedia: (file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    return requestFormDataWithProgress<MediaAsset>("/media/standalone", fd, onProgress);
  },
  listMediaForContent: (contentId: string) =>
    request<MediaAsset[]>(`/media/content/${contentId}`),
  uploadNewMedia: (contentId: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    return requestFormDataWithProgress<MediaAsset>(`/media/content/${contentId}`, fd, onProgress);
  },
  uploadMediaVersion: (assetId: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    return requestFormDataWithProgress<MediaVersion>(`/media/${assetId}/versions`, fd, onProgress);
  },
  deleteMediaAsset: (assetId: string) =>
    request<{ message: string }>(`/media/${assetId}`, { method: "DELETE" }),
  approveMediaVersion: (versionId: string) =>
    request<MediaVersion>(`/media/versions/${versionId}/approve`, { method: "POST" }),
  downloadMediaVersion: (versionId: string, filename: string) =>
    downloadFile(`/media/versions/${versionId}/file`, filename),
  listMediaComments: (versionId: string) =>
    request<MediaComment[]>(`/media/versions/${versionId}/comments`),
  addMediaComment: (
    versionId: string,
    data: {
      commentText: string;
      timestampSeconds?: number;
      positionX?: number;
      positionY?: number;
      parentCommentId?: string;
    }
  ) =>
    request<MediaComment>(`/media/versions/${versionId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resolveMediaComment: (commentId: string, isResolved = true) =>
    request<MediaComment>(`/media/comments/${commentId}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ isResolved }),
    }),
  deleteMediaComment: (commentId: string) =>
    request<{ message: string }>(`/media/comments/${commentId}`, { method: "DELETE" }),

  // --- AI content generator ---
  generateWithAi: (
    contentId: string,
    data: { promptTemplateId?: string; instructions?: string; referenceFile?: File }
  ) => {
    const fd = new FormData();
    if (data.promptTemplateId) fd.append("promptTemplateId", data.promptTemplateId);
    if (data.instructions) fd.append("instructions", data.instructions);
    if (data.referenceFile) fd.append("referenceFile", data.referenceFile);
    return requestFormData<Content>(`/ai/content/${contentId}/generate`, fd);
  },
  generateImageWithAi: (contentId: string, data: { prompt: string; referenceFile?: File }) => {
    const fd = new FormData();
    fd.append("prompt", data.prompt);
    if (data.referenceFile) fd.append("referenceFile", data.referenceFile);
    return requestFormData<MediaAsset>(`/ai/content/${contentId}/generate-image`, fd);
  },

  // --- prompt templates (brand voice) ---
  listPromptTemplates: () => request<PromptTemplate[]>("/prompt-templates"),
  createPromptTemplate: (data: { name: string; templateText: string; brandVoiceNotes?: string }) =>
    request<PromptTemplate>("/prompt-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePromptTemplate: (
    id: string,
    data: Partial<{ name: string; templateText: string; brandVoiceNotes: string; isActive: boolean }>
  ) =>
    request<PromptTemplate>(`/prompt-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deletePromptTemplate: (id: string) =>
    request<{ message: string }>(`/prompt-templates/${id}`, { method: "DELETE" }),

  // --- export ---
  exportContentExcel: () => downloadFile("/export/content.xlsx", "konten-icgi.xlsx"),
  exportContentPdf: () => downloadFile("/export/content.pdf", "konten-icgi.pdf"),
  exportStoryboardPdf: (storyboardId: string) =>
    downloadFile(`/export/storyboard/${storyboardId}/pdf`, `storyboard-${storyboardId}.pdf`),
};