import SwiftUI

public struct ContentView: View {
    // Shared authentication service
    @State private var authService = AuthService()
    
    public init() {}
    
    public var body: some View {
        TabView {
            Tab("Home", systemImage: "house.fill") {
                HomeView(authService: authService)
            }
            
            Tab("Tasks", systemImage: "scope") {
                NavigationStack {
                    ZStack {
                        Color.adidayaBackground.ignoresSafeArea()
                        VStack {
                            Text("Tasks Module Placeholder")
                                .font(.headline)
                                .foregroundColor(.adidayaSubtitle)
                        }
                    }
                    .navigationTitle("Tasks")
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
            
            Tab("Actions", systemImage: "bolt.fill") {
                NavigationStack {
                    ZStack {
                        Color.adidayaBackground.ignoresSafeArea()
                        VStack {
                            Text("Actions Module Placeholder")
                                .font(.headline)
                                .foregroundColor(.adidayaSubtitle)
                        }
                    }
                    .navigationTitle("Actions")
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
            
            Tab("Projects", systemImage: "laser.burst") {
                NavigationStack {
                    ZStack {
                        Color.adidayaBackground.ignoresSafeArea()
                        VStack {
                            Text("Projects Module Placeholder")
                                .font(.headline)
                                .foregroundColor(.adidayaSubtitle)
                        }
                    }
                    .navigationTitle("Projects")
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
            
            Tab(role: .search) {
                NavigationStack {
                    ZStack {
                        Color.adidayaBackground.ignoresSafeArea()
                        VStack {
                            Text("Search Module Placeholder")
                                .font(.headline)
                                .foregroundColor(.adidayaSubtitle)
                        }
                    }
                    .navigationTitle("Search")
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
        .tint(.adidayaRed)
    }
}

#Preview {
    ContentView()
}
