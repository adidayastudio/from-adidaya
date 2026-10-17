import SwiftUI

public struct LoginView: View {
    @State private var step: LoginStep = .landing
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    
    // Uses the AuthService injected or initialized here
    @State private var authService = AuthService()
    
    private enum LoginStep {
        case landing
        case form
    }
    
    public init(authService: AuthService = AuthService()) {
        self._authService = State(initialValue: authService)
    }
    
    public var body: some View {
        ZStack {
            Color.adidayaBackground
                .ignoresSafeArea()
            
            switch step {
            case .landing:
                landingView
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .leading)),
                        removal: .opacity.combined(with: .move(edge: .leading))
                    ))
            case .form:
                formView
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .trailing)),
                        removal: .opacity.combined(with: .move(edge: .trailing))
                    ))
            }
        }
        .animation(.spring(response: 0.45, dampingFraction: 0.8), value: step)
    }
    
    // MARK: - Landing View
    private var landingView: some View {
        VStack {
            Spacer()
            
            // Logo Content Area
            VStack(spacing: 24) {
                logoImage(size: 120)
                    .frame(width: 120, height: 120)
                    .shadow(color: .adidayaRed.opacity(0.15), radius: 15, x: 0, y: 10)
                
                VStack(spacing: 8) {
                    Text("from: adidayastudio")
                        .font(.system(size: 22, weight: .bold, design: .default))
                        .foregroundColor(.black)
                        .tracking(-0.5)
                    
                    Text("OPERATIONAL INTELLIGENCE SYSTEM")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.adidayaGray)
                        .tracking(1.5)
                }
            }
            
            Spacer()
            
            // Landing Action Area
            VStack(spacing: 24) {
                Button(action: {
                    step = .form
                }) {
                    HStack(spacing: 8) {
                        Text("Login to System")
                            .font(.system(size: 18, weight: .bold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(Color.adidayaRed)
                    .cornerRadius(28)
                    .shadow(color: .adidayaRed.opacity(0.25), radius: 8, x: 0, y: 4)
                }
                
                Text("© 2026 Adidaya Studio. All rights reserved.")
                    .font(.system(size: 12))
                    .foregroundColor(.adidayaLightGray)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
    }
    
    // MARK: - Form View
    private var formView: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header (With back button)
                HStack {
                    Button(action: {
                        step = .landing
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 16, weight: .semibold))
                            Text("Back")
                                .font(.system(size: 16))
                        }
                        .foregroundColor(.adidayaRed)
                    }
                    Spacer()
                }
                .padding(.top, 16)
                
                // Form Header
                VStack(spacing: 16) {
                    logoImage(size: 80)
                        .frame(width: 80, height: 80)
                    
                    VStack(spacing: 6) {
                        Text("Sign In")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.adidayaDark)
                            .tracking(-0.5)
                        
                        Text("Welcome back to Adidaya OS")
                            .font(.system(size: 15))
                            .foregroundColor(.adidayaSubtitle)
                    }
                }
                
                // Form Content
                VStack(spacing: 20) {
                    // Error Container
                    if let error = authService.errorMessage {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.adidayaRed)
                                .font(.system(size: 16))
                            
                            Text(error)
                                .font(.system(size: 14))
                                .foregroundColor(.adidayaRed)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(14)
                        .background(Color.adidayaRed.opacity(0.08))
                        .cornerRadius(12)
                    }
                    
                    // Username Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Username or Email")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.adidayaDark)
                        
                        TextField("username or name@adidayastudio.id", text: $email)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.emailAddress)
                            .padding(.horizontal, 20)
                            .frame(height: 52)
                            .background(Color.white)
                            .cornerRadius(26)
                            .overlay(
                                RoundedRectangle(cornerRadius: 26)
                                    .stroke(Color.adidayaBorder, lineWidth: 1)
                            )
                            .disabled(authService.isLoading)
                    }
                    
                    // Password Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.adidayaDark)
                        
                        HStack {
                            if showPassword {
                                TextField("Required", text: $password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Required", text: $password)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            
                            Button(action: {
                                showPassword.toggle()
                            }) {
                                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                    .foregroundColor(.adidayaGray)
                                    .font(.system(size: 16))
                            }
                        }
                        .padding(.horizontal, 20)
                        .frame(height: 52)
                        .background(Color.white)
                        .cornerRadius(26)
                        .overlay(
                            RoundedRectangle(cornerRadius: 26)
                                .stroke(Color.adidayaBorder, lineWidth: 1)
                        )
                        .disabled(authService.isLoading)
                    }
                    
                    // Submit Button
                    Button(action: {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        Task {
                            await authService.signIn(email: email, password: password)
                        }
                    }) {
                        ZStack {
                            if authService.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Sign In")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.adidayaDark)
                        .cornerRadius(26)
                    }
                    .disabled(authService.isLoading)
                    .padding(.top, 8)
                    
                    Text("For password reset, please contact administrator.")
                        .font(.system(size: 13))
                        .foregroundColor(.adidayaGray)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }
            }
            .padding(.horizontal, 24)
        }
    }
    
    // MARK: - Logo View Helper
    private func logoImage(size: CGFloat) -> some View {
        Group {
            if UIImage(named: "logo-adidaya-red") != nil {
                Image("logo-adidaya-red")
                    .resizable()
                    .scaledToFit()
                    .frame(width: size, height: size)
            } else {
                // High fidelity fallback drawing for local previews
                ZStack {
                    Circle()
                        .fill(Color.adidayaRed.opacity(0.1))
                        .frame(width: size, height: size)
                    
                    Image(systemName: "triangle.fill")
                        .resizable()
                        .scaledToFit()
                        .foregroundColor(.adidayaRed)
                        .frame(width: size * 0.5, height: size * 0.5)
                        .overlay(
                            Text("A")
                                .font(.system(size: size * 0.22, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                                .offset(y: size * 0.05)
                        )
                }
            }
        }
    }
}

// Preview Provider
#Preview {
    LoginView()
}
