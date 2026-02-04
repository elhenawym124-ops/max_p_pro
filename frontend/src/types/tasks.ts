export interface Task {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    priority: string;
    component: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    assigneeAvatar: string | null;
    reporterName: string;
    projectName: string | null;
    projectId: string | null;
    projectColor: string | null;
    releaseVersion: string | null;
    releaseId: string | null;
    dueDate: string | null;
    startDate: string | null;
    completedDate: string | null;
    estimatedHours: number;
    actualHours: number;
    progress: number;
    tags: string[];
    gitBranch: string | null;
    createdAt: string;
    updatedAt: string;
    comments: Comment[];
    activities: Activity[];
    timeLogs: TimeLog[];
    subtasks: Task[];
    attachments: Attachment[];
    checklists: Checklist[];
    watchers?: any[]; // Updated to any[] to handle flexible input for now, ideally specific type
    currentMemberId?: string | null;
    businessValue?: string | null;
    acceptanceCriteria?: string | null;

    nextTaskId?: string | null;
    previousTaskId?: string | null;

    // List view specific props (optional)
    commentsCount?: number;
    attachmentsCount?: number;
    subtasksCount?: number;

    // Additional fields from Form
    companyId?: string;
    ticketId?: string;
    campaignId?: string;
    targetAudience?: string;
    budgetAllocation?: number;
    expectedROI?: number;
    relatedLinks?: { title: string; url: string }[];
    department?: string;
}

export interface Attachment {
    id: string;
    fileName: string;
    originalName?: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
}

export interface Comment {
    id: string;
    content: string;
    authorName: string;
    authorAvatar: string | null;
    createdAt: string;
    isEdited: boolean;
    editedAt: string | null;
    replies: Comment[];
}

export interface Activity {
    id: string;
    action: string;
    description: string;
    memberName: string | null;
    memberAvatar: string | null;
    createdAt: string;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
}

export interface TimeLog {
    id: string;
    duration: number;
    description: string | null;
    memberName: string;
    memberId: string;
    startTime: string;
    endTime: string | null;
    isRunning: boolean;
}

export interface Checklist {
    id: string;
    title: string;
    items: ChecklistItem[];
}

export interface ChecklistItem {
    id: string;
    content: string;
    isCompleted: boolean;
    completedAt: string | null;
}

export interface Project {
    id: string;
    name: string;
    color: string;
}

export interface TeamMember {
    id: string;
    userId?: string; // Sometimes used interchangeably
    name: string;
    email: string;
    avatar: string | null;
    department?: string;
    availability?: string;
}

export interface Release {
    id: string;
    version: string;
    name: string;
}
