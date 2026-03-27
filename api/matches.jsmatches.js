export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.cricapi.com/v1/currentMatches?apikey=318b004a-8b94-45af-8dd8-6581499af004"
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
}
