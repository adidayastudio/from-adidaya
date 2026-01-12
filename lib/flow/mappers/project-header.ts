import { Project } from "@/components/flow/projects/data";
// DbProject interface based on supabase schema
export interface DbProject {
    id: string;
    project_number: string;
    project_code: string;
    project_name: string;
    status: string;
    stage?: string; // Optional if not always present
    meta: Record<string, any> | null;
    location: Record<string, any> | null;
}

export function mapProjectToHeader(project: DbProject) {
    const meta = project.meta as any;
    const location = project.location as any;

    return {
        id: project.id,
        projectNo: project.project_number,
        code: project.project_code,
        name: project.project_name,
        status: project.status,
        stage: project.stage || "01-KO", // Default to Kickoff if pending

        // Meta fields
        progress: meta?.progress ?? 0,
        type: meta?.type ?? "design-build",
        client: meta?.clientName,
        landArea: meta?.landArea,
        buildingArea: meta?.buildingArea,
        floors: meta?.floors,
        rabClass: meta?.rabClass,

        // Location fields
        address: location?.address,
        city: location?.city,
        province: location?.province,
    };
}
