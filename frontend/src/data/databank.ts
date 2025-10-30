import Clothimg from '../assets/Clothimg.png'
import Causeimg from '../assets/Causeimg.png'
import Creatorimg from '../assets/Creator.png'

export interface Product {
  id: number
  image: string
  title: string
  creator: string
  price: string
  category: string
  categoryType: string
  size: string
  color: string
  sizes: string[]
  description: string
  details: string
  shipping: string
  delivery: string
}

export interface Cause {
  id: number
  image: string
  title: string
  organization: string
}

export interface Creator {
  id: number
  image: string
  name: string
  role: string
}

export const products: Product[] = [
  {
    id: 1,
    image: Clothimg,
    title: "Live In Balance",
    creator: "OluwaDayo",
    price: "₦20,000",
    category: "shirts",
    categoryType: "fundraisers",
    size: "M",
    color: "black",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "A beautifully designed t-shirt that represents the balance between creativity and social impact. Made with sustainable materials and featuring an elegant script design.",
    details: "100% organic cotton, pre-shrunk, machine washable. Designed and printed locally to support community artists.",
    shipping: "Free shipping on orders over ₦15,000. Standard delivery: 3-5 business days. Express delivery: 1-2 business days.",
    delivery: "We partner with local delivery services to ensure your order arrives safely. Tracking information provided upon shipment."
  },
  {
    id: 2,
    image: Clothimg,
    title: "Creative Freedom",
    creator: "Sarah Johnson",
    price: "₦15,000",
    category: "hoodies",
    categoryType: "bestsellers",
    size: "L",
    color: "gray",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Express your creative freedom with this comfortable hoodie featuring minimalist design elements.",
    details: "80% cotton, 20% polyester blend. Soft fleece interior, adjustable drawstring hood.",
    shipping: "Free shipping on orders over ₦15,000. Standard delivery: 3-5 business days.",
    delivery: "Tracked delivery with signature confirmation. Safe packaging guaranteed."
  },
  {
    id: 3,
    image: Clothimg,
    title: "Artistic Vision",
    creator: "Mike Chen",
    price: "₦35,000",
    category: "caps",
    categoryType: "creators-choice",
    size: "S",
    color: "white",
    sizes: ["S", "M", "L"],
    description: "A premium cap that showcases artistic vision and supports independent creators.",
    details: "100% cotton twill, structured cap with curved brim. Adjustable strap closure.",
    shipping: "Free shipping on all orders. Standard delivery: 2-4 business days.",
    delivery: "Express delivery available. Package protection included."
  },
  {
    id: 4,
    image: Clothimg,
    title: "Community Spirit",
    creator: "Aisha Okafor",
    price: "₦25,000",
    category: "sweaters",
    categoryType: "fundraisers",
    size: "M",
    color: "navy",
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Celebrate community spirit with this warm and stylish sweater designed for social impact.",
    details: "100% merino wool, hand-knitted by local artisans. Soft and breathable fabric.",
    shipping: "Free shipping on orders over ₦20,000. Standard delivery: 4-6 business days.",
    delivery: "Carefully packaged to maintain quality. Tracking available upon shipment."
  },
  {
    id: 5,
    image: Clothimg,
    title: "Innovation Drive",
    creator: "David Kim",
    price: "₦18,000",
    category: "shirts",
    categoryType: "bestsellers",
    size: "L",
    color: "blue",
    sizes: ["S", "M", "L", "XL"],
    description: "Drive innovation forward with this tech-inspired t-shirt supporting STEM education.",
    details: "100% cotton, moisture-wicking technology. Designed for comfort and style.",
    shipping: "Free shipping on orders over ₦15,000. Standard delivery: 3-5 business days.",
    delivery: "Express delivery available. Package protection included."
  },
  {
    id: 6,
    image: Clothimg,
    title: "Cultural Heritage",
    creator: "Fatima Al-Zahra",
    price: "₦30,000",
    category: "hoodies",
    categoryType: "creators-choice",
    size: "M",
    color: "burgundy",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Honor cultural heritage with this beautifully crafted hoodie featuring traditional patterns.",
    details: "Premium cotton blend, embroidered details. Hand-finished by skilled artisans.",
    shipping: "Free shipping on all orders. Standard delivery: 3-5 business days.",
    delivery: "Special care packaging for delicate items. Signature confirmation required."
  },
  {
    id: 7,
    image: Clothimg,
    title: "Future Leaders",
    creator: "James Wilson",
    price: "₦22,000",
    category: "caps",
    categoryType: "fundraisers",
    size: "L",
    color: "green",
    sizes: ["S", "M", "L", "XL"],
    description: "Support future leaders with this cap designed to inspire the next generation.",
    details: "100% cotton twill, structured design. Adjustable closure for perfect fit.",
    shipping: "Free shipping on orders over ₦20,000. Standard delivery: 2-4 business days.",
    delivery: "Tracked delivery with confirmation. Safe packaging guaranteed."
  },
  {
    id: 8,
    image: Clothimg,
    title: "Sustainable Future",
    creator: "Elena Rodriguez",
    price: "₦28,000",
    category: "sweaters",
    categoryType: "bestsellers",
    size: "S",
    color: "beige",
    sizes: ["XS", "S", "M", "L"],
    description: "Build a sustainable future with this eco-friendly sweater made from recycled materials.",
    details: "100% recycled polyester, soft and warm. Environmentally conscious production.",
    shipping: "Free shipping on all orders. Standard delivery: 4-6 business days.",
    delivery: "Carbon-neutral shipping. Package made from recycled materials."
  }
]

export interface Campaign {
  id: number
  image: string
  title: string
  amountRaised: string
  goal: string
  percentage: number
  category: string
  about: string
  howItWorks: string
  useOfFunds: string
}

export const campaigns: Campaign[] = [
  {
    id: 1,
    image: Causeimg,
    title: "Help Feed 3000 Children",
    amountRaised: "₦1,000,000",
    goal: "₦2,500,000",
    percentage: 40,
    category: "healthcare",
    about: "The Help Feed 3000 Children campaign was launched to provide nutritious meals to 3000 children across vulnerable communities. Each child receives a balanced meal daily, ensuring they have the energy needed for learning and growth. Your contributions directly fund food supplies, preparation, and distribution to these children.",
    howItWorks: "Step 1: You donate any amount to the campaign. Step 2: Your donation is tracked and added to our live progress bar. Step 3: Funds are used to purchase and distribute meals. Step 4: You receive updates on the impact of your donation through photos and reports.",
    useOfFunds: "60% of funds go directly to food supplies (meals, ingredients, and nutrition supplements). 25% covers operational costs (storage, transportation, and distribution). 10% is allocated to staff and volunteers. 5% goes to monitoring and impact assessment to ensure transparency."
  },
  {
    id: 2,
    image: Causeimg,
    title: "Build Schools in Rural Areas",
    amountRaised: "₦500,000",
    goal: "₦3,000,000",
    percentage: 17,
    category: "education",
    about: "The Build Schools in Rural Areas campaign aims to construct quality educational facilities in underserved rural communities. Each school will provide a safe learning environment for children who currently lack access to proper education infrastructure.",
    howItWorks: "Step 1: You donate to support school construction. Step 2: Funds are allocated to building materials and construction. Step 3: Schools are built with community involvement. Step 4: Educational facilities are equipped and children begin learning.",
    useOfFunds: "50% covers construction materials and building costs. 20% goes to furnishing and equipment. 15% covers labor and construction teams. 10% is for community engagement and training. 5% goes to project management and oversight."
  },
  {
    id: 3,
    image: Causeimg,
    title: "Plant 10,000 Trees Initiative",
    amountRaised: "₦750,000",
    goal: "₦1,500,000",
    percentage: 50,
    category: "climate-change",
    about: "The Plant 10,000 Trees Initiative focuses on reforestation efforts to combat climate change and restore degraded lands. Each tree planted contributes to carbon sequestration, soil conservation, and biodiversity restoration.",
    howItWorks: "Step 1: You donate to support tree planting. Step 2: Saplings are purchased and prepared. Step 3: Trees are planted in designated areas by volunteers. Step 4: Regular monitoring ensures tree survival and growth.",
    useOfFunds: "40% goes to purchasing saplings and seeds. 30% covers land preparation and planting activities. 15% is for maintenance and watering. 10% goes to community education and awareness. 5% covers monitoring and evaluation."
  },
  {
    id: 4,
    image: Causeimg,
    title: "Medical Supplies for Refugees",
    amountRaised: "₦1,200,000",
    goal: "₦2,000,000",
    percentage: 60,
    category: "healthcare",
    about: "The Medical Supplies for Refugees campaign provides essential medical supplies and equipment to refugee camps. This includes medicines, bandages, diagnostic tools, and personal protective equipment to ensure refugees receive proper healthcare.",
    howItWorks: "Step 1: You donate to support medical supply procurement. Step 2: Supplies are purchased from verified suppliers. Step 3: Items are distributed to refugee camps and clinics. Step 4: Healthcare workers use supplies to treat patients.",
    useOfFunds: "55% goes to purchasing medical supplies and medicines. 20% covers transportation and logistics. 15% goes to training healthcare workers. 7% is for monitoring and quality assurance. 3% covers administrative costs."
  },
  {
    id: 5,
    image: Causeimg,
    title: "Digital Learning Centers",
    amountRaised: "₦900,000",
    goal: "₦2,500,000",
    percentage: 36,
    category: "education",
    about: "The Digital Learning Centers campaign aims to establish computer labs and digital learning facilities in schools. Students will gain access to technology, internet connectivity, and digital literacy training to prepare them for the digital age.",
    howItWorks: "Step 1: You donate to support digital infrastructure. Step 2: Equipment including computers and internet are installed. Step 3: Students receive training on digital tools. Step 4: Regular support ensures continued learning opportunities.",
    useOfFunds: "45% goes to purchasing computers and devices. 25% covers internet connectivity and infrastructure. 15% is for training and curriculum development. 10% goes to maintenance and support. 5% covers project coordination."
  },
  {
    id: 6,
    image: Causeimg,
    title: "Clean Water Project",
    amountRaised: "₦1,500,000",
    goal: "₦2,000,000",
    percentage: 75,
    category: "climate-change",
    about: "The Clean Water Project provides safe drinking water to communities through well drilling, water purification systems, and water source protection. This ensures communities have access to clean water for drinking, cooking, and sanitation.",
    howItWorks: "Step 1: You donate to support water infrastructure. Step 2: Wells are drilled and water systems installed. Step 3: Purification systems ensure water quality. Step 4: Communities receive training on water management and maintenance.",
    useOfFunds: "50% covers drilling and infrastructure installation. 20% goes to water purification systems. 15% is for community training and education. 10% covers maintenance and repairs. 5% goes to water quality testing and monitoring."
  }
]

export const causes: Cause[] = [
  {
    id: 1,
    image: Causeimg,
    title: "Children In Gaza",
    organization: "The Palestine NGO"
  },
  {
    id: 2,
    image: Causeimg,
    title: "Education For All",
    organization: "Global Education Fund"
  },
  {
    id: 3,
    image: Causeimg,
    title: "Clean Water Initiative",
    organization: "Water For Life"
  },
  {
    id: 4,
    image: Causeimg,
    title: "Climate Action",
    organization: "Green Earth Foundation"
  },
  {
    id: 5,
    image: Causeimg,
    title: "Mental Health Support",
    organization: "Mind Matters"
  }
]

export const creators: Creator[] = [
  {
    id: 1,
    image: Creatorimg,
    name: "OluwaDayo",
    role: "Creator"
  },
  {
    id: 2,
    image: Creatorimg,
    name: "Sarah Johnson",
    role: "Designer"
  },
  {
    id: 3,
    image: Creatorimg,
    name: "Mike Chen",
    role: "Artist"
  },
  {
    id: 4,
    image: Creatorimg,
    name: "Aisha Okafor",
    role: "Creator"
  },
  {
    id: 5,
    image: Creatorimg,
    name: "David Kim",
    role: "Creator"
  },
  {
    id: 6,
    image: Creatorimg,
    name: "David Kim",
    role: "Creator"
  },
  
]


