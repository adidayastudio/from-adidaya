import { Redirect, useLocalSearchParams } from 'expo-router';
export default function LegacyProjectRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <Redirect href={{ pathname: '/project-details/[id]', params: { id } }} />; }
