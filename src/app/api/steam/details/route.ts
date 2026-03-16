import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "Missing appId" }, { status: 400 });
  }

  try {
    console.log("Fetching Steam details for appId:", appId);
    const response = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=french&cc=FR`
    );

    if (!response.data || !response.data[appId]) {
      console.error("Steam API returned invalid structure:", response.data);
      return NextResponse.json({ error: "Invalid response from Steam" }, { status: 502 });
    }

    const data = response.data[appId];

    if (!data.success) {
      console.warn("Steam API success=false for appId:", appId);
      return NextResponse.json({ error: "Game not found or restricted" }, { status: 404 });
    }

    const game = data.data;

    // Formatting according to the requested JSON structure
    const formattedGame = {
      title: game.name || "Titre inconnu",
      image: game.header_image || "",
      description: game.short_description || game.about_the_game || "",
      screenshots: game.screenshots?.map((s: any) => s.path_full).slice(0, 6) || [],
      videos: game.movies?.map((m: any) => m.mp4?.max || m.webm?.max || "").filter(Boolean) || [],
      dl: [], // Will be filled by frontend
      release_date: game.release_date?.date || "Date inconnue",
      size: "", // Need to extract or let user input
      min_requirements: parseRequirements(game.pc_requirements?.minimum),
      recommended_requirements: parseRequirements(game.pc_requirements?.recommended),
      online: game.categories?.some((c: any) =>
        c.description.toLowerCase().includes("multiplayer") ||
        c.description.toLowerCase().includes("multijoueur") ||
        c.description.toLowerCase().includes("online")
      ) || false,
      categories: game.genres?.map((g: any) => g.description) || [],
    };

    return NextResponse.json(formattedGame);
  } catch (error: any) {
    console.error("Steam details error:", error.message);
    if (error.response) {
      console.error("Steam API status:", error.response.status);
      console.error("Steam API data:", error.response.data);
    }
    return NextResponse.json({
      error: "Failed to fetch details",
      details: error.message
    }, { status: 500 });
  }
}

function parseRequirements(html: string) {
  if (!html) return {};
  const reqs: any = {};

  // Basic scraping of the HTML requirements string
  // Remove HTML tags but keep some structure
  const cleanHtml = html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ");

  const mapping: any = {
    "OS": ["Système d'exploitation", "OS"],
    "Processeur": ["Processeur", "Processor"],
    "Memoire": ["Mémoire vive", "Memory"],
    "Graphics": ["Graphiques", "Graphics"],
    "Storage": ["Espace disque", "Storage"],
    "DirectX": ["DirectX"],
  };

  for (const [label, patterns] of Object.entries(mapping)) {
    for (const pattern of (patterns as string[])) {
      // Look for the pattern followed by optional colon/space
      const regex = new RegExp(`${pattern}[\\s\\u00A0]*[:：]\\s*(.*?)(?=\\s+(?:Système|Processeur|Mémoire|Graphiques|Espace|DirectX|OS|Processor|Memory|Graphics|Storage|$))`, "i");
      const match = cleanHtml.match(regex);
      if (match && match[1]) {
        reqs[label] = match[1].trim();
        break;
      }
    }
  }

  return reqs;
}