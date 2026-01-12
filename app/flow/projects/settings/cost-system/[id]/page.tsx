
import SettingsDetailClient from "./SettingsDetailClient";

export default async function Page(props: { params: Promise<{ id: string }> | { id: string } }) {
    // Resolve params which might be a promise (Next.js 15) or an object (Next.js 14)
    const params = await props.params;
    const { id } = params;

    return <SettingsDetailClient id={id} />;
}
