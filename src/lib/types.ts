export type UploadKind = "image" | "audio" | "video" | "pdf" | "text" | "other";

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: UploadKind;
  base64?: string;
  textContent?: string;
  transcript?: string;
  previewUrl?: string;
};

export type MessageRole = "user" | "assistant" | "system";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  toolName?: string;
  attachments?: Attachment[];
  agentPlan?: BrowserPlan;
  agentResult?: BrowserRunResult;
  pendingApproval?: boolean;
};

export type Conversation = {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  memory?: string;
};

export type Project = {
  id: string;
  name: string;
  instructions?: string;
  memoryItems: string[];
  createdAt: string;
  updatedAt: string;
};

export type ToolStatus = "available" | "optional" | "disabled";

export type ToolResult = {
  tool: string;
  ok: boolean;
  summary: string;
  data?: unknown;
  reason?: string;
};

export type ToolDefinition = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  status: ToolStatus;
  env?: string[];
  publicFriendly: boolean;
  execute: (query: string) => Promise<ToolResult>;
};

export type BrowserTarget = {
  selector?: string;
  text?: string;
  placeholder?: string;
  label?: string;
};

export type BrowserAction =
  | { type: "goto"; url: string; note?: string }
  | { type: "click"; target: BrowserTarget; note?: string }
  | { type: "type"; target: BrowserTarget; value: string; secret?: boolean; note?: string }
  | { type: "press"; target: BrowserTarget; key: string; note?: string }
  | { type: "wait"; milliseconds: number; note?: string }
  | { type: "waitForText"; text: string; note?: string }
  | { type: "screenshot"; name: string; note?: string }
  | { type: "extractText"; target: BrowserTarget; name: string; note?: string };

export type BrowserPlan = {
  title: string;
  summary: string;
  websites: string[];
  risks: string[];
  requiresLogin: boolean;
  steps: BrowserAction[];
};

export type BrowserRunResult = {
  ok: boolean;
  currentUrl?: string;
  logs: string[];
  screenshots: Array<{ name: string; dataUrl: string }>;
  extracted: Record<string, string>;
  error?: string;
};
