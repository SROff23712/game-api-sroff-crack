import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] --- NEW REQUEST RECEIVED ---`);

  // Config variables inside the handler to ensure they are fresh
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "SROff23712";
  const GITHUB_REPO = process.env.GITHUB_REPO || "game-api-sroff-crack";
  const FILE_PATH = "public/games_updated.json";

  const diagnostics = {
    tokenPresent: !!GITHUB_TOKEN,
    tokenLength: GITHUB_TOKEN ? GITHUB_TOKEN.length : 0,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    filePath: FILE_PATH,
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k => k.includes("GIT") || k.includes("AUTH"))
  };

  try {
    if (!GITHUB_TOKEN) {
      console.error(`[${requestId}] Error: GITHUB_TOKEN missing`);
      return NextResponse.json(
        { error: "Configuration Error: GITHUB_TOKEN is missing on Vercel.", diagnostics },
        { status: 501 }
      );
    }

    // Try to parse JSON body
    let newGame;
    try {
      newGame = await request.json();
    } catch (e) {
      console.error(`[${requestId}] Error: Failed to parse request body as JSON`);
      return NextResponse.json(
        { error: "Invalid JSON in request body", diagnostics },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Action: Adding game "${newGame.title || 'Unknown'}"`);

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "NextJS-App-Route"
    };

    // 1. Get current file content + SHA
    console.log(`[${requestId}] Action: Fetching from GitHub...`);
    const getRes = await fetch(apiUrl, { headers, cache: 'no-store' });
    
    if (!getRes.ok) {
      const errText = await getRes.text();
      console.error(`[${requestId}] GitHub Fetch Error (${getRes.status}): ${errText}`);
      return NextResponse.json(
        { 
          error: "GitHub API: Failed to fetch file content.", 
          githubStatus: getRes.status,
          githubError: errText,
          diagnostics 
        },
        { status: 502 }
      );
    }
    
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const sha = fileData.sha;
    
    let games = [];
    try {
        games = JSON.parse(currentContent);
        console.log(`[${requestId}] Success: Fetched ${games.length} games.`);
    } catch (parseErr) {
        console.error(`[${requestId}] Error: Repo JSON parse fail`);
        return NextResponse.json(
            { error: "The JSON file in the repository is malformed.", diagnostics },
            { status: 500 }
        );
    }

    // 2. Prepend the new game
    const updatedGames = [newGame, ...games];
    const updatedContent = Buffer.from(
      JSON.stringify(updatedGames, null, 2),
      "utf-8"
    ).toString("base64");

    // 3. Commit back
    console.log(`[${requestId}] Action: Sending update to GitHub...`);
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
      console.error(`[${requestId}] GitHub Commit Error (${putRes.status}): ${errText}`);
      return NextResponse.json(
        { 
          error: "GitHub API: Failed to save changes.", 
          githubStatus: putRes.status,
          githubError: errText,
          diagnostics 
        },
        { status: 503 }
      );
    }

    console.log(`[${requestId}] Success: Game added.`);
    return NextResponse.json({ success: true, diagnostics });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;
    console.error(`[${requestId}] CRITICAL ERROR: ${message}`);
    return NextResponse.json(
      { error: "Internal Server Error", detail: message, stack, diagnostics },
      { status: 500 }
    );
  }
}
