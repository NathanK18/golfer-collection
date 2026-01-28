export const STORAGE_KEY = "pgaGolfers_v1";

// Returns an array of golfer data
export function getSeedGolfers() {
  const now = Date.now();
  const mk = (name, country, age, worldRank, winsPga, majorWins, fedexRank) => ({
    id: `g_${Math.floor(Math.random() * 1e9)}_${Math.floor(Math.random() * 1e9)}`,
    name,
    country,
    age,
    worldRank,
    winsPga,
    majorWins,
    fedexRank,
    updatedAt: now
  });

  // golfer data
  return [
    mk("Scottie Scheffler", "USA", 27, 1, 9, 2, 1),
    mk("Rory McIlroy", "NIR", 34, 2, 24, 4, 6),
    mk("Jon Rahm", "ESP", 29, 3, 11, 2, 9),
    mk("Xander Schauffele", "USA", 30, 4, 7, 0, 3),
    mk("Viktor Hovland", "NOR", 26, 5, 6, 0, 2),
    mk("Patrick Cantlay", "USA", 31, 6, 8, 0, 7),
    mk("Collin Morikawa", "USA", 27, 7, 6, 2, 10),
    mk("Ludvig Åberg", "SWE", 24, 8, 1, 0, 14),
    mk("Justin Thomas", "USA", 30, 9, 15, 2, 18),
    mk("Jordan Spieth", "USA", 30, 10, 13, 3, 22),

    mk("Brooks Koepka", "USA", 33, 11, 9, 5, 30),
    mk("Dustin Johnson", "USA", 39, 12, 24, 2, 40),
    mk("Max Homa", "USA", 33, 13, 6, 0, 15),
    mk("Tony Finau", "USA", 34, 14, 6, 0, 16),
    mk("Tommy Fleetwood", "ENG", 32, 15, 0, 0, 19),
    mk("Cameron Smith", "AUS", 30, 16, 6, 1, 25),
    mk("Hideki Matsuyama", "JPN", 31, 17, 9, 1, 20),
    mk("Wyndham Clark", "USA", 30, 18, 3, 1, 8),
    mk("Matt Fitzpatrick", "ENG", 29, 19, 2, 1, 24),
    mk("Tyrrell Hatton", "ENG", 32, 20, 1, 0, 27),

    mk("Jason Day", "AUS", 36, 21, 13, 1, 35),
    mk("Bryson DeChambeau", "USA", 30, 22, 8, 1, 29),
    mk("Sungjae Im", "KOR", 25, 23, 2, 0, 17),
    mk("Sam Burns", "USA", 27, 24, 5, 0, 21),
    mk("Shane Lowry", "IRL", 36, 25, 2, 1, 26),
    mk("Keegan Bradley", "USA", 37, 26, 6, 1, 23),
    mk("Justin Rose", "ENG", 43, 27, 11, 1, 38),
    mk("Rickie Fowler", "USA", 35, 28, 6, 0, 33),
    mk("Corey Conners", "CAN", 32, 29, 2, 0, 28),
    mk("Sepp Straka", "AUT", 30, 30, 2, 0, 31),
  ];
}

// seed local storage if needed
export function seedIfNeeded() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return false;

  const seed = getSeedGolfers();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return true;
}
