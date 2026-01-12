import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  return NextResponse.json({
    projects: [{ title: "Precision Gym", subtitle: "Project" }],
    tasks: [],
    documents: [],
    people: [],
    expenses: [],
  });
}
