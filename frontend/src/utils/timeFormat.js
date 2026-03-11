export const formatTime = (time24) => {
    if (!time24) return "";
    
    // Handle cases where the time might already be formatted or invalid
    if (time24.toLowerCase().includes('am') || time24.toLowerCase().includes('pm')) {
        return time24;
    }

    const [hoursStr, minutesStr] = time24.split(":");
    if (!hoursStr || !minutesStr) return time24;

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (isNaN(hours) || isNaN(minutes)) return time24;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    // Pad minutes with zero if needed
    const minutesPadded = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesPadded} ${ampm}`;
};
