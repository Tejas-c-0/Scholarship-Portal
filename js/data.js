/**
 * ScholarPath – Static Data
 * All seed data for scholarships, testimonials, FAQs, and categories.
 */
window.ScholarData = {

  /* ─────────────────────────── SCHOLARSHIPS ─────────────────────────── */
  scholarships: [
    {
      id: "SCH001",
      name: "Prime Minister's Scholarship Scheme",
      provider: "Ministry of Education",
      providerLogo: null,
      amount: 36000,
      amountDisplay: "₹36,000/year",
      deadline: "2025-09-30",
      category: "Merit-cum-Means",
      tags: ["Central Govt", "UG/PG"],
      description: "Scholarship for wards of Ex-Servicemen and Ex-Coast Guard personnel pursuing professional courses.",
      eligibility: {
        minCGPA: 6.0,
        maxIncome: 600000,
        categories: ["General","OBC","SC","ST"],
        courses: ["B.Tech","BCA","MCA","MBA","MBBS","B.Pharm"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://ksb.gov.in/pm-scholarship.htm",
      featured: true,
      seats: 5500
    },
    {
      id: "SCH002",
      name: "Post Matric Scholarship for SC Students",
      provider: "Ministry of Social Justice",
      providerLogo: null,
      amount: 23400,
      amountDisplay: "₹23,400/year",
      deadline: "2025-10-31",
      category: "SC/ST",
      tags: ["SC", "Central Govt"],
      description: "Financial assistance to SC students pursuing post-matric or post-secondary courses.",
      eligibility: {
        minCGPA: 0,
        maxIncome: 250000,
        categories: ["SC"],
        courses: [],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://scholarships.gov.in",
      featured: true,
      seats: 40000
    },
    {
      id: "SCH003",
      name: "AICTE Pragati Scholarship",
      provider: "AICTE",
      providerLogo: null,
      amount: 50000,
      amountDisplay: "₹50,000/year",
      deadline: "2025-11-15",
      category: "Women in STEM",
      tags: ["Women", "Technical"],
      description: "For girl students pursuing Degree/Diploma programmes in Technical Education.",
      eligibility: {
        minCGPA: 0,
        maxIncome: 800000,
        categories: ["General","OBC","SC","ST"],
        courses: ["B.Tech","B.E","Diploma"],
        states: [],
        minYear: 1,
        maxYear: 4,
        gender: "Female"
      },
      applyLink: "https://www.aicte-pragati-saksham-gov.in",
      featured: true,
      seats: 4000
    },
    {
      id: "SCH004",
      name: "Vidyasaarathi Scholarship",
      provider: "NSDL e-Governance",
      providerLogo: null,
      amount: 60000,
      amountDisplay: "₹60,000/year",
      deadline: "2025-08-31",
      category: "Merit-cum-Means",
      tags: ["Private", "UG/PG"],
      description: "Connecting students with corporates for CSR scholarships across various programmes.",
      eligibility: {
        minCGPA: 7.0,
        maxIncome: 500000,
        categories: ["General","OBC","SC","ST"],
        courses: [],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://www.vidyasaarathi.co.in",
      featured: true,
      seats: 2000
    },
    {
      id: "SCH005",
      name: "Sitaram Jindal Foundation Scholarship",
      provider: "Sitaram Jindal Foundation",
      providerLogo: null,
      amount: 24000,
      amountDisplay: "₹24,000/year",
      deadline: "2025-07-31",
      category: "Merit-cum-Means",
      tags: ["Private Foundation"],
      description: "For meritorious students from economically weaker sections pursuing UG/PG courses.",
      eligibility: {
        minCGPA: 6.5,
        maxIncome: 250000,
        categories: ["General","OBC","SC","ST"],
        courses: [],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://sitaramjindalfoundation.org",
      featured: true,
      seats: 3000
    },
    {
      id: "SCH006",
      name: "Inspire Scholarship (SHE)",
      provider: "DST – Government of India",
      providerLogo: null,
      amount: 80000,
      amountDisplay: "₹80,000/year",
      deadline: "2025-10-01",
      category: "Science Excellence",
      tags: ["Science", "Top Merit"],
      description: "For students ranked in the top 1% of their board exams pursuing BSc/B.Tech in Natural Sciences.",
      eligibility: {
        minCGPA: 8.5,
        maxIncome: 0,
        categories: ["General","OBC","SC","ST"],
        courses: ["B.Sc","B.Tech"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://online-inspire.gov.in",
      featured: true,
      seats: 10000
    },
    {
      id: "SCH007",
      name: "Swami Vivekananda Merit-cum-Means Scholarship",
      provider: "Govt of West Bengal",
      providerLogo: null,
      amount: 60000,
      amountDisplay: "₹60,000/year",
      deadline: "2025-09-15",
      category: "State Govt",
      tags: ["West Bengal", "Merit"],
      description: "For West Bengal domicile students in undergraduate courses at WB colleges.",
      eligibility: {
        minCGPA: 7.5,
        maxIncome: 250000,
        categories: ["General","OBC","SC","ST"],
        courses: [],
        states: ["West Bengal"],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://svmcm.wbhed.gov.in",
      featured: false,
      seats: 8000
    },
    {
      id: "SCH008",
      name: "Central Sector Scheme of Scholarships",
      provider: "Ministry of Education",
      providerLogo: null,
      amount: 20000,
      amountDisplay: "₹20,000/year",
      deadline: "2025-10-31",
      category: "Merit",
      tags: ["Central Govt", "Top Rank"],
      description: "For students who are above 80th percentile in their 12th board and secure admission in colleges.",
      eligibility: {
        minCGPA: 0,
        maxIncome: 450000,
        categories: ["General","OBC","SC","ST"],
        courses: [],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://scholarships.gov.in",
      featured: false,
      seats: 82000
    },
    {
      id: "SCH009",
      name: "HDFC Educational Crisis Scholarship",
      provider: "HDFC Bank Parivartan",
      providerLogo: null,
      amount: 75000,
      amountDisplay: "₹75,000/year",
      deadline: "2025-12-31",
      category: "Financial Need",
      tags: ["Private Bank", "Crisis"],
      description: "For students facing financial crisis due to death/illness of earning family member.",
      eligibility: {
        minCGPA: 5.5,
        maxIncome: 200000,
        categories: ["General","OBC","SC","ST"],
        courses: [],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://www.hdfcbank.com/personal/resources/learning-centre/pay/hdfc-bank-parivatan-scholarship",
      featured: false,
      seats: 1000
    },
    {
      id: "SCH010",
      name: "Reliance Foundation UG Scholarship",
      provider: "Reliance Foundation",
      providerLogo: null,
      amount: 200000,
      amountDisplay: "₹2,00,000/year",
      deadline: "2026-01-15",
      category: "Merit",
      tags: ["Top Merit", "STEM", "Humanities"],
      description: "For top-merit undergraduate students in STEM and Humanities to pursue their passion.",
      eligibility: {
        minCGPA: 8.0,
        maxIncome: 1500000,
        categories: ["General","OBC","SC","ST"],
        courses: [],
        states: [],
        minYear: 1,
        maxYear: 1
      },
      applyLink: "https://rf.foundation/education/undergraduate-scholarships",
      featured: false,
      seats: 5000,
      documentsRequired: ["Aadhaar Card", "Class 12 Marksheet", "Income Certificate", "Bonafide Certificate", "Passport Photo"]
    },
    {
      id: "SCH011",
      name: "Dr. Ambedkar Post-Matric Scholarship for EBC",
      provider: "Ministry of Social Justice and Empowerment",
      providerLogo: null,
      amount: 20000,
      amountDisplay: "₹20,000/year",
      deadline: "2025-11-30",
      category: "Means",
      tags: ["Central Govt", "EBC", "Higher Education"],
      description: "Financial assistance to Economically Backward Class (EBC) students to pursue post-matriculation or post-secondary education.",
      eligibility: {
        minCGPA: 5.5,
        maxIncome: 250000,
        categories: ["General", "OBC"],
        courses: ["B.Tech", "B.E", "B.Sc", "B.Com", "B.A", "BCA"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://scholarships.gov.in",
      featured: false,
      seats: 12000,
      documentsRequired: ["Aadhaar Card", "EBC Income Certificate", "Marksheet", "College Fee Receipt", "Bank Passbook"]
    },
    {
      id: "SCH012",
      name: "Kishore Vaigyanik Protsahan Yojana (KVPY)",
      provider: "Department of Science and Technology (DST)",
      providerLogo: null,
      amount: 84000,
      amountDisplay: "₹84,000/year",
      deadline: "2025-08-31",
      category: "Science",
      tags: ["Research", "Govt", "Fellowship"],
      description: "National Program of Fellowship in Basic Sciences initiated to encourage students to take up research careers in Science.",
      eligibility: {
        minCGPA: 8.5,
        maxIncome: 1000000,
        categories: ["General", "OBC", "SC", "ST"],
        courses: ["B.Sc", "B.Sc Physics", "B.Sc Chemistry", "B.Sc Maths", "B.Sc Biotech", "B.Tech"],
        states: [],
        minYear: 1,
        maxYear: 3
      },
      applyLink: "http://www.kvpy.iisc.ernet.in",
      featured: true,
      seats: 2500,
      documentsRequired: ["Aadhaar Card", "Entrance Score Card", "Class 12 Marksheet", "College ID", "Bank Passbook"]
    },
    {
      id: "SCH013",
      name: "INSPIRE Scholarship for Higher Education (SHE)",
      provider: "Department of Science and Technology (Govt of India)",
      providerLogo: null,
      amount: 80000,
      amountDisplay: "₹80,000/year",
      deadline: "2025-10-15",
      category: "Science",
      tags: ["DST", "National", "STEM"],
      description: "Innovation in Science Pursuit for Inspired Research (INSPIRE) offers 10,000 scholarships annually for students enrolled in natural and basic sciences at BSc/BS and MSc/MS level.",
      eligibility: {
        minCGPA: 8.0,
        maxIncome: 800000,
        categories: ["General", "OBC", "SC", "ST"],
        courses: ["B.Sc", "B.Sc Physics", "B.Sc Chemistry", "B.Sc Maths", "B.Tech"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://online-inspire.gov.in",
      featured: true,
      seats: 10000,
      documentsRequired: ["Aadhaar Card", "Class 12 Top 1% Rank Certificate", "Endorsement Form", "Bank Passbook"]
    },
    {
      id: "SCH014",
      name: "Central Sector Scheme of Scholarships for College Students",
      provider: "Department of Higher Education (MHRD)",
      providerLogo: null,
      amount: 20000,
      amountDisplay: "₹20,000/year",
      deadline: "2025-12-15",
      category: "Merit-cum-Means",
      tags: ["MHRD", "NSP", "Graduate"],
      description: "For meritorious students belonging to low income families pursuing regular graduate and postgraduate degree courses in recognized colleges.",
      eligibility: {
        minCGPA: 7.0,
        maxIncome: 450000,
        categories: ["General", "OBC", "SC", "ST"],
        courses: ["B.Tech", "B.E", "B.Sc", "B.Com", "B.A", "BCA", "MBBS"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://scholarships.gov.in",
      featured: false,
      seats: 82000,
      documentsRequired: ["Aadhaar Card", "Class 12 Marksheet", "Income Certificate", "Bonafide Certificate", "Bank Passbook"]
    },
    {
      id: "SCH015",
      name: "ACC Vidyasaarathi Scholarship",
      provider: "NSDL Vidyasaarathi Platform & ACC Ltd.",
      providerLogo: null,
      amount: 50000,
      amountDisplay: "₹50,000/year",
      deadline: "2025-09-15",
      category: "Means",
      tags: ["Corporate CSR", "Engineering", "Diploma"],
      description: "Designed for underprivileged students pursuing B.E / B.Tech degrees across India to support tuition fees and living expenses.",
      eligibility: {
        minCGPA: 6.5,
        maxIncome: 500000,
        categories: ["General", "OBC", "SC", "ST"],
        courses: ["B.Tech CSE", "B.Tech ECE", "B.Tech ME", "B.Tech Civil", "B.E"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://www.vidyasaarathi.co.in",
      featured: false,
      seats: 600,
      documentsRequired: ["Aadhaar Card", "Income Certificate", "Current College Fee Receipt", "10th & 12th Marksheets", "Bank Passbook"]
    },
    {
      id: "SCH016",
      name: "Sitaram Jindal Foundation Scholarship",
      provider: "Sitaram Jindal Foundation",
      providerLogo: null,
      amount: 38400,
      amountDisplay: "₹38,400/year",
      deadline: "2025-11-15",
      category: "Means",
      tags: ["Philanthropic", "UG/PG", "Private"],
      description: "Scholarship scheme by Sitaram Jindal Foundation to support deserving students from economically weaker sections pursuing technical and professional degrees.",
      eligibility: {
        minCGPA: 6.5,
        maxIncome: 400000,
        categories: ["General", "OBC", "SC", "ST"],
        courses: ["B.Tech", "B.E", "BCA", "MCA", "MBA", "B.Sc", "B.Com"],
        states: [],
        minYear: 1,
        maxYear: 4
      },
      applyLink: "https://www.sitaramjindalfoundation.org",
      featured: false,
      seats: 4000,
      documentsRequired: ["Aadhaar Card", "Income Certificate (BPL/Ration Card)", "Marksheet", "College ID", "Fee Receipt"]
    }
  ],

  /* ─────────────────────────── TESTIMONIALS ─────────────────────────── */
  testimonials: [
    {
      id: "T001",
      name: "Arjun Mehta",
      university: "IIT Bombay",
      course: "B.Tech CSE",
      year: "3rd Year",
      scholarship: "Inspire Scholarship (SHE)",
      amount: "₹80,000",
      quote: "ScholarPath helped me find the Inspire Scholarship in minutes. The eligibility checker was spot-on and the step-by-step guide made applying super easy. I got ₹80,000 and I couldn't be happier!",
      rating: 5,
      initials: "AM",
      color: "#667eea"
    },
    {
      id: "T002",
      name: "Priya Nair",
      university: "NIT Calicut",
      course: "B.Tech ECE",
      year: "2nd Year",
      scholarship: "AICTE Pragati Scholarship",
      amount: "₹50,000",
      quote: "As a first-generation college student, finances were my biggest worry. ScholarPath's AI matching found the Pragati Scholarship for me. The process was smooth and the team's resources were invaluable!",
      rating: 5,
      initials: "PN",
      color: "#f093fb"
    },
    {
      id: "T003",
      name: "Rahul Sharma",
      university: "Delhi University",
      course: "B.Sc Physics",
      year: "Final Year",
      scholarship: "Central Sector Scheme",
      amount: "₹20,000",
      quote: "I discovered three scholarships I didn't even know existed. The deadline tracker kept me on schedule. ScholarPath is a must-use for every student looking for financial support!",
      rating: 5,
      initials: "RS",
      color: "#4facfe"
    },
    {
      id: "T004",
      name: "Sneha Kulkarni",
      university: "Pune University",
      course: "MCA",
      year: "1st Year",
      scholarship: "Vidyasaarathi Scholarship",
      amount: "₹60,000",
      quote: "The quick eligibility check showed I qualified for 12 scholarships! Applied to 4 and got selected for Vidyasaarathi. The portal is incredibly user-friendly.",
      rating: 4,
      initials: "SK",
      color: "#43e97b"
    }
  ],

  /* ─────────────────────────── FAQs ─────────────────────────── */
  faqs: [
    {
      q: "Who can apply for scholarships on ScholarPath?",
      a: "Eligibility depends on each scholarship's rules. Browse the catalog or use the quick checker to compare your details, then confirm the current requirements on the official scheme website before applying."
    },
    {
      q: "Is ScholarPath free to use?",
      a: "Yes! ScholarPath is 100% free for students. We do not charge any registration, application, or service fee. If anyone asks you to pay for a scholarship listing on our platform, please report it immediately."
    },
    {
      q: "How do scholarship recommendations work?",
      a: "The recommendation score compares the profile information you provide with the eligibility details saved for each listing. It is a guide, not an eligibility decision; always verify the latest rules with the scholarship provider."
    },
    {
      q: "What documents are typically needed to apply?",
      a: "Common documents include: Mark sheets (10th, 12th, latest semester), Income certificate (from Tahsildar/SDM), Caste certificate (if applicable), Aadhaar card, Bank passbook / cancelled cheque, Passport-size photographs, and Institution bonafide certificate."
    },
    {
      q: "How long does it take for a scholarship to be credited?",
      a: "Processing times and status updates are set by each scholarship provider. Check the official portal or contact the provider for current timelines, then record your progress in the ScholarPath dashboard."
    },
    {
      q: "Can I apply for multiple scholarships simultaneously?",
      a: "Some providers allow multiple applications while others restrict receiving overlapping awards. Check the current terms for each scholarship before applying."
    },
    {
      q: "What is the National Scholarship Portal (NSP) and how does it relate?",
      a: "The National Scholarship Portal (scholarships.gov.in) is the Government of India's scholarship portal. ScholarPath is a discovery and organization tool; applications and official status updates happen through the scheme's provider or portal."
    },
    {
      q: "My application was rejected. What should I do?",
      a: "Check the rejection reason in the official portal or contact the provider. You can update your own application notes in ScholarPath and review other listings, checking each one's eligibility and current deadline."
    }
  ],

  /* ─────────────────────────── CATEGORIES ─────────────────────────── */
  categories: [
    { id: "merit",         label: "Merit Based",       icon: "🏆", color: "#f59e0b" },
    { id: "means",         label: "Means Based",       icon: "💰", color: "#10b981" },
    { id: "merit-means",   label: "Merit-cum-Means",   icon: "⭐", color: "#6366f1" },
    { id: "sc-st",         label: "SC/ST",             icon: "🤝", color: "#ef4444" },
    { id: "obc",           label: "OBC",               icon: "🎓", color: "#8b5cf6" },
    { id: "women",         label: "Women in STEM",     icon: "👩‍💻", color: "#ec4899" },
    { id: "disability",    label: "Differently Abled", icon: "♿", color: "#0ea5e9" },
    { id: "sports",        label: "Sports",            icon: "⚽", color: "#f97316" },
    { id: "state",         label: "State Specific",    icon: "🗺️", color: "#14b8a6" },
    { id: "science",       label: "Science & Tech",    icon: "🔬", color: "#a855f7" }
  ],

  /* ─────────────────────────── INDIAN STATES ─────────────────────────── */
  states: [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
    "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
    "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
    "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli",
    "Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
  ],

  /* ─────────────────────────── COURSES ─────────────────────────── */
  courses: [
    "B.Tech CSE","B.Tech ECE","B.Tech ME","B.Tech Civil","B.Tech EEE","B.Tech IT",
    "B.E","BCA","B.Sc","B.Sc Physics","B.Sc Chemistry","B.Sc Maths","B.Sc Biotech",
    "B.Com","B.A","BBA","B.Pharm","MBBS","BDS","B.Arch","LLB","Diploma",
    "M.Tech","MCA","MBA","M.Sc","M.A","M.Com","M.Pharm","MD","MS","LLM","Ph.D"
  ],

  /* ─────────────────────────────────────────────────────────────────────────
     HOW IT WORKS (3 Steps)
     ───────────────────────────────────────────────────────────────────────── */
  howItWorks: [
    {
      step: 1,
      number: "01",
      title: "Create Your Profile",
      desc: "Complete your academic credentials (CGPA, Course), category, and financial profile in less than 3 minutes.",
      icon: "user-check"
    },
    {
      step: 2,
      number: "02",
      title: "Discover & Match",
      desc: "Our automated recommendation engine evaluates your eligibility score across 500+ Central, State, and Corporate funds.",
      icon: "compass"
    },
    {
      step: 3,
      number: "03",
      title: "Apply & Track Live",
      desc: "Submit your pre-filled application with document previews and monitor real-time approval milestones up to DBT disbursement.",
      icon: "send"
    }
  ],

  /* ─────────────────────────────────────────────────────────────────────────
     CREDENTIALS
     ───────────────────────────────────────────────────────────────────────── */
  adminCredentials: {
    username: "admin@scholarpath.in",
    email: "admin@scholarpath.in",
    password: "Admin@123",
    role: "admin",
    name: "Syed Fazil (Admin)"
  },

  demoStudent: {
    name: "Arjun Sharma",
    email: "arjun@student.com",
    password: "Student@123",
    role: "student",
    institution: "Dayananda Sagar University",
    course: "B.Tech CSE",
    cgpa: 8.75
  }
};
