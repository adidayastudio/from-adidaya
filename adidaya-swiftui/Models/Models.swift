import Foundation

// MARK: - Enums

public enum CrewRole: String, Codable, CaseIterable, Identifiable {
    case foreman = "FOREMAN"
    case leader = "LEADER"
    case skilled = "SKILLED"
    case helper = "HELPER"
    case operatorRole = "OPERATOR"
    case general = "GENERAL"
    
    public var id: String { self.rawValue }
    
    public var label: String {
        switch self {
        case .foreman: return "Foreman"
        case .leader: return "Team Leader"
        case .skilled: return "Skilled Worker"
        case .helper: return "Helper"
        case .operatorRole: return "Operator"
        case .general: return "General Worker"
        }
    }
}

public enum CrewStatus: String, Codable, CaseIterable, Identifiable {
    case active = "ACTIVE"
    case inactive = "INACTIVE"
    
    public var id: String { self.rawValue }
}

public enum AttendanceStatus: String, Codable, CaseIterable, Identifiable {
    case present = "PRESENT"
    case absent = "ABSENT"
    case halfDay = "HALF_DAY"
    case cuti = "CUTI"
    case empty = ""
    
    public var id: String { self.rawValue }
}

public enum RequestType: String, Codable, CaseIterable, Identifiable {
    case leave = "LEAVE"
    case kasbon = "KASBON"
    case reimburse = "REIMBURSE"
    
    public var id: String { self.rawValue }
}

public enum RequestStatus: String, Codable, CaseIterable, Identifiable {
    case pending = "PENDING"
    case approved = "APPROVED"
    case rejected = "REJECTED"
    case canceled = "CANCELED"
    
    public var id: String { self.rawValue }
}

public enum DocumentType: String, Codable, CaseIterable, Identifiable {
    case ktp = "KTP"
    case kk = "KK"
    case bpjsKes = "BPJS_KES"
    case bpjsTk = "BPJS_TK"
    case asuransiLain = "ASURANSI_LAIN"
    case other = "OTHER"
    
    public var id: String { self.rawValue }
    
    public var label: String {
        switch self {
        case .ktp: return "KTP"
        case .kk: return "Kartu Keluarga"
        case .bpjsKes: return "BPJS Kesehatan"
        case .bpjsTk: return "BPJS Ketenagakerjaan"
        case .asuransiLain: return "Asuransi Lain"
        case .other: return "Lainnya"
        }
    }
}

// MARK: - Structs

public struct CrewDocument: Codable, Identifiable, Hashable {
    public let id: String
    public let type: DocumentType
    public let label: String
    public let fileUrl: String
    public let fileName: String
    
    public init(id: String, type: DocumentType, label: String, fileUrl: String, fileName: String) {
        self.id = id
        self.type = type
        self.label = label
        self.fileUrl = fileUrl
        self.fileName = fileName
    }
}

public struct CrewMember: Codable, Identifiable, Hashable {
    public let id: String
    public var name: String
    public var initials: String
    public var role: CrewRole
    public var status: CrewStatus
    public var skillTags: [String]
    public var projectCode: String?
    public var baseDailyRate: Double
    public var overtimeDailyRate: Double
    public var otRate1: Double
    public var otRate2: Double
    public var otRate3: Double
    public var phone: String?
    public var email: String?
    
    // Personal details
    public var nickname: String?
    public var photoUrl: String?
    public var nik: String?
    public var birthDate: String?
    public var homeAddress: String?
    
    // Payroll account
    public var bankName: String?
    public var bankAccountNumber: String?
    public var bankAccountName: String?
    
    // Documents
    public var documents: [CrewDocument]?
    
    public init(
        id: String,
        name: String,
        initials: String,
        role: CrewRole,
        status: CrewStatus,
        skillTags: [String],
        projectCode: String? = nil,
        baseDailyRate: Double,
        overtimeDailyRate: Double,
        otRate1: Double,
        otRate2: Double,
        otRate3: Double,
        phone: String? = nil,
        email: String? = nil,
        nickname: String? = nil,
        photoUrl: String? = nil,
        nik: String? = nil,
        birthDate: String? = nil,
        homeAddress: String? = nil,
        bankName: String? = nil,
        bankAccountNumber: String? = nil,
        bankAccountName: String? = nil,
        documents: [CrewDocument]? = nil
    ) {
        self.id = id
        self.name = name
        self.initials = initials
        self.role = role
        self.status = status
        self.skillTags = skillTags
        self.projectCode = projectCode
        self.baseDailyRate = baseDailyRate
        self.overtimeDailyRate = overtimeDailyRate
        self.otRate1 = otRate1
        self.otRate2 = otRate2
        self.otRate3 = otRate3
        self.phone = phone
        self.email = email
        self.nickname = nickname
        self.photoUrl = photoUrl
        self.nik = nik
        self.birthDate = birthDate
        self.homeAddress = homeAddress
        self.bankName = bankName
        self.bankAccountNumber = bankAccountNumber
        self.bankAccountName = bankAccountName
        self.documents = documents
    }
}

public struct Project: Codable, Identifiable, Hashable {
    public var id: String { code }
    public let code: String
    public let name: String
    
    public init(code: String, name: String) {
        self.code = code
        self.name = name
    }
}

public struct Assignment: Codable, Identifiable, Hashable {
    public let id: String
    public let crewId: String
    public let crewName: String
    public let crewRole: CrewRole
    public let projectCode: String
    public let startDate: String
    public var endDate: String?
    public var status: String // ACTIVE | COMPLETED | INACTIVE
    
    public init(id: String, crewId: String, crewName: String, crewRole: CrewRole, projectCode: String, startDate: String, endDate: String? = nil, status: String) {
        self.id = id
        self.crewId = crewId
        self.crewName = crewName
        self.crewRole = crewRole
        self.projectCode = projectCode
        self.startDate = startDate
        self.endDate = endDate
        self.status = status
    }
}

public struct DailyLog: Codable, Identifiable, Hashable {
    public let id: String
    public let crewId: String
    public let projectCode: String
    public let date: String // YYYY-MM-DD
    public var status: AttendanceStatus
    public var regularHours: Double
    public var ot1Hours: Double
    public var ot2Hours: Double
    public var ot3Hours: Double
    
    public init(id: String, crewId: String, projectCode: String, date: String, status: AttendanceStatus, regularHours: Double, ot1Hours: Double, ot2Hours: Double, ot3Hours: Double) {
        self.id = id
        self.crewId = crewId
        self.projectCode = projectCode
        self.date = date
        self.status = status
        self.regularHours = regularHours
        self.ot1Hours = ot1Hours
        self.ot2Hours = ot2Hours
        self.ot3Hours = ot3Hours
    }
}

public struct CrewRequest: Codable, Identifiable, Hashable {
    public let id: String
    public let crewId: String
    public let crewName: String
    public let crewRole: CrewRole
    public var projectCode: String?
    public let type: RequestType
    public var amount: Double?
    public let startDate: String
    public var endDate: String?
    public let reason: String
    public var status: RequestStatus
    public let createdAt: String
    public var proofUrl: String?
    public var rejectReason: String?
    
    public init(
        id: String,
        crewId: String,
        crewName: String,
        crewRole: CrewRole,
        projectCode: String? = nil,
        type: RequestType,
        amount: Double? = nil,
        startDate: String,
        endDate: String? = nil,
        reason: String,
        status: RequestStatus,
        createdAt: String,
        proofUrl: String? = nil,
        rejectReason: String? = nil
    ) {
        self.id = id
        self.crewId = crewId
        self.crewName = crewName
        self.crewRole = crewRole
        self.projectCode = projectCode
        self.type = type
        self.amount = amount
        self.startDate = startDate
        self.endDate = endDate
        self.reason = reason
        self.status = status
        self.createdAt = createdAt
        self.proofUrl = proofUrl
        self.rejectReason = rejectReason
    }
}

// MARK: - Mock Data Extensions

public extension Project {
    static let mocks: [Project] = [
        Project(code: "001-RWM", name: "Rawa Minyak Waterway"),
        Project(code: "008-RBH", name: "Rawa Buaya Infrastructure"),
        Project(code: "009-LAX", name: "Lorong Agung Bridge"),
        Project(code: "012-KBY", name: "Kebayoran MRT Extension")
    ]
}

public extension CrewMember {
    static let mocks: [CrewMember] = [
        CrewMember(
            id: "c1",
            name: "Bambang Pamungkas",
            initials: "BP",
            role: .foreman,
            status: .active,
            skillTags: ["Scaffolding", "Safety Officer", "Site Supervision"],
            projectCode: "008-RBH",
            baseDailyRate: 350000,
            overtimeDailyRate: 450000,
            otRate1: 60000,
            otRate2: 80000,
            otRate3: 100000,
            phone: "+62 812-3456-7890",
            email: "bambang.p@adidaya.com",
            nickname: "Bambang",
            nik: "3175012345678901",
            birthDate: "1985-03-15",
            homeAddress: "Jl. Raya Kebayoran No. 45, Jakarta Selatan",
            bankName: "BCA",
            bankAccountNumber: "1234567890",
            bankAccountName: "Bambang Pamungkas",
            documents: [
                CrewDocument(id: "doc1", type: .ktp, label: "KTP", fileUrl: "https://placehold.co/400x250", fileName: "ktp_bambang.jpg")
            ]
        ),
        CrewMember(
            id: "c2",
            name: "Agus Setiawan",
            initials: "AS",
            role: .leader,
            status: .active,
            skillTags: ["Concrete Casting", "Masonry", "Carpentry"],
            projectCode: "008-RBH",
            baseDailyRate: 280000,
            overtimeDailyRate: 360000,
            otRate1: 50000,
            otRate2: 70000,
            otRate3: 90000,
            phone: "+62 813-9876-5432",
            email: "agus.setiawan@adidaya.com",
            nickname: "Agus"
        ),
        CrewMember(
            id: "c3",
            name: "Rudi Hartono",
            initials: "RH",
            role: .skilled,
            status: .active,
            skillTags: ["Welding", "Metalworking", "Steel Structure"],
            projectCode: "001-RWM",
            baseDailyRate: 220000,
            overtimeDailyRate: 300000,
            otRate1: 40000,
            otRate2: 55000,
            otRate3: 70000,
            phone: "+62 811-5555-4444",
            email: "rudi.h@adidaya.com",
            nickname: "Rudi"
        ),
        CrewMember(
            id: "c4",
            name: "Joko Widodo",
            initials: "JW",
            role: .helper,
            status: .active,
            skillTags: ["General Labor", "Excavation Support"],
            projectCode: "001-RWM",
            baseDailyRate: 150000,
            overtimeDailyRate: 200000,
            otRate1: 25000,
            otRate2: 35000,
            otRate3: 45000,
            phone: "+62 812-7777-8888",
            email: "joko.w@adidaya.com",
            nickname: "Joko"
        ),
        CrewMember(
            id: "c5",
            name: "Heri Prasetyo",
            initials: "HP",
            role: .operatorRole,
            status: .active,
            skillTags: ["Excavator Operator", "Heavy Equipment License"],
            projectCode: "009-LAX",
            baseDailyRate: 300000,
            overtimeDailyRate: 400000,
            otRate1: 55000,
            otRate2: 75000,
            otRate3: 95000,
            phone: "+62 857-1111-2222",
            email: "heri.p@adidaya.com",
            nickname: "Heri"
        ),
        CrewMember(
            id: "c6",
            name: "Dedi Kurniawan",
            initials: "DK",
            role: .general,
            status: .inactive,
            skillTags: ["General Assistance", "Site Cleaning"],
            baseDailyRate: 140000,
            overtimeDailyRate: 180000,
            otRate1: 20000,
            otRate2: 30000,
            otRate3: 40000,
            phone: "+62 819-3333-4444",
            email: "dedi.k@adidaya.com",
            nickname: "Dedi"
        )
    ]
}
