export interface BuildingMass { code: string; name: string; buildingArea: string; floors: string; isSiteWork?: boolean; [key: string]: any; }
export interface ProjectInformationDetails {
    location: Record<string, any>;
    currentStage: string;
    category: string; disciplines: string[]; landArea: string; buildingArea: string; floors: string; rabClass: string;
    buildingMassCount: number; buildingMasses: BuildingMass[]; clientName: string; clientContact: string;
}
export function parseProjectLocation(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value };
    if (typeof value === 'string' && value.trim()) {
        try { const parsed = JSON.parse(value); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed; } catch { /* A legacy plain address is valid. */ }
        return { address: value };
    }
    return {};
}
export function projectInformationDetails(project: any): ProjectInformationDetails {
    const meta = project?.meta || {}, count = project?.buildingMassCount ?? meta.buildingMassCount ?? 1;
    const stored = [project?.buildingMasses, meta.buildingMasses].find(value => Array.isArray(value) && value.length > 0) || [];
    const masses = stored.map((mass: any) => ({ ...mass, buildingArea: String(mass.buildingArea ?? ''), floors: String(mass.floors ?? '') }));
    const effectiveCount = Math.max(Number(count), masses.filter((mass: BuildingMass) => !mass.isSiteWork).length);
    return {
        currentStage: String(project?.currentStage ?? meta.currentStage ?? meta.stage ?? ''),
        location: parseProjectLocation(project?.locationDetails ?? project?.location), category: meta.category ?? '',
        disciplines: Array.isArray(meta.disciplines) ? [...meta.disciplines] : [],
        landArea: String(meta.landArea ?? ''), buildingArea: String(meta.buildingArea ?? ''), floors: String(meta.floors ?? ''), rabClass: meta.rabClass ?? '',
        buildingMassCount: effectiveCount, buildingMasses: resizeBuildingMasses(masses, effectiveCount, meta.buildingArea, meta.floors),
        clientName: meta.clientName ?? '', clientContact: meta.clientContact ?? '',
    };
}
export function resizeBuildingMasses(masses: BuildingMass[], count: number, area = '', floors = ''): BuildingMass[] {
    if (!Number.isInteger(count) || count < 1 || count > 25) throw new Error('Building mass count must be between 1 and 25.');
    const buildings = masses.filter(mass => !mass.isSiteWork);
    return [...Array.from({ length: count }, (_, index) => ({ ...buildings[index], code: String.fromCharCode(65 + index), name: buildings[index]?.name || (count === 1 ? 'Main Building' : `Building ${String.fromCharCode(65 + index)}`), buildingArea: buildings[index]?.buildingArea ?? (index === 0 ? String(area ?? '') : ''), floors: buildings[index]?.floors ?? (index === 0 ? String(floors ?? '') : '') })),
        { ...masses.find(mass => mass.isSiteWork), code: String.fromCharCode(65 + count), name: masses.find(mass => mass.isSiteWork)?.name || 'External Works & Infrastructure (Site Work)', buildingArea: masses.find(mass => mass.isSiteWork)?.buildingArea || '', floors: masses.find(mass => mass.isSiteWork)?.floors || '', isSiteWork: true }];
}
export function validateProjectInformation(details: ProjectInformationDetails) {
    for (const [label, value] of [['Land area', details.landArea], ['Building area', details.buildingArea], ['Floors', details.floors]] as const) {
        if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`${label} must be a non-negative number.`);
    }
    for (const [key, limit] of [['latitude', 90], ['longitude', 180]] as const) {
        const value = String(details.location[key] ?? '').trim();
        if (value && (!Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit)) throw new Error(`Invalid ${key}.`);
    }
    if (!Number.isInteger(details.buildingMassCount) || details.buildingMassCount < 1 || details.buildingMassCount > 25) throw new Error('Building mass count must be between 1 and 25.');
    for (const mass of details.buildingMasses) {
        if (!mass.name.trim()) throw new Error('Every building mass must have a name.');
        for (const value of [mass.buildingArea, mass.floors]) if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error('Building mass area and floors must be non-negative numbers.');
    }
}

export function currentStageCode(value: string | undefined, codes: string[]): string | undefined {
    if (!value?.trim()) return codes[0]; // Same initial Kickoff stage as the legacy header.
    const normalize = (code: string) => code.trim().toUpperCase().replace(/^\d+[-.\s]*/, '');
    return codes.find(code => code.toUpperCase() === value.trim().toUpperCase() || normalize(code) === normalize(value));
}
