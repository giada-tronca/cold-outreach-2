# LINKEDIN PROFILE SUMMARY GENERATOR

Generate a detailed, human-sounding LinkedIn summary suitable for a professional profile. The summary should be written in the **first person**, with a tone that reflects the individual's **career story, strengths, and ambitions**, and it should be tailored for a professional networking audience.

## OBJECTIVE

Craft a compelling and personalized LinkedIn summary using the available data from Proxycurl's LinkedIn Profile API. The goal is to:

- Communicate the individual’s professional journey and expertise
- Highlight achievements, skills, and career focus
- Convey personality, motivation, and current professional goals
- Be suitable for inclusion in the "About" section on LinkedIn

## INPUT DATA
- **Full Proxycurl LinkedIn Profile API output**, including:
  - Name
  - Headline
  - Current and past job roles (titles, companies, dates, descriptions)
  - Education history
  - Skills and endorsements
  - Location
  - Accomplishments and certifications
  - Interests and groups (if available)
  - Profile summary (if already present)
  - Public profile URL
  - Industry and seniority
  - Work experience length and career trajectory

## OUTPUT FORMAT

Write a **professional and approachable LinkedIn summary** in first person, ~150–250 words. It should include the following elements:

### 1. PROFESSIONAL IDENTITY
- Who am I? (based on headline, current role, and career field)
- What drives me professionally?

### 2. CAREER JOURNEY
- Key highlights from my professional path (not a CV dump, but a narrative arc)
- Noteworthy industries, companies, or transformations I've been part of

### 3. CORE COMPETENCIES
- What am I good at? What skills do I bring to the table?
- Mention technical or business expertise backed by data

### 4. PERSONAL VALUES & WORK STYLE
- How do I approach work and collaboration?
- Any values, leadership traits, or passions that stand out

### 5. FUTURE ASPIRATIONS
- What am I currently focused on or exploring professionally?
- Open to opportunities? Leading innovation? Seeking collaboration?

## STYLE & TONE
- Write in **first person**, with a **warm, confident, and authentic** tone
- Avoid jargon or overly formal language—aim for **professional yet approachable**
- Use paragraph format (no bullet points)
- Where relevant, include **measurable outcomes or specific technologies/roles**

## EXAMPLES (for inspiration)

✅ *"I'm a seasoned product strategist with 10+ years of experience turning ideas into impactful digital solutions..."*

✅ *"After earning my degree in marketing, I dove into the startup world, helping small teams scale fast..."*

✅ *"I'm passionate about simplifying complex systems, leading cross-functional teams, and continuously learning..."*

## REASONING APPROACH

When crafting the summary:
- Use job titles, industries, and skill tags to infer the user's domain expertise
- Use career progression to infer motivation and experience level
- Use educational background and endorsements to reinforce expertise
- Infer tone and aspirations from headline, roles, and current position

## INPUT DATA BEGINS BELOW
{$LINKEDIN_PROFILE_DATA}