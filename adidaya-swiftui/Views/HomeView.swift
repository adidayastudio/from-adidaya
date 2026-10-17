import SwiftUI

public struct HomeView: View {
    @AppStorage("isDarkMode") private var isDarkMode = false
    
    // Auth Service passed from parent
    let authService: AuthService
    
    // Clock Action State
    @State private var isClockedIn = false
    @State private var clockInTime: Date? = nil
    @State private var locationCode: String? = nil
    @State private var elapsedSeconds = 0
    @State private var showClockConfirmSheet = false
    @State private var alertMessage: String? = nil
    @State private var showAlert = false
    
    @State private var timer: Timer? = nil
    
    public init(authService: AuthService) {
        self.authService = authService
    }
    
    private var displayName: String {
        if let email = authService.currentUserEmail {
            let prefix = email.split(separator: "@").first ?? "Adidaya"
            return String(prefix).capitalized
        }
        return "Adidaya"
    }
    
    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour >= 22 || hour < 4 { return "Good Night" }
        if hour < 12 { return "Good Morning" }
        if hour < 18 { return "Good Afternoon" }
        return "Good Evening"
    }
    
    // Rings statistics matching mock data
    private var ringData: [MultiProgressRing.RingData] {
        [
            .init(label: "Tasks", progress: 0.75, color: isDarkMode ? Color.blue : Color(hex: "32ADE6")),
            .init(label: "Presence", progress: 0.88, color: Color(hex: "30D158")),
            .init(label: "Pulse", progress: 0.40, color: Color(hex: "FF9F0A"))
        ]
    }
    
    // Launcher Items struct
    struct LauncherItem: Identifiable {
        let id: String
        let label: String
        let icon: String
        let startColor: Color
        let endColor: Color
    }
    
    private let launcherItems = [
        LauncherItem(id: "finance", label: "Finance", icon: "creditcard.fill", startColor: Color(hex: "C73A40"), endColor: Color(hex: "B3262D")),
        LauncherItem(id: "resources", label: "Resources", icon: "archivebox.fill", startColor: Color(hex: "F08C45"), endColor: Color(hex: "E07A2F")),
        LauncherItem(id: "people", label: "People", icon: "person.2.fill", startColor: Color(hex: "60D284"), endColor: Color(hex: "38A45A")),
        LauncherItem(id: "clock", label: "Clock", icon: "clock.fill", startColor: Color(hex: "5BA4E5"), endColor: Color(hex: "3A7CC7")),
        LauncherItem(id: "crew", label: "Crew", icon: "person.3.fill", startColor: Color(hex: "734DA5"), endColor: Color(hex: "5E3A87"))
    ]
    
    public var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color.adidayaBackground
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // 1. Activity Rings Card
                        activityCard
                            .padding(.top, 16)
                        
                        // 2. Launcher Menu Grid
                        launcherGrid
                        
                        // Scroll padding to avoid overlaps with the floating clock widget
                        Spacer()
                            .frame(height: 120)
                    }
                }
                .scrollIndicators(.hidden)
                
                // 3. Floating Bottom Quick Action
                VStack {
                    Spacer()
                    floatingClockWidget
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                // Left Toolbar: Logo / Brand Button
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 8) {
                        logoView(size: 28)
                        Text("Adidaya OS")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.adidayaDark)
                    }
                }
                
                // Right Toolbar: Notifications, Theme Switcher & Profile
                ToolbarItemGroup(placement: .topBarTrailing) {
                    // Notifications
                    Button(action: {
                        triggerAlert(message: "Notifications screen is under development.")
                    }) {
                        Image(systemName: "bell.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.adidayaDark)
                            .overlay(
                                Circle()
                                    .fill(Color.adidayaRed)
                                    .frame(width: 8, height: 8)
                                    .offset(x: 6, y: -6),
                                alignment: .topTrailing
                            )
                    }
                    
                    // Dark Mode Toggle
                    Button(action: {
                        isDarkMode.toggle()
                        triggerHapticFeedback(.light)
                    }) {
                        Image(systemName: isDarkMode ? "sun.max.fill" : "moon.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.adidayaDark)
                    }
                    
                    // Profile/Log out
                    Menu {
                        Section("Signed In as \(authService.currentUserEmail ?? "")") {
                            Button(action: {
                                triggerAlert(message: "My Profile screen is under development.")
                            }) {
                                Label("My Profile", systemImage: "person.crop.circle")
                            }
                            
                            Button(role: .destructive, action: {
                                withAnimation {
                                    authService.signOut()
                                }
                            }) {
                                Label("Sign Out", systemImage: "power")
                            }
                        }
                    } label: {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.adidayaDark)
                    }
                }
            }
            .sheet(isPresented: $showClockConfirmSheet) {
                ClockConfirmSheet(isPresented: $showClockConfirmSheet, isClockedIn: isClockedIn) { code in
                    handleClockAction(locationCode: code)
                }
            }
            .alert(isPresented: $showAlert) {
                Alert(title: Text("Notice"), message: Text(alertMessage ?? ""), dismissButton: .default(Text("OK")))
            }
        }
        .preferredColorScheme(isDarkMode ? .dark : .light)
    }
    
    // MARK: - Activity Summary Card
    private var activityCard: some View {
        Button(action: {
            triggerAlert(message: "Detailed activity view is under development.")
        }) {
            VStack(spacing: 0) {
                HStack(spacing: 16) {
                    // Left Side: Legend statistics
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Activity Summary")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.adidayaDark)
                            .padding(.bottom, 2)
                        
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(ringData) { ring in
                                HStack(spacing: 10) {
                                    // Icon Circle
                                    ZStack {
                                        Circle()
                                            .fill(ring.color.opacity(0.12))
                                            .frame(width: 26, height: 26)
                                        
                                        Image(systemName: ring.label == "Tasks" ? "scope" : ring.label == "Presence" ? "person.fill.checkmark" : "waveform.path.ecg")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(ring.color)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(ring.label.uppercased())
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundColor(.adidayaSubtitle.opacity(0.8))
                                            .tracking(0.5)
                                        
                                        Text("\(Int(ring.progress * 100))%")
                                            .font(.system(size: 16, weight: .black))
                                            .foregroundColor(.adidayaDark)
                                            .tracking(-0.3)
                                    }
                                }
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Right Side: Concatenated Rings
                    MultiProgressRing(rings: ringData)
                        .frame(width: 120, height: 120)
                }
                .padding(20)
                
                // Footer Insight
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.15))
                            .frame(width: 24, height: 24)
                        
                        Image(systemName: "sparkles")
                            .font(.system(size: 11))
                            .foregroundColor(.blue)
                    }
                    
                    HStack(spacing: 4) {
                        Text("You are")
                            .font(.system(size: 12))
                            .foregroundColor(.adidayaSubtitle)
                        
                        Text("15% more productive")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.adidayaDark)
                        
                        Text("than last week")
                            .font(.system(size: 12))
                            .foregroundColor(.adidayaSubtitle)
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color.black.opacity(0.02))
                .overlay(
                    Divider(),
                    alignment: .top
                )
            }
            .background(Color.white)
            .cornerRadius(24)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(Color.adidayaBorder, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 4)
            .padding(.horizontal, 20)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Launcher Grid
    private var launcherGrid: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("WORKSPACE")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.adidayaSubtitle.opacity(0.8))
                .tracking(0.8)
                .padding(.horizontal, 20)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                ForEach(launcherItems) { item in
                    Button(action: {
                        triggerHapticFeedback(.light)
                        triggerAlert(message: "\(item.label) Module is under development.")
                    }) {
                        ZStack(alignment: .bottomLeading) {
                            // Gradient card background
                            LinearGradient(
                                colors: [item.startColor, item.endColor],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            
                            // Watermark Icon
                            VStack {
                                HStack {
                                    Spacer()
                                    Image(systemName: item.icon)
                                        .font(.system(size: 44, weight: .semibold))
                                        .foregroundColor(.white.opacity(0.25))
                                        .padding(.trailing, 6)
                                        .padding(.top, 6)
                                }
                                Spacer()
                            }
                            
                            // Title Label
                            Text(item.label)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .padding(12)
                        }
                        .frame(height: 100)
                        .cornerRadius(18)
                        .shadow(color: item.endColor.opacity(0.25), radius: 6, x: 0, y: 4)
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    // MARK: - Floating Clock Widget
    private var floatingClockWidget: some View {
        GlassEffectContainer {
            HStack(spacing: 16) {
                // Left Content: Status Dot & Timer
                HStack(spacing: 10) {
                    // Status Dot
                    Circle()
                        .fill(isClockedIn ? Color.green : Color.adidayaGray)
                        .frame(width: 8, height: 8)
                        .shadow(color: isClockedIn ? Color.green.opacity(0.8) : Color.clear, radius: 4)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 8) {
                            Text(formatElapsed(elapsedSeconds))
                                .font(.system(size: 22, weight: .bold, design: .monospaced))
                                .foregroundColor(.adidayaDark)
                            
                            if isClockedIn, let code = locationCode {
                                HStack(spacing: 4) {
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 8))
                                    Text(code)
                                        .font(.system(size: 9, weight: .bold))
                                }
                                .foregroundColor(.adidayaSubtitle)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.black.opacity(0.06))
                                .cornerRadius(8)
                            }
                        }
                        
                        // Times row
                        HStack(spacing: 6) {
                            // IN time
                            HStack(spacing: 3) {
                                Image(systemName: "arrow.up.forward")
                                    .font(.system(size: 9))
                                Text(startedAtTime)
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(.adidayaSubtitle)
                            
                            Text("|")
                                .font(.system(size: 10))
                                .foregroundColor(.adidayaBorder)
                            
                            // Target OUT time
                            HStack(spacing: 3) {
                                Image(systemName: "arrow.down.forward")
                                    .font(.system(size: 9))
                                Text(targetOutTime)
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(.adidayaSubtitle)
                        }
                    }
                }
                
                Spacer()
                
                // Action Button
                Button(action: {
                    triggerHapticFeedback(isClockedIn ? .heavy : .medium)
                    showClockConfirmSheet = true
                }) {
                    Text(isClockedIn ? "Clock Out" : "Clock In")
                        .font(.system(size: 14, weight: .bold))
                }
                .buttonStyle(.glassProminent)
                .tint(isClockedIn ? .adidayaRed : .blue)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .glassEffect(in: .capsule)
        }
    }
    
    // MARK: - Clock Helpers
    private func handleClockAction(locationCode: String?) {
        if isClockedIn {
            // Clock out
            isClockedIn = false
            clockInTime = nil
            self.locationCode = nil
            stopTimer()
        } else {
            // Clock in
            isClockedIn = true
            clockInTime = Date()
            self.locationCode = locationCode
            startTimer()
        }
    }
    
    private func startTimer() {
        timer?.invalidate()
        elapsedSeconds = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            elapsedSeconds += 1
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private var startedAtTime: String {
        guard let start = clockInTime else { return "--.--" }
        return formatDateSimple(start)
    }
    
    private var targetOutTime: String {
        guard let start = clockInTime else { return "--.--" }
        let calendar = Calendar.current
        let targetHours = calendar.component(.weekday, from: start) == 7 ? 5 : 8
        if let target = calendar.date(byAdding: .hour, value: targetHours, to: start) {
            return formatDateSimple(target)
        }
        return "--.--"
    }
    
    private func formatElapsed(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        return String(format: "%02d:%02d:%02d", h, m, s)
    }
    
    private func formatDateSimple(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH.mm"
        return formatter.string(from: date)
    }
    
    private func triggerAlert(message: String) {
        alertMessage = message
        showAlert = true
    }
    
    private func triggerHapticFeedback(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
    
    // MARK: - Logo View Helper
    private func logoView(size: CGFloat) -> some View {
        Group {
            if UIImage(named: "logo-adidaya-red") != nil {
                Image("logo-adidaya-red")
                    .resizable()
                    .scaledToFit()
                    .frame(width: size, height: size)
            } else {
                ZStack {
                    Circle()
                        .fill(Color.adidayaRed.opacity(0.12))
                        .frame(width: size, height: size)
                    Text("A")
                        .font(.system(size: size * 0.5, weight: .bold, design: .rounded))
                        .foregroundColor(.adidayaRed)
                }
            }
        }
    }
}

// Preview Provider
#Preview {
    HomeView(authService: AuthService())
}
