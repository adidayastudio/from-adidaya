import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
/** Native rendering of Lucide Focus and Minimize geometry (ISC license). */
export function FocusModeIcon({ active, color, size = 17 }: { active: boolean; color: string; size?: number }) {
    const paths = active ? ['M8 3v3a2 2 0 0 1-2 2H3', 'M21 8h-3a2 2 0 0 1-2-2V3', 'M3 16h3a2 2 0 0 1 2 2v3', 'M16 21v-3a2 2 0 0 1 2-2h3'] : ['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2'];
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{!active && <Circle cx={12} cy={12} r={3} />}{paths.map(d => <Path key={d} d={d} />)}</Svg>;
}
