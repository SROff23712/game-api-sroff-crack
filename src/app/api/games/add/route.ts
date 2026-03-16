import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  // Simplified for user preference: no backend session check to avoid complex setup.
  // We assume the frontend protection is sufficient for this local tool.
  
  try {
    const newGame = await request.json();
    const filePath = path.join(process.cwd(), "games_updated.json");

    const fileData = await fs.readFile(filePath, "utf-8");
    const games = JSON.parse(fileData);

    const updatedGames = [newGame, ...games];

    await fs.writeFile(filePath, JSON.stringify(updatedGames, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add game error:", error);
    return NextResponse.json({ error: "Failed to update JSON" }, { status: 500 });
  }
}
