export function clockConfirmationIssue(input: {
    insideArea: boolean;
    remoteMode: string | null;
    note: string;
    coords: { latitude: number; longitude: number } | null;
    photoUri?: string;
    capturing: boolean;
}): string | null {
    if (!input.coords || !Number.isFinite(input.coords.latitude) || !Number.isFinite(input.coords.longitude)) return 'Waiting for location coordinates. Use Refresh Location to retry.';
    if (!input.insideArea && !input.remoteMode) return 'Select a remote mode to continue.';
    if (!input.insideArea && !input.note.trim()) return 'Add an activity note for remote attendance.';
    if (input.capturing) return 'Preparing your attendance photo…';
    if (!input.photoUri) return 'Capture a photo to continue.';
    return null;
}
