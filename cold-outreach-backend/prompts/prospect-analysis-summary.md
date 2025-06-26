# PROSPECT ANALYSIS AND SALES STRATEGY GENERATOR

Analyze prospect and company data to create a tailored sales strategy for digital services (software development, digital transformation, marketing).

## INPUT DATA
- **Proxycurl Person Enrichment data** (LinkedIn profile)
- **Company website content** (via Firecrawl)
- **BuiltWith technology profile** (tech stack)
- **[Optional]** Digital services to consider selling

## ANALYSIS FRAMEWORK

### 1. PROSPECT ANALYSIS (from Proxycurl data)
- **Professional Background**: Career progression, industry focus, job tenure patterns
- **Current Role**: Title, seniority, decision-making authority, company context
- **Qualifications**: Education, skills, certifications, technical vs. business orientation
- **Interests & Activity**: Professional focus areas, LinkedIn engagement, content themes

### 2. COMPANY ANALYSIS (from Firecrawl website data)
- **Company Profile**: Mission, offerings, target market, size/maturity
- **Digital Presence**: Website quality, content freshness, communication style
- **Key Messaging**: Value propositions, pain points addressed, differentiators
- **Opportunities**: Explicit/implied challenges, growth areas, service gaps

### 3. TECHNOLOGY ASSESSMENT (from BuiltWith data)
- **Tech Stack**: CMS, e-commerce platforms, marketing tools, core technologies
- **Technical Maturity**: Modern vs. legacy systems, mobile optimization, integration complexity
- **Improvement Areas**: Missing technologies, outdated platforms, integration opportunities

### 4. SOLUTION RECOMMENDATION
- **Primary Need**: Match prospect's authority with highest-impact opportunity
- **Service Alignment**: Core offering recommendation with supporting services
- **Value Proposition**: Business impact, ROI framework, connection to pain points

### 5. ENGAGEMENT STRATEGY
- **Approach**: Communication channels, messaging tone, technical depth
- **Key Points**: Relevant case studies, personalized insights, conversation starters
- **Objection Handling**: Anticipated concerns, counter-arguments, next steps

## OUTPUT FORMAT

Create a concise sales strategy with these sections:

### 1. EXECUTIVE SUMMARY (100-150 words)
- Prospect overview, main opportunity, recommended service, and expected value

### 2. PROSPECT INSIGHTS
- Career highlights, role authority, professional motivators, engagement angles

### 3. COMPANY NEEDS
- Digital state assessment, pain points, growth opportunities, strategic priorities

### 4. TECHNICAL LANDSCAPE
- Core tech stack, maturity level, strengths/weaknesses, improvement areas

### 5. SALES STRATEGY
- Service recommendation, tailored value proposition, engagement approach, objection handling

For each section:
- Use bulleted points for key insights
- Include brief reasoning for recommendations
- Provide 1-2 specific examples as evidence

## REASONING APPROACH

For each recommendation, briefly explain:
- Data points that informed your conclusion
- Alignment with prospect's role and authority
- Why this approach best addresses company needs
- Expected value for both parties

**INPUT DATA BEGINS NOW**

```
${SELF_COMPANY_INFO}
```

# Prospect LinkedIn Profile

```
${LINKEDIN_INFO}
```

# Company Website

```
${FIRECRAWL_INFO}
```

# BuiltWith Technology Profile

```
${BUILTWITH_INFO}
```