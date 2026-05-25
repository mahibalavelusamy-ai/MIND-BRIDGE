/**
 * Permission Filtering Layer
 * All outputs must pass through role-aware filtering.
 */
export const PermissionFilter = {
  filterInsights(insights: any, viewerRole: string) {
    if (!insights) return null;
    
    // Deep clone to avoid mutating original source
    const filtered = JSON.parse(JSON.stringify(insights));
    
    switch (viewerRole) {
      case 'student':
        // Full visibility to own insights
        return filtered;
        
      case 'parent':
        // Parents see supportive summaries, planner engagement, NOT raw journals
        delete filtered.rawCheckins;
        delete filtered.privateNotes;
        delete filtered.clinicalIndicators; // Parents shouldn't see these anyway
        return filtered;
        
      case 'teacher':
        // Teachers see classroom engagement, academic wellness, NOT private emotional content
        delete filtered.rawCheckins;
        delete filtered.privateNotes;
        delete filtered.homeLifeIndicators;
        delete filtered.emotionalSpecifics;
        return filtered;
        
      case 'school_admin':
        // Admins see organizational trends, stripped of personal identification where applicable
        delete filtered.rawCheckins;
        delete filtered.privateNotes;
        delete filtered.personalConversations;
        return filtered;
        
      default:
        // By default, restrict everything sensitive
        delete filtered.rawCheckins;
        delete filtered.privateNotes;
        delete filtered.emotionalSpecifics;
        return filtered;
    }
  },
  
  filterAlerts(alerts: any[], viewerRole: string) {
    // Some alerts might only be for teachers (e.g. academic overload) or parents (e.g. sleep issues)
    return alerts.filter(alert => {
      if (viewerRole === 'parent' && alert.type === 'classroom_behavior') return false;
      if (viewerRole === 'teacher' && alert.type === 'home_behavior') return false;
      return true;
    });
  }
};
