import { redirect } from "next/navigation";

export default function MyProjectsPage() {
  redirect("/dashboard/projects/overview");
}
