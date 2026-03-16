import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("it");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    // Search using Steam Store Search API
    const response = await axios.get(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        query
      )}&l=french&cc=FR`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Steam search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
