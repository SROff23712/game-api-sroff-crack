import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] --- NEW REQUEST RECEIVED ---`);

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER || "SROff23712";
  const GITHUB_REPO = process.env.GITHUB_REPO || "game-api-sroff-crack";
  const FILE_PATH = "public/games_updated.json";

  const diagnostics: any = {
    tokenPresent: !!GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    filePath: FILE_PATH,
  };

  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "Configuration Error: GITHUB_TOKEN is missing.", diagnostics },
        { status: 501 }
      );
    }

    let newGame;
    try {
      newGame = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body", diagnostics },
        { status: 400 }
      );
    }

    const branch = "master";
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const urlWithBranch = `${apiUrl}?ref=${branch}`;
    
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "NextJS-App-Route"
    };

    diagnostics.branch = branch;

    // 1. Get metadata and SHA
    console.log(`[${requestId}] Action: Fetching metadata from ${urlWithBranch}`);
    const metaRes = await fetch(urlWithBranch, { headers, cache: 'no-store' });
    
    if (!metaRes.ok) {
        const errText = await metaRes.text();
        return NextResponse.json(
          { error: "GitHub API: Failed to fetch metadata.", githubStatus: metaRes.status, githubError: errText, diagnostics },
          { status: 502 }
        );
    }
    
    const fileData = await metaRes.json();
    const sha = fileData.sha;
    diagnostics.sha = sha;

    // 2. Get the actual content (large files > 1MB don't include it in metadata)
    let currentContent = "";
    if (fileData.content) {
        console.log(`[${requestId}] Action: Content found in metadata, decoding...`);
        currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    } else {
        console.log(`[${requestId}] Action: Large file detected. Fetching raw from ${urlWithBranch}`);
        const rawRes = await fetch(urlWithBranch, { 
            headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
            cache: 'no-store'
        });
        
        if (!rawRes.ok) {
            const errText = await rawRes.text();
            return NextResponse.json(
              { error: "GitHub API: Failed to fetch raw content.", githubStatus: rawRes.status, githubError: errText, diagnostics },
              { status: 502 }
            );
        }
        currentContent = await rawRes.text();
    }
    
    console.log(`[${requestId}] Action: Content fetched. Length: ${currentContent.length} chars.`);

    // 3. Prepend the new game
    let games = [];
    try {
        games = JSON.parse(currentContent);
        console.log(`[${requestId}] Action: Parsed ${games.length} games.`);
    } catch (parseErr: any) {
        console.error(`[${requestId}] Error: Repo JSON parse fail: ${parseErr.message}`);
        return NextResponse.json(
            { error: "The JSON file in the repository is malformed.", detail: parseErr.message, diagnostics },
            { status: 500 }
        );
    }

    const updatedGames = [newGame, ...games];
    const updatedContent = Buffer.from(
      JSON.stringify(updatedGames, null, 2),
      "utf-8"
    ).toString("base64");

    // 4. Commit back
    console.log(`[${requestId}] Action: Committing to ${apiUrl} (branch: ${branch})`);
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add game: ${newGame.title ?? "unknown"}`,
        content: updatedContent,
        sha,
        branch
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return NextResponse.json(
        { error: "GitHub API: Failed to save changes.", githubStatus: putRes.status, githubError: errText, diagnostics },
        { status: 503 }
      );
    }

    console.log(`[${requestId}] Success: Game added effectively.`);
    return NextResponse.json({ success: true, diagnostics });
  } catch (error: any) {
    console.error(`[${requestId}] CRITICAL ERROR: ${error.message}`);
    return NextResponse.json(
      { error: "Internal Server Error", detail: error.message, stack: error.stack, diagnostics },
      { status: 500 }
    );
  }
}
