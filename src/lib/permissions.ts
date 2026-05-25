export type Role = 'student' | 'parent' | 'teacher' | 'school_admin' | 'counselor';
export type Relationship = 'parent_of' | 'teacher_of' | 'school_monitor' | 'self';
export type SensitivityLevel = 'public' | 'summary' | 'private' | 'restricted';

export interface UserContext {
    uid: string;
    role: Role;
    relationships: Record<string, Relationship[]>; // childId -> relationships
    organizationId?: string;
}

export const PermissionEngine = {
    canViewRawJournal(user: UserContext, targetChildId: string): boolean {
        // Only the student can view their deeply personal reflections
        return user.uid === targetChildId || this.hasRelationship(user, targetChildId, 'self');
    },

    canViewWellnessSummary(user: UserContext, targetChildId: string): boolean {
        if (this.canViewRawJournal(user, targetChildId)) return true;
        
        const rels = user.relationships[targetChildId] || [];
        // Parents and authorized teachers/counselors can view summaries
        return rels.includes('parent_of') || rels.includes('teacher_of') || rels.includes('school_monitor');
    },

    canReceiveAlerts(user: UserContext, targetChildId: string): boolean {
        const rels = user.relationships[targetChildId] || [];
        return rels.includes('parent_of') || rels.includes('school_monitor') || rels.includes('teacher_of');
    },

    hasRelationship(user: UserContext, targetChildId: string, requiredRel: Relationship): boolean {
        return (user.relationships[targetChildId] || []).includes(requiredRel);
    }
};
