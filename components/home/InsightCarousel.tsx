import { ScrollView, StyleSheet, View } from 'react-native';
import { ActionStatusCard, ProjectProgressCard, TaskPulseCard } from './InsightCards';

export function InsightCarousel() {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={280 + 16} // card width + margin
            >
                <TaskPulseCard />
                <ProjectProgressCard />
                <ActionStatusCard />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
});
