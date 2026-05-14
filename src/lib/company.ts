import logo from "@/assets/spag-logo.jpg";

const KEY = "spag.company.v1";

export interface CompanyProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gst_number: string;
  logo_url: string; // can be data: URL or remote URL
}

export const defaultCompany: CompanyProfile = {
  name: "SPAG Eagle Global Private Limited",
  tagline: "Pure Water. Pure Promise.",
  address: "No.1, Oulgaret (Uzhavarkarai) Main Road, Mettupalayam, Puducherry 605009",
  phone: "6383975781 / 8870832121",
  email: "info@spagglobal.com",
  website: "spagglobal.com",
  gst_number: "",
  logo_url: logo,
};

export function loadCompany(): CompanyProfile {
  if (typeof window === "undefined") return defaultCompany;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultCompany;
    return { ...defaultCompany, ...JSON.parse(raw) };
  } catch {
    return defaultCompany;
  }
}

export function saveCompany(profile: CompanyProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}
