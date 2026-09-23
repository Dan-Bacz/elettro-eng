export const COMPANY = {
  name: "ELETTRO",
  tagline: "Engineering Enterprises",
  phone: "0961 234 5678",
  email: "info@elettro.com",
  address: "Zamboanga Del Sur, Philippines",
  hours: "Mon – Sat: 8:00 AM – 6:00 PM",
  facebook: "#",
  instagram: "#",
}

export type Service = {
  slug: string
  title: string
  icon: string
  short: string
  description: string
  features: string[]
  offerings: string[]
}

export const SERVICES: Service[] = [
  {
    slug: "electrical-installation",
    title: "Electrical Installation",
    icon: "⚡",
    short:
      "Complete electrical installation for residential, commercial, and industrial buildings.",
    description:
      "We design and install complete electrical systems that meet local codes and safety standards. From new construction wiring to tenant improvements, our licensed electricians handle everything from service panels and circuits to outlets, switches, and appliances.",
    features: [
      "Residential & commercial wiring",
      "Service panel installation",
      "Circuit and outlet installation",
      "Code-compliant workmanship",
    ],
    offerings: [
      "Household Wiring",
      "Residential Wiring",
      "Commercial Wiring",
      "Service Panel Installation",
      "Circuit Breaker Installation",
      "Outlet & Switch Installation",
      "Lighting Installation",
      "Appliance Wiring",
      "Electrical Rewiring",
    ],
  },
  {
    slug: "electrical-maintenance",
    title: "Electrical Maintenance",
    icon: "🔧",
    short:
      "Preventive maintenance programs that keep your systems reliable year-round.",
    description:
      "Regular maintenance prevents costly breakdowns. Our teams perform scheduled inspections, testing, and servicing of your electrical infrastructure so you stay safe, compliant, and running without interruption.",
    features: [
      "Scheduled inspections",
      "Thermographic scanning",
      "Panel and breaker servicing",
      "Preventive maintenance plans",
    ],
    offerings: [
      "Preventive Maintenance",
      "Electrical Inspection",
      "Panel Inspection",
      "Circuit Testing",
      "Equipment Maintenance",
      "Wiring Inspection",
    ],
  },
  {
    slug: "electrical-repair",
    title: "Electrical Repair",
    icon: "🛠️",
    short:
      "Fast, dependable repairs for faults, outages, and defective equipment.",
    description:
      "When something goes wrong, we respond fast. Our technicians diagnose and repair electrical faults, tripping breakers, power outages, and defective components with precision and minimal downtime.",
    features: [
      "Fault diagnosis",
      "Emergency call-outs",
      "Breaker & wiring repairs",
      "Equipment replacement",
    ],
    offerings: [
      "Power Outage Diagnosis",
      "Circuit Breaker Repair",
      "Short Circuit Repair",
      "Outlet Repair",
      "Wiring Repair",
      "Electrical Equipment Repair",
    ],
  },
  {
    slug: "lighting-solutions",
    title: "Lighting Solutions",
    icon: "💡",
    short:
      "Indoor and outdoor lighting design and installation for efficiency and ambiance.",
    description:
      "From energy-efficient LED retrofits to decorative outdoor lighting, we design lighting systems that are bright, efficient, and beautiful. Reduce your power bill while improving visibility and security.",
    features: [
      "LED retrofit & upgrade",
      "Indoor & outdoor lighting",
      "Security & flood lights",
      "Smart lighting control",
    ],
    offerings: [
      "Indoor Lighting",
      "Outdoor Lighting",
      "LED Lighting",
      "Security Lighting",
      "Lighting Design",
      "Lighting Replacement",
    ],
  },
  {
    slug: "industrial-electrical-works",
    title: "Industrial Electrical Works",
    icon: "🏭",
    short:
      "Heavy-duty electrical systems for plants, machinery, and production lines.",
    description:
      "We deliver heavy-duty electrical solutions for factories, plants, and commercial facilities — motor control centers, high-capacity panels, three-phase systems, and industrial-grade wiring built to endure.",
    features: [
      "Motor control centers",
      "Three-phase systems",
      "High-capacity panels",
      "Industrial-grade wiring",
    ],
    offerings: [
      "Industrial Wiring",
      "Motor Installation",
      "Control Panel Installation",
      "Machine Wiring",
      "Power Distribution",
    ],
  },
  {
    slug: "renewable-energy-systems",
    title: "Renewable Energy Systems",
    icon: "🌞",
    short:
      "Solar and renewable energy installations that cut costs and carbon footprint.",
    description:
      "Future-proof your property with solar power. We handle solar panel installation, inverters, and battery storage systems that reduce your dependence on the grid and save you money for years.",
    features: [
      "Solar panel installation",
      "Inverter & battery storage",
      "Grid-tie & off-grid systems",
      "Energy efficiency audits",
    ],
    offerings: [
      "Solar Panel Installation",
      "Solar Inverter Installation",
      "Solar Battery Systems",
      "Solar Wiring",
      "Solar Maintenance",
    ],
  },
]

export const PRODUCT_CATEGORIES = [
  "All",
  "Circuit Breakers",
  "Wires & Cables",
  "Panels & Boards",
  "Lighting",
  "Other",
]

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
]