// Machine → Work type mapping for the Production department.
// Add a new machine by adding a key here with its list of work types —
// it will automatically appear in the Machine type dropdown, and picking
// it will automatically filter the Work type list to just these options.
export const MACHINE_WORKTYPE_MAP = {
  "Konica Minolta bizhub PRESS C1060": [
    "Digital Printing",
    "Colour Printing",
    "Photo Printing",
    "Visiting Card Printing",
    "Brochure Printing",
    "Flyer Printing",
    "Invitation Card Printing",
    "Certificate Printing",
    "Sticker Printing",
    "Booklet Printing",
  ],
  "Saga Die Cut & Scoring Machine": [
    "Die Cutting",
    "Creasing / Scoring",
    "Box Making",
    "Paper Cutting",
    "Shape Cutting",
    "Packaging Cutting",
  ],
  "IDP Smart-51 – ID Card Printer": [
    "PVC ID Card Printing",
    "ID Card Printing",
    "Employee ID Card Printing",
    "Student ID Card Printing",
    "Membership Card Printing",
    "PVC Card Printing",
  ],
  "Cutting Machine": [
    "Paper Cutting",
    "Board Cutting",
    "Vinyl Cutting",
    "Sheet Cutting",
    "Card Cutting",
    "Fabric Cutting",
  ],
  "GBT FM-360 – Lamination Machine": [
    "Hot Lamination",
    "Cold Lamination",
    "Film Lamination",
    "Sheet Lamination",
    "Document Lamination",
    "Photo Lamination",
  ],
  "Epson L130 – Sublimation Printer": [
    "Sublimation Printing",
    "Mug Printing",
    "T-Shirt Printing",
    "Keychain Printing",
    "Cushion Printing",
    "Photo Frame Printing",
    "Sublimation Sheet Printing",
  ],
  "Metalam-12 – ID Card Lamination": [
    "ID Card Lamination",
    "PVC Card Lamination",
    "Card Overlay Lamination",
  ],
  "Coil & Wire 3:1 – SW2500A": [
    "Wiro Binding",
    "Spiral Binding",
    "Coil Binding",
    "Calendar Binding",
    "Notebook Binding",
    "Book Binding",
  ],
  "Bio-Sphere – Self-Inking Stamp Machine": [
    "Rubber Stamp Making",
    "Self-Inking Stamp Making",
    "Office Stamp Making",
    "Name Stamp Making",
    "Date Stamp Making",
  ],
  "GZSTRFIRE25PL – Solvent Machine": [
    "Solvent Printing",
    "Outdoor Vinyl Printing",
    "Flex Printing",
    "Banner Printing",
    "Sticker Printing",
    "Large Format Printing",
  ],
  "Eco Solvent Machine": [
    "Eco-Solvent Printing",
    "Vinyl Printing",
    "Sticker Printing",
    "One-Way Vision Printing",
    "Poster Printing",
    "Outdoor Signage Printing",
  ],
  "Vinyl Lamination Machine": [
    "Vinyl Lamination",
    "Sticker Lamination",
    "Cold Lamination",
    "Outdoor Vinyl Lamination",
    "One-Way Vision Lamination",
  ],
  "T-Shirt & Mug Printing Sublimation Machine": [
    "T-Shirt Sublimation",
    "Mug Sublimation",
    "Sublimation Gift Printing",
    "Custom T-Shirt Printing",
    "Custom Mug Printing",
  ],
  "Laser Pro Machine": [
    "Laser Cutting",
    "Laser Engraving",
    "Acrylic Cutting",
    "MDF Cutting",
    "Wood Cutting",
    "Acrylic Engraving",
    "Wood Engraving",
  ],
  "Laser Plus Machine": [
    "Laser Cutting",
    "Laser Engraving",
    "Acrylic Cutting",
    "MDF Cutting",
    "Wood Cutting",
    "Acrylic Engraving",
    "Wood Engraving",
  ],
  "Acrylic Bending Machine": [
    "Acrylic Bending",
    "Acrylic Box Making",
    "Acrylic Stand Making",
    "Acrylic Display Making",
    "Acrylic Letter Bending",
  ],
  "DTF UV Machine": [
    "UV DTF Printing",
    "UV DTF Sticker Printing",
    "Hard Surface Printing",
    "Customized Product Printing",
    "Acrylic Printing",
    "Glass Printing",
    "Metal Printing",
    "Gift Product Printing",
  ],
  "Metal Marking Machine": [
    "Metal Engraving",
    "Metal Marking",
    "Stainless Steel Marking",
    "Aluminium Marking",
    "Metal Name Plate Marking",
    "Metal Tag Marking",
  ],
  "Sky Cut Cutting Plotter – Die Cut Machine": [
    "Vinyl Cutting",
    "Sticker Cutting",
    "Die Cutting",
    "Label Cutting",
    "Plotter Cutting",
    "Shape Cutting",
    "Heat Transfer Vinyl Cutting",
  ],
  "Banner Hilite Machine": [
    "Banner Printing",
    "Flex Printing",
    "Large Format Printing",
    "Outdoor Printing",
    "Banner Finishing",
    "Eyelet / Ring Fixing",
  ],
};

// Machine type dropdown options (named machines + "Other" for anything not listed yet)
export const MACHINE_TYPES = [...Object.keys(MACHINE_WORKTYPE_MAP), "Other"];

// Work types mapped to a given machine name. Returns [] for an unrecognised /
// custom ("Other") machine name — callers treat that as "no restriction".
export function workTypesForMachine(machine) {
  return MACHINE_WORKTYPE_MAP[machine] || [];
}
