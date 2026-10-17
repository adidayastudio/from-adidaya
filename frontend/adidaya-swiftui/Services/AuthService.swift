import Foundation
import Observation

@Observable
public final class AuthService {
    public var isAuthenticated: Bool = false
    public var isLoading: Bool = false
    public var currentUserEmail: String? = nil
    public var errorMessage: String? = nil
    
    public init() {}
    
    /// Simulates signing in with email and password
    public func signIn(email: String, password: String) async {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !password.isEmpty else {
            self.errorMessage = "Please enter both email and password"
            return
        }
        
        self.isLoading = true
        self.errorMessage = nil
        
        // Simulating network latency (1.2 seconds)
        try? await Task.sleep(nanoseconds: 1_200_000_000)
        
        // Mock Login validation
        // Any password >= 6 characters will succeed for easy developer testing
        if email.contains("@") && password.count >= 6 {
            self.isAuthenticated = true
            self.currentUserEmail = email.lowercased()
            self.isLoading = false
        } else if password.count < 6 {
            self.errorMessage = "Password must be at least 6 characters"
            self.isLoading = false
        } else {
            self.errorMessage = "Invalid email address format"
            self.isLoading = false
        }
    }
    
    /// Logs out of the current session
    public func signOut() {
        self.isLoading = true
        self.isAuthenticated = false
        self.currentUserEmail = nil
        self.errorMessage = nil
        self.isLoading = false
    }
}
