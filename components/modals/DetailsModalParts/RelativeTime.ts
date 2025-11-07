// Put the components/DetailsModalParts/RelativeTime.ts code here // RelativeTime.ts
export function getRelativeTime(
    past?: Date | string | { toDate: () => Date }
  ): string {
    if (!past) return "Just now";
    
    let pastDate: Date;
    if (past instanceof Date) {
      pastDate = past;
    } else if (
      typeof past === "object" &&
      typeof (past as any).toDate === "function"
    ) {
      pastDate = (past as any).toDate();
    } else {
      pastDate = new Date(past);
    }
    
    if (isNaN(pastDate.getTime())) return "Just now";
    
    const diffMs = Date.now() - pastDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }
  