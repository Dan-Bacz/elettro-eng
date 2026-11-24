export const COMPANY = {
  name: "ELETTRO",
  tagline: "Engineering Enterprises",
  phone: "09109064859",
  email: "lanzaderasjezamae959@gmail.com",
  address: "Mahayag, Zamboanga del Sur, Philippines",
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
  offerings: ServiceOffering[]
}

export type ServiceOffering = {
  name: string
  price: number
}

const offering = (name: string, price: number): ServiceOffering => ({ name, price })

export type BookingQuestion = {
  id: string
  offering: string
  question: string
  placeholder: string
}

const QUESTION_RULES: Array<{ match: string[]; question: Omit<BookingQuestion, "id" | "offering"> }> = [
  { match: ["household wiring", "residential wiring"], question: { question: "How many floors and rooms will be wired?", placeholder: "Example: 2 floors, 3 bedrooms, living room and kitchen" } },
  { match: ["household wiring", "residential wiring", "commercial wiring", "industrial wiring"], question: { question: "Is this for a new installation or replacement of existing wiring?", placeholder: "Example: New installation / replacement of old wiring" } },
  { match: ["commercial wiring"], question: { question: "What type of business or commercial space is this, and what is its approximate floor area?", placeholder: "Example: Small grocery, approximately 80 square meters" } },
  { match: ["service panel installation", "control panel installation", "power distribution"], question: { question: "What equipment or electrical load will the panel support?", placeholder: "Example: 2 air conditioners, 1 pump and general outlets" } },
  { match: ["circuit breaker installation", "circuit breaker repair"], question: { question: "What breaker rating or electrical problem are you experiencing?", placeholder: "Example: Main breaker trips when the air conditioner starts" } },
  { match: ["outlet & switch installation", "outlet repair"], question: { question: "How many outlets or switches are needed, and where should they be installed?", placeholder: "Example: 6 outlets in the kitchen and 2 switches in the hallway" } },
  { match: ["lighting installation", "indoor lighting", "outdoor lighting", "security lighting", "lighting replacement"], question: { question: "How many lights are needed and what type or area should they cover?", placeholder: "Example: 8 LED ceiling lights and 2 outdoor security lights" } },
  { match: ["appliance wiring"], question: { question: "What appliance needs wiring and what are its voltage or power requirements?", placeholder: "Example: 1.5 HP split-type air conditioner, 220V" } },
  { match: ["electrical rewiring", "wiring repair", "short circuit repair"], question: { question: "Which part of the property needs rewiring or repair, and what symptoms have you noticed?", placeholder: "Example: Kitchen circuit sparks and loses power when appliances run" } },
  { match: ["solar panel installation"], question: { question: "What is your target solar capacity or average monthly electricity bill?", placeholder: "Example: ₱6,000 monthly bill or around 5 kW solar system" } },
  { match: ["solar inverter installation"], question: { question: "What inverter brand, capacity, or solar system will it be connected to?", placeholder: "Example: 5 kW hybrid inverter for a new solar installation" } },
  { match: ["solar battery systems"], question: { question: "How long should the battery provide backup power, and which appliances are essential?", placeholder: "Example: 6 hours for lights, refrigerator and internet equipment" } },
  { match: ["motor installation", "machine wiring"], question: { question: "What motor or machine will be installed, including its horsepower and voltage?", placeholder: "Example: 3 HP water pump, three-phase, 220V" } },
  { match: ["preventive maintenance", "equipment maintenance"], question: { question: "What equipment or electrical areas should be included in the maintenance visit?", placeholder: "Example: Main panel, generator and three air-conditioning units" } },
  { match: ["electrical inspection", "panel inspection", "wiring inspection", "circuit testing"], question: { question: "What issue or inspection goal should our technician focus on?", placeholder: "Example: Safety inspection before moving into the building" } },
  { match: ["power outage diagnosis"], question: { question: "When did the outage start, and does it affect the whole property or only one circuit?", placeholder: "Example: Started this morning; only the second-floor outlets are affected" } },
]

export function getBookingQuestions(service: Service, selectedNames: string[]): BookingQuestion[] {
  const questions: BookingQuestion[] = []
  for (const selectedName of selectedNames) {
    const name = selectedName.replace(/^Other:\s*/i, "")
    const normalized = name.toLowerCase()
    QUESTION_RULES.forEach((rule, index) => {
      if (rule.match.some((term) => normalized.includes(term))) {
        const question = { id: `${service.slug}-${index}-${name}`, offering: name, ...rule.question }
        if (!questions.some((item) => item.question === question.question)) questions.push(question)
      }
    })
  }
  if (selectedNames.some((selectedName) => selectedName.toLowerCase().startsWith("other:"))) {
    questions.push({ id: `${service.slug}-other`, offering: "Other", question: "Please describe the custom service you need and the result you expect.", placeholder: "Describe the requested electrical work" })
  }
  return questions
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
      offering("Household Wiring", 15000), offering("Residential Wiring", 12000), offering("Commercial Wiring", 35000),
      offering("Service Panel Installation", 8500), offering("Circuit Breaker Installation", 2500), offering("Outlet & Switch Installation", 650),
      offering("Lighting Installation", 1800), offering("Appliance Wiring", 1800), offering("Electrical Rewiring", 18000),
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
      offering("Preventive Maintenance", 5000), offering("Electrical Inspection", 2500), offering("Panel Inspection", 1800),
      offering("Circuit Testing", 1500), offering("Equipment Maintenance", 3500), offering("Wiring Inspection", 2200),
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
      offering("Power Outage Diagnosis", 1500), offering("Circuit Breaker Repair", 1800), offering("Short Circuit Repair", 2500),
      offering("Outlet Repair", 1200), offering("Wiring Repair", 2500), offering("Electrical Equipment Repair", 3500),
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
      offering("Indoor Lighting", 2500), offering("Outdoor Lighting", 3500), offering("LED Lighting", 1800),
      offering("Security Lighting", 2800), offering("Lighting Design", 5000), offering("Lighting Replacement", 1500),
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
      offering("Industrial Wiring", 50000), offering("Motor Installation", 15000), offering("Control Panel Installation", 25000),
      offering("Machine Wiring", 18000), offering("Power Distribution", 30000),
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
      offering("Solar Panel Installation", 45000), offering("Solar Inverter Installation", 12000), offering("Solar Battery Systems", 35000),
      offering("Solar Wiring", 15000), offering("Solar Maintenance", 5000),
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
