import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = "SROff23712";
const GITHUB_REPO = "game-api-sroff-crack";
const FILE_PATH = "public/games_updated.json";

export async function POST(request: Request) {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    const newGame = await request.json();

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    // 1. Get current file content + SHA (needed to update)
    const getRes = await fetch(apiUrl, { headers });
    if (!getRes.ok) {
      const err = await getRes.text();
      return NextResponse.json(
        { error: "Failed to fetch file from GitHub", detail: err },
        { status: 500 }
      );
    }
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const games = JSON.parse(currentContent);
    const sha = fileData.sha;

    // 2. Prepend the new game
    const updatedGames = [newGame, ...games];
    const updatedContent = Buffer.from(
      JSON.stringify(updatedGames, null, 2),
      "utf-8"
    ).toString("base64");

    // 3. Commit the updated file back to GitHub
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add game: ${newGame.title ?? "unknown"}`,
        content: updatedContent,
        sha,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      return NextResponse.json(
        { error: "Failed to commit file to GitHub", detail: err },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Add game error:", message);
    return NextResponse.json(
      { error: "Failed to update JSON", detail: message },
      { status: 500 }
    );
  }
}
