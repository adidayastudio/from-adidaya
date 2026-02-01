
export type AttendanceStatus = "ontime" | "intime" | "late" | "absent" | "sick" | "leave" | "weekend" | "holiday";

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    status: AttendanceStatus;
    totalMinutes: number;
    overtimeMinutes: number;
    userName?: string; // For team view
    userRole?: string; // For team filtering
    userDepartment?: string; // For team filtering
    avatar?: string; // User avatar URL
    // Location fields for check-in
    checkInLatitude?: number;
    checkInLongitude?: number;
    checkInLocationCode?: string;
    checkInLocationType?: string;
    checkInRemoteMode?: string;
    checkInLocationStatus?: string;
    notes?: string; // Reason or Override Note
}

export type LeaveType = "Annual Leave" | "Sick Leave" | "Permission" | "Unpaid Leave" | "Maternity Leave";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
    id: string;
    userId: string;
    userName?: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    status: RequestStatus;
    reason: string;
    rejectReason?: string;
    fileUrl?: string;
    createdAt: string;
}

export interface OvertimeLog {
    id: string;
    userId: string;
    userName?: string;
    date: string;
    startTime: string;
    endTime: string;
    projectId?: string;
    status: RequestStatus;
    description: string;
    photoUrl?: string;
    createdAt: string;
    approvedStartTime?: string;
    approvedEndTime?: string;
    rejectReason?: string;
}

export interface BusinessTrip {
    id: string;
    userId: string;
    userName?: string;
    destination: string;
    startDate: string;
    endDate: string;
    purpose: string;
    projectId?: string;
    transportation?: string;
    accommodation?: string;
    estimatedCost?: number;
    status: RequestStatus;
    rejectReason?: string;
    fileUrl?: string;
    notes?: string;
    createdAt: string;
}

export interface AttendanceSession {
    id: string;
    userId: string;
    date: string;
    sessionNumber: number;
    clockIn: string;
    clockOut: string | null;
    durationMinutes: number;
    isOvertime: boolean;
    latitude?: number;
    longitude?: number;
    locationCode?: string;
    locationType?: string;
    remoteMode?: string;
    locationStatus?: string;
    userName?: string; // from join
    avatar?: string; // from join
}

export interface AttendanceLog {
    id: string;
    userId: string;
    type: "IN" | "OUT";
    timestamp: string;
    latitude?: number;
    longitude?: number;
    detectedLocationCode?: string;
    locationStatus?: string;
    createdAt: string;
    userName?: string; // from join
    avatar?: string; // from join
}

export interface ClockActionMetadata {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    detectedLocationId?: string;
    detectedLocationCode?: string;
    detectedLocationType?: string;
    distanceMeters?: number;
    locationStatus?: "inside" | "outside" | "unknown";
    overrideReason?: string;
    remoteMode?: string;
}
