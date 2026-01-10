export const formatMessageTime = (date: Date): string => {
    const now = new Date();
    const messageDate = new Date(date);
    
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Just now (< 1 minute)
    if (diffMins < 1) return 'Just now';
    
    // Minutes ago (< 60 minutes)
    if (diffMins < 60) return `${diffMins}m ago`;
    
    // Hours ago (< 24 hours)
    if (diffHours < 24) return `${diffHours}h ago`;
    
    // Days ago (< 7 days)
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Older: show actual time
    const hours = messageDate.getHours();
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes} ${ampm}`;
};

export const formatFullDateTime = (date: Date): string => {
    const messageDate = new Date(date);
    const day = messageDate.getDate();
    const month = messageDate.toLocaleString('en-US', { month: 'short' });
    const year = messageDate.getFullYear();
    const hours = messageDate.getHours();
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${month} ${day}, ${year} • ${displayHours}:${minutes} ${ampm}`;
};