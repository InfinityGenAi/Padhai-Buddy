import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/InfinityGenAi/Padhai-Buddy/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 3600 },
      },
    );

    if (response.status === 404) {
      // No GitHub release is published yet. This is a valid empty state,
      // not an API failure: the download page can show PWA installation steps.
      return NextResponse.json({ message: "No published release found", assets: [] }, { status: 200 });
    }
    if (!response.ok) {
      console.error("[RELEASES] GitHub API returned", response.status);
      return NextResponse.json({ error: "Unable to load release information" }, { status: 502 });
    }

    const release: unknown = await response.json();
    if (!release || typeof release !== "object" || !("assets" in release) || !Array.isArray(release.assets)) {
      return NextResponse.json({ error: "Invalid release metadata" }, { status: 502 });
    }

    return NextResponse.json(release, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[RELEASES] Failed to fetch GitHub release", error);
    return NextResponse.json({ error: "Release service is temporarily unavailable" }, { status: 502 });
  }
}
