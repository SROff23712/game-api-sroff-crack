const axios = require('axios');

async function test(appId) {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=french&cc=FR`;
    console.log(`Fetching: ${url}`);
    const response = await axios.get(url);
    console.log("Response data keys:", Object.keys(response.data));
    const data = response.data[appId];
    if (!data) {
      console.log(`No data for appId ${appId}`);
      return;
    }
    console.log("Success:", data.success);
    if (data.success) {
        const game = data.data;
        console.log("Game Title:", game.name);
        // console.log("Short Description:", game.short_description);
        console.log("PC Requirements Keys:", Object.keys(game.pc_requirements || {}));
    }
  } catch (error) {
    console.error("Error fetching steam details:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Body:", error.response.data);
    }
  }
}

// Test with Half-Life 2 (220) or Elden Ring (1245620)
const testId = process.argv[2] || "220";
test(testId);
