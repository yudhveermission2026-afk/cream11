export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.cricapi.com/v1/matches?apikey=318b004a-8b94-45af-8dd8-6581499af004&offset=0"
    );

    const json = await response.json();
    const all = Array.isArray(json.data) ? json.data : [];

    const IPL_TEAMS = [
      "chennai super kings","mumbai indians","royal challengers bengaluru","royal challengers bangalore",
      "kolkata knight riders","sunrisers hyderabad","rajasthan royals","delhi capitals",
      "punjab kings","lucknow super giants","gujarat titans"
    ];

    const INTL_TEAMS = [
      "india","australia","england","south africa","new zealand","pakistan","sri lanka",
      "bangladesh","afghanistan","west indies","ireland","scotland","netherlands",
      "zimbabwe","nepal","namibia","oman","usa","canada","uae","united arab emirates"
    ];

    const EXCLUDE = [
      "u19","women","academy","club","a team","2nd xi","district","university",
      "ranji","county","sheffield shield","plunket"
    ];

    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);

    function safeLower(v) {
      return (v || "").toString().toLowerCase();
    }

    function getMatchDate(match) {
      const raw = match.dateTimeGMT || match.date || match.dateTime || "";
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    function isExcluded(haystack) {
      return EXCLUDE.some(x => haystack.includes(x));
    }

    function isIPL(match, haystack, teams) {
      if (haystack.includes("ipl")) return true;
      const iplCount = teams.filter(t => IPL_TEAMS.includes(t)).length;
      return iplCount >= 2;
    }

    function isInternational(match, haystack, teams) {
      const intlCount = teams.filter(t => INTL_TEAMS.includes(t)).length;
      const intlKeywords = ["test", "odi", "t20i", "international", "champions trophy", "world cup", "asia cup"];
      const hasIntlKeyword = intlKeywords.some(k => haystack.includes(k));
      return intlCount >= 2 || (intlCount >= 1 && hasIntlKeyword);
    }

    function includeByTime(match, matchDate) {
      const state = safeLower(match.status);
      const ended = match.matchEnded === true || state.includes("won by") || state.includes("match over") || state.includes("completed");
      if (ended) {
        return matchDate && matchDate >= twoDaysAgo;
      }
      return true;
    }

    const filtered = all.filter(match => {
      const teams = [
        ...(Array.isArray(match.teams) ? match.teams : []),
        ...((Array.isArray(match.teamInfo) ? match.teamInfo : []).map(t => t?.name || ""))
      ].map(safeLower).filter(Boolean);

      const haystack = [safeLower(match.name), safeLower(match.venue), ...teams].join(" | ");
      if (isExcluded(haystack)) return false;

      const wanted = isIPL(match, haystack, teams) || isInternational(match, haystack, teams);
      if (!wanted) return false;

      const matchDate = getMatchDate(match);
      return includeByTime(match, matchDate);
    });

    filtered.sort((a, b) => {
      const da = getMatchDate(a)?.getTime() || 0;
      const db = getMatchDate(b)?.getTime() || 0;
      return da - db;
    });

    res.status(200).json({
      total: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch filtered matches" });
  }
}
