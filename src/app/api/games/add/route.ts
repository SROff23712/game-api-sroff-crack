import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = "SROff23712";
const GITHUB_REPO = "game-api-sroff-crack";
const FILE_PATH = "public/games_updated.json";

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Action: Starting game add process`);

  try {
    if (!GITHUB_TOKEN) {
      console.error(`[${requestId}] Error: GITHUB_TOKEN is missing from environment variables`);
      return NextResponse.json(
        { error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    const newGame = await request.json();
    console.log(`[${requestId}] Action: Received new game data for "${newGame.title || 'Unknown'}"`);

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    // 1. Get current file content + SHA (needed to update)
    console.log(`[${requestId}] Action: Fetching current JSON from GitHub...`);
    const getRes = await fetch(apiUrl, { headers, cache: 'no-store' });
    
    if (!getRes.ok) {
      const err = await getRes.text();
      console.error(`[${requestId}] Error: GitHub fetch failed with status ${getRes.status}. Details: ${err}`);
      return NextResponse.json(
        { error: "Failed to fetch file from GitHub", detail: err, status: getRes.status },
        { status: 500 }
      );
    }
    
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    console.log(`[${requestId}] Action: Successfully fetched and decoded current file. Length: ${currentContent.length} bytes`);
    
    let games = [];
    try {
        games = JSON.parse(currentContent);
        console.log(`[${requestId}] Action: Parsed current JSON. Found ${games.length} games.`);
    } catch (parseErr) {
        const errorMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error(`[${requestId}] Error: JSON parse failed. Content start: ${currentContent.substring(0, 100)}`);
        throw new Error(`Failed to parse current JSON: ${errorMsg}`);
    }

    const sha = fileData.sha;

    // 2. Prepend the new game
    const updatedGames = [newGame, ...games];
    const updatedContent = Buffer.from(
      JSON.stringify(updatedGames, null, 2),
      "utf-8"
    ).toString("base64");
    console.log(`[${requestId}] Action: Prepared updated content (prepended new game).`);

    // 3. Commit the updated file back to GitHub
    console.log(`[${requestId}] Action: Committing changes to GitHub...`);
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
      console.error(`[${requestId}] Error: GitHub commit failed with status ${putRes.status}. Details: ${err}`);
      return NextResponse.json(
        { error: "Failed to commit file to GitHub", detail: err, status: putRes.status },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] Action: Successfully committed changes to GitHub. Process complete.`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Critical Error: ${message}`);
    return NextResponse.json(
      { error: "Failed to update JSON", detail: message },
      { status: 500 }
    );
  }
}
