import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "SROff23712";
const GITHUB_REPO = process.env.GITHUB_REPO || "game-api-sroff-crack";
const FILE_PATH = "public/games_updated.json";

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Action: Starting game add process`);

  try {
    // Surface diagnostic info if token is missing
    if (!GITHUB_TOKEN) {
      console.error(`[${requestId}] Error: GITHUB_TOKEN is missing`);
      return NextResponse.json(
        { 
          error: "GITHUB_TOKEN not configured", 
          diagnostic: {
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            envSet: !!process.env.GITHUB_TOKEN
          }
        },
        { status: 501 } // Use 501 to distinguish from code errors
      );
    }

    const newGame = await request.json();
    console.log(`[${requestId}] Action: Received data for "${newGame.title || 'Unknown'}"`);

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    // 1. Get current file content + SHA
    console.log(`[${requestId}] Action: Fetching from GitHub: ${apiUrl}`);
    const getRes = await fetch(apiUrl, { headers, cache: 'no-store' });
    
    if (!getRes.ok) {
      const errText = await getRes.text();
      let detail = errText;
      try {
          const errJson = JSON.parse(errText);
          detail = errJson.message || errText;
      } catch (e) {}

      console.error(`[${requestId}] Error: GitHub fetch failed (${getRes.status}): ${detail}`);
      return NextResponse.json(
        { 
          error: "GitHub Fetch Failed", 
          status: getRes.status,
          detail: detail,
          diagnostic: {
            url: apiUrl,
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO
          }
        },
        { status: 502 }
      );
    }
    
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    
    let games = [];
    try {
        games = JSON.parse(currentContent);
        console.log(`[${requestId}] Action: Parsed ${games.length} games.`);
    } catch (parseErr) {
        const errorMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error(`[${requestId}] Error: JSON parse failed: ${errorMsg}`);
        return NextResponse.json(
            { error: "Invalid JSON in repo", detail: errorMsg },
            { status: 500 }
        );
    }

    const sha = fileData.sha;

    // 2. Prepend the new game
    const updatedGames = [newGame, ...games];
    const updatedContent = Buffer.from(
      JSON.stringify(updatedGames, null, 2),
      "utf-8"
    ).toString("base64");

    // 3. Commit back
    console.log(`[${requestId}] Action: Committing to GitHub...`);
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
      const errText = await putRes.text();
      let detail = errText;
      try {
          const errJson = JSON.parse(errText);
          detail = errJson.message || errText;
      } catch (e) {}

      console.error(`[${requestId}] Error: GitHub commit failed (${putRes.status}): ${detail}`);
      return NextResponse.json(
        { error: "GitHub Commit Failed", status: putRes.status, detail: detail },
        { status: 503 }
      );
    }

    console.log(`[${requestId}] Action: Success.`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Critical Error: ${message}`);
    return NextResponse.json(
      { error: "Internal Server Error", detail: message },
      { status: 500 }
    );
  }
}
