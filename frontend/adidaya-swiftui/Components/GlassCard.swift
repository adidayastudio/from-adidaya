import SwiftUI

public struct GlassCard<Content: View>: View {
    private let cornerRadius: CGFloat
    private let paddingAmount: CGFloat
    private let content: Content
    
    public init(
        cornerRadius: CGFloat = 16,
        padding: CGFloat = 16,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.paddingAmount = padding
        self.content = content()
    }
    
    public var body: some View {
        content
            .padding(paddingAmount)
            .background(.ultraThinMaterial)
            .cornerRadius(cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(
                        LinearGradient(
                            colors: [
                                .white.opacity(0.25),
                                .white.opacity(0.05),
                                .black.opacity(0.05),
                                .white.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 8)
    }
}

// Preview Provider
#Preview {
    ZStack {
        // Dynamic background to showcase glassmorphism
        LinearGradient(
            colors: [.adidayaRed, .purple],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
        
        GlassCard(cornerRadius: 24, padding: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Glassmorphic SwiftUI Card")
                    .font(.headline)
                    .foregroundColor(.white)
                Text("This matches the aesthetic styling of our React Native application.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
            }
            .frame(width: 280)
        }
    }
}
