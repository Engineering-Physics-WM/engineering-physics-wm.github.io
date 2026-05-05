/* EP — sample data baked in.
   Catalog projects mirror the uploaded projects.json (9 real projects).
   Pitches are placeholder text until per-project JSON is wired up.
   Sample students + rankings drive the dashboard demo. */

window.EP_DATA = {
  years: [
    { id: "2024-2025", label: "24·25", status: "archive" },
    { id: "2025-2026", label: "25·26", status: "archive-pending" },
    { id: "2026-2027", label: "26·27", status: "current" },
    { id: "2027-2028", label: "27·28", status: "future" },
  ],
  currentYear: "2026-2027",

  projects: [
    {
      id: "animal-crossing", num: 1,
      title: "Animal Crossing: Reengineering Effective Wildlife Crossing Structures At The Jamestown Dam",
      advisor: "Randy Chambers", affiliation: "ENSP",
      areas: ["Instrumentation / sensors", "Public-facing / installation / outreach"],
      pitch: "Design and instrument wildlife crossing structures at the Jamestown Dam to reduce road mortality and study habitat connectivity. Combines field sensor deployment with civil engineering judgment and ecology data.",
    },
    {
      id: "usv-race-boat", num: 2,
      title: "Modification of a high-speed, electric, unmanned surface vessel (USV) race boat towards full-stack agentic control.",
      advisor: "Jonathan Frey", affiliation: "Applied Science",
      areas: ["AI-driven measurement or analysis", "Robotics / autonomy / controls", "Public-facing / installation / outreach", "Instrumentation / sensors"],
      pitch: "Take an electric race-boat platform and stack on full-stack agentic control: perception, planning, and learning from on-water trials. End-of-year demo at a public race event.",
    },
    {
      id: "photosensor-readout", num: 3,
      title: "Photosensor readout electronics for fun and profit*",
      advisor: "Mike Kordosky", affiliation: "Physics",
      areas: ["Bioengineering / medical devices", "Instrumentation / sensors", "Plasma / high-energy adjacent"],
      pitch: "Build low-noise readout electronics for SiPM/PMT photosensors. Applications branch into both high-energy detector R&D and biomedical optics, with a real PCB hand-off at the end.",
    },
    {
      id: "irays-pupillometry", num: 4,
      title: "iRays: Computational Dual-Spectrum Pupillometry for Pre-Hospital Neuro-Triage",
      advisor: "Ran Yang", affiliation: "Physics",
      areas: ["Instrumentation / sensors", "AI-driven measurement or analysis", "Bioengineering / medical devices", "Computational imaging / simulation", "Robotics / autonomy / controls"],
      pitch: "A pocketable dual-spectrum pupillometer that gives EMTs and field clinicians a fast, quantitative neuro-triage signal. Optical design + embedded vision + ML-driven analysis on real patient data.",
    },
    {
      id: "audimo", num: 5,
      title: "Audimo (Sensor-Augmented Acoustic Instruments)",
      advisor: "Benjamin D. Whiting", affiliation: "Music",
      areas: ["Instrumentation / sensors"],
      pitch: "Embed sensors and signal processing inside acoustic instruments to extend their voice — without losing the player's craft. Co-developed with W&M Music performers.",
    },
    {
      id: "smr-heat-load", num: 6,
      title: "Developing heat load model and solutions for SMR located on former mining site",
      advisor: "Saskia Mordijck", affiliation: "Physics",
      areas: ["Computational imaging / simulation"],
      pitch: "Model and propose heat-rejection strategies for a small modular reactor sited on a former mining property. Combines thermal-hydraulics simulation with site constraint analysis.",
    },
    {
      id: "soft-bio-robot", num: 7,
      title: "Soft Shallow Water Biomimetic Robot",
      advisor: "Jonathan Frey", affiliation: "Applied Science",
      areas: ["Public-facing / installation / outreach", "Instrumentation / sensors", "Robotics / autonomy / controls"],
      pitch: "Design a soft-bodied robot inspired by shallow-water animals. Material selection, actuation, and onboard sensing for non-disruptive monitoring of estuarine ecosystems.",
    },
    {
      id: "biofilm-corrosion", num: 8,
      title: "Corrosion Prevention Using Engineered Biofilms",
      advisor: "Margaret Saha", affiliation: "Applied Science",
      areas: ["Bioengineering / medical devices", "Instrumentation / sensors", "Materials"],
      pitch: "Engineered microbial biofilms as a barrier against metallic corrosion. Wet-lab + electrochemistry + materials characterization, with possible scale-up for marine applications.",
    },
    {
      id: "quantum-forge", num: 9,
      title: "Quantum Forge Pilot Project with INQ in Quantum Computing or Quantum Sensing",
      advisor: "INQ Industry Mentor", affiliation: "Industry / Quantum Forge",
      areas: ["Quantum science and technology", "Computational imaging / simulation", "Instrumentation / sensors"],
      pitch: "An industry-mentored pilot in quantum computing or quantum sensing through Quantum Forge / Q-SEnSE. Direct work with an INQ technical lead and W&M faculty.",
    },
  ],

  // Sample student responses — drives the dashboard demo
  responses: [
    { name: "Aiyana Patel",   email: "appatel@wm.edu",     ranking: ["irays-pupillometry","quantum-forge","photosensor-readout","audimo","usv-race-boat","biofilm-corrosion","soft-bio-robot","smr-heat-load","animal-crossing"], notes: "ML/CV interest" },
    { name: "Bennett Cho",    email: "bcho@wm.edu",        ranking: ["usv-race-boat","soft-bio-robot","irays-pupillometry","photosensor-readout","quantum-forge","animal-crossing","smr-heat-load","biofilm-corrosion","audimo"], notes: "Loves robotics" },
    { name: "Cara Lin",       email: "clin@wm.edu",        ranking: ["quantum-forge","photosensor-readout","smr-heat-load","irays-pupillometry","biofilm-corrosion","audimo","usv-race-boat","soft-bio-robot","animal-crossing"], notes: "Theory-leaning" },
    { name: "Daniel Reyes",   email: "dreyes@wm.edu",      ranking: ["irays-pupillometry","photosensor-readout","quantum-forge","biofilm-corrosion","audimo","usv-race-boat","soft-bio-robot","smr-heat-load","animal-crossing"], notes: "Pre-med + EE" },
    { name: "Elena Rosario",  email: "erosario@wm.edu",    ranking: ["audimo","irays-pupillometry","biofilm-corrosion","photosensor-readout","quantum-forge","soft-bio-robot","usv-race-boat","animal-crossing","smr-heat-load"], notes: "Cellist" },
    { name: "Felix Okafor",   email: "fokafor@wm.edu",     ranking: ["usv-race-boat","soft-bio-robot","animal-crossing","irays-pupillometry","photosensor-readout","biofilm-corrosion","quantum-forge","smr-heat-load","audimo"], notes: "Wants outdoor + robotics" },
    { name: "Gita Mehta",     email: "gmehta@wm.edu",      ranking: ["biofilm-corrosion","irays-pupillometry","photosensor-readout","quantum-forge","soft-bio-robot","audimo","animal-crossing","usv-race-boat","smr-heat-load"], notes: "Bio + materials" },
    { name: "Henrik Sato",    email: "hsato@wm.edu",       ranking: ["smr-heat-load","quantum-forge","photosensor-readout","irays-pupillometry","usv-race-boat","biofilm-corrosion","soft-bio-robot","animal-crossing","audimo"], notes: "Sim-heavy" },
    { name: "Isla Berger",    email: "iberger@wm.edu",     ranking: ["animal-crossing","soft-bio-robot","biofilm-corrosion","usv-race-boat","irays-pupillometry","photosensor-readout","audimo","quantum-forge","smr-heat-load"], notes: "ENSP minor" },
    { name: "Jasper Kim",     email: "jkim@wm.edu",        ranking: ["irays-pupillometry","quantum-forge","photosensor-readout","biofilm-corrosion","usv-race-boat","soft-bio-robot","smr-heat-load","audimo","animal-crossing"], notes: "MD-PhD aspirant" },
    { name: "Kalia Brooks",   email: "kbrooks@wm.edu",     ranking: ["audimo","animal-crossing","soft-bio-robot","irays-pupillometry","biofilm-corrosion","photosensor-readout","quantum-forge","usv-race-boat","smr-heat-load"], notes: "Music + outreach" },
    { name: "Liam Donnelly",  email: "ldonnelly@wm.edu",   ranking: ["usv-race-boat","photosensor-readout","quantum-forge","irays-pupillometry","soft-bio-robot","smr-heat-load","biofilm-corrosion","animal-crossing","audimo"], notes: "Embedded systems" },
    { name: "Maya Underwood", email: "munderwood@wm.edu",  ranking: ["quantum-forge","smr-heat-load","photosensor-readout","irays-pupillometry","usv-race-boat","biofilm-corrosion","soft-bio-robot","audimo","animal-crossing"], notes: "Industry-curious" },
    { name: "Nikhil Verma",   email: "nverma@wm.edu",      ranking: ["soft-bio-robot","usv-race-boat","irays-pupillometry","animal-crossing","photosensor-readout","biofilm-corrosion","quantum-forge","audimo","smr-heat-load"], notes: "Soft robotics" },
    { name: "Owen Park",      email: "opark@wm.edu",       ranking: ["photosensor-readout","irays-pupillometry","quantum-forge","biofilm-corrosion","smr-heat-load","usv-race-boat","soft-bio-robot","audimo","animal-crossing"], notes: "Detector electronics" },
    { name: "Priya Anand",    email: "panand@wm.edu",      ranking: ["biofilm-corrosion","animal-crossing","irays-pupillometry","audimo","photosensor-readout","soft-bio-robot","usv-race-boat","quantum-forge","smr-heat-load"], notes: "Wet-lab fluent" },
    { name: "Quinn Hall",     email: "qhall@wm.edu",       ranking: ["irays-pupillometry","audimo","photosensor-readout","biofilm-corrosion","quantum-forge","usv-race-boat","soft-bio-robot","animal-crossing","smr-heat-load"], notes: "" },
    { name: "Rohan Iyer",     email: "riyer@wm.edu",       ranking: ["quantum-forge","irays-pupillometry","photosensor-readout","smr-heat-load","biofilm-corrosion","audimo","usv-race-boat","soft-bio-robot","animal-crossing"], notes: "Quantum-curious" },
    { name: "Sam Whitaker",   email: "swhitaker@wm.edu",   ranking: ["usv-race-boat","photosensor-readout","irays-pupillometry","soft-bio-robot","quantum-forge","biofilm-corrosion","smr-heat-load","audimo","animal-crossing"], notes: "" },
    { name: "Talia Greene",   email: "tgreene@wm.edu",     ranking: ["irays-pupillometry","biofilm-corrosion","audimo","photosensor-readout","animal-crossing","quantum-forge","soft-bio-robot","usv-race-boat","smr-heat-load"], notes: "Pre-med" },
    { name: "Uma Castillo",   email: "ucastillo@wm.edu",   ranking: ["soft-bio-robot","animal-crossing","biofilm-corrosion","usv-race-boat","irays-pupillometry","photosensor-readout","audimo","smr-heat-load","quantum-forge"], notes: "Field bio" },
    { name: "Victor Ng",      email: "vng@wm.edu",         ranking: ["photosensor-readout","quantum-forge","smr-heat-load","irays-pupillometry","biofilm-corrosion","usv-race-boat","soft-bio-robot","audimo","animal-crossing"], notes: "Detector + sim" },
  ],

  // Past + future cohort meta for archive view
  archive: [
    { year: "2024-2025", title: "Founding cohort", projects: 7, teams: 3, students: 9, summary: "First Engineering Physics capstone year. Hand-matched teams, shared lab space established at Small Hall.", status: "past" },
    { year: "2025-2026", title: "Second cohort", projects: 8, teams: 3, students: 8, summary: "Introduced industry partner mentorship pilots. Public showcase added at the Sadler Center.", status: "past" },
    { year: "2026-2027", title: "Current cohort — you are here", projects: 9, teams: null, students: 22, summary: "Ranking poll + first auto team-making preview running this year. Quantum Forge industry track joins the slate.", status: "current" },
    { year: "2027-2028", title: "Reserved", projects: null, teams: null, students: null, summary: "Placeholder for next year. Ranking and team data will land here once the cohort starts.", status: "future" },
  ],
};
