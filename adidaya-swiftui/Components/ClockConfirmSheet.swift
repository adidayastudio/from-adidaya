import SwiftUI

public struct ClockConfirmSheet: View {
    @Binding var isPresented: Bool
    let isClockedIn: Bool
    let onConfirm: (String?) -> Void
    
    @State private var isInsideArea: Bool = false
    @State private var selectedMode: String = "WFH"
    @State private var notes: String = ""
    
    private let modes = ["WFH", "WFA", "Trip", "Other"]
    private let modeCodes = [
        "WFH": "WFH",
        "WFA": "WFA",
        "Trip": "BST",
        "Other": "OTH"
    ]
    
    public init(isPresented: Binding<Bool>, isClockedIn: Bool, onConfirm: @escaping (String?) -> Void) {
        self._isPresented = isPresented
        self.isClockedIn = isClockedIn
        self.onConfirm = onConfirm
    }
    
    private var actionLabel: String {
        isClockedIn ? "Clock OUT" : "Clock IN"
    }
    
    private var actionColor: Color {
        isClockedIn ? .adidayaRed : .blue
    }
    
    private var canConfirm: Bool {
        isInsideArea || (!selectedMode.isEmpty && !notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }
    
    public var body: some View {
        VStack(spacing: 20) {
            // Drag Indicator
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)
            
            // Header
            HStack {
                Text(isInsideArea ? "Confirm Attendance" : "Remote Protocol")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.adidayaText)
                
                Spacer()
                
                Button(action: {
                    isPresented = false
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.adidayaGray.opacity(0.6))
                }
            }
            .padding(.horizontal, 24)
            
            // Subtitle
            Text(isInsideArea ? "You are at Kantor Pusat. Ready to begin your session?" : "Please verify your work status and provide a brief note for remote activity.")
                .font(.system(size: 15))
                .foregroundColor(.adidayaSubtitle)
                .padding(.horizontal, 24)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            ScrollView {
                VStack(spacing: 20) {
                    // Geofence Banner
                    HStack(spacing: 12) {
                        Image(systemName: isInsideArea ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(isInsideArea ? .green : .orange)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(isInsideArea ? "Kantor Pusat" : "Outside registered area")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(isInsideArea ? .green : .orange)
                                
                                Spacer()
                                
                                if !isInsideArea {
                                    Button(action: {
                                        // Simulate checking location
                                        withAnimation {
                                            isInsideArea = true
                                        }
                                    }) {
                                        Image(systemName: "arrow.clockwise")
                                            .font(.system(size: 13, weight: .bold))
                                            .padding(8)
                                            .background(Color.orange.opacity(0.15))
                                            .clipShape(Circle())
                                            .foregroundColor(.orange)
                                    }
                                }
                            }
                            
                            Text(isInsideArea ? "Within registered area (PRG)" : "Operating in Remote mode")
                                .font(.system(size: 13))
                                .foregroundColor(isInsideArea ? .green.opacity(0.8) : .orange.opacity(0.8))
                        }
                    }
                    .padding(16)
                    .background(isInsideArea ? Color.green.opacity(0.08) : Color.orange.opacity(0.08))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isInsideArea ? Color.green.opacity(0.2) : Color.orange.opacity(0.2), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                    
                    // Remote Protocol form if outside geofence
                    if !isInsideArea {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Workspace")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.adidayaSubtitle)
                                .padding(.horizontal, 4)
                            
                            // Segmented Picker
                            Picker("Workspace Mode", selection: $selectedMode) {
                                ForEach(modes, id: \.self) { mode in
                                    Text(mode).tag(mode)
                                }
                            }
                            .pickerStyle(.segmented)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 2) {
                                    Text("Activity Note")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.adidayaSubtitle)
                                    Text("*")
                                        .foregroundColor(.red)
                                }
                                .padding(.horizontal, 4)
                                
                                TextField("Add a brief note...", text: $notes, axis: .vertical)
                                    .lineLimit(3...5)
                                    .padding(14)
                                    .background(Color.black.opacity(0.04))
                                    .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal, 24)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                }
            }
            
            Divider()
                .padding(.horizontal, 24)
            
            // Footer Actions
            HStack(spacing: 12) {
                Button(action: {
                    isPresented = false
                }) {
                    Text("Cancel")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.adidayaText)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.gray.opacity(0.12))
                        .cornerRadius(26)
                }
                
                Button(action: {
                    let code = isInsideArea ? "PRG" : modeCodes[selectedMode]
                    onConfirm(code)
                    isPresented = false
                }) {
                    Text(actionLabel)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(canConfirm ? actionColor : Color.gray.opacity(0.3))
                        .cornerRadius(26)
                }
                .disabled(!canConfirm)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    Text("Sheet Container")
        .sheet(isPresented: .constant(true)) {
            ClockConfirmSheet(isPresented: .constant(true), isClockedIn: false) { code in
                print("Clock in with mode: \(code ?? "none")")
            }
        }
}
