import SwiftUI

public struct MultiProgressRing: View {
    public struct RingData: Identifiable {
        public let id = UUID()
        public let label: String
        public let progress: Double // Range: 0.0 to 1.0
        public let color: Color
        
        public init(label: String, progress: Double, color: Color) {
            self.label = label
            self.progress = progress
            self.color = color
        }
    }
    
    public let rings: [RingData]
    
    public init(rings: [RingData]) {
        self.rings = rings
    }
    
    public var body: some View {
        ZStack {
            ForEach(Array(rings.enumerated()), id: \.element.id) { index, ring in
                // Each nested ring has a smaller radius
                let radius: CGFloat = 52 - CGFloat(index * 13)
                
                // Background Track
                Circle()
                    .stroke(ring.color.opacity(0.12), lineWidth: 8)
                    .frame(width: radius * 2, height: radius * 2)
                
                // Foreground Progress
                Circle()
                    .trim(from: 0.0, to: CGFloat(ring.progress))
                    .stroke(
                        ring.color,
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .frame(width: radius * 2, height: radius * 2)
                    .rotationEffect(Angle(degrees: -90))
                    .animation(.spring(response: 0.6, dampingFraction: 0.8), value: ring.progress)
            }
        }
    }
}

// Preview Provider
#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        MultiProgressRing(rings: [
            .init(label: "Tasks", progress: 0.75, color: .blue),
            .init(label: "Presence", progress: 0.88, color: .green),
            .init(label: "Pulse", progress: 0.40, color: .orange)
        ])
    }
}
