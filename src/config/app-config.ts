import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "VPPA Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, VPPA Fashions.`,
  meta: {
    title: "VPPA Admin - Luxury Menswear Backoffice",
    description: "VPPA Fashions admin dashboard for managing products, collections, and orders.",
  },
};
