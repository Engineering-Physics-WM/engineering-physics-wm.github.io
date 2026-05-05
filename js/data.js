import students2026 from "../data/2026-2027/students.json";

const cohortStudents = students2026.students;
const rosterResponses = cohortStudents.map((student) => ({
  name: student.name,
  email: student.email,
  ranking: student.sampleRanking,
  notes: student.honorsProject
    ? `Honors project ${String(student.honorsProject.number).padStart(2, "0")} matching default`
    : student.requirements.computationalRequirement,
}));

const EP_DATA = {
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
      slug: "animal-crossing-reengineering-effective-wildlife-crossing-structures-at-the-jamestown-dam",
      title: "Animal Crossing: Reengineering Effective Wildlife Crossing Structures At The Jamestown Dam",
      advisor: "Randy Chambers", affiliation: "ENSP", advisorEmail: "rmcham@wm.edu",
      coadvisors: [{ name: "Ran Yang", affiliation: "Physics", email: "rxyan2@wm.edu" }],
      areas: ["Instrumentation / sensors", "Public-facing / installation / outreach"],
      pitch: "There are thousands of small dams that impound water across the Virginia coastal plain, but the dams impede the migrations of fishes and other organisms. Students will work with Keck Lab personnel to design, install, and monitor equipment to facilitate upstream movements of migratory animals, thereby opening habitats underutilized owing to the dams.",
      background: "Water flows downhill, but migratory organisms flow upstream to complete their life cycles. Dams effectively break the cycles. Because dam removal currently is not an option, the problem must be addressed another way. The animal team plans to work on engineering potential pathways to facilitate the flow of organisms like fish over dams. Starting with research and review of past methodologies (e.g., fish ladders, salmon guns), the team will target a species, identify the specific barriers to upstream migration posed by the Lake Matoaka dam on Jamestown Road, then engineer a structure that could assist with migration. The team would hope to demonstrate the effectiveness of their engineering solution via in-stream videography of successful animal migrations at the dam.",
      workspace: "The team will work in Physics (Yang lab) and in the Keck Environmental Lab and in the field (Lake Matoaka and College Creek).",
      notes: "I've never been involved in EPAD projects before, so this is all new to me!",
    },
    {
      id: "usv-race-boat", num: 6,
      slug: "modification-of-a-high-speed-electric-unmanned-surface-vessel-usv-race-boat-towards-full-stack-agentic-control",
      title: "Modification of a high-speed, electric, unmanned surface vessel (USV) race boat towards full-stack agentic control.",
      advisor: "Jonathan Frey", affiliation: "Applied Science", advisorEmail: "jfrey@wm.edu",
      coadvisors: null,
      areas: ["AI-driven measurement or analysis", "Robotics / autonomy / controls", "Public-facing / installation / outreach", "Instrumentation / sensors"],
      pitch: "William & Mary Racing is moving to improve the mechanical systems of the unmanned race boat to achieve higher average speeds as well as modifying the autonomous control systems and sensors to achieve full stack agentic AI control of the vessel.",
      background: "The team will be focused on competing in the ASNE collegiate race in April within the autonomous race division. This project will result in delivered and tested hardware and electronics as well as software and firmware developed within the stack. We are working to turn the W&M racing vessel, Pesce Volante, into an autonomous vessel akin to Kit from the tv show Knight Rider.",
      workspace: "Makerspace",
      notes: null,
    },
    {
      id: "photosensor-readout", num: 7,
      slug: "photosensor-readout-electronics-for-fun-and-profit",
      title: "Photosensor readout electronics for fun and profit*",
      advisor: "Mike Kordosky", affiliation: "Physics", advisorEmail: "makordosky@wm.edu",
      coadvisors: null,
      areas: ["Bioengineering / medical devices", "Instrumentation / sensors", "Plasma / high-energy adjacent"],
      pitch: "If you've wondered how the analog signals that come out of sensors end up as numbers on a computer this project is for you. You'll build the so-called front-end readout for photodetectors that are sensitive to single photons with a time resolution of a few ns. Pick this project if you like electronics and instrumentation and want a challenge combining hardware and software.",
      background: "Photosensors with single photon and few ns resolution are widely used in high-energy and nuclear physics as well as in adjacent fields like medical physics. They are typically read out with bespoke hardware that takes delta-function like current pulses from the sensor, shapes and amplifies them (in the RC-CR sense) and then digitizes them to produce numbers. The digitizer and front end usually service multiple inputs and are controlled and read-out by a micro-controller (ex: arduino). The goal of this project is to design, construct, and characterize a readout system consisting of one or more PCBs.",
      workspace: "Work will be done in our labs in the Small Hall research wing.",
      notes: "This project needs a team with members who liked analog electronics (PHYS 252) and were decent at it. It would also benefit from having some members who have taken instrumentation (PHYS 351) or who are planning to take it in F26. Team members will also need some programming experience (via PHYS 256 or similar) and will benefit from experience with linux/unix.",
    },
    {
      id: "irays-pupillometry", num: 5,
      slug: "irays-computational-dual-spectrum-pupillometry-for-pre-hospital-neuro-triage",
      title: "iRays: Computational Dual-Spectrum Pupillometry for Pre-Hospital Neuro-Triage",
      advisor: "Ran Yang", affiliation: "Physics", advisorEmail: "rxyan2@wm.edu",
      coadvisors: [{ name: "Gunter Luepke", affiliation: "Applied Science", email: "gxluep@wm.edu" }],
      areas: ["Instrumentation / sensors", "AI-driven measurement or analysis", "Bioengineering / medical devices", "Computational imaging / simulation", "Robotics / autonomy / controls"],
      pitch: "You are a year away from being engineers, not students, and iRays is the rare project where the distance between a William & Mary lab bench and the back of an ambulance and emergencies is exactly as far as you carry it; most undergraduates leave school without ever feeling that line disappear. Across the year you will get hands on with computational imaging, on-device AI, PCB and firmware integration, and the discipline of designing for a user who has 90 seconds and one free hand. This is not a \"might someday be useful\" project; it is an NIH-funded industry problem with active IRB approval, a filed patent, and a fire department waiting on the device. The pupils you teach this unit to read belong to people having strokes, overdoses, and head injuries, and faster, objective answers in those minutes save lives.",
      background: "Acute brain emergencies (stroke, traumatic brain injury, overdose) make up a large share of 911 calls, but the only neurologic tool in most ambulances is a penlight check that is subjective, hard to document, and wrong up to 66 percent of the time. iRays replaces that penlight with a handheld dual-spectrum imager that captures the pupillary light reflex (PLR), the fastest direct bedside indicator of brain function, and runs on-device AI to extract size, latency, constriction velocity, and binocular asymmetry in seconds. The physics core is computational imaging under uncontrolled motion: timed visible and infrared illumination, contact-free geometry correction (the \"Star Ruler\" depth model), event-synchronized stimulus timing (the \"Pink Frame\" method), and segmentation models that must run real time on edge compute.\nThe capstone team will own one integration thread that turns the existing benchtop prototype into a field-testable unit. Concretely, the team will (1) build and characterize a synthetic-eye replay rig for repeatable, ground-truth bench validation; (2) integrate dual-spectrum illumination and binocular acquisition into a handheld enclosure; (3) execute a structured measurement campaign on the rig covering timing accuracy, depth correction, and PLR feature repeatability under scripted motion and more.\nYear-end deliverables: a working handheld prototype, a calibrated synthetic-eye test bench, a characterized dataset with quantitative repeatability metrics, a live April Showcase demo, and a publication-ready technical report. Strong students will be positioned to co-author a peer-reviewed paper and contribute to follow-on patent disclosures.",
      workspace: "Primary workspace: Dr. Yang's Point of Care Lab in William & Mary Physics (Small Hall 234) for integration, embedded build-out, and bench measurement. Optical characterization and eye safety verification will occur in Dr. Luepke's lab in Small Hall. Day-to-day human subjects activities under the iRays IRB and IDE are handled by the graduate engineer and the Hampton Fire & Rescue partner team, so the capstone scope is primarily bench based on synthetic eyes. If a project thread benefits from limited human subjects involvement, the undergraduate team will complete CITI human subjects training and be added to the IRB protocol.",
      notes: null,
    },
    {
      id: "audimo", num: 2,
      slug: "audimo-sensor-augmented-acoustic-instruments",
      title: "Audimo (Sensor-Augmented Acoustic Instruments)",
      advisor: "Benjamin D. Whiting", affiliation: "Music", advisorEmail: "bdwhiting@wm.edu",
      coadvisors: [
        { name: "Ran Yang", affiliation: "Physics", email: "rxyan2@wm.edu" },
        { name: "Melody Chua", affiliation: "Kunst Universität Graz (KUG)", email: "melo@chua.ch" },
      ],
      areas: ["Instrumentation / sensors"],
      pitch: "Audimo aims to deliver tighter integration of acoustic instruments into electronic music performance and improvisation. Eschewing uncomfortable solutions like stomp boxes and bulky sensor attachments that require the performer to move in ways that are unidiomatic to their instrument, it will allow performers the ability to control electronic effects and synthesized or sampled audio in a way that jives with how they normally play.",
      background: "This project builds upon the progress made by current seniors Jennifer Tsai and Felix Iov during the 2025AY. Audimo currently exists as an alpha-state prototype. It is compact, sports a 9-axis motion sensor and proximity sensor for gesture recognition, as well as a small microphone for amplitude and pitch tracking. It operates by taking the data logged on the SBC (currently a Raspberry Pi Pico), bundling the values into Open Sound Control (OSC)-formatted messages, and then transmitting those messages to the Audimo DAW plugin on the host computer. The user then has the option to either use one of the several audio FX processes in the plugin or transmit the values to another destination (e.g., another plugin in the DAW or to an external audio programming platform like Pure Data or Max/MSP).\n\nWhile it is already a capable device in its own right, there is still much to accomplish for Audimo to realize its purpose as a sensor augmentation for any instrument, including those that are typically stationary when played. This matters as there exists a number of practitioners of contemporary electronic and electroacoustic music composition, improvisation, and performance who are eager for such a solution that current commercially available offerings (namely, MUGIC Motion) either do not adequately address or are incompatible with their instrument or manner of performance. What Audimo aims to offer is a degree of flexibility heretofore unprecedented in this area.\n\nKey deliverables by the end of the 2026AY include the following:\n• Incorporation of microcontrollers and other components to replace the RPi Pico\n• Refinement of dynamic time warping algorithm for improved gesture recognition accuracy\n• Adoption of a more robust proximity sensing solution as well as others that will assist in measuring performance data from stationary instruments\n• Improvement of form factor and instrument mounting solutions\n• UI/UX improvements for the plugin, as well as the incorporation of more audio effects\n• Development of presets for instruments to aid in calibration and parameter mapping\n• Demo of beta-state prototype at the April Showcase, as well as (ideally) a publication-ready report",
      workspace: "Weekly meetings will occur in the Experimental Project Studio (room 062) in the basement of the Music Arts Center. Pending approval, hardware work will continue to be conducted in Ran's Lab in Small Hall. Testing sessions with volunteer musicians will be conducted in the Music Arts Center, either in the Experimental Project Studio (MAC 062) or the Vlahakis Recording Studio (MAC 064) depending on the nature of the test. Testing of the sound quality of the plugin can be conducted in the new Sound Design Studio (MAC 065) over stereo studio monitors in an acoustically treated space, or in the Experimental Project Studio for testing over a 6.1 surround sound system.",
      notes: "The team will, on occasion, meet remotely with other experts in the field of sensor-augmented instruments and AI-powered improvisation machines for guidance. My team had a lot of fun this year getting this initiative started, and I expect next year will prove to be just as, if not even more, exhilarating and rewarding.",
    },
    {
      id: "smr-heat-load", num: 4,
      slug: "developing-heat-load-model-and-solutions-for-smr-located-on-former-mining-site",
      title: "Developing heat load model and solutions for SMR located on former mining site",
      advisor: "Saskia Mordijck", affiliation: "Physics", advisorEmail: "smordijck@wm.edu",
      coadvisors: null,
      areas: ["Computational imaging / simulation"],
      pitch: "Most conflicts in the world can reduced to 3 topics: Water, Energy & data. In this project, you will directly be able to contribute to real world challenge through assessing the ability of a former mining site to provide the cooling for small modular reactors.",
      background: "This project will involve assessing the heat capacity of mine water in combination with an artificial open air basin for supporting Small Modular Reactors in Southwest Virginia. Students will have to develop an increasingly complex system using open source software such as TESPy (a thermal engineering software package for energy systems). The students will have to develop a solution which includes multiple heat deposits, addresses environmental temperatures, realistic pumps and water flow rates for a variety of environmental conditions. In addition, advanced modeling of the mine using open source software MODFLOW can address the impact of multi year operation and localized temperatures in the mine itself.",
      workspace: "This work requires computers and internet access.",
      notes: "This project will put you in contact with major energy companies and engage with a former W&M alumnus.",
    },
    {
      id: "soft-bio-robot", num: 9,
      slug: "soft-shallow-water-biomimetic-robot",
      title: "Soft Shallow Water Biomimetic Robot",
      advisor: "Jonathan Frey", affiliation: "Applied Science", advisorEmail: "jfrey@wm.edu",
      coadvisors: null,
      areas: ["Public-facing / installation / outreach", "Instrumentation / sensors", "Robotics / autonomy / controls"],
      pitch: "Marine ecosystems represent a vastly complex and diverse area of study that pose accessibility challenges for direct human interaction. Such regions have traditionally been studied by underwater autonomous vehicles utilizing propeller-based locomotion. However, these are limited in their maneuverability, speed, and natural integration. Soft robotics represent a viable alternative to efficiently navigate sensitive marine ecosystems with minimal disturbance. Using biomimetics as design framework, this project will work towards developing a soft remotely operated underwater vehicle in the form factor of a manta ray for use in observation of shallow water marine environments with minimal disturbance.",
      background: "This project will result in a remotely operated soft robotic manta ray.",
      workspace: "Makerspace",
      notes: null,
    },
    {
      id: "biofilm-corrosion", num: 3,
      slug: "corrosion-prevention-using-engineered-biofilms",
      title: "Corrosion Prevention Using Engineered Biofilms",
      advisor: "Margaret Saha", affiliation: "Applied Science", advisorEmail: "mssaha@wm.edu",
      coadvisors: [
        { name: "Doug Beringer", affiliation: "Core Labs", email: "dbberinger@wm.edu" },
        { name: "Dennis Manos", affiliation: "Physics", email: "dmanos@wm.edu" },
      ],
      areas: ["Bioengineering / medical devices", "Instrumentation / sensors", "Materials"],
      pitch: "Developing novel approaches using biofilms to prevent corrosion is important because traditional anti-corrosion methods often rely on toxic chemicals that can harm the environment. Corrosion causes an estimated $2.5 trillion in damage globally each year, or about 3–4% of global GDP, making more effective solutions economically critical. Biofilms offer a more sustainable and potentially self-regenerating solution by forming protective layers on material surfaces. They can adapt to changing conditions, improving long-term durability, reducing maintenance costs, and helping mitigate the massive economic burden of corrosion.",
      background: "By the end of the year, the team expects to produce several concrete artifacts, including a characterized dataset on biofilm performance under different environmental conditions and a validated experimental setup for testing corrosion resistance. This will include the development of a flow chamber that mimics real-world water movement experienced by ships and bridges, enabling more realistic testing conditions. The team also aims to create a prototype or proof-of-concept demonstrating biofilm-based protection on a material sample. Additionally, the project should result in a publication-ready report and a live or recorded demonstration suitable for presentation at the April Showcase.",
      workspace: "Team will work in ISC4 — in several labs and Core Labs.",
      notes: "The bacteria producing the biofilm is BSL1 — same safety level as the bacteria in the yogurt one eats for breakfast!",
    },
    {
      id: "quantum-forge", num: 8,
      slug: "quantum-forge-pilot-project-with-inq-in-quantum-computing-or-quantum-sensing",
      title: "Quantum Forge Pilot Project with IonQ in Quantum Computing or Quantum Sensing",
      advisor: "IonQ Industry Mentor", affiliation: "Industry / IonQ", advisorEmail: null,
      partners: [
        { name: "IonQ", url: "https://www.ionq.com" },
        { name: "Q-SEnSE", url: "https://www.colorado.edu/research/qsense/" },
      ],
      coadvisors: [{ name: "W&M Physics professor (TBD)", affiliation: "Physics", email: null }],
      areas: ["Quantum science and technology", "Computational imaging / simulation", "Instrumentation / sensors"],
      pitch: "IonQ builds the world's most powerful trapped-ion quantum computers — systems where individual ytterbium atoms, suspended in an electromagnetic trap and manipulated by laser pulses, serve as qubits with some of the highest gate fidelities in the industry. This Quantum Forge capstone puts you inside that work. You would join a year-long project mentored directly by an IonQ technical lead, tackling a real problem at the intersection of hardware characterization, algorithm development, or quantum sensing — and doing it at a company that is publicly traded, shipping cloud-accessible quantum hardware today, and actively expanding what trapped-ion systems can do.",
      background: "This capstone project is part of Quantum Forge, a year-long model developed by NSF Q-SEnSE to embed undergraduates in real quantum industry collaborations. The 2026-2027 W&M cohort project is being developed with IonQ — a leading quantum computing company whose trapped-ion QPUs are accessible via cloud platforms including AWS Braket, Microsoft Azure, and Google Cloud.\n\nIonQ's core technology uses chains of trapped ytterbium-171 ions as qubits, achieving algorithmic qubit counts that outperform many superconducting systems on error-corrected workloads. Their research spans gate optimization, error mitigation, quantum network interfaces, and application-layer algorithm design for chemistry, optimization, and machine learning tasks.\n\nThe final project scope is being defined with IonQ mentors and will fall in one of two directions: (1) quantum computing — contributing to algorithm benchmarking, circuit optimization, or application development on IonQ hardware; or (2) quantum sensing — exploring how trapped-ion precision measurement techniques translate to real-world sensing problems. Either path involves defining requirements, modeling system behavior, building and testing workflows, and reporting to technical stakeholders in the way industry actually works.\n\nDeliverables: technical background review, problem statement with requirements, progress reviews, and a final report and presentation. Depending on scope, the team may also produce a benchmarking dataset, circuit library, or sensing workflow prototype.",
      workspace: "Primary work will be based in William & Mary Physics and associated engineering spaces, with regular remote interaction with IonQ technical mentors. Cloud access to IonQ quantum hardware will be provided through the Quantum Forge program.",
      notes: "This is a pilot Quantum Forge project for the 2026-2027 capstone cycle. The exact technical direction is being finalized with IonQ and Q-SEnSE program mentors. A W&M Physics faculty co-advisor in the relevant area will be confirmed once the scope is set.",
    },
  ],

  students: cohortStudents,
  cohortStudents: students2026,

  // Roster-based sample responses — drives the dashboard demo until live submissions are connected.
  responses: rosterResponses,

  archive: [
    { year: "2024-2025", title: "Founding cohort", projects: 7, teams: 3, students: 9, summary: "First Engineering Physics capstone year. Hand-matched teams, shared lab space established at Small Hall.", status: "past" },
    { year: "2025-2026", title: "Second cohort", projects: 8, teams: 3, students: 8, summary: "Introduced industry partner mentorship pilots. Public showcase added at the Sadler Center.", status: "past" },
    { year: "2026-2027", title: "Current cohort — you are here", projects: 9, teams: null, students: 17, summary: "Ranking poll + first auto team-making preview running this year. Quantum Forge industry track joins the slate.", status: "current" },
    { year: "2027-2028", title: "Reserved", projects: null, teams: null, students: null, summary: "Placeholder for next year. Ranking and team data will land here once the cohort starts.", status: "future" },
  ],
};

export { EP_DATA };
