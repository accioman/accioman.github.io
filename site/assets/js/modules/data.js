const PORTFOLIO_PATH = "./assets/data/site-data.json";
const LINKEDIN_PATH = "./assets/data/linkedin-profile.json";

function normalizeKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeKeys(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key.length ? `${key[0].toLowerCase()}${key.slice(1)}` : key,
        normalizeKeys(entry)
      ])
    );
  }

  return value;
}

export async function loadPayload() {
  const portfolioResponse = await fetch(PORTFOLIO_PATH);
  if (!portfolioResponse.ok) {
    throw new Error(`Impossibile caricare ${PORTFOLIO_PATH}`);
  }

  const portfolio = normalizeKeys(await portfolioResponse.json());
  let linkedin = null;

  try {
    const linkedinResponse = await fetch(LINKEDIN_PATH);
    if (linkedinResponse.ok) {
      linkedin = normalizeKeys(await linkedinResponse.json());
    }
  } catch {
    linkedin = null;
  }

  return { portfolio, linkedin };
}
