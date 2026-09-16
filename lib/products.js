// Product category → Product type mapping (Enquiries + Job cards).
// Add a new category by adding a key here with its list of product types —
// it will automatically appear in the Product category dropdown, and picking
// it will automatically filter the Product type list to just these options.
// A category with an empty list (no types given yet) behaves like "Other" —
// its Product type field is left unrestricted until a list is added.
export const PRODUCT_TYPE_MAP = {
  "Printing": [
    "Visiting Card",
    "Letterhead",
    "Bill Book",
    "Brochure",
    "Flyer",
    "Pamphlet",
    "Poster",
    "Invitation",
    "Certificate",
    "Booklet",
    "Digital Print",
  ],
  "Flex & Banner": [
    "Flex Banner",
    "Star Flex",
    "Backlit Flex",
    "Frontlit Flex",
    "Vinyl Banner",
  ],
  "Board Work": [
    "Foam Board",
    "Sunboard",
    "Acrylic Board",
    "ACP Board",
    "PVC Board",
    "MDF Board",
    "Fluted Board",
    "Glow Sign Board",
    "LED Board",
    "Name Board",
    "Shop Board",
    "Display Board",
    "Direction Board",
    "3D Letter",
    "Acrylic Name Board",
    "ACP Name Board",
    "Photo Board",
    "Mounting Board",
  ],
  "Sticker & Vinyl": [
    "Vinyl Sticker",
    "Die-Cut Sticker",
    "Label Sticker",
    "Transparent Sticker",
    "One-Way Vision",
    "Sun Control Film",
    "Wall Sticker",
    "Vehicle Sticker",
  ],
  "Photo Printing": [
    "Photo Print",
    "Canvas Print",
    "Photo Frame",
    "Photo Album",
    "Photo Collage",
  ],
  "Customized Gifts": [
    "Mug",
    "Magic Mug",
    "T-Shirt",
    "Keychain",
    "Cushion",
    "Bottle",
    "Photo Frame",
    "Name Plate",
    "Wooden Gift",
    "Personalized Gift",
  ],
  "ID Card & Accessories": [
    "PVC ID Card",
    "Smart ID Card",
    "ID Card Holder",
    "Lanyard",
    "Badge",
  ],
  // NOTE: no product type list supplied yet for this category — Product type
  // stays a free multi-select (like "Other") until one is added here.
  "Corporate Gifts": [],
  "Laser Cutting & Engraving": [
    "Acrylic Cutting",
    "MDF Cutting",
    "Acrylic Engraving",
    "MDF Engraving",
    "Name Cut",
    "Letter Cut",
  ],
  "Promotional Products": [
    "Standee",
    "Roll-up Standee",
    "Poster",
    "Table Calendar",
    "Corporate Gift",
    "Promotional Board",
  ],
  "Packaging": [
    "Paper Bag",
    "Product Label",
    "Packaging Sticker",
    "Product Tag",
    "Thank You Card",
    "Box Printing",
  ],
  "Outdoor / Indoor Branding": [
    "Wall Branding",
    "Glass Branding",
    "Vehicle Branding",
    "Shop Branding",
    "Installation Work",
  ],
  // NOTE: no product type list supplied yet for this category — Product type
  // stays a free multi-select (like "Other") until one is added here.
  "Miscellaneous / Other Services": [],
};

// Product category dropdown options (named categories + "Other" for anything not listed yet)
export const PRODUCT_CATEGORIES = [...Object.keys(PRODUCT_TYPE_MAP), "Other"];

// Product types mapped to a given category. Returns [] for an unrecognised /
// custom ("Other") category, or one that has no list yet — callers treat
// that as "no restriction".
export function productTypesForCategory(category) {
  return PRODUCT_TYPE_MAP[category] || [];
}
